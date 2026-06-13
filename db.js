// Luna IndexedDB Manager
class LunaDB {
  constructor() {
    this.dbName = 'LunaDB';
    this.version = 1;
    this.db = null;
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Notes store
        if (!db.objectStoreNames.contains('notes')) {
          const notesStore = db.createObjectStore('notes', { keyPath: 'id' });
          notesStore.createIndex('date', 'date', { unique: false });
          notesStore.createIndex('archived', 'archived', { unique: false });
        }

        // Alarms store
        if (!db.objectStoreNames.contains('alarms')) {
          const alarmsStore = db.createObjectStore('alarms', { keyPath: 'id' });
          alarmsStore.createIndex('time', 'time', { unique: false });
          alarmsStore.createIndex('active', 'active', { unique: false });
        }

        // Tasks store
        if (!db.objectStoreNames.contains('tasks')) {
          const tasksStore = db.createObjectStore('tasks', { keyPath: 'id' });
          tasksStore.createIndex('priority', 'priority', { unique: false });
          tasksStore.createIndex('completed', 'completed', { unique: false });
        }

        // Reminders store
        if (!db.objectStoreNames.contains('reminders')) {
          const remindersStore = db.createObjectStore('reminders', { keyPath: 'id' });
          remindersStore.createIndex('dateTime', 'dateTime', { unique: false });
          remindersStore.createIndex('fired', 'fired', { unique: false });
        }

        // Events store (calendar)
        if (!db.objectStoreNames.contains('events')) {
          const eventsStore = db.createObjectStore('events', { keyPath: 'id' });
          eventsStore.createIndex('date', 'date', { unique: false });
        }

        // Conversations store (chat history)
        if (!db.objectStoreNames.contains('conversations')) {
          const conversationsStore = db.createObjectStore('conversations', { keyPath: 'id', autoIncrement: true });
          conversationsStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // Settings store
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      };
    });
  }

  async add(storeName, data) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.add(data);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async put(storeName, data) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(data);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async get(storeName, key) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getAll(storeName) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async delete(storeName, key) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async clear(storeName) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Settings helpers
  async getSetting(key, defaultValue = null) {
    const result = await this.get('settings', key);
    return result ? result.value : defaultValue;
  }

  async setSetting(key, value) {
    return this.put('settings', { key, value });
  }

  // Export all data
  async exportAll() {
    const data = {};
    const stores = ['notes', 'alarms', 'tasks', 'reminders', 'events', 'conversations', 'settings'];
    for (const store of stores) {
      data[store] = await this.getAll(store);
    }
    return {
      version: this.version,
      timestamp: Date.now(),
      data
    };
  }

  // Import all data
  async importAll(importData) {
    if (!importData.data) throw new Error('Invalid import format');

    const stores = ['notes', 'alarms', 'tasks', 'reminders', 'events', 'conversations', 'settings'];
    for (const store of stores) {
      if (importData.data[store]) {
        await this.clear(store);
        for (const item of importData.data[store]) {
          await this.put(store, item);
        }
      }
    }
  }

  // Wipe all data
  async wipeAll() {
    const stores = ['notes', 'alarms', 'tasks', 'reminders', 'events', 'conversations', 'settings'];
    for (const store of stores) {
      await this.clear(store);
    }
  }
}

// Global instance
const lunaDB = new LunaDB();
