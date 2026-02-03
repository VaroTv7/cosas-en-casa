const http = require('http');

function request(options, data) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => resolve({ statusCode: res.statusCode, body: body }));
        });
        req.on('error', reject);
        if (data) req.write(data);
        req.end();
    });
}

async function verify() {
    try {
        // 1. Check Root (Frontend serving)
        console.log('Checking Root...');
        const root = await request({ hostname: 'localhost', port: 8110, path: '/', method: 'GET' });
        console.log('Root Status:', root.statusCode);
        if (root.body.includes('<!doctype html>')) console.log('✅ Frontend Serving: OK');
        else console.log('❌ Frontend Serving: Failed', root.body.substring(0, 100));

        // 2. Create Space
        console.log('\nCreating Space...');
        const spaceData = JSON.stringify({ name: 'Cocina Verificada' });
        const createSpace = await request({
            hostname: 'localhost',
            port: 8110,
            path: '/api/spaces',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': spaceData.length
            }
        }, spaceData);
        console.log('Create Space Status:', createSpace.statusCode);
        console.log('Body:', createSpace.body);

        // 3. Get Inventory
        console.log('\nFetching Inventory...');
        const inventory = await request({ hostname: 'localhost', port: 8110, path: '/api/inventory', method: 'GET' });
        console.log('Inventory Status:', inventory.statusCode);
        console.log('Body:', inventory.body);

    } catch (err) {
        console.error('Verification failed:', err);
    }
}

verify();
