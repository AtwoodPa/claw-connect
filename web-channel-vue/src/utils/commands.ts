export const COMMANDS = [
  { key: 'model', label: 'Switch Model', description: '/model [name]' },
  { key: 'think', label: 'Deep Think', description: '/think [question]' },
  { key: 'new', label: 'New Session', description: '/new' },
  { key: 'clear', label: 'Clear History', description: '/clear' },
] as const;

export function parseCommand(text: string): { cmd: string; query: string } | null {
  const match = text.match(/^\/(\w*)(?:\s+(.*))?$/);
  if (!match) return null;
  return { cmd: match[1], query: match[2] ?? '' };
}

export function extractCodeBlocks(content: string): string[] {
  const matches = content.matchAll(/```[\s\S]*?```/g);
  return [...matches].map((m) => {
    const block = m[0];
    const inner = block.replace(/^```\w*\n?/, '').replace(/\n?```$/, '');
    return inner;
  });
}
