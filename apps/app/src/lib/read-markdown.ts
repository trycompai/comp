import { readFile } from 'node:fs/promises';

export async function readMarkdownFromModule(relativePath: string, baseUrl: string | URL) {
  const url = new URL(relativePath, baseUrl);
  return readFile(url, 'utf8');
}
