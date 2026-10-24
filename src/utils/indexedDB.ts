import type { SeismicEventRecord } from '../types/seismic';

const DB_NAME = 'SentryQuakeDB';
const DB_VERSION = 1;
const STORE_NAME = 'seismic_events';
const LOCAL_STORAGE_KEY = 'sentryquake_events_backup';

class SeismicEventDatabase {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private async openDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    if (typeof window === 'undefined' || !window.indexedDB) {
      throw new Error('IndexedDB not supported in this environment');
    }

    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('peakG', 'peakG', { unique: false });
          store.createIndex('type', 'type', { unique: false });
        }
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });

    return this.dbPromise;
  }

  /**
   * Save a seismic event record into IndexedDB with LocalStorage fallback
   */
  public async saveEvent(record: SeismicEventRecord): Promise<void> {
    try {
      const db = await this.openDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(record);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch {
      // LocalStorage fallback if IndexedDB fails or is restricted in private browsing
      try {
        const existing = this.getLocalStorageEvents();
        existing.unshift(record);
        // Keep latest 100 in LocalStorage to prevent quota exceeded error
        const trimmed = existing.slice(0, 100);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(trimmed));
      } catch {
        // Silent fail if local storage is also full
      }
    }
  }

  /**
   * Retrieve all logged events, sorted in reverse chronological order
   */
  public async getAllEvents(): Promise<SeismicEventRecord[]> {
    try {
      const db = await this.openDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const index = store.index('timestamp');
        const request = index.openCursor(null, 'prev'); // Most recent first
        const results: SeismicEventRecord[] = [];

        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
          if (cursor && results.length < 250) {
            // Cap at 250 records to prevent memory bloat in continuous runtime
            results.push(cursor.value);
            cursor.continue();
          } else {
            resolve(results);
          }
        };

        request.onerror = () => reject(request.error);
      });
    } catch {
      return this.getLocalStorageEvents();
    }
  }

  /**
   * Delete an event by ID
   */
  public async deleteEvent(id: string): Promise<void> {
    try {
      const db = await this.openDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(id);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch {
      const existing = this.getLocalStorageEvents().filter((e) => e.id !== id);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(existing));
    }
  }

  /**
   * Clear all logged events
   */
  public async clearAll(): Promise<void> {
    try {
      const db = await this.openDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.clear();

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    }
  }

  /**
   * Export all logged events as formatted JSON file
   */
  public async exportAsJSON(): Promise<void> {
    const events = await this.getAllEvents();
    const dataStr = JSON.stringify(events, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    const dateStr = new Date().toISOString().split('T')[0];
    a.download = `sentryquake_events_${dateStr}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  private getLocalStorageEvents(): SeismicEventRecord[] {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }
}

export const seismicDB = new SeismicEventDatabase();
