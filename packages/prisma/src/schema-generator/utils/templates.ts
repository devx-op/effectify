import { createFromBuffer } from '@dprint/formatter';
import { getPath } from '@dprint/typescript';
import * as fs from 'node:fs';

// Initialize formatter globally to avoid reloading WASM on every call
const buffer = fs.readFileSync(getPath());
const formatter = createFromBuffer(buffer);

export async function formatCode(code: string) {
  try {
    // dprint formatText is synchronous
    return formatter.formatText({ filePath: 'file.ts', fileText: code });
  } catch (error) {
    // Fallback to unformatted code if formatting fails
    console.warn('Warning: dprint formatting failed:', error);
    return code;
  }
}
