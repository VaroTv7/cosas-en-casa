const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'data/inventory.db');
console.log('Opening DB at:', dbPath);

try {
    const db = new Database(dbPath, { readonly: true });

    // List tables
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    console.log('Tables:', tables.map(t => t.name));

    // Count rows in each table
    tables.forEach(t => {
        if (t.name === 'sqlite_sequence') return;
        try {
            const count = db.prepare(`SELECT count(*) as c FROM ${t.name}`).get();
            console.log(`${t.name}: ${count.c} rows`);
        } catch (e) {
            console.error(`Error counting ${t.name}:`, e.message);
        }
    });

    // Check last item
    try {
        const lastItem = db.prepare("SELECT * FROM items ORDER BY id DESC LIMIT 1").get();
        console.log('Last Item:', lastItem);
    } catch (e) { }

} catch (e) {
    console.error('DB Error:', e);
}
