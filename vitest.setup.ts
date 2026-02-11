import 'fake-indexeddb/auto';
import { webcrypto } from 'node:crypto';

if (!globalThis.crypto) {
  // Vitest's jsdom environment lacks crypto by default; provide the Node implementation.
  globalThis.crypto = webcrypto as unknown as Crypto;
}
