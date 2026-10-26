import '@testing-library/jest-dom/vitest'
import { webcrypto } from 'node:crypto'

// jsdom lacks crypto.subtle (and may lack randomUUID): use Node's Web Crypto.
if (!globalThis.crypto?.subtle || typeof globalThis.crypto.randomUUID !== 'function') {
  Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true, writable: true })
}
