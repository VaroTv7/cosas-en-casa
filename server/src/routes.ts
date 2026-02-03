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
    fastify.post('/api/spaces', async (req: FastifyRequest<{ Body: { name: string, description?: string, parent_id?: number } }>, reply) => {
        const { name, description, parent_id } = req.body;
        if (!name) return reply.status(400).send({ error: 'Nombre requerido' });
        const result = db.prepare('INSERT INTO spaces (name, description, parent_id) VALUES (?, ?, ?)').run(name, description || null, parent_id || null);
        return { id: result.lastInsertRowid };
    });

    // POST Container (Multipart)
    fastify.post('/api/containers', async (req, reply) => {
        const parts = req.parts();
        let name: string | undefined, description: string | undefined, space_id: number | undefined, photo_url: string | null | undefined;

        for await (const part of parts) {
            if (part.type === 'file') {
                photo_url = await saveImage(part);
            } else {
                if (part.fieldname === 'name') name = (part.value as string);
                if (part.fieldname === 'description') description = (part.value as string);
                if (part.fieldname === 'space_id') space_id = parseInt(part.value as string);
            }
        }

        if (!name) return reply.status(400).send({ error: 'Falta el nombre' });

        const result = db.prepare('INSERT INTO containers (name, description, space_id, photo_url) VALUES (?, ?, ?, ?)').run(name, description || null, space_id || null, photo_url);
        return { id: result.lastInsertRowid, photo_url };
    });

    // POST Item (Multipart with extended metadata)
    fastify.post('/api/items', async (req, reply) => {
        const parts = req.parts();
        const fields: Record<string, any> = {};
        let photo_url: string | null = null;

        for await (const part of parts) {
            if (part.type === 'file') {
                photo_url = await saveImage(part);
            } else {
                fields[part.fieldname] = part.value as string;
            }
        }

        const name = fields.name;
        const container_id = fields.container_id ? parseInt(fields.container_id) : null;
        if (!name || !container_id) return reply.status(400).send({ error: 'Falta nombre o ID de contenedor' });

        const stmt = db.prepare(`
            INSERT INTO items (
                name, container_id, quantity, description, tags, expiration_date, photo_url,
                category_id, serial_number, brand, model, purchase_date, purchase_price, purchase_location,
                warranty_months, warranty_end, condition, notes,
                book_author, book_publisher, book_year, book_pages, book_isbn, book_genre,
                game_platform, game_developer, game_publisher, game_year, game_genre,
                tech_specs, tech_manual_url
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        const result = stmt.run(
            name, container_id,
            fields.quantity ? parseInt(fields.quantity) : 1,
            fields.description || null, fields.tags || null, fields.expiration_date || null, photo_url,
            fields.category_id ? parseInt(fields.category_id) : null,
            fields.serial_number || null, fields.brand || null, fields.model || null,
            fields.purchase_date || null,
            fields.purchase_price ? parseFloat(fields.purchase_price) : null,
            fields.purchase_location || null,
            fields.warranty_months ? parseInt(fields.warranty_months) : null,
            fields.warranty_end || null,
            fields.condition || 'buen_estado',
            fields.notes || null,
            fields.book_author || null, fields.book_publisher || null,
            fields.book_year ? parseInt(fields.book_year) : null,
            fields.book_pages ? parseInt(fields.book_pages) : null,
            fields.book_isbn || null, fields.book_genre || null,
            fields.game_platform || null, fields.game_developer || null, fields.game_publisher || null,
            fields.game_year ? parseInt(fields.game_year) : null,
            fields.game_genre || null,
            fields.tech_specs || null, fields.tech_manual_url || null
        );
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
    fastify.put('/api/spaces/:id', async (req: FastifyRequest<{ Params: { id: string }, Body: { name: string, description?: string, parent_id?: number } }>, reply) => {
        const { id } = req.params;
        const { name, description, parent_id } = req.body;

        if (!name) return reply.status(400).send({ error: 'Nombre requerido' });

        const result = db.prepare('UPDATE spaces SET name = ?, description = ?, parent_id = ? WHERE id = ?').run(name, description || null, parent_id || null, id);

        if (result.changes === 0) return reply.status(404).send({ error: 'Espacio no encontrado' });
        return { success: true };
    });

    fastify.put('/api/containers/:id', async (req, reply) => {
        const { id } = (req.params as { id: string });
        const parts = req.parts();
        let name: string | undefined, description: string | undefined, space_id: number | undefined, photo_url: string | null | undefined;

        // Get current container to preserve photo if not updated
        const currentContainer = db.prepare('SELECT photo_url FROM containers WHERE id = ?').get(id) as { photo_url: string };
        if (!currentContainer) return reply.status(404).send({ error: 'Contenedor no encontrado' });
        photo_url = currentContainer.photo_url;

        for await (const part of parts) {
            if (part.type === 'file') {
                photo_url = await saveImage(part);
            } else {
                if (part.fieldname === 'name') name = (part.value as string);
                if (part.fieldname === 'description') description = (part.value as string);
                if (part.fieldname === 'space_id') space_id = parseInt(part.value as string);
            }
        }

        const updates: string[] = [];
        const values: any[] = [];

        if (name) { updates.push('name = ?'); values.push(name); }
        if (description !== undefined) { updates.push('description = ?'); values.push(description || null); }
        if (space_id) { updates.push('space_id = ?'); values.push(space_id); }
        if (photo_url) { updates.push('photo_url = ?'); values.push(photo_url); }

        if (updates.length === 0) return { success: true, message: 'Nada que actualizar' };

        values.push(id);
        db.prepare(`UPDATE containers SET ${updates.join(', ')} WHERE id = ?`).run(...values);

        return { success: true };
    });

    // ==================== v0.5 People API ====================
    fastify.get('/api/people', async () => {
        return db.prepare('SELECT * FROM people ORDER BY name ASC').all();
    });

    fastify.post('/api/people', async (request, reply) => {
        const { name, role, contact_info } = request.body as { name: string, role?: string, contact_info?: string };
        try {
            const result = db.prepare('INSERT INTO people (name, role, contact_info) VALUES (?, ?, ?)').run(name, role || 'Amigo', contact_info);
            return { id: result.lastInsertRowid, name, role, contact_info };
        } catch (error: any) {
            if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
                return reply.code(409).send({ error: 'Person already exists' });
            }
            throw error;
        }
    });

    fastify.put('/api/people/:id', async (request, reply) => {
         const { id } = request.params as { id: string };
         const { name, role, contact_info } = request.body as { name: string, role?: string, contact_info?: string };
         try {
             const result = db.prepare('UPDATE people SET name = ?, role = ?, contact_info = ? WHERE id = ?').run(name, role, contact_info, id);
             if (result.changes === 0) return reply.code(404).send({ error: 'Person not found' });
             return { success: true };
         } catch (error: any) {
             if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
                 return reply.code(409).send({ error: 'Name already taken' });
             }
             throw error;
         }
    });

    fastify.delete('/api/people/:id', async (request, reply) => {
        const { id } = request.params as { id: string };
        const result = db.prepare('DELETE FROM people WHERE id = ?').run(id);
        if (result.changes === 0) return reply.code(404).send({ error: 'Person not found' });
        return { success: true };
    });

    fastify.put('/api/items/:id', async (req, reply) => {
        const { id } = (req.params as { id: string });
        const parts = req.parts();
        const fields: Record<string, any> = {};
        let photo_url: string | null | undefined;

        // Get current item to preserve photo if not updated
        const currentItem = db.prepare('SELECT photo_url FROM items WHERE id = ?').get(id) as { photo_url: string };
        if (!currentItem) return reply.status(404).send({ error: 'Ítem no encontrado' });
        photo_url = currentItem.photo_url;

        for await (const part of parts) {
            if (part.type === 'file') {
                photo_url = await saveImage(part);
            } else {
                fields[part.fieldname] = part.value as string;
            }
        }

        // Build dynamic update
        const updates: string[] = [];
        const values: any[] = [];

        const addField = (dbField: string, value: any, parser?: (v: string) => any) => {
            if (value !== undefined) {
                updates.push(`${dbField} = ?`);
                values.push(value === '' ? null : (parser ? parser(value) : value));
            }
        };

        // Basic fields
        addField('name', fields.name);
        addField('container_id', fields.container_id, parseInt);
        addField('quantity', fields.quantity, parseInt);
        addField('description', fields.description);
        addField('tags', fields.tags);
        addField('expiration_date', fields.expiration_date);
        if (photo_url !== currentItem.photo_url) { updates.push('photo_url = ?'); values.push(photo_url); }

        // v0.4 Extended fields
        addField('category_id', fields.category_id, parseInt);
        addField('serial_number', fields.serial_number);
        addField('brand', fields.brand);
        addField('model', fields.model);
        addField('purchase_date', fields.purchase_date);
        addField('purchase_price', fields.purchase_price, parseFloat);
        addField('purchase_location', fields.purchase_location);
        addField('warranty_months', fields.warranty_months, parseInt);
        addField('warranty_end', fields.warranty_end);
        addField('condition', fields.condition);
        addField('notes', fields.notes);

        // Book fields
        addField('book_author', fields.book_author);
        addField('book_publisher', fields.book_publisher);
        addField('book_year', fields.book_year, parseInt);
        addField('book_pages', fields.book_pages, parseInt);
        addField('book_isbn', fields.book_isbn);
        addField('book_genre', fields.book_genre);

        // Game fields
        addField('game_platform', fields.game_platform);
        addField('game_developer', fields.game_developer);
        addField('game_publisher', fields.game_publisher);
        addField('game_year', fields.game_year, parseInt);
        addField('game_genre', fields.game_genre);

        // Tech fields
        addField('tech_specs', fields.tech_specs);
        addField('tech_manual_url', fields.tech_manual_url);

        if (updates.length === 0) return { success: true, message: 'Nada que actualizar' };

        values.push(id);
        db.prepare(`UPDATE items SET ${updates.join(', ')} WHERE id = ?`).run(...values);

        return { success: true };
    });

    // v0.5: Bulk Operations
    fastify.post('/api/items/bulk-move', async (request, reply) => {
        const { itemIds, targetContainerId } = request.body as { itemIds: number[], targetContainerId: number };

        if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
            return reply.code(400).send({ error: 'No items selected' });
        }

        const updateStmt = db.prepare('UPDATE items SET container_id = ? WHERE id = ?');

        const transaction = db.transaction((ids: number[], containerId: number) => {
            for (const id of ids) {
                updateStmt.run(containerId, id);
            }
        });

        try {
            transaction(itemIds, targetContainerId);
            reply.send({ success: true, count: itemIds.length });
        } catch (error) {
            console.error('Bulk move error:', error);
            reply.code(500).send({ error: 'Failed to move items' });
        }
    });

    fastify.post('/api/items/bulk-delete', async (request, reply) => {
        const { itemIds } = request.body as { itemIds: number[] };

        if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
            return reply.code(400).send({ error: 'No items selected' });
        }

        const deleteStmt = db.prepare('DELETE FROM items WHERE id = ?');
        const deletePhotosStmt = db.prepare('DELETE FROM item_photos WHERE item_id = ?');

        const transaction = db.transaction((ids: number[]) => {
            for (const id of ids) {
                deletePhotosStmt.run(id);
                deleteStmt.run(id);
            }
        });

        try {
            transaction(itemIds);
            reply.send({ success: true, count: itemIds.length });
        } catch (error) {
            console.error('Bulk delete error:', error);
            reply.code(500).send({ error: 'Failed to delete items' });
        }
    });

    // ==================== v0.2 APIs ====================

    // GET Item by ID with photos (Useful for QR scanning) - Enhanced
    fastify.get('/api/items/:id/full', async (req: FastifyRequest<{ Params: { id: string } }>, reply) => {
        const { id } = req.params;
        const item = db.prepare('SELECT * FROM items WHERE id = ?').get(id) as any;
        if (!item) return reply.status(404).send({ error: 'Ítem no encontrado' });

        const photos = db.prepare('SELECT * FROM item_photos WHERE item_id = ? ORDER BY is_primary DESC, id ASC').all(id);
        return { ...item, photos };
    });

    // --- Item Photos ---
    fastify.get('/api/items/:id/photos', async (req: FastifyRequest<{ Params: { id: string } }>) => {
        const { id } = req.params;
        return db.prepare('SELECT * FROM item_photos WHERE item_id = ? ORDER BY is_primary DESC, id ASC').all(id);
    });

    fastify.post('/api/items/:id/photos', async (req, reply) => {
        const { id } = (req.params as { id: string });
        const parts = req.parts();
        let photo_url = null;

        for await (const part of parts) {
            if (part.type === 'file') {
                photo_url = await saveImage(part);
            }
        }

        if (!photo_url) return reply.status(400).send({ error: 'No se recibió imagen' });

        // Check max photos (limit 10)
        const count = db.prepare('SELECT count(*) as count FROM item_photos WHERE item_id = ?').get(id) as { count: number };
        if (count.count >= 10) return reply.status(400).send({ error: 'Máximo 10 fotos por ítem' });

        const result = db.prepare('INSERT INTO item_photos (item_id, photo_url, is_primary) VALUES (?, ?, ?)').run(id, photo_url, count.count === 0 ? 1 : 0);
        return { id: result.lastInsertRowid, photo_url };
    });

    fastify.delete('/api/items/:itemId/photos/:photoId', async (req: FastifyRequest<{ Params: { itemId: string, photoId: string } }>, reply) => {
        const { itemId, photoId } = req.params;
        const result = db.prepare('DELETE FROM item_photos WHERE id = ? AND item_id = ?').run(photoId, itemId);
        if (result.changes === 0) return reply.status(404).send({ error: 'Foto no encontrada' });
        return { success: true };
    });

    fastify.put('/api/items/:itemId/photos/:photoId/primary', async (req: FastifyRequest<{ Params: { itemId: string, photoId: string } }>, reply) => {
        const { itemId, photoId } = req.params;
        // Clear all primaries for this item, then set the new one
        db.prepare('UPDATE item_photos SET is_primary = 0 WHERE item_id = ?').run(itemId);
        const result = db.prepare('UPDATE item_photos SET is_primary = 1 WHERE id = ? AND item_id = ?').run(photoId, itemId);
        if (result.changes === 0) return reply.status(404).send({ error: 'Foto no encontrada' });
        return { success: true };
    });

    // --- Floor Plan ---
    fastify.get('/api/floor-plan', async () => {
        // Ensure a floor plan exists
        let plan = db.prepare('SELECT * FROM floor_plan LIMIT 1').get() as any;
        if (!plan) {
            db.prepare('INSERT INTO floor_plan DEFAULT VALUES').run();
            plan = db.prepare('SELECT * FROM floor_plan LIMIT 1').get();
        }

        const rooms = db.prepare(`
            SELECT rl.*, s.name as space_name 
            FROM room_layouts rl 
            JOIN spaces s ON rl.space_id = s.id
        `).all() as any[];

        const containers = db.prepare(`
            SELECT cp.*, c.name as container_name, c.space_id
            FROM container_positions cp
            JOIN containers c ON cp.container_id = c.id
        `).all() as any[];

        return { plan, rooms, containers };
    });

    fastify.put('/api/floor-plan', async (req: FastifyRequest<{ Body: { name?: string, width?: number, height?: number, background_color?: string } }>) => {
        const { name, width, height, background_color } = req.body;

        const updates: string[] = [];
        const values: any[] = [];
        if (name) { updates.push('name = ?'); values.push(name); }
        if (width) { updates.push('width = ?'); values.push(width); }
        if (height) { updates.push('height = ?'); values.push(height); }
        if (background_color) { updates.push('background_color = ?'); values.push(background_color); }

        if (updates.length > 0) {
            db.prepare(`UPDATE floor_plan SET ${updates.join(', ')} WHERE id = 1`).run(...values);
        }
        return { success: true };
    });

    // --- Room Layouts ---
    fastify.post('/api/room-layouts', async (req: FastifyRequest<{ Body: { space_id: number, x?: number, y?: number, width?: number, height?: number, color?: string } }>, reply) => {
        const { space_id, x, y, width, height, color } = req.body;
        if (!space_id) return reply.status(400).send({ error: 'space_id requerido' });

        // Check if layout already exists for this space
        const existing = db.prepare('SELECT id FROM room_layouts WHERE space_id = ?').get(space_id);
        if (existing) return reply.status(400).send({ error: 'Este espacio ya tiene un layout' });

        const result = db.prepare(`
            INSERT INTO room_layouts (space_id, x, y, width, height, color) 
            VALUES (?, ?, ?, ?, ?, ?)
        `).run(space_id, x || 50, y || 50, width || 150, height || 120, color || '#2a2a4e');
        return { id: result.lastInsertRowid };
    });

    fastify.put('/api/room-layouts/:id', async (req: FastifyRequest<{ Params: { id: string }, Body: { x?: number, y?: number, width?: number, height?: number, color?: string } }>, reply) => {
        const { id } = req.params;
        const { x, y, width, height, color } = req.body;

        const updates: string[] = [];
        const values: any[] = [];
        if (x !== undefined) { updates.push('x = ?'); values.push(x); }
        if (y !== undefined) { updates.push('y = ?'); values.push(y); }
        if (width !== undefined) { updates.push('width = ?'); values.push(width); }
        if (height !== undefined) { updates.push('height = ?'); values.push(height); }
        if (color) { updates.push('color = ?'); values.push(color); }

        if (updates.length === 0) return { success: true };

        values.push(id);
        const result = db.prepare(`UPDATE room_layouts SET ${updates.join(', ')} WHERE id = ?`).run(...values);
        if (result.changes === 0) return reply.status(404).send({ error: 'Layout no encontrado' });
        return { success: true };
    });

    fastify.delete('/api/room-layouts/:id', async (req: FastifyRequest<{ Params: { id: string } }>, reply) => {
        const { id } = req.params;
        const result = db.prepare('DELETE FROM room_layouts WHERE id = ?').run(id);
        if (result.changes === 0) return reply.status(404).send({ error: 'Layout no encontrado' });
        return { success: true };
    });

    // --- Container Positions ---
    fastify.post('/api/container-positions', async (req: FastifyRequest<{ Body: { container_id: number, room_layout_id?: number, x?: number, y?: number, width?: number, height?: number, icon?: string } }>, reply) => {
        const { container_id, room_layout_id, x, y, width, height, icon } = req.body;
        if (!container_id) return reply.status(400).send({ error: 'container_id requerido' });

        // Check if position already exists
        const existing = db.prepare('SELECT id FROM container_positions WHERE container_id = ?').get(container_id);
        if (existing) return reply.status(400).send({ error: 'Este contenedor ya tiene posición' });

        const result = db.prepare(`
            INSERT INTO container_positions (container_id, room_layout_id, x, y, width, height, icon) 
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(container_id, room_layout_id || null, x || 10, y || 10, width || 60, height || 60, icon || 'box');
        return { id: result.lastInsertRowid };
    });

    fastify.put('/api/container-positions/:id', async (req: FastifyRequest<{ Params: { id: string }, Body: { room_layout_id?: number, x?: number, y?: number, width?: number, height?: number, icon?: string } }>, reply) => {
        const { id } = req.params;
        const { room_layout_id, x, y, width, height, icon } = req.body;

        const updates: string[] = [];
        const values: any[] = [];
        if (room_layout_id !== undefined) { updates.push('room_layout_id = ?'); values.push(room_layout_id); }
        if (x !== undefined) { updates.push('x = ?'); values.push(x); }
        if (y !== undefined) { updates.push('y = ?'); values.push(y); }
        if (width !== undefined) { updates.push('width = ?'); values.push(width); }
        if (height !== undefined) { updates.push('height = ?'); values.push(height); }
        if (icon) { updates.push('icon = ?'); values.push(icon); }

        if (updates.length === 0) return { success: true };

        values.push(id);
        const result = db.prepare(`UPDATE container_positions SET ${updates.join(', ')} WHERE id = ?`).run(...values);
        if (result.changes === 0) return reply.status(404).send({ error: 'Posición no encontrada' });
        return { success: true };
    });

    fastify.delete('/api/container-positions/:id', async (req: FastifyRequest<{ Params: { id: string } }>, reply) => {
        const { id } = req.params;
        const result = db.prepare('DELETE FROM container_positions WHERE id = ?').run(id);
        if (result.changes === 0) return reply.status(404).send({ error: 'Posición no encontrada' });
        return { success: true };
    });

    // ==================== v0.4 Categories API ====================

    // GET all categories
    fastify.get('/api/categories', async () => {
        return db.prepare('SELECT * FROM categories ORDER BY name').all();
    });

    // POST create category
    fastify.post('/api/categories', async (req: FastifyRequest<{ Body: { name: string, icon?: string, color?: string } }>, reply) => {
        const { name, icon, color } = req.body;
        if (!name) return reply.status(400).send({ error: 'Nombre requerido' });

        try {
            const result = db.prepare('INSERT INTO categories (name, icon, color) VALUES (?, ?, ?)').run(name, icon || 'package', color || '#6b7280');
            return { id: result.lastInsertRowid };
        } catch (err: any) {
            if (err.message?.includes('UNIQUE')) {
                return reply.status(400).send({ error: 'La categoría ya existe' });
            }
            throw err;
        }
    });

    // PUT update category
    fastify.put('/api/categories/:id', async (req: FastifyRequest<{ Params: { id: string }, Body: { name?: string, icon?: string, color?: string } }>, reply) => {
        const { id } = req.params;
        const { name, icon, color } = req.body;

        const updates: string[] = [];
        const values: any[] = [];
        if (name) { updates.push('name = ?'); values.push(name); }
        if (icon) { updates.push('icon = ?'); values.push(icon); }
        if (color) { updates.push('color = ?'); values.push(color); }

        if (updates.length === 0) return { success: true };

        values.push(id);
        const result = db.prepare(`UPDATE categories SET ${updates.join(', ')} WHERE id = ?`).run(...values);
        if (result.changes === 0) return reply.status(404).send({ error: 'Categoría no encontrada' });
        return { success: true };
    });

    // DELETE category
    fastify.delete('/api/categories/:id', async (req: FastifyRequest<{ Params: { id: string } }>, reply) => {
        const { id } = req.params;
        // Don't allow deleting if items use this category
        const itemCount = db.prepare('SELECT count(*) as count FROM items WHERE category_id = ?').get(id) as { count: number };
        if (itemCount.count > 0) {
            return reply.status(400).send({ error: `Hay ${itemCount.count} objetos usando esta categoría` });
        }

        const result = db.prepare('DELETE FROM categories WHERE id = ?').run(id);
        if (result.changes === 0) return reply.status(404).send({ error: 'Categoría no encontrada' });
        return { success: true };
    });
}
