#!/bin/bash
# Agent RPC Demo - Consumer Script
export PATH="/Users/user/Library/Application Support/pear/bin:$PATH"
cd "$(dirname "$0")"

echo "=================================="
echo " Agent RPC - Consumer Demo"
echo "=================================="
echo ""

# Check if admin bootstrap key is provided
if [ -z "$1" ]; then
    echo "Usage: ./demo-consumer.sh <admin-writer-key-hex>"
    echo ""
    echo "If you don't have a bootstrap key, start an admin peer first:"
    echo "  pear run . --peer-store-name admin --msb-store-name admin-msb --subnet-channel agent-rpc-demo"
    echo ""
    echo "Then copy the 'Peer writer key (hex)' from the output and pass it to this script."
    exit 1
fi

BOOTSTRAP=$1

echo "Starting consumer peer..."
echo "Bootstrap: $BOOTSTRAP"
echo ""
echo "Try these commands after the prompt appears:"
echo "  /service_list"
echo '  /rpc_call --method calc.add --params "[5,3]"'
echo '  /rpc_call --method text.uppercase --params "[\"hello\"]"'
echo '  /rpc_call --method echo --params "[\"Agent RPC works!\"]"'
echo '  /rpc_call --method random.uuid --params "[]"'
echo '  /rpc_call --method hash --params "[\"test\"]"'
echo ""
echo "Press Ctrl+C to stop"
echo ""

# Start the consumer peer
pear run . \
  --peer-store-name consumer \
  --msb-store-name consumer-msb \
  --subnet-channel agent-rpc-demo \
  --subnet-bootstrap "$BOOTSTRAP"

echo ""
echo "Consumer stopped."
