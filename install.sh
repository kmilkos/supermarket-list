#!/usr/bin/env bash
set -euo pipefail

if [ "$EUID" -ne 0 ]; then
  echo "Please run with sudo: sudo ./install.sh [--https]"
  exit 1
fi

APP_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_NAME="supermarket-list"
SERVICE_FILE="/etc/systemd/system/${APP_NAME}.service"
NODE_VERSION="22"
RUN_USER="${SUDO_USER:-root}"
USE_HTTPS=false

for arg in "$@"; do
  case "$arg" in
    --https) USE_HTTPS=true ;;
  esac
done

echo "=== SuperMarketList Installer for Debian ==="

# --- Node.js ---
if ! command -v node &>/dev/null; then
  echo "Installing Node.js ${NODE_VERSION}..."
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_VERSION}.x" | bash -
  apt-get install -y nodejs
else
  echo "Node.js $(node -v) already installed"
fi

# --- Build tools (for native modules like better-sqlite3, sharp) ---
echo "Installing build dependencies..."
apt-get install -y python3 make g++

# --- npm dependencies ---
echo "Installing server dependencies..."
cd "$APP_DIR/server"
npm install

echo "Installing client dependencies..."
cd "$APP_DIR/client"
npm install

# --- Build client ---
echo "Building client..."
cd "$APP_DIR"
npm run build

# --- Create uploads directory ---
mkdir -p "$APP_DIR/server/uploads"
chown "$RUN_USER":"$RUN_USER" "$APP_DIR/server/uploads" 2>/dev/null || true

# --- Optional HTTPS via mkcert ---
if [ "$USE_HTTPS" = true ]; then
  echo ""
  echo "--- Setting up HTTPS with mkcert ---"

  # Install mkcert
  if ! command -v mkcert &>/dev/null; then
    echo "Installing mkcert..."
    apt-get install -y libnss3-tools
    curl -fsSL -o /usr/local/bin/mkcert https://dl.filippo.io/mkcert/latest?for=linux/amd64
    chmod +x /usr/local/bin/mkcert
    mkcert -install
  else
    echo "mkcert already installed"
  fi

  # Detect server IP
  SERVER_IP=$(hostname -I | awk '{print $1}')
  CERT_DIR="$APP_DIR/certs"
  mkdir -p "$CERT_DIR"

  echo "Generating certificate for IP: $SERVER_IP"
  cd "$CERT_DIR"
  mkcert "$SERVER_IP" localhost 127.0.0.1

  # Rename to expected filenames (mkcert outputs e.g. 192.168.1.155+2.pem)
  CERT_FILE=$(ls -t *.pem | grep -v -- "-key" | head -1)
  KEY_FILE=$(ls -t *-key.pem | head -1)
  if [ -n "$CERT_FILE" ] && [ -n "$KEY_FILE" ]; then
    mv "$CERT_FILE" cert.pem
    mv "$KEY_FILE" key.pem
  fi

  chown -R "$RUN_USER":"$RUN_USER" "$CERT_DIR"
  cd "$APP_DIR"
  echo "Certificates saved to $CERT_DIR"
fi

# --- systemd service ---
echo ""
echo "Setting up systemd service..."

if [ "$USE_HTTPS" = true ]; then
  EXEC_START="$(which node) $APP_DIR/server/https.js"
  SERVER_IP=$(hostname -I | awk '{print $1}')
  URL="https://$SERVER_IP:3001"
else
  EXEC_START="$(which node) $APP_DIR/server/index.js"
  SERVER_IP=$(hostname -I | awk '{print $1}')
  URL="http://$SERVER_IP:3001"
fi

cat > "$SERVICE_FILE" <<EOF
[Unit]
Description=SuperMarketList price comparison app
After=network.target

[Service]
Type=simple
User=$RUN_USER
WorkingDirectory=$APP_DIR
ExecStart=$EXEC_START
Restart=always
RestartSec=5
Environment=NODE_ENV=production
Environment=PORT=3001

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable "$APP_NAME"
systemctl start "$APP_NAME"

echo ""
echo "=== Install complete ==="
echo "  Service: ${APP_NAME}"
echo "  URL:     ${URL}"
echo ""
if [ "$USE_HTTPS" = false ]; then
  echo "  Tip: run with --https to enable camera access:"
  echo "       sudo ./install.sh --https"
fi