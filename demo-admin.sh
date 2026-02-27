#!/bin/bash
# Agent RPC Demo - Step 1: Admin Bootstrap Node
export PATH="/Users/user/Library/Application Support/pear/bin:$PATH"

cd "$(dirname "$0")"

echo "=================================="
echo " Agent RPC - Admin Bootstrap"
echo "=================================="
echo ""
echo "Starting admin (bootstrap) peer..."
echo ""
echo ">>> IMPORTANT: Copy the line that says:"
echo "    Peer writer key (hex): <64-char-hex>"
echo ">>> Use that hex value for demo-provider.sh and demo-consumer.sh"
echo ""

pear run . \
  --peer-store-name admin \
  --msb-store-name admin-msb \
  --subnet-channel agent-rpc-demo

echo ""
echo "Admin stopped."
