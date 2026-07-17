#!/bin/bash
set -e
export PATH="/usr/local/bin:/usr/bin:/bin"
export HOME=/home/odyio

cd /home/odyio/odyio-bench

# Get ERPNext
bench get-app erpnext --branch version-15 2>&1
echo "=== ERPNext get done ==="

# Start Redis (needed for site creation)
redis-server --daemonize yes 2>&1 || true
echo "=== Redis started ==="

# Create site
bench new-site odyio.localhost --mariadb-root-password root --admin-password admin 2>&1
echo "=== Site created ==="

# Install ERPNext on the site
bench --site odyio.localhost install-app erpnext 2>&1
echo "=== ERPNext installed ==="
