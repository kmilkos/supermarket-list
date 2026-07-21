#!/usr/bin/env bash
set -euo pipefail

if [ "$EUID" -ne 0 ]; then
  echo "Please run with sudo: sudo ./install.sh"
  exit 1
fi

APP_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_NAME="supermarket-list"
SERVICE_FILE="/etc/systemd/system/${APP_NAME}.service"
NODE_VERSION="22"
RUN_USER="${SUDO_USER:-root}"

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

# --- systemd service ---
echo "Setting up systemd service..."
cat > "$SERVICE_FILE" <<EOF
[Unit]
Description=SuperMarketList price comparison app
After=network.target

[Service]
Type=simple
User=$RUN_USER
WorkingDirectory=$APP_DIR
ExecStart=$(which node) $APP_DIR/server/index.js
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
echo "  URL:     http://$(hostname -I | awk '{print $1}'):3001"
echo ""
echo "For HTTPS setup, see: SETUP_HTTPS.md"
