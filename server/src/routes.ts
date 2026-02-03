import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import db from './db';
import path from 'path';
import sharp from 'sharp';
import { randomUUID } from 'crypto';

const UPLOADS_DIR = path.join(__dirname, '../uploads');

function getInventoryTree() {
    const spaces = db.prepare('SELECT * FROM spaces').all() as any[];
    const containers = db.prepare('SELECT * FROM containers').all() as any[];
    const items = db.prepare('SELECT * FROM items').all() as any[];

    // Simple nested structure builder
    const spaceMap = new Map();
    spaces.forEach(s => spaceMap.set(s.id, { ...s, containers: [] }));

    containers.forEach(c => {
        const space = spaceMap.get(c.space_id);
        if (space) {
            space.containers.push({ ...c, items: items.filter((i: any) => i.container_id === c.id) });
        }
    });

    return Array.from(spaceMap.values());
}

export default async function routes(fastify: FastifyInstance) {

    // Helper: Process and save image
    const saveImage = async (data: any): Promise<string | null> => {
        if (!data) return null;
        const filename = `${randomUUID()}.webp`;
        const filepath = path.join(UPLOADS_DIR, filename);

        try {
            const buffer = await data.toBuffer();
            await sharp(buffer)
                .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
                .webp({ quality: 80 })
                .toFile(filepath);
            return `/uploads/${filename}`;
        } catch (err) {
            console.error('Image processing error:', err);
            return null;
        }
    };

    // GET Inventory
    fastify.get('/api/inventory', async () => {
        return getInventoryTree();
    });

    // POST Space
    fastify.post('/api/spaces', async (req: FastifyRequest<{ Body: { name: string, parent_id?: number } }>, reply) => {
        const { name, parent_id } = req.body;
        if (!name) return reply.status(400).send({ error: 'Nombre requerido' });
        const result = db.prepare('INSERT INTO spaces (name, parent_id) VALUES (?, ?)').run(name, parent_id || null);
        return { id: result.lastInsertRowid };
    });

    // POST Container (Multipart)
    fastify.post('/api/containers', async (req, reply) => {
        const parts = req.parts();
        let name, space_id, photo_url;

        for await (const part of parts) {
            if (part.type === 'file') {
                photo_url = await saveImage(part);
            } else {
                if (part.fieldname === 'name') name = (part.value as string);
                if (part.fieldname === 'space_id') space_id = parseInt(part.value as string);
            }
        }

        if (!name || !space_id) return reply.status(400).send({ error: 'Faltan campos (nombre o espacio)' });

        const result = db.prepare('INSERT INTO containers (name, space_id, photo_url) VALUES (?, ?, ?)').run(name, space_id, photo_url);
        return { id: result.lastInsertRowid, photo_url };
    });

    // POST Item (Multipart)
    fastify.post('/api/items', async (req, reply) => {
        const parts = req.parts();
        let name, container_id, quantity, description, tags, expiration_date, photo_url;

        for await (const part of parts) {
            if (part.type === 'file') {
                photo_url = await saveImage(part);
            } else {
                const val = (part.value as string);
                if (part.fieldname === 'name') name = val;
                if (part.fieldname === 'container_id') container_id = parseInt(val);
                if (part.fieldname === 'quantity') quantity = parseInt(val);
                if (part.fieldname === 'description') description = val;
                if (part.fieldname === 'tags') tags = val;
                if (part.fieldname === 'expiration_date') expiration_date = val;
            }
        }

        if (!name || !container_id) return reply.status(400).send({ error: 'Falta nombre o ID de contenedor' });

        const stmt = db.prepare(`
            INSERT INTO items (name, container_id, quantity, description, tags, expiration_date, photo_url)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        const result = stmt.run(name, container_id, quantity || 1, description, tags, expiration_date, photo_url);
        return { id: result.lastInsertRowid, photo_url };
    });

    // Search
    fastify.get('/api/search', async (req: FastifyRequest<{ Querystring: { q: string } }>) => {
        const { q } = req.query;
        if (!q) return [];
        // Simple LIKE search for now
        const items = db.prepare('SELECT * FROM items WHERE name LIKE ? OR tags LIKE ?').all(`%${q}%`, `%${q}%`);
        return items;
    });

    // GET Item by ID (Useful for QR scanning)
    fastify.get('/api/items/:id', async (req: FastifyRequest<{ Params: { id: string } }>, reply) => {
        const { id } = req.params;
        const item = db.prepare('SELECT * FROM items WHERE id = ?').get(id);
        if (!item) return reply.status(404).send({ error: 'Ítem no encontrado' });
        return item;
    });

    // DELETE Routes
    fastify.delete('/api/items/:id', async (req: FastifyRequest<{ Params: { id: string } }>, reply) => {
        const { id } = req.params;
        const result = db.prepare('DELETE FROM items WHERE id = ?').run(id);
        if (result.changes === 0) return reply.status(404).send({ error: 'Ítem no encontrado' });
        return { success: true };
    });

    fastify.delete('/api/containers/:id', async (req: FastifyRequest<{ Params: { id: string } }>, reply) => {
        const { id } = req.params;
        // Check for items first? For now, CASCADE or just delete orphans. SQLite default is usually no cascade unless configured.
        // Let's manually delete items for safety or error if not empty.
        const items = db.prepare('SELECT count(*) as count FROM items WHERE container_id = ?').get(id) as { count: number };
        if (items.count > 0) return reply.status(400).send({ error: 'El contenedor no está vacío' });

        const result = db.prepare('DELETE FROM containers WHERE id = ?').run(id);
        if (result.changes === 0) return reply.status(404).send({ error: 'Contenedor no encontrado' });
        return { success: true };
    });

    fastify.delete('/api/spaces/:id', async (req: FastifyRequest<{ Params: { id: string } }>, reply) => {
        const { id } = req.params;
        const containers = db.prepare('SELECT count(*) as count FROM containers WHERE space_id = ?').get(id) as { count: number };
        if (containers.count > 0) return reply.status(400).send({ error: 'El espacio no está vacío' });

        const result = db.prepare('DELETE FROM spaces WHERE id = ?').run(id);
        if (result.changes === 0) return reply.status(404).send({ error: 'Espacio no encontrado' });
        return { success: true };
    });

    // PUT Routes (Update)
    fastify.put('/api/spaces/:id', async (req: FastifyRequest<{ Params: { id: string }, Body: { name: string, parent_id?: number } }>, reply) => {
        const { id } = req.params;
        const { name, parent_id } = req.body;

        if (!name) return reply.status(400).send({ error: 'Nombre requerido' });

        const result = db.prepare('UPDATE spaces SET name = ?, parent_id = ? WHERE id = ?').run(name, parent_id || null, id);

        if (result.changes === 0) return reply.status(404).send({ error: 'Espacio no encontrado' });
        return { success: true };
    });

    fastify.put('/api/containers/:id', async (req, reply) => {
        const { id } = (req.params as { id: string });
        const parts = req.parts();
        let name, space_id, photo_url;

        // Get current container to preserve photo if not updated
        const currentContainer = db.prepare('SELECT photo_url FROM containers WHERE id = ?').get(id) as { photo_url: string };
        if (!currentContainer) return reply.status(404).send({ error: 'Contenedor no encontrado' });
        photo_url = currentContainer.photo_url;

        for await (const part of parts) {
            if (part.type === 'file') {
                photo_url = await saveImage(part);
            } else {
                if (part.fieldname === 'name') name = (part.value as string);
                if (part.fieldname === 'space_id') space_id = parseInt(part.value as string);
            }
        }

        const updates: string[] = [];
        const values: any[] = [];

        if (name) { updates.push('name = ?'); values.push(name); }
        if (space_id) { updates.push('space_id = ?'); values.push(space_id); }
        if (photo_url) { updates.push('photo_url = ?'); values.push(photo_url); }

        if (updates.length === 0) return { success: true, message: 'Nada que actualizar' };

        values.push(id);
        db.prepare(`UPDATE containers SET ${updates.join(', ')} WHERE id = ?`).run(...values);

        return { success: true };
    });
    fastify.put('/api/items/:id', async (req, reply) => {
        const { id } = (req.params as { id: string });
        const parts = req.parts();
        let name, container_id, quantity, description, tags, expiration_date, photo_url;

        // Get current item to preserve photo if not updated
        const currentItem = db.prepare('SELECT photo_url FROM items WHERE id = ?').get(id) as { photo_url: string };
        if (!currentItem) return reply.status(404).send({ error: 'Ítem no encontrado' });
        photo_url = currentItem.photo_url;

        for await (const part of parts) {
            if (part.type === 'file') {
                photo_url = await saveImage(part);
            } else {
                const val = (part.value as string);
                if (part.fieldname === 'name') name = val;
                if (part.fieldname === 'container_id') container_id = parseInt(val);
                if (part.fieldname === 'quantity') quantity = parseInt(val);
                if (part.fieldname === 'description') description = val;
                if (part.fieldname === 'tags') tags = val;
                if (part.fieldname === 'expiration_date') expiration_date = val;
            }
        }

        // Dynamic update query
        const updates: string[] = [];
        const values: any[] = [];

        if (name) { updates.push('name = ?'); values.push(name); }
        if (container_id) { updates.push('container_id = ?'); values.push(container_id); }
        if (quantity) { updates.push('quantity = ?'); values.push(quantity); }
        if (description !== undefined) { updates.push('description = ?'); values.push(description); }
        if (tags !== undefined) { updates.push('tags = ?'); values.push(tags); }
        if (expiration_date !== undefined) { updates.push('expiration_date = ?'); values.push(expiration_date); }
        if (photo_url) { updates.push('photo_url = ?'); values.push(photo_url); }

        if (updates.length === 0) return { success: true, message: 'Nada que actualizar' };

        values.push(id);
        db.prepare(`UPDATE items SET ${updates.join(', ')} WHERE id = ?`).run(...values);

        return { success: true };
    });
}
