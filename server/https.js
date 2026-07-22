const https = require('https');
const fs = require('fs');
const path = require('path');
const app = require('./index');

const PORT = process.env.PORT || 3001;
const CERT_DIR = path.join(__dirname, '..', 'certs');
const KEY = path.join(CERT_DIR, 'key.pem');
const CERT = path.join(CERT_DIR, 'cert.pem');

if (!fs.existsSync(KEY) || !fs.existsSync(CERT)) {
  console.error('Missing certificate files. Run: sudo ./install.sh --https');
  process.exit(1);
}

const options = {
  key: fs.readFileSync(KEY),
  cert: fs.readFileSync(CERT),
};

https.createServer(options, app).listen(PORT, '0.0.0.0', () => {
  console.log(`HTTPS server running on https://0.0.0.0:${PORT}`);
});
