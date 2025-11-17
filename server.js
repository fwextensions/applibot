const http = require('http');
const https = require('https');
const url = require('url');

let PORT = 3000;
const MAX_PORT_ATTEMPTS = 10;
const DAHLIA_BASE_URL = 'https://dahlia-full.herokuapp.com';

const server = http.createServer((req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // Parse the request URL
    const parsedUrl = url.parse(req.url, true);
    
    // Only proxy requests to /api/*
    if (!parsedUrl.pathname.startsWith('/api/')) {
        res.writeHead(404);
        res.end('Not found');
        return;
    }

    // Build the target URL
    const targetUrl = DAHLIA_BASE_URL + parsedUrl.pathname;

    // Prepare options for the proxy request
    const options = {
        method: req.method,
        headers: {
            'Content-Type': 'application/json',
        }
    };

    // Make the request to Dahlia
    const proxyReq = https.request(targetUrl, options, (proxyRes) => {
        res.writeHead(proxyRes.statusCode, proxyRes.headers);
        proxyRes.pipe(res);
    });

    proxyReq.on('error', (error) => {
        console.error('Proxy error:', error);
        res.writeHead(500);
        res.end('Proxy error: ' + error.message);
    });

    // If POST request, pipe the body
    if (req.method === 'POST') {
        req.pipe(proxyReq);
    } else {
        proxyReq.end();
    }
});

function startServer(port, attempts = 0) {
    if (attempts >= MAX_PORT_ATTEMPTS) {
        console.error(`Failed to find an available port after ${MAX_PORT_ATTEMPTS} attempts`);
        process.exit(1);
    }

    server.listen(port, () => {
        console.log(`Proxy server running at http://localhost:${port}`);
        if (port !== 3000) {
            console.log(`Note: Port 3000 was in use, using port ${port} instead`);
            console.log(`Update the fetch URLs in app.js to use http://localhost:${port}`);
        }
        console.log(`Open index.html in your browser to use the application`);
    }).on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.log(`Port ${port} is in use, trying port ${port + 1}...`);
            startServer(port + 1, attempts + 1);
        } else {
            console.error('Server error:', err);
            process.exit(1);
        }
    });
}

startServer(PORT);
