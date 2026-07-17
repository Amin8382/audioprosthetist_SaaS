#!/bin/bash
set -e

cd /root
bench init odyio-bench --frappe-branch version-15 2>&1
echo "EXIT: $?"
