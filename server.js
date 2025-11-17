const http = require('http');
const https = require('https');
const url = require('url');

const PORT = 3000;
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

server.listen(PORT, () => {
    console.log(`Proxy server running at http://localhost:${PORT}`);
    console.log(`Open index.html in your browser to use the application`);
});
