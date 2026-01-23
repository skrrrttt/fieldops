import 'fake-indexeddb/auto';
import { IDBFactory, IDBKeyRange } from 'fake-indexeddb';
import { beforeEach, afterEach, vi } from 'vitest';

// Create fresh IndexedDB instance for each test to prevent cross-test pollution
beforeEach(() => {
  // Reset global IndexedDB to fresh instance
  globalThis.indexedDB = new IDBFactory();
  globalThis.IDBKeyRange = IDBKeyRange;
});

afterEach(() => {
  // Clear any mocks
  vi.clearAllMocks();
});
