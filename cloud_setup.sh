#!/bin/bash
# =============================================================================
# CodePop Node Setup Script
# Run this on either the bootstrap or peer VMs to get fully set up
# Usage: bash setup.sh
# =============================================================================

set -e  # Exit on any error

echo ""
echo "============================================="
echo "  CodePop Node Setup"
echo "============================================="
echo ""

# -----------------------------------------------------------------------------
# Step 1: Remove old Node.js
# -----------------------------------------------------------------------------
echo "[ ^ ] Removing old Node.js..."
sudo apt-get remove -y nodejs npm 2>/dev/null || true
sudo apt-get autoremove -y 2>/dev/null || true
sudo rm -f /etc/apt/sources.list.d/nodesource.list
echo "[ ^ ] Old Node.js removed"
echo ""

# -----------------------------------------------------------------------------
# Step 2: Install nvm and Node 22
# -----------------------------------------------------------------------------
echo "[ ^ ] Installing nvm..."
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

# Load nvm into current shell session
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

echo "[ ^ ] Installing Node.js 22..."
nvm install 22
nvm use 22
nvm alias default 22

echo "[ ^ ] Node version: $(node --version)"
echo "[ ^ ] npm version: $(npm --version)"
echo ""

# -----------------------------------------------------------------------------
# Step 3: Git pull latest code
# -----------------------------------------------------------------------------
echo "[ ^ ] Pulling latest code from git..."

# Go to the root of the repo (two levels up from orbitdb/)
cd ~/code-pop/codepop_backend

git pull

echo "[ ^ ] Git pull complete"
echo ""

# -----------------------------------------------------------------------------
# Step 4: npm install in codepop/ (frontend/shared)
# -----------------------------------------------------------------------------
# Adjust this path if your frontend folder is named differently
FRONTEND_DIR=~/code-pop/codepop

if [ -d "$FRONTEND_DIR" ]; then
  echo "[ ^ ] Running npm install in codepop/..."
  cd "$FRONTEND_DIR"
  npm install
  echo "[ ^ ] codepop/ dependencies installed"
else
  echo "[ ! ] codepop/ directory not found at $FRONTEND_DIR, skipping..."
fi
echo ""

# -----------------------------------------------------------------------------
# Step 5: npm install in orbitdb/ (backend)
# -----------------------------------------------------------------------------
ORBITDB_DIR=~/code-pop/codepop_backend/orbitdb

if [ -d "$ORBITDB_DIR" ]; then
  echo "[ ^ ] Running npm install in codepop_backend/orbitdb/..."
  cd "$ORBITDB_DIR"
  npm install
  echo "[ ^ ] orbitdb/ dependencies installed"
else
  echo "[ X ] orbitdb/ directory not found at $ORBITDB_DIR"
  exit 1
fi
echo ""

# -----------------------------------------------------------------------------
# Step 6: Install Google Cloud Storage package
# -----------------------------------------------------------------------------
echo "[ ^ ] Installing @google-cloud/storage..."
cd "$ORBITDB_DIR"
npm install @google-cloud/storage
echo "[ ^ ] @google-cloud/storage installed"
echo ""

# -----------------------------------------------------------------------------
# Step 7: Reinstall PM2 under Node 22
# -----------------------------------------------------------------------------
echo "[ ^ ] Reinstalling PM2 under Node 22..."
pm2 kill 2>/dev/null || true
npm install -g pm2
echo "[ ^ ] PM2 installed: $(pm2 --version)"
echo ""

# -----------------------------------------------------------------------------
# Step 8: Collect config and write ecosystem.config.cjs
# -----------------------------------------------------------------------------
echo "============================================="
echo "  Node Configuration"
echo "============================================="
echo ""

# Node type
while true; do
  read -p "Is this a bootstrap or peer node? (bootstrap/peer): " NODE_TYPE
  if [[ "$NODE_TYPE" == "bootstrap" || "$NODE_TYPE" == "peer" ]]; then
    break
  fi
  echo "  Please type 'bootstrap' or 'peer'"
done

# GCS bucket
read -p "GCS bucket name: " GCS_BUCKET

# Bootstrap IP (peers only)
if [ "$NODE_TYPE" == "peer" ]; then
  read -p "Bootstrap node internal IP (e.g. 10.128.0.2): " BOOTSTRAP_IP
  while true; do
    read -p "Port for this peer (3001 / 3002 / 3003): " PEER_PORT
    if [[ "$PEER_PORT" =~ ^[0-9]+$ ]]; then
      break
    fi
    echo "  Please enter a valid port number"
  done
fi

# Extra env vars
echo ""
echo "Enter any additional environment variables (e.g. Stripe keys, JWT secret)."
echo "Type them one per line in KEY=VALUE format. Press Enter on a blank line when done."
echo ""
EXTRA_ENV_LINES=""
while true; do
  read -p "  ENV var (or blank to finish): " ENV_LINE
  if [ -z "$ENV_LINE" ]; then
    break
  fi
  # Validate format
  if [[ "$ENV_LINE" == *"="* ]]; then
    KEY="${ENV_LINE%%=*}"
    VALUE="${ENV_LINE#*=}"
    EXTRA_ENV_LINES="${EXTRA_ENV_LINES}      ${KEY}: \"${VALUE}\",\n"
  else
    echo "  Invalid format — use KEY=VALUE"
  fi
done

echo ""
echo "[ ^ ] Writing ecosystem.config.cjs..."

cd "$ORBITDB_DIR"

if [ "$NODE_TYPE" == "bootstrap" ]; then
  cat > ecosystem.config.cjs << EOF
module.exports = {
  apps: [{
    name: "codepop-bootstrap",
    script: "bootstrap-node.js",
    env: {
      GCS_BUCKET: "${GCS_BUCKET}",
$(printf "$EXTRA_ENV_LINES")    }
  }]
}
EOF
else
  cat > ecosystem.config.cjs << EOF
module.exports = {
  apps: [{
    name: "codepop-peer",
    script: "peer-node.js",
    env: {
      GCS_BUCKET: "${GCS_BUCKET}",
      BOOTSTRAP_IP: "${BOOTSTRAP_IP}",
      PORT: "${PEER_PORT}",
$(printf "$EXTRA_ENV_LINES")    }
  }]
}
EOF
fi

echo "[ ^ ] ecosystem.config.cjs written:"
echo ""
cat ecosystem.config.cjs
echo ""

# -----------------------------------------------------------------------------
# Step 9: Start PM2
# -----------------------------------------------------------------------------
echo "[ ^ ] Starting node with PM2..."
pm2 start ecosystem.config.cjs
pm2 save

echo ""
echo "[ ^ ] PM2 started. Run the following command to enable auto-restart on reboot:"
echo ""
pm2 startup | tail -1
echo ""

# -----------------------------------------------------------------------------
# Done
# -----------------------------------------------------------------------------
echo "============================================="
echo "  Setup Complete!"
echo "============================================="
echo ""
echo "Useful commands:"
echo "  pm2 logs          - View live logs"
echo "  pm2 list          - Check node status"
echo "  pm2 restart all   - Restart the node"
echo ""
