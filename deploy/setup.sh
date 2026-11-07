#!/usr/bin/env bash
# One-time setup of a fresh Ubuntu 22.04/24.04 server (Oracle Cloud Always Free)
# for Rogue. Run as the default "ubuntu" user:
#   curl -fsSL https://raw.githubusercontent.com/Hendo10X/rogue/master/deploy/setup.sh | bash
set -euo pipefail

APP=/opt/rogue
REPO=https://github.com/Hendo10X/rogue.git

sudo apt-get update
sudo apt-get install -y git curl gnupg debian-keyring debian-archive-keyring apt-transport-https netfilter-persistent

# Node.js 22
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# Caddy (web server with automatic HTTPS certificates)
curl -1sLf https://dl.cloudsmith.io/public/caddy/stable/gpg.key | sudo gpg --dearmor --yes -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt | sudo tee /etc/apt/sources.list.d/caddy-stable.list >/dev/null
sudo apt-get update
sudo apt-get install -y caddy

# Oracle's Ubuntu image blocks web traffic in its own firewall: open 80 and 443.
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
sudo netfilter-persistent save

# The app
sudo mkdir -p "$APP"
sudo chown "$USER":"$USER" "$APP"
[ -d "$APP/.git" ] || git clone "$REPO" "$APP"

sudo cp "$APP/deploy/rogue.service" /etc/systemd/system/rogue.service
sudo cp "$APP/deploy/Caddyfile" /etc/caddy/Caddyfile
sudo cp "$APP/deploy/rogue-cron" /etc/cron.d/rogue
sudo chmod 644 /etc/cron.d/rogue
sudo systemctl daemon-reload
sudo systemctl enable rogue caddy
sudo systemctl restart caddy

echo
echo "Setup done. Next: create $APP/.env (see docs/deploy-oracle.md), then run:"
echo "  bash $APP/deploy/deploy.sh"
