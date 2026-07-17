#!/bin/bash
set -e
export PATH="/usr/local/bin:/usr/bin:/bin"
export HOME=/home/odyio

cd /home/odyio/odyio-bench

# Create odyio_cnam
printf "Odyio CNAM\nCNAM claims management for audioprothesistes\nOdyio Technologies\n1.0.0\n" | bench new-app odyio_cnam 2>&1
echo "=== odyio_cnam created ==="

# Create odyio_noah
printf "Odyio Noah\nNoah ES bidirectional sync\nOdyio Technologies\n1.0.0\n" | bench new-app odyio_noah 2>&1
echo "=== odyio_noah created ==="

# Install on site
bench --site odyio.localhost install-app odyio_cnam 2>&1
echo "=== odyio_cnam installed ==="

bench --site odyio.localhost install-app odyio_noah 2>&1
echo "=== odyio_noah installed ==="

# List all apps
bench --site odyio.localhost list-apps 2>&1
echo "=== All done ==="
