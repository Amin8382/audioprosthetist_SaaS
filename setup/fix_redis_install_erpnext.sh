#!/bin/bash
set -e
export PATH="/usr/local/bin:/usr/bin:/bin"
export HOME=/home/odyio

cd /home/odyio/odyio-bench

# Update common_site_config to use default Redis port
cat > sites/common_site_config.json << 'CONFIG'
{
  "background_workers": 1,
  "db_host": "127.0.0.1",
  "db_port": 3306,
  "db_type": "mariadb",
  "developer_mode": 1,
  "redis_cache": "redis://127.0.0.1:6379",
  "redis_queue": "redis://127.0.0.1:6379",
  "redis_socketio": "redis://127.0.0.1:6379",
  "server_script_enabled": true
}
CONFIG

# Start Redis if not running
redis-cli ping 2>/dev/null || redis-server --daemonize yes --port 6379 2>&1
sleep 2
redis-cli ping
echo "=== Redis ready ==="

# List apps
bench --site odyio.localhost list-apps 2>&1 || true

# Install ERPNext
bench --site odyio.localhost install-app erpnext 2>&1
echo "=== ERPNext install done ==="
