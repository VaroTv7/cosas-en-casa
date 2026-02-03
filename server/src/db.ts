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
      description TEXT,
      parent_id INTEGER,
      photo_url TEXT,
      FOREIGN KEY(parent_id) REFERENCES spaces(id)
    );

    CREATE TABLE IF NOT EXISTS containers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
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

  // v0.3: Migrations for existing databases
  try {
    db.exec(`ALTER TABLE spaces ADD COLUMN description TEXT`);
  } catch (e) { /* Column already exists */ }

  try {
    db.exec(`ALTER TABLE containers ADD COLUMN description TEXT`);
  } catch (e) { /* Column already exists */ }

  // v0.3: Container size support
  try {
    db.exec(`ALTER TABLE container_positions ADD COLUMN width INTEGER DEFAULT 60`);
  } catch (e) { /* Column already exists */ }

  try {
    db.exec(`ALTER TABLE container_positions ADD COLUMN height INTEGER DEFAULT 60`);
  } catch (e) { /* Column already exists */ }

  // v0.4: Categories table
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      icon TEXT,
      color TEXT
    );
  `);

  // v0.4: Insert default categories
  const defaultCategories = [
    { name: 'General', icon: 'package', color: '#6b7280' },
    { name: 'Libros', icon: 'book', color: '#3b82f6' },
    { name: 'Videojuegos', icon: 'gamepad-2', color: '#8b5cf6' },
    { name: 'Electrónica', icon: 'laptop', color: '#10b981' },
    { name: 'Muebles', icon: 'sofa', color: '#f59e0b' },
    { name: 'Ropa', icon: 'shirt', color: '#ec4899' },
    { name: 'Herramientas', icon: 'wrench', color: '#ef4444' },
    { name: 'Arte/Decoración', icon: 'palette', color: '#06b6d4' }
  ];

  const insertCategory = db.prepare(`INSERT OR IGNORE INTO categories (name, icon, color) VALUES (?, ?, ?)`);
  for (const cat of defaultCategories) {
    insertCategory.run(cat.name, cat.icon, cat.color);
  }

  // v0.4: Extended item metadata fields
  const itemMigrations = [
    `ALTER TABLE items ADD COLUMN category_id INTEGER`,
    `ALTER TABLE items ADD COLUMN serial_number TEXT`,
    `ALTER TABLE items ADD COLUMN brand TEXT`,
    `ALTER TABLE items ADD COLUMN model TEXT`,
    `ALTER TABLE items ADD COLUMN purchase_date TEXT`,
    `ALTER TABLE items ADD COLUMN purchase_price REAL`,
    `ALTER TABLE items ADD COLUMN purchase_location TEXT`,
    `ALTER TABLE items ADD COLUMN warranty_months INTEGER`,
    `ALTER TABLE items ADD COLUMN warranty_end TEXT`,
    `ALTER TABLE items ADD COLUMN condition TEXT DEFAULT 'buen_estado'`,
    `ALTER TABLE items ADD COLUMN notes TEXT`,
    // Book fields
    `ALTER TABLE items ADD COLUMN book_author TEXT`,
    `ALTER TABLE items ADD COLUMN book_publisher TEXT`,
    `ALTER TABLE items ADD COLUMN book_year INTEGER`,
    `ALTER TABLE items ADD COLUMN book_pages INTEGER`,
    `ALTER TABLE items ADD COLUMN book_isbn TEXT`,
    `ALTER TABLE items ADD COLUMN book_genre TEXT`,
    // Game fields
    `ALTER TABLE items ADD COLUMN game_platform TEXT`,
    `ALTER TABLE items ADD COLUMN game_developer TEXT`,
    `ALTER TABLE items ADD COLUMN game_publisher TEXT`,
    `ALTER TABLE items ADD COLUMN game_year INTEGER`,
    `ALTER TABLE items ADD COLUMN game_genre TEXT`,
    // Electronics fields
    `ALTER TABLE items ADD COLUMN tech_specs TEXT`,
    `ALTER TABLE items ADD COLUMN tech_manual_url TEXT`
  ];

  for (const migration of itemMigrations) {
    try {
      db.exec(migration);
    } catch (e) { /* Column already exists */ }
  }

  console.log('Database initialized');
};

export default db;
