import assert from 'node:assert/strict';
import net from 'node:net';
import { setTimeout as sleep } from 'node:timers/promises';
import { WebSocket, WebSocketServer } from 'ws';
import { GatewayWsClient } from '../dist/gateway-client.js';
import { WebChannelServer } from '../dist/server.js';

function createLogger(scope = 'smoke') {
  return {
    child(name) {
      return createLogger(`${scope}:${name}`);
    },
    info(message, meta) {
      if (process.env.SMOKE_VERBOSE === '1') {
        console.log(`[INFO] [${scope}] ${message}`, meta ?? '');
      }
    },
    warn(message, meta) {
      if (process.env.SMOKE_VERBOSE === '1') {
        console.warn(`[WARN] [${scope}] ${message}`, meta ?? '');
      }
    },
    debug(message, meta) {
      if (process.env.SMOKE_VERBOSE === '1') {
        console.log(`[DEBUG] [${scope}] ${message}`, meta ?? '');
      }
    },
    error(message, meta) {
      console.error(`[ERROR] [${scope}] ${message}`, meta ?? '');
    },
  };
}

async function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(0, '127.0.0.1');
    server.once('listening', () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        server.close();
        reject(new Error('failed to resolve free port'));
        return;
      }
      const { port } = address;
      server.close((err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(port);
      });
    });
    server.once('error', reject);
  });
}

function createFrameCollector(ws) {
  const queue = [];
  const waiters = [];

  ws.on('message', (raw) => {
    let frame;
    try {
      const text = typeof raw === 'string' ? raw : Buffer.from(raw).toString('utf8');
      frame = JSON.parse(text);
    } catch {
      return;
    }

    for (let i = 0; i < waiters.length; i += 1) {
      const waiter = waiters[i];
      if (!waiter.predicate(frame)) {
        continue;
      }
      waiters.splice(i, 1);
      clearTimeout(waiter.timer);
      waiter.resolve(frame);
      return;
    }

    queue.push(frame);
  });

  function next(predicate, timeoutMs = 5000) {
    const idx = queue.findIndex(predicate);
    if (idx >= 0) {
      const hit = queue[idx];
      queue.splice(idx, 1);
      return Promise.resolve(hit);
    }

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        const idx = waiters.findIndex((w) => w.resolve === resolve);
        if (idx >= 0) {
          waiters.splice(idx, 1);
        }
        reject(new Error('timed out waiting for websocket frame'));
      }, timeoutMs);
      waiters.push({ predicate, resolve, timer });
    });
  }

  return { next };
}

async function startMockGateway(port) {
  const logger = createLogger('mock-gateway');
  const wss = new WebSocketServer({ host: '127.0.0.1', port });

  const calls = {
    connect: 0,
    chatSend: 0,
    chatHistory: 0,
    chatAbort: 0,
    sessionsList: 0,
  };

  wss.on('connection', (socket) => {
    socket.on('message', async (raw) => {
      let frame;
      try {
        const text = typeof raw === 'string' ? raw : Buffer.from(raw).toString('utf8');
        frame = JSON.parse(text);
      } catch {
        return;
      }

      if (!frame || frame.type !== 'req') {
        return;
      }

      const method = frame.method;
      const params = frame.params ?? {};
      logger.debug(`received req:${method}`, params);

      if (method === 'connect') {
        calls.connect += 1;
        const token = params?.auth?.token;
        if (token !== 'gateway-smoke-token') {
          socket.send(
            JSON.stringify({
              type: 'res',
              id: frame.id,
              ok: false,
              error: { code: 'UNAUTHORIZED', message: 'invalid gateway token' },
            }),
          );
          return;
        }
        socket.send(
          JSON.stringify({
            type: 'res',
            id: frame.id,
            ok: true,
            payload: { protocol: 3, server: 'mock-gateway' },
          }),
        );
        return;
      }

      if (method === 'sessions.list') {
        calls.sessionsList += 1;
        socket.send(
          JSON.stringify({
            type: 'res',
            id: frame.id,
            ok: true,
            payload: {
              sessions: [
                {
                  sessionKey: 'agent:main:web-channel:direct:history-session',
                  title: 'Smoke Session',
                  updatedAt: Date.now(),
                },
              ],
            },
          }),
        );
        return;
      }

      if (method === 'chat.history') {
        calls.chatHistory += 1;
        socket.send(
          JSON.stringify({
            type: 'res',
            id: frame.id,
            ok: true,
            payload: {
              sessionKey: params.sessionKey,
              messages: [
                {
                  id: 'hist-user-1',
                  role: 'user',
                  text: 'history user msg',
                  timestamp: Date.now() - 1000,
                },
                {
                  id: 'hist-assistant-1',
                  role: 'assistant',
                  text: 'history assistant msg',
                  timestamp: Date.now() - 500,
                },
              ],
            },
          }),
        );
        return;
      }

      if (method === 'chat.abort') {
        calls.chatAbort += 1;
        socket.send(
          JSON.stringify({
            type: 'res',
            id: frame.id,
            ok: true,
            payload: { stopped: true },
          }),
        );
        return;
      }

      if (method === 'chat.send') {
        calls.chatSend += 1;
        const runId = params.idempotencyKey || `run-${Date.now()}`;
        const sessionKey = params.sessionKey;
        const message = String(params.message ?? '');
        const fullText = `Echo: ${message}`;
        const half = fullText.slice(0, Math.max(1, Math.floor(fullText.length / 2)));

        socket.send(
          JSON.stringify({
            type: 'res',
            id: frame.id,
            ok: true,
            payload: {
              runId,
              status: 'started',
            },
          }),
        );

        await sleep(20);
        socket.send(
          JSON.stringify({
            type: 'event',
            event: 'chat',
            payload: {
              runId,
              sessionKey,
              state: 'delta',
              message: { text: half },
            },
          }),
        );

        await sleep(20);
        socket.send(
          JSON.stringify({
            type: 'event',
            event: 'chat',
            payload: {
              runId,
              sessionKey,
              state: 'final',
              message: { text: fullText },
            },
          }),
        );

        await sleep(10);
        socket.send(
          JSON.stringify({
            type: 'event',
            event: 'agent',
            payload: {
              sessionKey,
              phase: 'tool.end',
              tool: 'mock-tool',
            },
          }),
        );
        return;
      }

      socket.send(
        JSON.stringify({
          type: 'res',
          id: frame.id,
          ok: false,
          error: { code: 'NOT_FOUND', message: `unknown method ${method}` },
        }),
      );
    });
  });

  await new Promise((resolve) => wss.once('listening', resolve));

  return {
    wss,
    calls,
    close: async () =>
      new Promise((resolve, reject) => {
        wss.close((err) => (err ? reject(err) : resolve()));
      }),
  };
}

async function run() {
  const gatewayPort = await getFreePort();
  const webPort = await getFreePort();
  const logger = createLogger('web-channel');

  const gateway = await startMockGateway(gatewayPort);
  const gatewayClient = new GatewayWsClient({
    wsUrl: `ws://127.0.0.1:${gatewayPort}`,
    token: 'gateway-smoke-token',
    connectTimeoutMs: 5000,
    requestTimeoutMs: 5000,
    logger,
  });

  const server = new WebChannelServer(
    {
      host: '127.0.0.1',
      port: webPort,
      cors: { origins: '*', credentials: true },
      auth: {
        type: 'jwt',
        secret: 'smoke-secret',
        expiration: 1800,
        apiKey: 'smoke-api-key',
      },
      gateway: {
        connectTimeoutMs: 5000,
        requestTimeoutMs: 5000,
      },
    },
    { logger },
    gatewayClient,
  );

  let browserWs;
  try {
    await gatewayClient.start();
    await server.start();

    const health = await fetch(`http://127.0.0.1:${webPort}/health`).then((r) => r.json());
    assert.equal(health.status, 'ok');
    assert.equal(health.running, true);

    const config = await fetch(`http://127.0.0.1:${webPort}/config`).then((r) => r.json());
    assert.equal(config.features.streaming, true);

    const badAuth = await fetch(`http://127.0.0.1:${webPort}/auth`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ apiKey: 'wrong-key' }),
    });
    assert.equal(badAuth.status, 401);

    const auth = await fetch(`http://127.0.0.1:${webPort}/auth`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ apiKey: 'smoke-api-key', sub: 'smoke-user' }),
    }).then((r) => r.json());
    assert.equal(typeof auth.token, 'string');
    assert.ok(auth.token.length > 10);

    const sessionsHttp = await fetch(`http://127.0.0.1:${webPort}/sessions?limit=10`).then((r) =>
      r.json(),
    );
    assert.ok(Array.isArray(sessionsHttp.sessions));
    assert.ok(sessionsHttp.sessions.length >= 1);

    browserWs = new WebSocket(`ws://127.0.0.1:${webPort}/ws`);
    const collector = createFrameCollector(browserWs);
    await new Promise((resolve, reject) => {
      browserWs.once('open', resolve);
      browserWs.once('error', reject);
    });
    const connected = await collector.next((f) => f.type === 'connected');
    assert.equal(typeof connected.sessionKey, 'string');

    browserWs.send(
      JSON.stringify({
        type: 'auth',
        payload: { token: auth.token },
      }),
    );
    await collector.next((f) => f.type === 'auth_success');

    browserWs.send(JSON.stringify({ type: 'sessions', payload: { limit: 10 } }));
    const wsSessions = await collector.next((f) => f.type === 'session_list');
    assert.ok(Array.isArray(wsSessions.sessions));

    browserWs.send(
      JSON.stringify({
        type: 'history',
        payload: { sessionKey: connected.sessionKey, limit: 50 },
      }),
    );
    const history = await collector.next((f) => f.type === 'history');
    assert.equal(history.sessionKey, connected.sessionKey);
    assert.ok(Array.isArray(history.messages));
    assert.ok(history.messages.length >= 1);

    const runId = 'smoke-run-1';
    browserWs.send(
      JSON.stringify({
        type: 'chat',
        payload: {
          sessionKey: connected.sessionKey,
          content: 'hello smoke',
          messageId: runId,
        },
      }),
    );

    const ack = await collector.next((f) => f.type === 'chat_ack' && f.runId === runId);
    assert.equal(ack.sessionKey, connected.sessionKey);

    let done = false;
    let assistantText = '';
    let sawAgentEvent = false;
    const deadline = Date.now() + 8000;

    while (!done && Date.now() < deadline) {
      const frame = await collector.next((f) => ['message', 'agent_event'].includes(f.type), 8000);
      if (frame.type === 'agent_event') {
        sawAgentEvent = true;
        continue;
      }
      if (typeof frame.content === 'string' && frame.content.length > 0) {
        assistantText += frame.content;
      }
      if (frame.done) {
        done = true;
      }
    }

    assert.equal(done, true);
    assert.equal(assistantText, 'Echo: hello smoke');
    if (!sawAgentEvent) {
      await collector.next((f) => f.type === 'agent_event', 3000);
      sawAgentEvent = true;
    }
    assert.equal(sawAgentEvent, true);

    browserWs.send(
      JSON.stringify({
        type: 'stop',
        payload: { sessionKey: connected.sessionKey, runId },
      }),
    );
    const stopped = await collector.next((f) => f.type === 'stopped');
    assert.equal(stopped.sessionKey, connected.sessionKey);

    assert.equal(gateway.calls.connect >= 1, true);
    assert.equal(gateway.calls.chatSend >= 1, true);
    assert.equal(gateway.calls.chatHistory >= 1, true);
    assert.equal(gateway.calls.chatAbort >= 1, true);
    assert.equal(gateway.calls.sessionsList >= 2, true);

    console.log('SMOKE PASS: web-channel bridge e2e flow verified.');
  } finally {
    if (browserWs && browserWs.readyState === WebSocket.OPEN) {
      browserWs.close();
    }
    await server.stop();
    gatewayClient.close();
    await gateway.close();
  }
}

run().catch((error) => {
  console.error('SMOKE FAIL:', error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
