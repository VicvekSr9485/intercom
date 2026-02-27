import {Contract} from 'trac-peer'

/**
 * Agent RPC Contract
 * 
 * A decentralized service registry for autonomous agents to register and discover
 * callable RPC methods. Agents can expose their capabilities (tools, APIs, compute)
 * and charge TNK for remote procedure calls executed over sidechannels.
 * 
 * Architecture:
 * - Contract: Global service registry (who offers what, at what price)
 * - Sidechannel: P2P transport layer for JSON-RPC requests/responses
 * - MSB: Payment settlement in TNK
 * 
 * Storage schema:
 * - services/<serviceId> -> { method, description, priceInTNK, providerPubKey, providerAddress, timestamp }
 * - services_index -> array of serviceIds
 * - providers/<providerAddress> -> array of serviceIds owned by this provider
 */
class AgentRpcContract extends Contract {
    constructor(protocol, options = {}) {
        super(protocol, options);

        // Register service (create new RPC endpoint)
        this.addSchema('registerService', {
            value : {
                $$strict : true,
                $$type: "object",
                op : { type : "string", enum: ["register_service"] },
                serviceId : { type : "string", min : 1, max: 64 },
                method : { type : "string", min : 1, max: 128 },
                description : { type : "string", min : 0, max: 500 },
                priceInTNK : { type : "string", min : 1, max: 32 },  // decimal string
                category : { type : "string", optional: true, max: 64 }
            }
        });

        // Update service details
        this.addSchema('updateService', {
            value : {
                $$strict : true,
                $$type: "object",
                op : { type : "string", enum: ["update_service"] },
                serviceId : { type : "string", min : 1, max: 64 },
                description : { type : "string", optional: true, max: 500 },
                priceInTNK : { type : "string", optional: true, max: 32 },
                category : { type : "string", optional: true, max: 64 }
            }
        });

        // Remove service
        this.addSchema('removeService', {
            value : {
                $$strict : true,
                $$type: "object",
                op : { type : "string", enum: ["remove_service"] },
                serviceId : { type : "string", min : 1, max: 64 }
            }
        });

        // Read helpers (no state writes)
        this.addFunction('listServices');
        this.addFunction('getServiceById');
        this.addFunction('getProviderServices');
        
        this.addSchema('getService', {
            value : {
                $$strict : true,
                $$type: "object",
                op : { type : "string", enum: ["get_service"] },
                serviceId : { type : "string", min : 1, max: 64 }
            }
        });

        this.addSchema('getProviderSvcs', {
            value : {
                $$strict : true,
                $$type: "object",
                op : { type : "string", enum: ["get_provider_services"] },
                providerAddress : { type : "string", min : 1, max: 128 }
            }
        });

        // Timer feature (for timestamping service registrations)
        const _this = this;
        this.addSchema('feature_entry', {
            key : { type : "string", min : 1, max: 256 },
            value : { type : "any" }
        });

        this.addFeature('timer_feature', async function(){
            if(false === _this.check.validateSchema('feature_entry', _this.op)) return;
            if(_this.op.key === 'currentTime') {
                if(null === await _this.get('currentTime')) console.log('Agent RPC started at', _this.op.value);
                await _this.put(_this.op.key, _this.op.value);
            }
        });
    }

    /**
     * Register a new RPC service
     * Provider agents call this to expose their capabilities
     */
    async registerService(){
        const { serviceId, method, description, priceInTNK, category } = this.value;

        // Check if service already exists
        const existing = await this.get(`services/${serviceId}`);
        if(existing !== null) {
            console.log('Service already exists:', serviceId);
            return new Error('Service already exists');
        }

        // Get provider's public key and address
        const providerAddress = this.address;
        const currentTime = await this.get('currentTime');

        // Create service entry
        const service = {
            serviceId,
            method,
            description,
            priceInTNK,
            category: category || 'general',
            providerAddress,
            timestamp: currentTime,
            active: true
        };

        // Store service
        await this.put(`services/${serviceId}`, service);

        // Update global index
        let index = await this.get('services_index') || [];
        if (!Array.isArray(index)) index = [];
        index.push(serviceId);
        await this.put('services_index', index);

        // Update provider's service list
        let providerServices = await this.get(`providers/${providerAddress}`) || [];
        if (!Array.isArray(providerServices)) providerServices = [];
        providerServices.push(serviceId);
        await this.put(`providers/${providerAddress}`, providerServices);

        console.log('Service registered:', serviceId, 'by', providerAddress);
    }

    /**
     * Update an existing RPC service (only by owner)
     */
    async updateService(){
        const { serviceId, description, priceInTNK, category } = this.value;

        // Get existing service
        const service = await this.get(`services/${serviceId}`);
        if(service === null) {
            console.log('Service not found:', serviceId);
            return new Error('Service not found');
        }

        // Verify ownership
        if(service.providerAddress !== this.address) {
            console.log('Not authorized:', this.address);
            return new Error('Not authorized');
        }

        // Update fields
        if(description !== undefined) service.description = description;
        if(priceInTNK !== undefined) service.priceInTNK = priceInTNK;
        if(category !== undefined) service.category = category;

        // Store updated service
        await this.put(`services/${serviceId}`, service);

        console.log('Service updated:', serviceId);
    }

    /**
     * Remove an RPC service (only by owner)
     */
    async removeService(){
        const { serviceId } = this.value;

        // Get existing service
        const service = await this.get(`services/${serviceId}`);
        if(service === null) {
            console.log('Service not found:', serviceId);
            return new Error('Service not found');
        }

        // Verify ownership
        if(service.providerAddress !== this.address) {
            console.log('Not authorized:', this.address);
            return new Error('Not authorized');
        }

        const providerAddress = service.providerAddress;

        // Mark as inactive (don't delete for audit trail)
        service.active = false;
        await this.put(`services/${serviceId}`, service);

        // Remove from global index
        let index = await this.get('services_index') || [];
        if (Array.isArray(index)) {
            index = index.filter(id => id !== serviceId);
            await this.put('services_index', index);
        }

        // Remove from provider's service list
        let providerServices = await this.get(`providers/${providerAddress}`) || [];
        if (Array.isArray(providerServices)) {
            providerServices = providerServices.filter(id => id !== serviceId);
            await this.put(`providers/${providerAddress}`, providerServices);
        }

        console.log('Service removed:', serviceId);
    }

    /**
     * List all active services
     */
    async listServices(){
        const index = await this.get('services_index') || [];
        const services = [];

        for(const serviceId of index) {
            const service = await this.get(`services/${serviceId}`);
            if(service && service.active) {
                services.push(service);
            }
        }

        console.log('Active services:', services.length);
        console.log(JSON.stringify(services, null, 2));
    }

    /**
     * Get a specific service by ID
     */
    async getServiceById(){
        const { serviceId } = this.value;
        const service = await this.get(`services/${serviceId}`);
        
        if(service && service.active) {
            console.log('Service:', JSON.stringify(service, null, 2));
        } else {
            console.log('Service not found or inactive:', serviceId);
        }
    }

    /**
     * Get all services provided by a specific provider
     */
    async getProviderServices(){
        const { providerAddress } = this.value;
        const serviceIds = await this.get(`providers/${providerAddress}`) || [];
        const services = [];

        for(const serviceId of serviceIds) {
            const service = await this.get(`services/${serviceId}`);
            if(service && service.active) {
                services.push(service);
            }
        }

        console.log('Provider services:', providerAddress);
        console.log(JSON.stringify(services, null, 2));
    }
}

export default AgentRpcContract;
