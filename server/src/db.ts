import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs-extra';

const DB_PATH = path.join(__dirname, '../data/inventory.db');
fs.ensureDirSync(path.dirname(DB_PATH));

const db = new Database(DB_PATH);

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL');

export const initDb = () => {
    db.exec(`
    CREATE TABLE IF NOT EXISTS spaces (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      parent_id INTEGER,
      photo_url TEXT,
      FOREIGN KEY(parent_id) REFERENCES spaces(id)
    );

    CREATE TABLE IF NOT EXISTS containers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      space_id INTEGER,
      photo_url TEXT,
      qr_code TEXT,
      FOREIGN KEY(space_id) REFERENCES spaces(id)
    );

    CREATE TABLE IF NOT EXISTS items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      container_id INTEGER,
      photo_url TEXT,
      quantity INTEGER DEFAULT 1,
      description TEXT,
      tags TEXT,
      expiration_date TEXT,
      qr_code TEXT,
      FOREIGN KEY(container_id) REFERENCES containers(id)
    );
  `);
    console.log('Database initialized');
};

export default db;
