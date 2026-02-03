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

    -- v0.2: Multiple photos per item
    CREATE TABLE IF NOT EXISTS item_photos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_id INTEGER NOT NULL,
      photo_url TEXT NOT NULL,
      is_primary INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(item_id) REFERENCES items(id) ON DELETE CASCADE
    );

    -- v0.2: Floor plan configuration
    CREATE TABLE IF NOT EXISTS floor_plan (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT DEFAULT 'Mi Casa',
      width INTEGER DEFAULT 800,
      height INTEGER DEFAULT 600,
      background_color TEXT DEFAULT '#1a1a2e'
    );

    -- v0.2: Room layouts on floor plan
    CREATE TABLE IF NOT EXISTS room_layouts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      space_id INTEGER NOT NULL UNIQUE,
      x INTEGER DEFAULT 50,
      y INTEGER DEFAULT 50,
      width INTEGER DEFAULT 150,
      height INTEGER DEFAULT 120,
      color TEXT DEFAULT '#2a2a4e',
      FOREIGN KEY(space_id) REFERENCES spaces(id) ON DELETE CASCADE
    );

    -- v0.2: Container positions within rooms
    CREATE TABLE IF NOT EXISTS container_positions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      container_id INTEGER NOT NULL UNIQUE,
      room_layout_id INTEGER,
      x INTEGER DEFAULT 10,
      y INTEGER DEFAULT 10,
      icon TEXT DEFAULT 'box',
      FOREIGN KEY(container_id) REFERENCES containers(id) ON DELETE CASCADE,
      FOREIGN KEY(room_layout_id) REFERENCES room_layouts(id) ON DELETE SET NULL
    );
  `);
  console.log('Database initialized');
};

export default db;
