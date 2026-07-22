const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const app = require('./index');

const PORT = process.env.PORT || 3001;
const HTTP_PORT = 3000;
const CERT_DIR = path.join(__dirname, '..', 'certs');
const KEY = path.join(CERT_DIR, 'key.pem');
const CERT = path.join(CERT_DIR, 'cert.pem');
const CA_FILE = path.join(CERT_DIR, '_install_on_clients.pem');

if (!fs.existsSync(KEY) || !fs.existsSync(CERT)) {
  console.error('Missing certificate files. Run: sudo ./install.sh --https');
  process.exit(1);
}

// HTTPS server (main app)
https.createServer({ key: fs.readFileSync(KEY), cert: fs.readFileSync(CERT) }, app)
  .listen(PORT, '0.0.0.0', () => {
    console.log(`HTTPS server running on https://0.0.0.0:${PORT}`);
  });

// HTTP server (redirect to HTTPS + serve CA cert for client setup)
http.createServer((req, res) => {
  // Serve CA cert file for download
  if (req.url === '/ca.crt' && fs.existsSync(CA_FILE)) {
    const data = fs.readFileSync(CA_FILE);
    res.writeHead(200, {
      'Content-Type': 'application/x-pem-file',
      'Content-Disposition': 'attachment; filename="mkcert-CA.pem"',
      'Content-Length': data.length,
    });
    res.end(data);
    return;
  }
  // Redirect everything else to HTTPS
  res.writeHead(302, { Location: `https://${req.headers.host || 'localhost'}:${PORT}${req.url}` });
  res.end();
}).listen(HTTP_PORT, '0.0.0.0', () => {
  console.log(`HTTP redirect server running on http://0.0.0.0:${HTTP_PORT}`);
  console.log(`Download CA cert: http://<server-ip>:${HTTP_PORT}/ca.crt`);
});
