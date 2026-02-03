import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import staticPlugin from '@fastify/static';
import path from 'path';
import fs from 'fs-extra';
import { initDb } from './db';
import routes from './routes';

const fastify = Fastify({
    logger: true
});

// Plugins
fastify.register(cors, {
    origin: '*' // Valid for local dev
});
fastify.register(multipart);

// Static files (uploaded images)
const UPLOADS_DIR = path.join(__dirname, '../uploads');
const CLIENT_DIR = path.join(__dirname, '../public'); // Standardizing on 'public' for built frontend

fs.ensureDirSync(UPLOADS_DIR);

// Serve Uploads
fastify.register(staticPlugin, {
    root: UPLOADS_DIR,
    prefix: '/uploads/',
    decorateReply: false
});

// Serve Frontend
fastify.register(staticPlugin, {
    root: CLIENT_DIR,
    prefix: '/',
    decorateReply: false
});

fastify.register(routes);

// SPA Fallback
fastify.setNotFoundHandler((req, reply) => {
    if (req.raw.url && req.raw.url.startsWith('/api')) {
        return reply.status(404).send({ error: 'Endpoint not found' });
    }
    const indexHtml = path.join(CLIENT_DIR, 'index.html');
    if (fs.existsSync(indexHtml)) {
        const stream = fs.createReadStream(indexHtml);
        reply.type('text/html').send(stream);
    } else {
        reply.status(404).send('Frontend not found (index.html missing)');
    }
});


// Start server
const start = async () => {
    try {
        initDb();
        const port = 8110;
        await fastify.listen({ port, host: '0.0.0.0' });
        console.log(`Server listening on http://localhost:${port}`);
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};

start();
