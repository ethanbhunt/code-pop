/**
 * Bootstrap Coordination Service
 * Manages multiple bootstrap node connections with automatic failover and health checking.
 * 
 * Allows peer nodes to:
 * - Connect to primary bootstrap node
 * - Automatically failover to secondary/tertiary bootstrap nodes if primary fails
 * - Health-check all bootstrap nodes periodically
 * - Re-connect to primary when it comes back online
 * - Load-balance across healthy bootstrap nodes for peer registration
 */

const axios = require('axios');

class BootstrapCoordinator {
  constructor(bootstrapAddresses = []) {
    // Array of bootstrap node URLs ordered by preference
    // e.g., ['http://localhost:3000', 'http://10.0.0.1:3000', 'http://10.0.0.2:3000']
    this.bootstrapAddresses = bootstrapAddresses;
    
    // Track health status of each bootstrap node
    // { url: { healthy: boolean, lastCheck: timestamp, failureCount: number } }
    this.bootstrapStatus = {};
    
    // Initialize status for each bootstrap node
    bootstrapAddresses.forEach(url => {
      this.bootstrapStatus[url] = {
        healthy: true, // Assume healthy until proven otherwise
        lastCheck: 0,
        failureCount: 0,
        successCount: 0,
      };
    });
    
    // Health check interval (default 30 seconds)
    this.healthCheckInterval = 30000;
    
    // Failure threshold before marking node unhealthy (3 consecutive failures)
    this.failureThreshold = 3;
    
    // Recovery threshold (5 consecutive successes to mark as healthy)
    this.recoveryThreshold = 5;
    
    // Health check timeout (5 seconds per check)
    this.healthCheckTimeout = 5000;
    
    // Active health check interval ID
    this.checkIntervalId = null;
  }

  /**
   * Start periodic health checks on all bootstrap nodes
   */
  startHealthChecks() {
    if (this.checkIntervalId) {
      console.log('[BootstrapCoordinator] Health checks already running');
      return;
    }

    console.log('[BootstrapCoordinator] Starting health checks on bootstrap nodes');
    
    // Run initial check immediately
    this.performHealthCheck();
    
    // Schedule periodic checks
    this.checkIntervalId = setInterval(() => {
      this.performHealthCheck();
    }, this.healthCheckInterval);
  }

  /**
   * Stop periodic health checks
   */
  stopHealthChecks() {
    if (this.checkIntervalId) {
      clearInterval(this.checkIntervalId);
      this.checkIntervalId = null;
      console.log('[BootstrapCoordinator] Health checks stopped');
    }
  }

  /**
   * Perform health check on all bootstrap nodes
   */
  async performHealthCheck() {
    const checkResults = await Promise.all(
      this.bootstrapAddresses.map(url => this.checkBootstrapHealth(url))
    );

    // Log summary
    const healthyCount = checkResults.filter(r => r.healthy).length;
    const totalCount = this.bootstrapAddresses.length;
    console.log(
      `[BootstrapCoordinator] Health check complete: ${healthyCount}/${totalCount} nodes healthy`
    );
  }

  /**
   * Check health of a single bootstrap node
   */
  async checkBootstrapHealth(url) {
    try {
      const response = await axios.get(`${url}/peers/stats`, {
        timeout: this.healthCheckTimeout,
      });

      // Success - update status
      const status = this.bootstrapStatus[url];
      status.lastCheck = Date.now();
      status.successCount++;
      status.failureCount = 0;

      // Mark as healthy if recovery threshold reached
      if (status.successCount >= this.recoveryThreshold && !status.healthy) {
        console.log(`[BootstrapCoordinator] Bootstrap node ${url} recovered and marked healthy`);
        status.healthy = true;
        status.successCount = 0;
      }

      return { url, healthy: true };
    } catch (error) {
      // Failure - update status
      const status = this.bootstrapStatus[url];
      status.lastCheck = Date.now();
      status.failureCount++;
      status.successCount = 0;

      // Mark as unhealthy if failure threshold reached
      if (status.failureCount >= this.failureThreshold && status.healthy) {
        console.log(`[BootstrapCoordinator] Bootstrap node ${url} failed health check, marked unhealthy`);
        status.healthy = false;
        status.failureCount = 0;
      }

      return { url, healthy: false, error: error.message };
    }
  }

  /**
   * Get the best available bootstrap node for connection
   * Returns the first healthy node, falling back to unhealthy nodes if none healthy
   */
  getAvailableBootstrapNode() {
    // Try to find a healthy node first
    for (const url of this.bootstrapAddresses) {
      if (this.bootstrapStatus[url].healthy) {
        return url;
      }
    }

    // If no healthy nodes, return the first one (with warning)
    if (this.bootstrapAddresses.length > 0) {
      console.warn(
        '[BootstrapCoordinator] No healthy bootstrap nodes available, using fallback:',
        this.bootstrapAddresses[0]
      );
      return this.bootstrapAddresses[0];
    }

    throw new Error('No bootstrap addresses configured');
  }

  /**
   * Try to register peer with bootstrap nodes in sequence
   * Automatically fails over to next bootstrap if one fails
   */
  async registerPeerWithFailover(peerId, metadata) {
    const errors = [];

    // Try each bootstrap node in order until one succeeds
    for (const url of this.bootstrapAddresses) {
      try {
        console.log(`[BootstrapCoordinator] Attempting peer registration at ${url}`);
        
        const response = await axios.post(`${url}/peers/register`, {
          peerId,
          ...metadata,
        }, {
          timeout: this.healthCheckTimeout,
        });

        console.log(`[BootstrapCoordinator] Peer ${peerId} registered successfully at ${url}`);
        return { success: true, bootstrapUrl: url, response: response.data };
      } catch (error) {
        const errorMsg = `${url}: ${error.message}`;
        errors.push(errorMsg);
        console.warn(`[BootstrapCoordinator] Registration failed at ${url}, trying next bootstrap...`);
      }
    }

    // All bootstrap nodes failed
    const errorDetail = errors.join('; ');
    throw new Error(
      `Failed to register peer at any bootstrap node. Errors: ${errorDetail}`
    );
  }

  /**
   * Try to send heartbeat with bootstrap nodes in sequence
   * Automatically fails over to next bootstrap if one fails
   */
  async heartbeatPeerWithFailover(peerId) {
    const errors = [];

    // Try each bootstrap node in order until one succeeds
    for (const url of this.bootstrapAddresses) {
      try {
        const response = await axios.post(
          `${url}/peers/heartbeat/${peerId}`,
          { timestamp: Date.now() },
          { timeout: this.healthCheckTimeout }
        );

        return { success: true, bootstrapUrl: url, response: response.data };
      } catch (error) {
        const errorMsg = `${url}: ${error.message}`;
        errors.push(errorMsg);
        console.warn(`[BootstrapCoordinator] Heartbeat failed at ${url}, trying next bootstrap...`);
      }
    }

    // All bootstrap nodes failed - log but don't throw (heartbeat failures are recoverable)
    console.error(
      `[BootstrapCoordinator] Heartbeat failed at all bootstrap nodes: ${errors.join('; ')}`
    );
    return { success: false, errors };
  }

  /**
   * Get status of all bootstrap nodes
   */
  getBootstrapStatus() {
    const healthyNodes = [];
    const unhealthyNodes = [];

    for (const url of this.bootstrapAddresses) {
      const status = this.bootstrapStatus[url];
      if (status.healthy) {
        healthyNodes.push({ url, ...status });
      } else {
        unhealthyNodes.push({ url, ...status });
      }
    }

    return {
      total: this.bootstrapAddresses.length,
      healthy: healthyNodes.length,
      unhealthy: unhealthyNodes.length,
      healthyNodes,
      unhealthyNodes,
    };
  }

  /**
   * Reconfigure bootstrap addresses (useful for dynamic topology changes)
   */
  reconfigureBootstrap(bootstrapAddresses) {
    console.log('[BootstrapCoordinator] Reconfiguring bootstrap addresses:', bootstrapAddresses);
    
    this.bootstrapAddresses = bootstrapAddresses;
    this.bootstrapStatus = {};
    
    bootstrapAddresses.forEach(url => {
      this.bootstrapStatus[url] = {
        healthy: true,
        lastCheck: 0,
        failureCount: 0,
        successCount: 0,
      };
    });
  }
}

module.exports = BootstrapCoordinator;
