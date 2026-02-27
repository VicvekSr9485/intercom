import {Protocol} from "trac-peer";
import { bufferToBigInt, bigIntToDecimalString } from "trac-msb/src/utils/amountSerialization.js";
import b4a from "b4a";
import PeerWallet from "trac-wallet";
import fs from "fs";

const stableStringify = (value) => {
    if (value === null || value === undefined) return 'null';
    if (typeof value !== 'object') return JSON.stringify(value);
    if (Array.isArray(value)) {
        return `[${value.map(stableStringify).join(',')}]`;
    }
    const keys = Object.keys(value).sort();
    return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
};

const normalizeInvitePayload = (payload) => {
    return {
        channel: String(payload?.channel ?? ''),
        inviteePubKey: String(payload?.inviteePubKey ?? '').trim().toLowerCase(),
        inviterPubKey: String(payload?.inviterPubKey ?? '').trim().toLowerCase(),
        inviterAddress: payload?.inviterAddress ?? null,
        issuedAt: Number(payload?.issuedAt),
        expiresAt: Number(payload?.expiresAt),
        nonce: String(payload?.nonce ?? ''),
        version: Number.isFinite(payload?.version) ? Number(payload.version) : 1,
    };
};

const normalizeWelcomePayload = (payload) => {
    return {
        channel: String(payload?.channel ?? ''),
        ownerPubKey: String(payload?.ownerPubKey ?? '').trim().toLowerCase(),
        text: String(payload?.text ?? ''),
        issuedAt: Number(payload?.issuedAt),
        version: Number.isFinite(payload?.version) ? Number(payload.version) : 1,
    };
};

const parseInviteArg = (raw) => {
    if (!raw) return null;
    let text = String(raw || '').trim();
    if (!text) return null;
    if (text.startsWith('@')) {
        try {
            text = fs.readFileSync(text.slice(1), 'utf8').trim();
        } catch (_e) {
            return null;
        }
    }
    if (text.startsWith('b64:')) text = text.slice(4);
    if (text.startsWith('{')) {
        try {
            return JSON.parse(text);
        } catch (_e) {}
    }
    try {
        const decoded = b4a.toString(b4a.from(text, 'base64'));
        return JSON.parse(decoded);
    } catch (_e) {}
    return null;
};

const parseWelcomeArg = (raw) => {
    if (!raw) return null;
    let text = String(raw || '').trim();
    if (!text) return null;
    if (text.startsWith('@')) {
        try {
            text = fs.readFileSync(text.slice(1), 'utf8').trim();
        } catch (_e) {
            return null;
        }
    }
    if (text.startsWith('b64:')) text = text.slice(4);
    if (text.startsWith('{')) {
        try {
            return JSON.parse(text);
        } catch (_e) {}
    }
    try {
        const decoded = b4a.toString(b4a.from(text, 'base64'));
        return JSON.parse(decoded);
    } catch (_e) {}
    return null;
};

class AgentRpcProtocol extends Protocol{

    /**
     * Agent RPC Protocol
     * 
     * Handles transaction commands and CLI interactions for the Agent RPC service registry.
     * Maps user commands to contract functions for registering, updating, and querying services.
     * 
     * this.peer: an instance of the entire Peer class
     * this.base: the database engine
     * this.options: the option stack passed from Peer instance
     *
     * @param peer
     * @param base
     * @param options
     */
    constructor(peer, base, options = {}) {
        // calling super and passing all parameters is required.
        super(peer, base, options);
    }

    /**
     * The Protocol superclass ProtocolApi instance already provides numerous api functions.
     * You can extend the built-in api based on your protocol requirements.
     *
     * @returns {Promise<void>}
     */
    async extendApi(){
        this.api.getSampleData = function(){
            return 'Some sample data';
        }
    }

    /**
     * Map incoming transaction commands to contract functions
     * 
     * Supports both simple string commands and JSON payloads for complex operations
     * 
     * @param command
     * @returns {{type: string, value: *}|null}
     */
    mapTxCommand(command){
        let obj = { type : '', value : null };
        
        // Simple read command: list all services
        if(command === 'list_services'){
            obj.type = 'listServices';
            obj.value = null;
            return obj;
        }

        // Parse JSON commands
        const json = this.safeJsonParse(command);
        if(json === undefined) return null;

        // Register a new service
        // Usage: /tx --command '{"op":"register_service","serviceId":"img_gen_v1","method":"generate_image","description":"AI image generation","priceInTNK":"5.0","category":"ai"}'
        if(json.op === 'register_service'){
            obj.type = 'registerService';
            obj.value = json;
            return obj;
        }

        // Update an existing service
        // Usage: /tx --command '{"op":"update_service","serviceId":"img_gen_v1","priceInTNK":"7.5"}'
        if(json.op === 'update_service'){
            obj.type = 'updateService';
            obj.value = json;
            return obj;
        }

        // Remove a service
        // Usage: /tx --command '{"op":"remove_service","serviceId":"img_gen_v1"}'
        if(json.op === 'remove_service'){
            obj.type = 'removeService';
            obj.value = json;
            return obj;
        }

        // Get a specific service
        // Usage: /tx --command '{"op":"get_service","serviceId":"img_gen_v1"}'
        if(json.op === 'get_service'){
            obj.type = 'getServiceById';
            obj.value = json;
            return obj;
        }

        // Get services by provider
        // Usage: /tx --command '{"op":"get_provider_services","providerAddress":"trac1xxx..."}'
        if(json.op === 'get_provider_services'){
            obj.type = 'getProviderServices';
            obj.value = json;
            return obj;
        }

        return null;
    }

    /**
     * Print Agent RPC commands available in the terminal
     *
     * @returns {Promise<void>}
     */
    async printOptions(){
        console.log(' ');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('  AGENT RPC COMMANDS');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(' ');
        console.log('Service Registry (write operations require transactions):');
        console.log('  /service_list                          | List all active RPC services');
        console.log('  /service_get --id <serviceId>          | Get details of a specific service');
        console.log('  /service_provider --address <addr>     | Get services by provider address');
        console.log(' ');
        console.log('  /service_register \\');
        console.log('    --id <serviceId> \\');
        console.log('    --method <methodName> \\');
        console.log('    --desc "<description>" \\');
        console.log('    --price <TNK> \\');
        console.log('    [--category <category>]              | Register a new RPC service');
        console.log(' ');
        console.log('  /service_update \\');
        console.log('    --id <serviceId> \\');
        console.log('    [--desc "<new description>"] \\');
        console.log('    [--price <new TNK>] \\');
        console.log('    [--category <new category>]          | Update your service (owner only)');
        console.log(' ');
        console.log('  /service_remove --id <serviceId>       | Remove your service (owner only)');
        console.log(' ');
        console.log('Sidechannel (JSON-RPC transport):');
        console.log('  /sc_join --channel "<name>"            | Join a sidechannel');
        console.log('  /sc_send --channel "<name>" --message "<text>" | Send message over sidechannel');
        console.log('  /sc_open --channel "<name>"            | Request others to open a sidechannel');
        console.log('  /sc_stats                              | Show sidechannel stats');
        console.log(' ');
        console.log('RPC Tools (if enabled):');
        console.log('  /rpc_list                              | List local RPC tools');
        console.log('  /rpc_call --method <name> --params <json> --channel <name> | Test RPC call');
        console.log(' ');
        console.log('Utilities:');
        console.log('  /get --key "<key>"                     | Read subnet state key');
        console.log('  /msb                                   | Show MSB status (balance, validators)');
        console.log(' ');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(' ');
        console.log('JSON-RPC Format (send via sidechannel):');
        console.log('  Request:  {"jsonrpc":"2.0","method":"generate_image","params":["prompt"],"id":1}');
        console.log('  Response: {"jsonrpc":"2.0","result":"<data>","id":1}');
        console.log('  Error:    {"jsonrpc":"2.0","error":{"code":-32000,"message":"error"},"id":1}');
        console.log(' ');
    }

    /**
     * Extend terminal commands with Agent RPC-specific functionality
     * 
     * @param input
     * @returns {Promise<void>}
     */
    async customCommand(input) {
        await super.tokenizeInput(input);
        
        // ============ AGENT RPC COMMANDS ============
        
        if (this.input.startsWith("/service_list")) {
            await this.api.tx('list_services');
            return;
        }

        if (this.input.startsWith("/service_get")) {
            const args = this.parseArgs(input);
            const serviceId = args.id || args.serviceId || args.service;
            if (!serviceId) {
                console.log('Usage: /service_get --id <serviceId>');
                return;
            }
            const command = JSON.stringify({ op: 'get_service', serviceId: String(serviceId) });
            await this.api.tx(command);
            return;
        }

        if (this.input.startsWith("/service_provider")) {
            const args = this.parseArgs(input);
            const providerAddress = args.address || args.addr || args.provider;
            if (!providerAddress) {
                console.log('Usage: /service_provider --address <trac1xxx...>');
                return;
            }
            const command = JSON.stringify({ op: 'get_provider_services', providerAddress: String(providerAddress) });
            await this.api.tx(command);
            return;
        }

        if (this.input.startsWith("/service_register")) {
            const args = this.parseArgs(input);
            const serviceId = args.id || args.serviceId;
            const method = args.method || args.m;
            const description = args.desc || args.description || args.d;
            const priceInTNK = args.price || args.p;
            const category = args.category || args.cat || args.c;

            if (!serviceId || !method || !priceInTNK) {
                console.log('Usage: /service_register --id <serviceId> --method <methodName> --desc "<description>" --price <TNK> [--category <category>]');
                return;
            }

            const command = JSON.stringify({
                op: 'register_service',
                serviceId: String(serviceId),
                method: String(method),
                description: String(description || ''),
                priceInTNK: String(priceInTNK),
                category: category ? String(category) : undefined
            });

            await this.api.tx(command);
            return;
        }

        if (this.input.startsWith("/service_update")) {
            const args = this.parseArgs(input);
            const serviceId = args.id || args.serviceId;
            const description = args.desc || args.description || args.d;
            const priceInTNK = args.price || args.p;
            const category = args.category || args.cat || args.c;

            if (!serviceId || (!description && !priceInTNK && !category)) {
                console.log('Usage: /service_update --id <serviceId> [--desc "<new description>"] [--price <new TNK>] [--category <new category>]');
                return;
            }

            const command = JSON.stringify({
                op: 'update_service',
                serviceId: String(serviceId),
                description: description ? String(description) : undefined,
                priceInTNK: priceInTNK ? String(priceInTNK) : undefined,
                category: category ? String(category) : undefined
            });

            await this.api.tx(command);
            return;
        }

        if (this.input.startsWith("/service_remove")) {
            const args = this.parseArgs(input);
            const serviceId = args.id || args.serviceId || args.service;

            if (!serviceId) {
                console.log('Usage: /service_remove --id <serviceId>');
                return;
            }

            const command = JSON.stringify({
                op: 'remove_service',
                serviceId: String(serviceId)
            });

            await this.api.tx(command);
            return;
        }

        // ============ RPC TOOL COMMANDS ============

        if (this.input.startsWith("/rpc_list")) {
            if (!this.peer.scBridge?.rpcHandler) {
                console.log('RPC handler not enabled. Start with --rpc 1');
                return;
            }
            const tools = this.peer.scBridge.rpcHandler.listTools();
            console.log(`Available RPC Tools (${tools.length}):`);
            console.log('');
            for (const tool of tools) {
                console.log(`  ${tool.method}`);
                console.log(`    Description: ${tool.description || 'N/A'}`);
                console.log(`    Price: ${tool.priceInTNK} TNK`);
                console.log(`    Category: ${tool.category}`);
                console.log('');
            }
            return;
        }

        if (this.input.startsWith("/rpc_call")) {
            const args = this.parseArgs(input);
            const method = args.method || args.m;
            const paramsRaw = args.params || args.p;
            const channel = args.channel || args.ch || '0000intercom';

            if (!method) {
                console.log('Usage: /rpc_call --method <name> --params <json-array> [--channel <name>]');
                console.log('Example: /rpc_call --method "calc.add" --params "[5,3]"');
                return;
            }

            if (!this.peer.sidechannel) {
                console.log('Sidechannel not available');
                return;
            }

            let params = [];
            if (paramsRaw) {
                try {
                    params = JSON.parse(String(paramsRaw));
                    if (!Array.isArray(params)) {
                        params = [params];
                    }
                } catch (e) {
                    console.log('Invalid params JSON. Must be an array like [1,2] or ["text"]');
                    return;
                }
            }

            const rpcRequest = {
                jsonrpc: '2.0',
                method: String(method),
                params: params,
                id: Date.now()
            };

            console.log('Sending RPC request:', JSON.stringify(rpcRequest));
            this.peer.sidechannel.broadcast(channel, rpcRequest);
            console.log(`Request sent on channel: ${channel}`);
            console.log('Watch for response in sidechannel messages...');
            return;
        }

        // ============ UTILITY COMMANDS ============
        
        if (this.input.startsWith("/get")) {
            const m = input.match(/(?:^|\s)--key(?:=|\s+)(\"[^\"]+\"|'[^']+'|\S+)/);
            const raw = m ? m[1].trim() : null;
            if (!raw) {
                console.log('Usage: /get --key "<hyperbee-key>" [--confirmed true|false] [--unconfirmed 1]');
                return;
            }
            const key = raw.replace(/^\"(.*)\"$/, "$1").replace(/^'(.*)'$/, "$1");
            const confirmedMatch = input.match(/(?:^|\s)--confirmed(?:=|\s+)(\S+)/);
            const unconfirmedMatch = input.match(/(?:^|\s)--unconfirmed(?:=|\s+)?(\S+)?/);
            const confirmed = unconfirmedMatch ? false : confirmedMatch ? confirmedMatch[1] === "true" || confirmedMatch[1] === "1" : true;
            const v = confirmed ? await this.getSigned(key) : await this.get(key);
            console.log(v);
            return;
        }
        if (this.input.startsWith("/msb")) {
            const txv = await this.peer.msbClient.getTxvHex();
            const peerMsbAddress = this.peer.msbClient.pubKeyHexToAddress(this.peer.wallet.publicKey);
            const entry = await this.peer.msbClient.getNodeEntryUnsigned(peerMsbAddress);
            const balance = entry?.balance ? bigIntToDecimalString(bufferToBigInt(entry.balance)) : 0;
            const feeBuf = this.peer.msbClient.getFee();
            const fee = feeBuf ? bigIntToDecimalString(bufferToBigInt(feeBuf)) : 0;
            const validators = this.peer.msbClient.getConnectedValidatorsCount();
            console.log({
                networkId: this.peer.msbClient.networkId,
                msbBootstrap: this.peer.msbClient.bootstrapHex,
                txv,
                msbSignedLength: this.peer.msbClient.getSignedLength(),
                msbUnsignedLength: this.peer.msbClient.getUnsignedLength(),
                connectedValidators: validators,
                peerMsbAddress,
                peerMsbBalance: balance,
                msbFee: fee,
            });
            return;
        }
        if (this.input.startsWith("/sc_join")) {
            const args = this.parseArgs(input);
            const name = args.channel || args.ch || args.name;
            const inviteArg = args.invite || args.invite_b64 || args.invitebase64;
            const welcomeArg = args.welcome || args.welcome_b64 || args.welcomebase64;
            if (!name) {
                console.log('Usage: /sc_join --channel "<name>" [--invite <json|b64|@file>] [--welcome <json|b64|@file>]');
                return;
            }
            if (!this.peer.sidechannel) {
                console.log('Sidechannel not initialized.');
                return;
            }
            let invite = null;
            if (inviteArg) {
                invite = parseInviteArg(inviteArg);
                if (!invite) {
                    console.log('Invalid invite. Pass JSON, base64, or @file.');
                    return;
                }
            }
            let welcome = null;
            if (welcomeArg) {
                welcome = parseWelcomeArg(welcomeArg);
                if (!welcome) {
                    console.log('Invalid welcome. Pass JSON, base64, or @file.');
                    return;
                }
            }
            if (invite || welcome) {
                this.peer.sidechannel.acceptInvite(String(name), invite, welcome);
            }
            const ok = await this.peer.sidechannel.addChannel(String(name));
            if (!ok) {
                console.log('Join denied (invite required or invalid).');
                return;
            }
            console.log('Joined sidechannel:', name);
            return;
        }
        if (this.input.startsWith("/sc_send")) {
            const args = this.parseArgs(input);
            const name = args.channel || args.ch || args.name;
            const message = args.message || args.msg;
            const inviteArg = args.invite || args.invite_b64 || args.invitebase64;
            const welcomeArg = args.welcome || args.welcome_b64 || args.welcomebase64;
            if (!name || message === undefined) {
                console.log('Usage: /sc_send --channel "<name>" --message "<text>" [--invite <json|b64|@file>] [--welcome <json|b64|@file>]');
                return;
            }
            if (!this.peer.sidechannel) {
                console.log('Sidechannel not initialized.');
                return;
            }
            let invite = null;
            if (inviteArg) {
                invite = parseInviteArg(inviteArg);
                if (!invite) {
                    console.log('Invalid invite. Pass JSON, base64, or @file.');
                    return;
                }
            }
            let welcome = null;
            if (welcomeArg) {
                welcome = parseWelcomeArg(welcomeArg);
                if (!welcome) {
                    console.log('Invalid welcome. Pass JSON, base64, or @file.');
                    return;
                }
            }
            if (invite || welcome) {
                this.peer.sidechannel.acceptInvite(String(name), invite, welcome);
            }
            const ok = await this.peer.sidechannel.addChannel(String(name));
            if (!ok) {
                console.log('Send denied (invite required or invalid).');
                return;
            }
            const sent = this.peer.sidechannel.broadcast(String(name), message, invite ? { invite } : undefined);
            if (!sent) {
                console.log('Send denied (owner-only or invite required).');
            }
            return;
        }
        if (this.input.startsWith("/sc_open")) {
            const args = this.parseArgs(input);
            const name = args.channel || args.ch || args.name;
            const via = args.via || args.channel_via;
            const inviteArg = args.invite || args.invite_b64 || args.invitebase64;
            const welcomeArg = args.welcome || args.welcome_b64 || args.welcomebase64;
            if (!name) {
                console.log('Usage: /sc_open --channel "<name>" [--via "<channel>"] [--invite <json|b64|@file>] [--welcome <json|b64|@file>]');
                return;
            }
            if (!this.peer.sidechannel) {
                console.log('Sidechannel not initialized.');
                return;
            }
            let invite = null;
            if (inviteArg) {
                invite = parseInviteArg(inviteArg);
                if (!invite) {
                    console.log('Invalid invite. Pass JSON, base64, or @file.');
                    return;
                }
            }
            let welcome = null;
            if (welcomeArg) {
                welcome = parseWelcomeArg(welcomeArg);
                if (!welcome) {
                    console.log('Invalid welcome. Pass JSON, base64, or @file.');
                    return;
                }
            } else if (typeof this.peer.sidechannel.getWelcome === 'function') {
                welcome = this.peer.sidechannel.getWelcome(String(name));
            }
            const viaChannel = via || this.peer.sidechannel.entryChannel || null;
            if (!viaChannel) {
                console.log('No entry channel configured. Pass --via "<channel>".');
                return;
            }
            this.peer.sidechannel.requestOpen(String(name), String(viaChannel), invite, welcome);
            console.log('Requested channel:', name);
            return;
        }
        if (this.input.startsWith("/sc_invite")) {
            const args = this.parseArgs(input);
            const channel = args.channel || args.ch || args.name;
            const invitee = args.pubkey || args.invitee || args.peer || args.key;
            const ttlRaw = args.ttl || args.ttl_sec || args.ttl_s;
            const welcomeArg = args.welcome || args.welcome_b64 || args.welcomebase64;
            if (!channel || !invitee) {
                console.log('Usage: /sc_invite --channel "<name>" --pubkey "<peer-pubkey-hex>" [--ttl <sec>] [--welcome <json|b64|@file>]');
                return;
            }
            if (!this.peer.sidechannel) {
                console.log('Sidechannel not initialized.');
                return;
            }
            if (this.peer?.wallet?.ready) {
                try {
                    await this.peer.wallet.ready;
                } catch (_e) {}
            }
            const walletPub = this.peer?.wallet?.publicKey;
            const inviterPubKey = walletPub
                ? typeof walletPub === 'string'
                    ? walletPub.trim().toLowerCase()
                    : b4a.toString(walletPub, 'hex')
                : null;
            if (!inviterPubKey) {
                console.log('Wallet not ready; cannot sign invite.');
                return;
            }
            let inviterAddress = null;
            try {
                if (this.peer?.msbClient) {
                    inviterAddress = this.peer.msbClient.pubKeyHexToAddress(inviterPubKey);
                }
            } catch (_e) {}
            const issuedAt = Date.now();
            let ttlMs = null;
            if (ttlRaw !== undefined) {
                const ttlSec = Number.parseInt(String(ttlRaw), 10);
                ttlMs = Number.isFinite(ttlSec) ? Math.max(ttlSec, 0) * 1000 : null;
            } else if (Number.isFinite(this.peer.sidechannel.inviteTtlMs) && this.peer.sidechannel.inviteTtlMs > 0) {
                ttlMs = this.peer.sidechannel.inviteTtlMs;
            } else {
                ttlMs = 0;
            }
            if (!ttlMs || ttlMs <= 0) {
                console.log('Invite TTL is required. Pass --ttl <sec> or set --sidechannel-invite-ttl.');
                return;
            }
            const expiresAt = issuedAt + ttlMs;
            const payload = normalizeInvitePayload({
                channel: String(channel),
                inviteePubKey: String(invitee).trim().toLowerCase(),
                inviterPubKey,
                inviterAddress,
                issuedAt,
                expiresAt,
                nonce: Math.random().toString(36).slice(2, 10),
                version: 1,
            });
            const message = stableStringify(payload);
            const msgBuf = b4a.from(message);
            let sig = this.peer.wallet.sign(msgBuf);
            let sigHex = '';
            if (typeof sig === 'string') {
                sigHex = sig;
            } else if (sig && sig.length > 0) {
                sigHex = b4a.toString(sig, 'hex');
            }
            if (!sigHex) {
                const walletSecret = this.peer?.wallet?.secretKey;
                const secretBuf = walletSecret
                    ? b4a.isBuffer(walletSecret)
                        ? walletSecret
                        : typeof walletSecret === 'string'
                            ? b4a.from(walletSecret, 'hex')
                            : b4a.from(walletSecret)
                    : null;
                if (secretBuf) {
                    const sigBuf = PeerWallet.sign(msgBuf, secretBuf);
                    if (sigBuf && sigBuf.length > 0) {
                        sigHex = b4a.toString(sigBuf, 'hex');
                    }
                }
            }
            let welcome = null;
            if (welcomeArg) {
                welcome = parseWelcomeArg(welcomeArg);
                if (!welcome) {
                    console.log('Invalid welcome. Pass JSON, base64, or @file.');
                    return;
                }
            } else if (typeof this.peer.sidechannel.getWelcome === 'function') {
                welcome = this.peer.sidechannel.getWelcome(String(channel));
            }
            const invite = { payload, sig: sigHex, welcome: welcome || undefined };
            const inviteJson = JSON.stringify(invite);
            const inviteB64 = b4a.toString(b4a.from(inviteJson), 'base64');
            if (!sigHex) {
                console.log('Failed to sign invite; wallet secret key unavailable.');
                return;
            }
            console.log(inviteJson);
            console.log('invite_b64:', inviteB64);
            return;
        }
        if (this.input.startsWith("/sc_welcome")) {
            const args = this.parseArgs(input);
            const channel = args.channel || args.ch || args.name;
            const text = args.text || args.message || args.msg;
            if (!channel || text === undefined) {
                console.log('Usage: /sc_welcome --channel "<name>" --text "<message>"');
                return;
            }
            if (!this.peer.sidechannel) {
                console.log('Sidechannel not initialized.');
                return;
            }
            if (this.peer?.wallet?.ready) {
                try {
                    await this.peer.wallet.ready;
                } catch (_e) {}
            }
            const walletPub = this.peer?.wallet?.publicKey;
            const ownerPubKey = walletPub
                ? typeof walletPub === 'string'
                    ? walletPub.trim().toLowerCase()
                    : b4a.toString(walletPub, 'hex')
                : null;
            if (!ownerPubKey) {
                console.log('Wallet not ready; cannot sign welcome.');
                return;
            }
            const payload = normalizeWelcomePayload({
                channel: String(channel),
                ownerPubKey,
                text: String(text),
                issuedAt: Date.now(),
                version: 1,
            });
            const message = stableStringify(payload);
            const msgBuf = b4a.from(message);
            let sig = this.peer.wallet.sign(msgBuf);
            let sigHex = '';
            if (typeof sig === 'string') {
                sigHex = sig;
            } else if (sig && sig.length > 0) {
                sigHex = b4a.toString(sig, 'hex');
            }
            if (!sigHex) {
                const walletSecret = this.peer?.wallet?.secretKey;
                const secretBuf = walletSecret
                    ? b4a.isBuffer(walletSecret)
                        ? walletSecret
                        : typeof walletSecret === 'string'
                            ? b4a.from(walletSecret, 'hex')
                            : b4a.from(walletSecret)
                    : null;
                if (secretBuf) {
                    const sigBuf = PeerWallet.sign(msgBuf, secretBuf);
                    if (sigBuf && sigBuf.length > 0) {
                        sigHex = b4a.toString(sigBuf, 'hex');
                    }
                }
            }
            if (!sigHex) {
                console.log('Failed to sign welcome; wallet secret key unavailable.');
                return;
            }
            const welcome = { payload, sig: sigHex };
            // Store the welcome in-memory so the owner peer can auto-send it to new connections
            // without requiring a restart (and so /sc_invite can embed it by default).
            try {
                this.peer.sidechannel.acceptInvite(String(channel), null, welcome);
            } catch (_e) {}
            const welcomeJson = JSON.stringify(welcome);
            const welcomeB64 = b4a.toString(b4a.from(welcomeJson), 'base64');
            console.log(welcomeJson);
            console.log('welcome_b64:', welcomeB64);
            return;
        }
        if (this.input.startsWith("/sc_stats")) {
            if (!this.peer.sidechannel) {
                console.log('Sidechannel not initialized.');
                return;
            }
            const channels = Array.from(this.peer.sidechannel.channels.keys());
            const connectionCount = this.peer.sidechannel.connections.size;
            console.log({ channels, connectionCount });
            return;
        }
    }
}

export default AgentRpcProtocol;
