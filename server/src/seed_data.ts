
import Database from 'better-sqlite3';

const db = new Database('./data/inventory.db');

const seedData = () => {
    console.log('Seeding data...');

    // Clear existing data (Optional: remove if you want to append)
    // db.exec('DELETE FROM items');
    // db.exec('DELETE FROM containers');
    // db.exec('DELETE FROM spaces');
    // db.exec('DELETE FROM people');

    // Create Spaces
    const spaces = ['Salón', 'Cocina', 'Garaje', 'Dormitorio'];
    for (const name of spaces) {
        db.prepare('INSERT OR IGNORE INTO spaces (name) VALUES (?)').run(name);
    }

    // Create Containers
    const containers = [
        { name: 'Caja Herramientas', space: 'Garaje' },
        { name: 'Estantería Libros', space: 'Salón' },
        { name: 'Nevera', space: 'Cocina' },
        { name: 'Armario Ropa', space: 'Dormitorio' }
    ];

    for (const c of containers) {
        const spaceId = db.prepare('SELECT id FROM spaces WHERE name = ?').get(c.space) as any;
        if (spaceId) {
            db.prepare('INSERT OR IGNORE INTO containers (name, space_id, photo_url) VALUES (?, ?, ?)').run(c.name, spaceId.id, '');
        }
    }

    // Create People
    const people = ['Juan', 'Maria', 'Pedro', 'Ana'];
    for (const p of people) {
        db.prepare('INSERT OR IGNORE INTO people (name, role) VALUES (?, ?)').run(p, 'Amigo');
    }

    // Create Items
    const items = [
        { name: 'Taladro', container: 'Caja Herramientas', min_quantity: 1, quantity: 1 },
        { name: 'Martillo', container: 'Caja Herramientas', loaned_to: 'Juan', quantity: 1 },
        { name: 'Leche', container: 'Nevera', min_quantity: 2, quantity: 1 }, // Low stock
        { name: 'Libro Ciencia Ficción', container: 'Estantería Libros', quantity: 10 }
    ];

    for (const item of items) {
        const containerId = db.prepare('SELECT id FROM containers WHERE name = ?').get(item.container) as any;
        if (containerId) {
            db.prepare(`
                INSERT INTO items (name, container_id, quantity, min_quantity, loaned_to, description) 
                VALUES (?, ?, ?, ?, ?, ?)
            `).run(
                item.name,
                containerId.id,
                item.quantity,
                item.min_quantity || 0,
                item.loaned_to || null,
                'Item de prueba generado automáticamente'
            );
        }
    }

    console.log('Data seeded successfully!');
};

seedData();
