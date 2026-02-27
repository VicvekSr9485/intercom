/**
 * Example RPC Tools
 * 
 * These are reference implementations of tools that providers can register.
 * Each tool is an async function that takes params and returns a result.
 */

/**
 * Calculator Tool - Basic arithmetic operations
 */
export const calculator = {
  add: async (params) => {
    if (!Array.isArray(params) || params.length !== 2) {
      throw new Error('add requires exactly 2 numeric parameters');
    }
    const [a, b] = params.map(Number);
    if (isNaN(a) || isNaN(b)) {
      throw new Error('Parameters must be numbers');
    }
    return a + b;
  },

  subtract: async (params) => {
    if (!Array.isArray(params) || params.length !== 2) {
      throw new Error('subtract requires exactly 2 numeric parameters');
    }
    const [a, b] = params.map(Number);
    if (isNaN(a) || isNaN(b)) {
      throw new Error('Parameters must be numbers');
    }
    return a - b;
  },

  multiply: async (params) => {
    if (!Array.isArray(params) || params.length !== 2) {
      throw new Error('multiply requires exactly 2 numeric parameters');
    }
    const [a, b] = params.map(Number);
    if (isNaN(a) || isNaN(b)) {
      throw new Error('Parameters must be numbers');
    }
    return a * b;
  },

  divide: async (params) => {
    if (!Array.isArray(params) || params.length !== 2) {
      throw new Error('divide requires exactly 2 numeric parameters');
    }
    const [a, b] = params.map(Number);
    if (isNaN(a) || isNaN(b)) {
      throw new Error('Parameters must be numbers');
    }
    if (b === 0) {
      throw new Error('Division by zero');
    }
    return a / b;
  }
};

/**
 * Echo Tool - Returns input (useful for testing)
 */
export const echo = async (params) => {
  return params;
};

/**
 * Timestamp Tool - Returns current Unix timestamp
 */
export const timestamp = async (params) => {
  const format = params?.[0] || 'ms';
  const now = Date.now();
  
  switch (format) {
    case 'ms':
      return now;
    case 's':
    case 'sec':
      return Math.floor(now / 1000);
    case 'iso':
      return new Date(now).toISOString();
    default:
      return now;
  }
};

/**
 * Hash Tool - Generate SHA256 hash of input
 */
export const hash = async (params) => {
  if (!params?.[0]) {
    throw new Error('hash requires input string');
  }
  
  const crypto = await import('crypto');
  const input = String(params[0]);
  return crypto.createHash('sha256').update(input).digest('hex');
};

/**
 * Random Tool - Generate random values
 */
export const random = {
  number: async (params) => {
    const min = Number(params?.[0]) || 0;
    const max = Number(params?.[1]) || 100;
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },

  string: async (params) => {
    const length = Number(params?.[0]) || 16;
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  },

  uuid: async () => {
    const crypto = await import('crypto');
    return crypto.randomUUID();
  }
};

/**
 * Text Tool - Text manipulation utilities
 */
export const text = {
  uppercase: async (params) => {
    if (!params?.[0]) throw new Error('uppercase requires text parameter');
    return String(params[0]).toUpperCase();
  },

  lowercase: async (params) => {
    if (!params?.[0]) throw new Error('lowercase requires text parameter');
    return String(params[0]).toLowerCase();
  },

  reverse: async (params) => {
    if (!params?.[0]) throw new Error('reverse requires text parameter');
    return String(params[0]).split('').reverse().join('');
  },

  length: async (params) => {
    if (!params?.[0]) throw new Error('length requires text parameter');
    return String(params[0]).length;
  },

  words: async (params) => {
    if (!params?.[0]) throw new Error('words requires text parameter');
    return String(params[0]).trim().split(/\s+/).length;
  }
};

/**
 * Encode/Decode Tool
 */
export const encode = {
  base64: async (params) => {
    if (!params?.[0]) throw new Error('base64 requires input string');
    const b4a = await import('b4a');
    return b4a.toString(b4a.from(String(params[0]), 'utf8'), 'base64');
  },

  hex: async (params) => {
    if (!params?.[0]) throw new Error('hex requires input string');
    const b4a = await import('b4a');
    return b4a.toString(b4a.from(String(params[0]), 'utf8'), 'hex');
  }
};

export const decode = {
  base64: async (params) => {
    if (!params?.[0]) throw new Error('base64 requires input string');
    const b4a = await import('b4a');
    return b4a.toString(b4a.from(String(params[0]), 'base64'), 'utf8');
  },

  hex: async (params) => {
    if (!params?.[0]) throw new Error('hex requires input string');
    const b4a = await import('b4a');
    return b4a.toString(b4a.from(String(params[0]), 'hex'), 'utf8');
  }
};

/**
 * Helper to register all tools in a namespace
 */
export function registerNamespace(rpcHandler, namespace, tools, options = {}) {
  const { prefix = '', priceInTNK = '0', category = 'general' } = options;
  
  for (const [name, handler] of Object.entries(tools)) {
    const methodName = prefix ? `${prefix}.${name}` : name;
    rpcHandler.registerTool(methodName, handler, {
      description: `${namespace} - ${name}`,
      priceInTNK,
      category,
      serviceId: methodName.replace(/\./g, '_')
    });
  }
}

/**
 * Helper to register all example tools
 */
export function registerAllExampleTools(rpcHandler, options = {}) {
  const { priceInTNK = '0.1', debug = false } = options;

  // Calculator tools
  registerNamespace(rpcHandler, 'Calculator', calculator, {
    prefix: 'calc',
    priceInTNK,
    category: 'math'
  });

  // Random tools
  registerNamespace(rpcHandler, 'Random', random, {
    prefix: 'random',
    priceInTNK,
    category: 'utilities'
  });

  // Text tools
  registerNamespace(rpcHandler, 'Text', text, {
    prefix: 'text',
    priceInTNK,
    category: 'utilities'
  });

  // Encode/Decode tools
  registerNamespace(rpcHandler, 'Encode', encode, {
    prefix: 'encode',
    priceInTNK,
    category: 'utilities'
  });

  registerNamespace(rpcHandler, 'Decode', decode, {
    prefix: 'decode',
    priceInTNK,
    category: 'utilities'
  });

  // Simple tools
  rpcHandler.registerTool('echo', echo, {
    description: 'Echo back the input parameters',
    priceInTNK: '0',
    category: 'utilities',
    serviceId: 'echo'
  });

  rpcHandler.registerTool('timestamp', timestamp, {
    description: 'Get current timestamp in various formats',
    priceInTNK: '0',
    category: 'utilities',
    serviceId: 'timestamp'
  });

  rpcHandler.registerTool('hash', hash, {
    description: 'Generate SHA256 hash of input',
    priceInTNK: '0.1',
    category: 'crypto',
    serviceId: 'hash'
  });

  if (debug) {
    console.log(`[RPC Tools] Registered ${rpcHandler.listTools().length} example tools`);
  }
}
