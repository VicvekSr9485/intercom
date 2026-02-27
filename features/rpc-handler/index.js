import Feature from 'trac-peer/src/artifacts/feature.js';

/**
 * RPC Handler Feature
 * 
 * Processes incoming JSON-RPC 2.0 requests from sidechannels and executes registered tools.
 * Providers register their tools here, and the handler automatically responds to requests.
 */
class RpcHandler extends Feature {
  constructor(peer, config = {}) {
    super(peer, config);
    this.key = 'rpc-handler';
    this.tools = new Map(); // Map<methodName, toolFunction>
    this.debug = config.debug === true;
    this.enabledChannels = config.enabledChannels || null; // null = all channels
    this.autoRegisterInContract = config.autoRegisterInContract !== false;
  }

  /**
   * Register a tool (callable method)
   * 
   * @param {string} methodName - JSON-RPC method name
   * @param {Function} handler - async function(params) => result
   * @param {Object} metadata - { description, priceInTNK, category, serviceId }
   */
  registerTool(methodName, handler, metadata = {}) {
    if (typeof handler !== 'function') {
      throw new Error('Tool handler must be a function');
    }

    this.tools.set(methodName, {
      handler,
      metadata: {
        description: metadata.description || '',
        priceInTNK: metadata.priceInTNK || '0',
        category: metadata.category || 'general',
        serviceId: metadata.serviceId || methodName
      }
    });

    if (this.debug) {
      console.log(`[RPC Handler] Registered tool: ${methodName}`);
    }

    // Auto-register in contract if enabled and peer protocol is ready
    if (this.autoRegisterInContract && this.peer?.protocol?.instance?.tx) {
      this._registerInContract(methodName, metadata).catch(err => {
        console.error(`[RPC Handler] Failed to register ${methodName} in contract:`, err.message);
      });
    }
  }

  /**
   * Register the tool in the contract registry
   */
  async _registerInContract(methodName, metadata) {
    try {
      const command = JSON.stringify({
        op: 'register_service',
        serviceId: metadata.serviceId || methodName,
        method: methodName,
        description: metadata.description || `RPC method: ${methodName}`,
        priceInTNK: String(metadata.priceInTNK || '0'),
        category: metadata.category || 'general'
      });

      // Use protocol.instance.tx() directly (bypasses apiTxExposed guard)
      await this.peer.protocol.instance.tx({ command });
      
      if (this.debug) {
        console.log(`[RPC Handler] Registered ${methodName} in contract`);
      }
    } catch (err) {
      // Service might already exist, or peer isn't writable yet - silently skip
      if (this.debug && !err.message?.includes('already exists') && !err.message?.includes('not writable') && !err.message?.includes('command not found')) {
        console.error(`[RPC Handler] Contract registration error:`, err.message);
      }
    }
  }

  /**
   * Handle incoming sidechannel message
   * Checks if it's a JSON-RPC request and processes it
   * 
   * @param {string} channel - Sidechannel name
   * @param {any} payload - Message payload
   * @param {Object} connection - Connection metadata
   */
  async handleMessage(channel, payload, connection) {
    // Check if we should process this channel
    if (this.enabledChannels && !this.enabledChannels.includes(channel)) {
      return null; // Not for us
    }

    // Try to parse as JSON-RPC
    const request = this._parseJsonRpc(payload);
    if (!request) {
      return null; // Not a valid JSON-RPC request
    }

    if (this.debug) {
      console.log(`[RPC Handler] Received request on ${channel}:`, request);
    }

    // Check if we have this tool
    const tool = this.tools.get(request.method);
    if (!tool) {
      const errorResponse = {
        jsonrpc: '2.0',
        error: {
          code: -32601,
          message: `Method not found: ${request.method}`
        },
        id: request.id
      };
      return errorResponse;
    }

    // Execute the tool
    try {
      const result = await tool.handler(request.params || []);
      
      const successResponse = {
        jsonrpc: '2.0',
        result: result,
        id: request.id
      };

      if (this.debug) {
        console.log(`[RPC Handler] Executed ${request.method}, returning result`);
      }

      return successResponse;
    } catch (err) {
      const errorResponse = {
        jsonrpc: '2.0',
        error: {
          code: -32000,
          message: err.message || 'Internal error'
        },
        id: request.id
      };

      if (this.debug) {
        console.error(`[RPC Handler] Error executing ${request.method}:`, err);
      }

      return errorResponse;
    }
  }

  /**
   * Parse and validate JSON-RPC 2.0 request
   */
  _parseJsonRpc(payload) {
    let json;
    try {
      if (typeof payload === 'string') {
        json = JSON.parse(payload);
      } else if (typeof payload === 'object' && payload !== null) {
        json = payload;
      } else {
        return null;
      }
    } catch (err) {
      return null;
    }

    // Validate JSON-RPC 2.0 format
    if (json.jsonrpc !== '2.0') return null;
    if (typeof json.method !== 'string') return null;
    if (json.id === undefined) return null; // Notification vs request

    return {
      jsonrpc: json.jsonrpc,
      method: json.method,
      params: json.params || [],
      id: json.id
    };
  }

  /**
   * Get list of registered tools
   */
  listTools() {
    const tools = [];
    for (const [methodName, tool] of this.tools.entries()) {
      tools.push({
        method: methodName,
        ...tool.metadata
      });
    }
    return tools;
  }

  /**
   * Start the handler (called by peer)
   */
  async start() {
    if (this.debug) {
      console.log(`[RPC Handler] Started with ${this.tools.size} tools`);
    }
  }

  /**
   * Stop the handler
   */
  async stop() {
    if (this.debug) {
      console.log('[RPC Handler] Stopped');
    }
  }
}

export { RpcHandler };
export default RpcHandler;
