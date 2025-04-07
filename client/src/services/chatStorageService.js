import { openDB } from 'idb';

const DB_NAME = 'team-chat-db';
const DB_VERSION = 1;
const STORE_NAMES = {
  messages: 'messages',
  pendingMessages: 'pending-messages',
  searchHistory: 'search-history'
};

export class ChatStorageService {
  constructor() {
    this.dbPromise = this.initDB();
  }

  async initDB() {
    return openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Messages store
        if (!db.objectStoreNames.contains(STORE_NAMES.messages)) {
          const messageStore = db.createObjectStore(STORE_NAMES.messages, {
            keyPath: '_id'
          });
          messageStore.createIndex('teamId', 'teamId');
          messageStore.createIndex('timestamp', 'timestamp');
        }

        // Pending messages store
        if (!db.objectStoreNames.contains(STORE_NAMES.pendingMessages)) {
          const pendingStore = db.createObjectStore(STORE_NAMES.pendingMessages, {
            keyPath: 'localId'
          });
          pendingStore.createIndex('teamId', 'teamId');
          pendingStore.createIndex('timestamp', 'timestamp');
        }

        // Search history store
        if (!db.objectStoreNames.contains(STORE_NAMES.searchHistory)) {
          db.createObjectStore(STORE_NAMES.searchHistory, {
            keyPath: 'timestamp'
          });
        }
      }
    });
  }

  // Message persistence methods
  async saveMessages(teamId, messages) {
    const db = await this.dbPromise;
    const tx = db.transaction(STORE_NAMES.messages, 'readwrite');
    const store = tx.objectStore(STORE_NAMES.messages);

    // Add teamId to each message for indexing
    const messagesToSave = messages.map(msg => ({
      ...msg,
      teamId
    }));

    await Promise.all(
      messagesToSave.map(msg => store.put(msg))
    );

    await tx.done;
  }

  async getMessages(teamId, { limit = 50, before = null } = {}) {
    const db = await this.dbPromise;
    const tx = db.transaction(STORE_NAMES.messages, 'readonly');
    const store = tx.objectStore(STORE_NAMES.messages);
    const index = store.index('teamId');

    let cursor = await index.openCursor(
      IDBKeyRange.only(teamId),
      'prev'
    );

    const messages = [];
    let skipped = 0;

    if (before) {
      // Skip messages until we reach the 'before' timestamp
      while (cursor && new Date(cursor.value.timestamp) >= new Date(before)) {
        cursor = await cursor.continue();
        skipped++;
      }
    }

    // Collect messages up to the limit
    while (cursor && messages.length < limit) {
      messages.push(cursor.value);
      cursor = await cursor.continue();
    }

    await tx.done;
    return messages;
  }

  // Pending message handling
  async savePendingMessage(teamId, message) {
    const db = await this.dbPromise;
    const localId = `pending_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    await db.add(STORE_NAMES.pendingMessages, {
      ...message,
      localId,
      teamId,
      timestamp: new Date().toISOString(),
      status: 'pending'
    });

    return localId;
  }

  async updatePendingMessage(localId, update) {
    const db = await this.dbPromise;
    const tx = db.transaction(STORE_NAMES.pendingMessages, 'readwrite');
    const store = tx.objectStore(STORE_NAMES.pendingMessages);

    const message = await store.get(localId);
    if (!message) return;

    await store.put({
      ...message,
      ...update
    });

    await tx.done;
  }

  async removePendingMessage(localId) {
    const db = await this.dbPromise;
    await db.delete(STORE_NAMES.pendingMessages, localId);
  }

  async getPendingMessages(teamId) {
    const db = await this.dbPromise;
    const index = db.transaction(STORE_NAMES.pendingMessages)
      .store
      .index('teamId');

    return index.getAll(teamId);
  }

  // Search history management
  async addSearchTerm(term) {
    const db = await this.dbPromise;
    await db.add(STORE_NAMES.searchHistory, {
      term,
      timestamp: Date.now()
    });
  }

  async getRecentSearches(limit = 5) {
    const db = await this.dbPromise;
    const tx = db.transaction(STORE_NAMES.searchHistory, 'readonly');
    const store = tx.objectStore(STORE_NAMES.searchHistory);

    let cursor = await store.openCursor(null, 'prev');
    const searches = new Set();

    while (cursor && searches.size < limit) {
      searches.add(cursor.value.term);
      cursor = await cursor.continue();
    }

    await tx.done;
    return Array.from(searches);
  }

  // Cleanup methods
  async clearOldMessages(teamId, olderThan) {
    const db = await this.dbPromise;
    const tx = db.transaction(STORE_NAMES.messages, 'readwrite');
    const store = tx.objectStore(STORE_NAMES.messages);
    const index = store.index('teamId');

    let cursor = await index.openCursor(IDBKeyRange.only(teamId));

    while (cursor) {
      if (new Date(cursor.value.timestamp) < olderThan) {
        await cursor.delete();
      }
      cursor = await cursor.continue();
    }

    await tx.done;
  }

  async clearOldSearchHistory(olderThan) {
    const db = await this.dbPromise;
    const tx = db.transaction(STORE_NAMES.searchHistory, 'readwrite');
    const store = tx.objectStore(STORE_NAMES.searchHistory);

    let cursor = await store.openCursor();

    while (cursor) {
      if (cursor.value.timestamp < olderThan) {
        await cursor.delete();
      }
      cursor = await cursor.continue();
    }

    await tx.done;
  }
}