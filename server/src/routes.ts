import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import db from './db';
import path from 'path';
import sharp from 'sharp';
import { randomUUID } from 'crypto';

const UPLOADS_DIR = path.join(__dirname, '../uploads');

function getInventoryTree() {
    const spaces = db.prepare('SELECT * FROM spaces').all() as any[];
    const furnitures = db.prepare('SELECT * FROM furnitures').all() as any[];
    const containers = db.prepare('SELECT * FROM containers').all() as any[];
    const items = db.prepare('SELECT * FROM items').all() as any[];

    // Build nested structure: Space -> Furniture[] -> Container[] -> Item[]
    // Containers can be in a furniture OR directly in a space (furniture_id = null)

    const spaceMap = new Map();
    spaces.forEach(s => spaceMap.set(s.id, { ...s, furnitures: [], containers: [] }));

    // Assign furnitures to spaces
    furnitures.forEach(f => {
        const space = spaceMap.get(f.space_id);
        if (space) {
            space.furnitures.push({ ...f, containers: [] });
        }
    });

    // Assign containers to furnitures or directly to spaces
    containers.forEach(c => {
        const containerWithItems = { ...c, items: items.filter((i: any) => i.container_id == c.id) };

        if (c.furniture_id) {
            // Container is in a furniture
            let placed = false;
            for (const space of spaceMap.values()) {
                const furniture = space.furnitures.find((f: any) => f.id == c.furniture_id);
                if (furniture) {
                    furniture.containers.push(containerWithItems);
                    placed = true;
                    break;
                }
            }
            if (!placed) console.warn(`Container ${c.id} (${c.name}) has furniture_id ${c.furniture_id} but furniture not found.`);
        } else if (c.space_id) {
            // Container is directly in a space (no furniture)
            const space = spaceMap.get(c.space_id);
            if (space) {
                space.containers.push(containerWithItems);
            }
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
    fastify.post('/api/spaces', {
        schema: {
            body: {
                type: 'object',
                required: ['name'],
                properties: {
                    name: { type: 'string', minLength: 1 },
                    description: { type: 'string' },
                    parent_id: { type: 'number' },
                    icon: { type: 'string' }
                }
            }
        }
    }, async (req: FastifyRequest<{ Body: { name: string, description?: string, parent_id?: number, icon?: string } }>, reply) => {
        const { name, description, parent_id, icon } = req.body;
        const result = db.prepare('INSERT INTO spaces (name, description, parent_id, icon) VALUES (?, ?, ?, ?)').run(name, description || null, parent_id || null, icon || null);
        return { id: result.lastInsertRowid };
    });

    // ==================== v0.8 Furnitures API ====================

    // GET Orphans (Limbo) - Items, Containers, or Furnitures without valid parents
    fastify.get('/api/orphans', async () => {
        // 1. Furnitures without valid space
        const strayFurnitures = db.prepare(`
            SELECT f.* 
            FROM furnitures f
            LEFT JOIN spaces s ON f.space_id = s.id
            WHERE f.space_id IS NULL OR s.id IS NULL
        `).all();

        // 2. Containers without valid space OR valid furniture
        // Also includes containers inside a 'stray' furniture
        const strayContainers = db.prepare(`
            SELECT c.* 
            FROM containers c
            LEFT JOIN spaces s ON c.space_id = s.id
            LEFT JOIN furnitures f ON c.furniture_id = f.id
            LEFT JOIN spaces s_f ON f.space_id = s_f.id
            WHERE 
               -- Case A: No parent assigned
               (c.space_id IS NULL AND c.furniture_id IS NULL)
               -- Case B: Parent Space invalid
               OR (c.space_id IS NOT NULL AND s.id IS NULL)
               -- Case C: Parent Furniture invalid
               OR (c.furniture_id IS NOT NULL AND f.id IS NULL)
               -- Case D: Parent Furniture is valid BUT that Furniture is stray (no space)
               OR (c.furniture_id IS NOT NULL AND (f.space_id IS NULL OR s_f.id IS NULL))
        `).all();

        // 3. Items without valid container OR inside a stray container
        const strayItems = db.prepare(`
            SELECT i.*, c.name as container_name 
            FROM items i 
            LEFT JOIN containers c ON i.container_id = c.id 
            LEFT JOIN spaces s ON c.space_id = s.id
            LEFT JOIN furnitures f ON c.furniture_id = f.id
            LEFT JOIN spaces s_f ON f.space_id = s_f.id
            WHERE 
                -- Case A: No container or Container doesn't exist
                (i.container_id IS NULL OR c.id IS NULL)
                -- Case B: Container exists but is stray
                OR (
                    (c.space_id IS NULL AND c.furniture_id IS NULL)
                    OR (c.space_id IS NOT NULL AND s.id IS NULL)
                    OR (c.furniture_id IS NOT NULL AND f.id IS NULL)
                    OR (c.furniture_id IS NOT NULL AND (f.space_id IS NULL OR s_f.id IS NULL))
                )
        `).all();

        return {
            items: strayItems,
            containers: strayContainers,
            furnitures: strayFurnitures
        };
    });

    // GET all furnitures
    fastify.get('/api/furnitures', async () => {
        return db.prepare(`
            SELECT f.*, s.name as space_name 
            FROM furnitures f 
            LEFT JOIN spaces s ON f.space_id = s.id 
            ORDER BY s.name, f.name
        `).all();
    });

    // POST Furniture (Multipart)
    fastify.post('/api/furnitures', async (req, reply) => {
        const parts = req.parts();
        let name: string | undefined, description: string | undefined, space_id: number | undefined, photo_url: string | null | undefined, icon: string | undefined;

        for await (const part of parts) {
            if (part.type === 'file') {
                photo_url = await saveImage(part);
            } else {
                if (part.fieldname === 'name') name = (part.value as string);
                if (part.fieldname === 'description') description = (part.value as string);
                if (part.fieldname === 'space_id') space_id = parseInt(part.value as string);
                if (part.fieldname === 'icon') icon = (part.value as string);
            }
        }

        if (!name) return reply.status(400).send({ error: 'Falta el nombre' });
        if (!space_id) return reply.status(400).send({ error: 'Falta el espacio' });

        const result = db.prepare('INSERT INTO furnitures (name, description, space_id, photo_url, icon) VALUES (?, ?, ?, ?, ?)').run(name, description || null, space_id, photo_url, icon || null);
        return { id: result.lastInsertRowid, photo_url };
    });

    // PUT Furniture
    fastify.put('/api/furnitures/:id', async (req, reply) => {
        const { id } = (req.params as { id: string });
        const parts = req.parts();
        let name: string | undefined, description: string | undefined, space_id: number | undefined, photo_url: string | null | undefined, icon: string | undefined;

        // Get current furniture to preserve photo if not updated
        const currentFurniture = db.prepare('SELECT photo_url FROM furnitures WHERE id = ?').get(id) as { photo_url: string };
        if (!currentFurniture) return reply.status(404).send({ error: 'Mueble no encontrado' });
        photo_url = currentFurniture.photo_url;

        for await (const part of parts) {
            if (part.type === 'file') {
                photo_url = await saveImage(part);
            } else {
                if (part.fieldname === 'name') name = (part.value as string);
                if (part.fieldname === 'description') description = (part.value as string);
                if (part.fieldname === 'space_id') space_id = parseInt(part.value as string);
                if (part.fieldname === 'icon') icon = (part.value as string);
            }
        }

        const updates: string[] = [];
        const values: any[] = [];

        if (name) { updates.push('name = ?'); values.push(name); }
        if (description !== undefined) { updates.push('description = ?'); values.push(description || null); }
        if (space_id) { updates.push('space_id = ?'); values.push(space_id); }
        if (photo_url) { updates.push('photo_url = ?'); values.push(photo_url); }
        if (icon !== undefined) { updates.push('icon = ?'); values.push(icon); }

        if (updates.length === 0) return { success: true, message: 'Nada que actualizar' };

        values.push(id);
        db.prepare(`UPDATE furnitures SET ${updates.join(', ')} WHERE id = ?`).run(...values);

        return { success: true };
    });

    // DELETE Furniture
    fastify.delete('/api/furnitures/:id', async (req: FastifyRequest<{ Params: { id: string } }>, reply) => {
        const { id } = req.params;
        // Check for containers first
        const containers = db.prepare('SELECT count(*) as count FROM containers WHERE furniture_id = ?').get(id) as { count: number };
        if (containers.count > 0) return reply.status(400).send({ error: 'El mueble tiene contenedores asignados' });

        const result = db.prepare('DELETE FROM furnitures WHERE id = ?').run(id);
        if (result.changes === 0) return reply.status(404).send({ error: 'Mueble no encontrado' });
        return { success: true };
    });

    // POST Container (Multipart) - v0.8: Now supports furniture_id and icon
    fastify.post('/api/containers', async (req, reply) => {
        const parts = req.parts();
        let name: string | undefined, description: string | undefined, space_id: number | undefined, furniture_id: number | undefined, photo_url: string | null | undefined, icon: string | undefined;

        for await (const part of parts) {
            if (part.type === 'file') {
                photo_url = await saveImage(part);
            } else {
                if (part.fieldname === 'name') name = (part.value as string);
                if (part.fieldname === 'description') description = (part.value as string);
                if (part.fieldname === 'space_id') space_id = parseInt(part.value as string);
                if (part.fieldname === 'furniture_id') furniture_id = parseInt(part.value as string);
                if (part.fieldname === 'icon') icon = (part.value as string);
            }
        }

        if (!name) return reply.status(400).send({ error: 'Falta el nombre' });

        const result = db.prepare('INSERT INTO containers (name, description, space_id, furniture_id, photo_url, icon) VALUES (?, ?, ?, ?, ?, ?)').run(name, description || null, space_id || null, furniture_id || null, photo_url, icon || null);
        return { id: result.lastInsertRowid, photo_url };
    });

    // POST Item (Multipart with extended metadata)
    fastify.post('/api/items', async (req, reply) => {
        const parts = req.parts();
        const fields: Record<string, any> = {};
        let photo_url: string | null = null;
        let invoice_photo_url: string | null = null;

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
                warranty_months, warranty_end, condition, notes, invoice_photo_url,
                book_author, book_publisher, book_year, book_pages, book_isbn, book_genre,
                game_platform, game_developer, game_publisher, game_year, game_genre,
                tech_specs, tech_manual_url, barcode
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
            invoice_photo_url,
            fields.book_author || null, fields.book_publisher || null,
            fields.book_year ? parseInt(fields.book_year) : null,
            fields.book_pages ? parseInt(fields.book_pages) : null,
            fields.book_isbn || null, fields.book_genre || null,
            fields.game_platform || null, fields.game_developer || null, fields.game_publisher || null,
            fields.game_year ? parseInt(fields.game_year) : null,
            fields.game_genre || null,
            fields.tech_specs || null, fields.tech_manual_url || null,
            fields.barcode || null
        );
        return { id: result.lastInsertRowid, photo_url };
    });

    // Global Search (v0.6/v0.9.2)
    fastify.get('/api/search', async (req: FastifyRequest<{ Querystring: { q: string } }>) => {
        const { q } = req.query;
        if (!q || q.trim().length < 2) return { items: [], containers: [], furnitures: [], spaces: [] };

        const searchTerm = `%${q.trim()}%`;
        const literalSearch = q.trim();

        // 1. Search items with location context
        const items = db.prepare(`
            SELECT i.*, 
                   c.name as container_name, 
                   f.name as furniture_name,
                   COALESCE(s_c.name, s_f.name) as space_name
            FROM items i
            LEFT JOIN containers c ON i.container_id = c.id
            LEFT JOIN furnitures f ON c.furniture_id = f.id
            LEFT JOIN spaces s_c ON c.space_id = s_c.id
            LEFT JOIN spaces s_f ON f.space_id = s_f.id
            WHERE i.name LIKE ? 
               OR i.tags LIKE ? 
               OR i.description LIKE ? 
               OR i.brand LIKE ? 
               OR i.model LIKE ? 
               OR i.serial_number LIKE ?
               OR i.loaned_to LIKE ?
               OR i.barcode = ?
               -- v0.9.2: Search by location name
               OR c.name LIKE ?
               OR f.name LIKE ?
               OR s_c.name LIKE ?
               OR s_f.name LIKE ?
            LIMIT 25
        `).all(
            searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, literalSearch,
            searchTerm, searchTerm, searchTerm, searchTerm
        );

        // 2. Search containers
        const containers = db.prepare(`
            SELECT c.*, 
                   f.name as furniture_name,
                   COALESCE(s.name, s_f.name) as space_name
            FROM containers c
            LEFT JOIN spaces s ON c.space_id = s.id
            LEFT JOIN furnitures f ON c.furniture_id = f.id
            LEFT JOIN spaces s_f ON f.space_id = s_f.id
            WHERE c.name LIKE ? 
               OR c.description LIKE ?
               -- v0.9.2: Match parent furniture/space
               OR f.name LIKE ?
               OR s.name LIKE ?
               OR s_f.name LIKE ?
            LIMIT 15
        `).all(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);

        // 3. Search furnitures (New in v0.9.2)
        const furnitures = db.prepare(`
            SELECT f.*, s.name as space_name
            FROM furnitures f
            LEFT JOIN spaces s ON f.space_id = s.id
            WHERE f.name LIKE ? 
               OR f.description LIKE ?
               OR s.name LIKE ?
            LIMIT 10
        `).all(searchTerm, searchTerm, searchTerm);

        // 4. Search spaces
        const spaces = db.prepare(`
            SELECT * FROM spaces 
            WHERE name LIKE ? 
               OR description LIKE ? 
            LIMIT 10
        `).all(searchTerm, searchTerm);

        return { items, containers, furnitures, spaces };
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

    // PUT Spaces
    fastify.put('/api/spaces/:id', {
        schema: {
            body: {
                type: 'object',
                required: ['name'],
                properties: {
                    name: { type: 'string', minLength: 1 },
                    description: { type: 'string' },
                    parent_id: { type: 'number', nullable: true },
                    icon: { type: 'string' }
                }
            }
        }
    }, async (req: FastifyRequest<{ Params: { id: string }, Body: { name: string, description?: string, parent_id?: number, icon?: string } }>, reply) => {
        const { id } = req.params;
        const { name, description, parent_id, icon } = req.body;

        const result = db.prepare('UPDATE spaces SET name = ?, description = ?, parent_id = ?, icon = ? WHERE id = ?').run(name, description || null, parent_id || null, icon || null, id);

        if (result.changes === 0) return reply.status(404).send({ error: 'Espacio no encontrado' });
        return { success: true };
    });

    fastify.put('/api/containers/:id', async (req, reply) => {
        const { id } = (req.params as { id: string });
        const parts = req.parts();
        let name: string | undefined, description: string | undefined, space_id: number | undefined, furniture_id: number | undefined, photo_url: string | null | undefined, icon: string | undefined;

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
                if (part.fieldname === 'furniture_id') furniture_id = parseInt(part.value as string);
                if (part.fieldname === 'icon') icon = (part.value as string);
            }
        }

        const updates: string[] = [];
        const values: any[] = [];

        if (name) { updates.push('name = ?'); values.push(name); }
        if (description !== undefined) { updates.push('description = ?'); values.push(description || null); }
        if (space_id !== undefined) { updates.push('space_id = ?'); values.push(space_id || null); }
        if (furniture_id !== undefined) { updates.push('furniture_id = ?'); values.push(furniture_id || null); }
        if (photo_url) { updates.push('photo_url = ?'); values.push(photo_url); }
        if (icon !== undefined) { updates.push('icon = ?'); values.push(icon); }

        if (updates.length === 0) return { success: true, message: 'Nada que actualizar' };

        values.push(id);
        db.prepare(`UPDATE containers SET ${updates.join(', ')} WHERE id = ?`).run(...values);

        return { success: true };
    });

    // ==================== v0.5 People API ====================
    fastify.get('/api/people', async () => {
        return db.prepare('SELECT * FROM people ORDER BY name ASC').all();
    });

    fastify.post('/api/people', {
        schema: {
            body: {
                type: 'object',
                required: ['name'],
                properties: {
                    name: { type: 'string', minLength: 1 },
                    role: { type: 'string' },
                    contact_info: { type: 'string' }
                }
            }
        }
    }, async (request, reply) => {
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
        let invoice_photo_url: string | null | undefined;

        // Get current item to preserve photo if not updated
        const currentItem = db.prepare('SELECT photo_url, invoice_photo_url FROM items WHERE id = ?').get(id) as { photo_url: string, invoice_photo_url: string };
        if (!currentItem) return reply.status(404).send({ error: 'Ítem no encontrado' });
        photo_url = currentItem.photo_url;
        invoice_photo_url = currentItem.invoice_photo_url;

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
        if (invoice_photo_url !== currentItem.invoice_photo_url) { updates.push('invoice_photo_url = ?'); values.push(invoice_photo_url); }

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
        addField('min_quantity', fields.min_quantity, parseInt);
        addField('loaned_to', fields.loaned_to);
        addField('loaned_at', fields.loaned_at);
        addField('barcode', fields.barcode);

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

    // GET Item by ID with photos (Useful for QR scanning) - Enhanced with location context
    fastify.get('/api/items/:id/full', async (req: FastifyRequest<{ Params: { id: string } }>, reply) => {
        const { id } = req.params;
        const item = db.prepare(`
            SELECT i.*, 
                   c.name as container_name,
                   f.name as furniture_name,
                   COALESCE(s_c.name, s_f.name) as space_name
            FROM items i
            LEFT JOIN containers c ON i.container_id = c.id
            LEFT JOIN furnitures f ON c.furniture_id = f.id
            LEFT JOIN spaces s_c ON c.space_id = s_c.id
            LEFT JOIN spaces s_f ON f.space_id = s_f.id
            WHERE i.id = ?
        `).get(id) as any;

        if (!item) return reply.status(404).send({ error: 'Ítem no encontrado' });

        const photos = db.prepare('SELECT * FROM item_photos WHERE item_id = ? ORDER BY is_primary DESC, id ASC').all(id);
        return { ...item, photos };
    });

    // --- Item Photos ---
    // v0.9: GET Item by Barcode
    fastify.get('/api/items/by-barcode/:barcode', async (req: FastifyRequest<{ Params: { barcode: string } }>, reply) => {
        const { barcode } = req.params;
        const item = db.prepare(`
            SELECT i.*, 
                   c.name as container_name,
                   f.name as furniture_name,
                   COALESCE(s_c.name, s_f.name) as space_name
            FROM items i
            LEFT JOIN containers c ON i.container_id = c.id
            LEFT JOIN furnitures f ON c.furniture_id = f.id
            LEFT JOIN spaces s_c ON c.space_id = s_c.id
            LEFT JOIN spaces s_f ON f.space_id = s_f.id
            WHERE i.barcode = ?
        `).get(barcode) as any;

        if (!item) return reply.status(404).send({ error: 'Ítem no encontrado por código de barras' });

        const photos = db.prepare('SELECT * FROM item_photos WHERE item_id = ? ORDER BY is_primary DESC, id ASC').all(item.id);
        return { ...item, photos };
    });

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

        const furnitures = db.prepare(`
            SELECT fp.*, f.name as furniture_name, f.space_id as logic_space_id, f.icon as logic_icon
            FROM furniture_positions fp
            JOIN furnitures f ON fp.furniture_id = f.id
        `).all() as any[];

        return { plan, rooms, containers, furnitures };
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

    // --- Furniture Positions (v0.8.2) ---
    fastify.post('/api/furniture-positions', async (req: FastifyRequest<{ Body: { furniture_id: number, room_layout_id?: number, x?: number, y?: number, width?: number, height?: number } }>, reply) => {
        const { furniture_id, room_layout_id, x, y, width, height } = req.body;
        if (!furniture_id) return reply.status(400).send({ error: 'furniture_id requerido' });

        const existing = db.prepare('SELECT id FROM furniture_positions WHERE furniture_id = ?').get(furniture_id);
        if (existing) return reply.status(400).send({ error: 'Este mueble ya tiene posición' });

        const result = db.prepare(`
            INSERT INTO furniture_positions (furniture_id, room_layout_id, x, y, width, height) 
            VALUES (?, ?, ?, ?, ?, ?)
        `).run(furniture_id, room_layout_id || null, x || 10, y || 10, width || 60, height || 60);
        return { id: result.lastInsertRowid };
    });

    fastify.put('/api/furniture-positions/:id', async (req: FastifyRequest<{ Params: { id: string }, Body: { room_layout_id?: number, x?: number, y?: number, width?: number, height?: number } }>, reply) => {
        const { id } = req.params;
        const { room_layout_id, x, y, width, height } = req.body;

        const updates: string[] = [];
        const values: any[] = [];
        if (room_layout_id !== undefined) { updates.push('room_layout_id = ?'); values.push(room_layout_id); }
        if (x !== undefined) { updates.push('x = ?'); values.push(x); }
        if (y !== undefined) { updates.push('y = ?'); values.push(y); }
        if (width !== undefined) { updates.push('width = ?'); values.push(width); }
        if (height !== undefined) { updates.push('height = ?'); values.push(height); }

        if (updates.length > 0) {
            values.push(id);
            const result = db.prepare(`UPDATE furniture_positions SET ${updates.join(', ')} WHERE id = ?`).run(...values);
            if (result.changes === 0) return reply.status(404).send({ error: 'Posición no encontrada' });
        }
        return { success: true };
    });

    fastify.delete('/api/furniture-positions/:id', async (req: FastifyRequest<{ Params: { id: string } }>, reply) => {
        const { id } = req.params;
        const result = db.prepare('DELETE FROM furniture_positions WHERE id = ?').run(id);
        if (result.changes === 0) return reply.status(404).send({ error: 'Posición no encontrada' });
        return { success: true };
    });

    // ==================== v0.4 Categories API ====================

    // GET all categories
    fastify.get('/api/categories', async () => {
        return db.prepare('SELECT * FROM categories ORDER BY name').all();
    });

    // POST create category
    fastify.post('/api/categories', {
        schema: {
            body: {
                type: 'object',
                required: ['name'],
                properties: {
                    name: { type: 'string', minLength: 1 },
                    icon: { type: 'string' },
                    color: { type: 'string' }
                }
            }
        }
    }, async (req: FastifyRequest<{ Body: { name: string, icon?: string, color?: string } }>, reply) => {
        const { name, icon, color } = req.body;

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

    // ==================== v0.7 Backup API ====================

    // Export all data
    fastify.get('/api/backup/export', async () => {
        const tables = [
            'spaces', 'furnitures', 'containers', 'items', 'item_photos',
            'floor_plan', 'room_layouts', 'container_positions',
            'categories', 'people'
        ];

        const backup: Record<string, any[]> = {};

        for (const table of tables) {
            backup[table] = db.prepare(`SELECT * FROM ${table}`).all();
        }

        return backup;
    });

    // Import all data
    fastify.post('/api/backup/import', async (req: FastifyRequest<{ Body: Record<string, any[]> }>, reply) => {
        const backup = req.body;
        if (!backup || typeof backup !== 'object') {
            return reply.status(400).send({ error: 'Backup inválido' });
        }

        const tables = [
            'item_photos', 'items', 'container_positions', 'containers',
            'furnitures', 'room_layouts', 'spaces', 'floor_plan', 'categories', 'people'
        ];

        const importTransaction = db.transaction((data: Record<string, any[]>) => {
            // 1. Clear tables (in reverse order of foreign keys)
            for (const table of tables) {
                db.prepare(`DELETE FROM ${table}`).run();
            }

            // 2. Insert data (in correct order of foreign keys)
            const insertTable = (table: string, items: any[]) => {
                if (!items || items.length === 0) return;

                const columns = Object.keys(items[0]);
                const placeholders = columns.map(() => '?').join(', ');
                const stmt = db.prepare(`INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`);

                for (const item of items) {
                    const values = columns.map(col => item[col]);
                    stmt.run(...values);
                }
            };

            // Order matters for FK
            const insertOrder = [
                'categories', 'people', 'spaces', 'furnitures', 'room_layouts',
                'containers', 'container_positions', 'items',
                'item_photos', 'floor_plan'
            ];

            for (const table of insertOrder) {
                insertTable(table, data[table]);
            }
        });

        try {
            importTransaction(backup);
            return { success: true };
        } catch (err: any) {
            console.error('Import error:', err);
            return reply.status(500).send({ error: 'Error al importar: ' + err.message });
        }
    });

}
