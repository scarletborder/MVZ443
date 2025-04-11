// indexedDB.ts
import { openDB } from 'idb';

const DB_NAME = 'docsDatabase';
const DB_VERSION = 1;
const STORE_NAME = 'docsContent';

// 打开数据库
const openDocsDB = async () => {
    return openDB(DB_NAME, DB_VERSION, {
        upgrade(db) {
            const store = db.createObjectStore(STORE_NAME, {
                keyPath: 'name',
            });
            store.createIndex('name', 'name');
        },
    });
};

// 将文档内容缓存到 IndexedDB
export const cacheDocContent = async (name: string, content: string) => {
    const db = await openDocsDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    await store.put({ name, content, timestamp: new Date().getTime() });
    await tx.done;
};

// 从 IndexedDB 中获取文档内容
export const getDocContent = async (name: string) => {
    const db = await openDocsDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const doc = await store.get(name);
    await tx.done;
    return doc ? doc.content : null;
};

// 获取所有文档的内容
export const getDocsListFromIndexedDB = async (name: string) => {
    const db = await openDocsDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const doc = await store.get(name);
    await tx.done;
    return doc ? doc.content : null;
};

// 清理过期的文档
export const clearExpiredDocs = async () => {
    const db = await openDocsDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const allDocs = await store.getAll();
    const currentTime = new Date().getTime();

    allDocs.forEach((doc) => {
        if (currentTime - doc.timestamp > 60 * 60 * 1000) {
            store.delete(doc.name); // 删除过期的文档
        }
    });

    await tx.done;
};
