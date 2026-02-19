import { Player, SavedMatch } from '../types';

const DB_NAME = 'football_balancer_db';
const DB_VERSION = 1;
const STORE_PLAYERS = 'players';
const STORE_HISTORY = 'history';

// Helper to open DB
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_PLAYERS)) {
        db.createObjectStore(STORE_PLAYERS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_HISTORY)) {
        db.createObjectStore(STORE_HISTORY, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
  });
};

// --- Player Operations ---

export const dbGetPlayers = async (): Promise<Player[]> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_PLAYERS, 'readonly');
    const store = transaction.objectStore(STORE_PLAYERS);
    const request = store.getAll();
    
    transaction.oncomplete = () => db.close();
    transaction.onerror = () => db.close();
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      db.close();
      reject(request.error);
    };
  });
};

export const dbAddPlayer = async (player: Player): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_PLAYERS, 'readwrite');
    const store = transaction.objectStore(STORE_PLAYERS);
    const request = store.put(player);
    
    transaction.oncomplete = () => db.close();
    transaction.onerror = () => db.close();
    
    request.onsuccess = () => resolve();
    request.onerror = () => {
      db.close();
      reject(request.error);
    };
  });
};

export const dbUpdatePlayer = async (player: Player): Promise<void> => {
    // put() handles both add and update if key exists
    return dbAddPlayer(player);
};

export const dbDeletePlayer = async (id: string): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_PLAYERS, 'readwrite');
    const store = transaction.objectStore(STORE_PLAYERS);
    const request = store.delete(id);
    
    transaction.oncomplete = () => db.close();
    transaction.onerror = () => db.close();
    
    request.onsuccess = () => resolve();
    request.onerror = () => {
      db.close();
      reject(request.error);
    };
  });
};

// --- History Operations ---

export const dbSaveMatch = async (match: SavedMatch): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_HISTORY, 'readwrite');
    const store = transaction.objectStore(STORE_HISTORY);
    const request = store.add(match);
    
    transaction.oncomplete = () => db.close();
    transaction.onerror = () => db.close();
    
    request.onsuccess = () => resolve();
    request.onerror = () => {
      db.close();
      reject(request.error);
    };
  });
};

export const dbGetHistory = async (): Promise<SavedMatch[]> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_HISTORY, 'readonly');
    const store = transaction.objectStore(STORE_HISTORY);
    const request = store.getAll();
    
    transaction.oncomplete = () => db.close();
    transaction.onerror = () => db.close();
    
    request.onsuccess = () => {
      // Sort by timestamp desc (newest first)
      const matches = request.result as SavedMatch[];
      matches.sort((a, b) => b.timestamp - a.timestamp);
      resolve(matches);
    };
    request.onerror = () => {
      db.close();
      reject(request.error);
    };
  });
};

export const dbDeleteMatch = async (id: string): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_HISTORY, 'readwrite');
    const store = transaction.objectStore(STORE_HISTORY);
    const request = store.delete(id);
    
    transaction.oncomplete = () => db.close();
    transaction.onerror = () => db.close();
    
    request.onsuccess = () => resolve();
    request.onerror = () => {
      db.close();
      reject(request.error);
    };
  });
};

export const dbUpdateMatch = async (match: SavedMatch): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_HISTORY, 'readwrite');
    const store = transaction.objectStore(STORE_HISTORY);
    const request = store.put(match);

    transaction.oncomplete = () => db.close();
    transaction.onerror = () => db.close();

    request.onsuccess = () => resolve();
    request.onerror = () => {
      db.close();
      reject(request.error);
    };
  });
};
