#!/bin/bash
set -e

# Kill any existing MariaDB
killall mysqld mariadbd mariadbd-safe 2>/dev/null || true
sleep 2

# Make sure the socket dir exists and is accessible
mkdir -p /run/mysqld
chmod 755 /run/mysqld

# Start MariaDB
mariadbd-safe &
sleep 5

# Create a MySQL user for odyio
mysql -u root -proot -e "CREATE USER IF NOT EXISTS 'odyio'@'localhost' IDENTIFIED BY 'odyio'; GRANT ALL PRIVILEGES ON *.* TO 'odyio'@'localhost' WITH GRANT OPTION; FLUSH PRIVILEGES;"

# Test connection as odyio
mysql -u odyio -podyio -e 'SELECT 1 AS test;'
echo "---MariaDB user ready---"
