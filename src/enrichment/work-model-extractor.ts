export function extractWorkModel(text: string): 'remote' | 'hybrid' | 'on-site' | undefined {
  if (/\b(télétravail|teletravail|full[\s-]?remote|100\s*%\s*remote|à\s+distance)\b/i.test(text)) {
    return 'remote';
  }
  if (/\b(hybride|hybrid|mixte|partially\s+remote)\b/i.test(text)) {
    return 'hybrid';
  }
  if (/\b(sur\s+site|on[\s-]?site|présentiel|presentiel|bureau)\b/i.test(text)) {
    return 'on-site';
  }
  return undefined;
}
