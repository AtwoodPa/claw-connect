# OpenClaw Gateway 可接入能力缺口清单

> 基于 `openclaw(源代码)/src/gateway/server-methods-list.ts`（BASE_METHODS + GATEWAY_EVENTS）分析。

## 当前已接入

- RPC Methods: `chat.send`, `chat.history`, `chat.abort`, `sessions.list`
- Events: `chat`, `agent`

## 未接入 RPC Methods（共 90 项）

### (root)

- `health`
- `status`
- `last-heartbeat`
- `set-heartbeats`
- `wake`
- `system-presence`
- `system-event`
- `send`
- `agent`

### agent

- `agent.identity.get`
- `agent.wait`

### agents

- `agents.list`
- `agents.create`
- `agents.update`
- `agents.delete`
- `agents.files.list`
- `agents.files.get`
- `agents.files.set`

### browser

- `browser.request`

### channels

- `channels.status`
- `channels.logout`

### config

- `config.get`
- `config.set`
- `config.apply`
- `config.patch`
- `config.schema`

### cron

- `cron.list`
- `cron.status`
- `cron.add`
- `cron.update`
- `cron.remove`
- `cron.run`
- `cron.runs`

### device

- `device.pair.list`
- `device.pair.approve`
- `device.pair.reject`
- `device.pair.remove`
- `device.token.rotate`
- `device.token.revoke`

### doctor

- `doctor.memory.status`

### exec

- `exec.approvals.get`
- `exec.approvals.set`
- `exec.approvals.node.get`
- `exec.approvals.node.set`
- `exec.approval.request`
- `exec.approval.waitDecision`
- `exec.approval.resolve`

### logs

- `logs.tail`

### models

- `models.list`

### node

- `node.pair.request`
- `node.pair.list`
- `node.pair.approve`
- `node.pair.reject`
- `node.pair.verify`
- `node.rename`
- `node.list`
- `node.describe`
- `node.invoke`
- `node.invoke.result`
- `node.event`
- `node.canvas.capability.refresh`

### secrets

- `secrets.reload`
- `secrets.resolve`

### sessions

- `sessions.preview`
- `sessions.patch`
- `sessions.reset`
- `sessions.delete`
- `sessions.compact`

### skills

- `skills.status`
- `skills.bins`
- `skills.install`
- `skills.update`

### talk

- `talk.config`
- `talk.mode`

### tools

- `tools.catalog`

### tts

- `tts.status`
- `tts.providers`
- `tts.enable`
- `tts.disable`
- `tts.convert`
- `tts.setProvider`

### update

- `update.run`

### usage

- `usage.status`
- `usage.cost`

### voicewake

- `voicewake.get`
- `voicewake.set`

### wizard

- `wizard.start`
- `wizard.next`
- `wizard.cancel`
- `wizard.status`

## 未接入 Events（共 16 项）

### (root)

- `presence`
- `tick`
- `shutdown`
- `health`
- `heartbeat`
- `cron`

### connect

- `connect.challenge`

### device

- `device.pair.requested`
- `device.pair.resolved`

### exec

- `exec.approval.requested`
- `exec.approval.resolved`

### node

- `node.pair.requested`
- `node.pair.resolved`
- `node.invoke.request`

### talk

- `talk.mode`

### voicewake

- `voicewake.changed`

