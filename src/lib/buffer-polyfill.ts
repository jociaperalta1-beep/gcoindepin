// Solana web3.js and its dependencies expect Node globals (Buffer, global, process)
// that browsers do not provide. This module must be imported before any Solana code.
import { Buffer } from "buffer";

const g = globalThis as unknown as {
  Buffer?: typeof Buffer;
  global?: unknown;
  process?: { env: Record<string, string> };
};

if (!g.Buffer) g.Buffer = Buffer;
if (!g.global) g.global = globalThis;
if (!g.process) g.process = { env: {} };
