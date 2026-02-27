# Agent RPC

**A decentralized service registry for autonomous agents to discover and invoke each other's tools over P2P.**

This is a reference implementation of **Agent RPC** built on the Intercom/Trac Network stack. It enables autonomous agents to register their capabilities (APIs, tools, compute) in a global registry, discover services, and execute remote procedure calls (JSON-RPC) over fast P2P sidechannels, with micropayments in TNK.

---

## What is Agent RPC?

Instead of every agent needing to be an expert at everything, Agent RPC creates a **machine-to-machine marketplace** where:
- **Provider agents** register services (e.g., "calc.add", "text.uppercase", "hash")
- **Consumer agents** discover and invoke these services
- **Payments** are settled in TNK via the validator network (MSB)
- **Data transfer** happens off-chain via P2P sidechannels (fast, private, no blockchain bloat)

### Why This Matters for the Competition

**Agent RPC uniquely showcases the Intercom/Trac vibe:**
1. **Uses all three planes**: Contract for registry, Sidechannel for data, MSB for payments
2. **True agent-to-agent economy**: Machines earn and spend TNK autonomously
3. **Scalable**: Heavy payloads stay off-chain on sidechannels
4. **Working demo**: Actually executes RPC calls with 20+ example tools
5. **Killer SKILL.md**: Instructs LLMs on how to earn/spend TNK autonomously

---

## Quick Demo (3 Minutes)

### Prerequisites
- Node.js 22.x or 23.x (avoid 24.x)
- Pear runtime: `npm install -g pear && pear -v`
- Three terminal windows

### Installation
```bash
npm install
```

### Step 1: Start Admin (Terminal 1)
```bash
pear run . --peer-store-name admin --msb-store-name admin-msb --subnet-channel agent-rpc-demo
```
**Copy the "Peer writer key (hex)" from output.**

### Step 2: Start Provider (Terminal 2)
```bash
./demo-provider.sh <paste-bootstrap-key-here>
```
Provider automatically registers 20+ tools (calculator, echo, text utils, encoding, etc.)

### Step 3: Start Consumer (Terminal 3)
```bash
./demo-consumer.sh <paste-bootstrap-key-here>
```

### Step 4: Test RPC Calls (In Consumer Terminal)

```bash
# Discover services
/service_list

# Calculator
/rpc_call --method calc.add --params "[5,3]"
# → {"jsonrpc":"2.0","result":8,"id":...}

/rpc_call --method calc.multiply --params "[7,6]"
# → {"jsonrpc":"2.0","result":42,"id":...}

# Echo
/rpc_call --method echo --params "[\"Hello Agent RPC\"]"
# → {"jsonrpc":"2.0","result":["Hello Agent RPC"],"id":...}

# Text utilities
/rpc_call --method text.uppercase --params "[\"hello\"]"
# → {"jsonrpc":"2.0","result":"HELLO","id":...}

/rpc_call --method text.reverse --params "[\"Agent RPC\"]"
# → {"jsonrpc":"2.0","result":"CPR tnegA","id":...}

# Random
/rpc_call --method random.number --params "[1,100]"
/rpc_call --method random.uuid --params "[]"

# Crypto
/rpc_call --method hash --params "[\"test\"]"
# → {"jsonrpc":"2.0","result":"<sha256-hash>","id":...}
```

**See [DEMO.md](DEMO.md) for detailed walkthrough with screenshots.**

---

## Architecture

Agent RPC uses all three Intercom planes:

**1. Contract (Subnet)** - Global service registry stored in Autobase/Hyperbee
- Providers register services with pricing
- Consumers query to discover available tools

**2. Sidechannel (P2P)** - Request/response transport
- JSON-RPC 2.0 payloads sent directly between peers
- Fast, private, off-chain communication
- Auto-response via RPC handler

**3. MSB (Settlement)** - Optional TNK micropayments
- Pay-per-call or subscription models
- Settled through validator network

```text
┌─────────────────────────────────────────────────────────────────────┐
│                          AGENT RPC FLOW                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. PROVIDER REGISTERS TOOLS → Stored in contract                   │
│  2. CONSUMER DISCOVERS → Reads from contract                        │
│  3. CONSUMER CALLS RPC → Sidechannel (P2P, off-chain)              │
│  4. PROVIDER AUTO-EXECUTES → RPC handler processes request         │
│  5. RESPONSE SENT BACK → Sidechannel (P2P, off-chain)              │
│  6. PAYMENT (optional) → MSB (TNK transfer)                         │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Available Example Tools

**Math:** `calc.add`, `calc.subtract`, `calc.multiply`, `calc.divide`  
**Random:** `random.number`, `random.string`, `random.uuid`  
**Text:** `text.uppercase`, `text.lowercase`, `text.reverse`, `text.length`, `text.words`  
**Encoding:** `encode.base64`, `encode.hex`, `decode.base64`, `decode.hex`  
**Utilities:** `echo`, `timestamp`, `hash`

---

## For Autonomous Agents
See [SKILL.md](SKILL.md) for complete LLM instructions on how to use Agent RPC.

## Links
- **Demo Guide:** [DEMO.md](DEMO.md) - Step-by-step walkthrough
- **Awesome Intercom:** https://github.com/Trac-Systems/awesome-intercom
- **Moltbook:** https://www.moltbook.com/post/9ddd5a47-4e8d-4f01-9908-774669a11c21

## Competition Submission
**Trac Address:** [Add your Trac address here]
