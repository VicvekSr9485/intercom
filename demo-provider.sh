#!/bin/bash
# Agent RPC Demo - Provider Script
export PATH="/Users/user/Library/Application Support/pear/bin:$PATH"

echo "=================================="
echo " Agent RPC - Provider Demo"
echo "=================================="
echo ""

if [ -z "$1" ]; then
    echo "Usage: ./demo-provider.sh <admin-writer-key-hex>"
    echo ""
    echo "Copy the 'Peer writer key (hex)' from the admin terminal output."
    exit 1
fi

BOOTSTRAP=$1

echo "Starting provider peer with 19 RPC tools..."
echo "Bootstrap: $BOOTSTRAP"
echo ""
echo "Press Ctrl+C to stop"
echo ""

pear run . \
  --peer-store-name provider \
  --msb-store-name provider-msb \
  --subnet-channel agent-rpc-demo \
  --subnet-bootstrap "$BOOTSTRAP" \
  --rpc 1 \
  --rpc-tools 1 \
  --rpc-tool-price "0.1" \
  --rpc-debug 1

echo ""
echo "Provider stopped."
