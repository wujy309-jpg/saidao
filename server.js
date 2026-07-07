const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 4000;
const BACKEND_URL = 'http://localhost:8080';

const mimeTypes = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf'
};

const server = http.createServer((req, res) => {
    // API代理
    if (req.url.startsWith('/api/')) {
        const options = {
            hostname: 'localhost',
            port: 8080,
            path: req.url,
            method: req.method,
            headers: {
                ...req.headers,
                host: 'localhost:8080'
            }
        };

        const proxy = http.request(options, (proxyRes) => {
            res.writeHead(proxyRes.statusCode, proxyRes.headers);
            proxyRes.pipe(res);
        });

        proxy.on('error', (err) => {
            console.error('Proxy error:', err);
            res.writeHead(502);
            res.end('Backend unavailable');
        });

        req.pipe(proxy);
        return;
    }

    // 静态文件服务
    let filePath = path.join(__dirname, req.url === '/' ? 'index.html' : req.url);
    
    // 安全检查
    if (!filePath.startsWith(__dirname)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }

    const ext = path.extname(filePath);
    const contentType = mimeTypes[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, data) => {
        if (err) {
            if (err.code === 'ENOENT') {
                // SPA路由 - 返回index.html
                fs.readFile(path.join(__dirname, 'index.html'), (err2, data2) => {
                    if (err2) {
                        res.writeHead(500);
                        res.end('Server Error');
                        return;
                    }
                    res.writeHead(200, { 'Content-Type': 'text/html' });
                    res.end(data2);
                });
            } else {
                res.writeHead(500);
                res.end('Server Error');
            }
            return;
        }

        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
    });
});

server.listen(PORT, () => {
    console.log(`\n========================================`);
    console.log(`  服务器已启动!`);
    console.log(`========================================`);
    console.log(`  本地访问: http://localhost:${PORT}`);
    console.log(`  后端API: ${BACKEND_URL}`);
    console.log(`========================================\n`);
});
