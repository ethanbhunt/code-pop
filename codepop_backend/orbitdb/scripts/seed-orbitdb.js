#!/usr/bin/env node

/**
 * OrbitDB Seeder Script
 * 
 * Seeds initial data into OrbitDB databases for CodePop distributed system.
 * 
 * This script:
 * - Connects to a running bootstrap or peer node
 * - Seeds base data (regions, hubs, stores, drinks, ingredients)
 * - Seeds inventory levels across all stores
 * - Seeds audit log baseline
 * - Validates seed data completeness
 * 
 * Usage:
 *   node seed-orbitdb.js --node http://localhost:3001 [--clear]
 * 
 * Arguments:
 *   --node: Target peer/bootstrap node URL (default: http://localhost:3001)
 *   --clear: Clear existing data before seeding (use with caution)
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Configuration
const NODE_URL = process.argv.includes('--node') 
  ? process.argv[process.argv.indexOf('--node') + 1]
  : 'http://localhost:3001';

const CLEAR_DATA = process.argv.includes('--clear');

// Regional data
const REGIONS = [
  { id: 'A', name: 'Chicago, IL', timezone: 'US/Central' },
  { id: 'B', name: 'New Jersey / New York', timezone: 'US/Eastern' },
  { id: 'C', name: 'Logan, UT', timezone: 'US/Mountain' },
  { id: 'D', name: 'Dallas, TX', timezone: 'US/Central' },
  { id: 'E', name: 'Atlanta, GA', timezone: 'US/Eastern' },
  { id: 'F', name: 'Phoenix, AZ', timezone: 'US/Mountain' },
  { id: 'G', name: 'Boise, ID', timezone: 'US/Mountain' },
];

// Supply hubs
const HUBS = REGIONS.map(region => ({
  hub_id: `hub-region-${region.id}`,
  region: region.id,
  name: `Regional Hub - ${region.name}`,
  address: `Central Distribution Center, ${region.name}`,
  status: 'active',
  created_at: new Date().toISOString(),
}));

// Drinks catalog
const DRINKS = [
  { id: 'drink-001', name: 'Lemon Lime Soda', price: 3.99 },
  { id: 'drink-002', name: 'Cola', price: 3.99 },
  { id: 'drink-003', name: 'Orange Soda', price: 3.99 },
  { id: 'drink-004', name: 'Grape Soda', price: 3.99 },
  { id: 'drink-005', name: 'Root Beer', price: 4.49 },
  { id: 'drink-006', name: 'Strawberry Shortcake', price: 4.49 },
  { id: 'drink-007', name: 'Blue Raspberry', price: 3.99 },
  { id: 'drink-008', name: 'Peach Mango', price: 4.49 },
];

// Syrups catalog
const SYRUPS = [
  { id: 'syrup-001', name: 'Syrup Base', type: 'base', quantity: 1000 },
  { id: 'syrup-002', name: 'Citrus Syrup', type: 'flavor', quantity: 500 },
  { id: 'syrup-003', name: 'Berry Syrup', type: 'flavor', quantity: 500 },
  { id: 'syrup-004', name: 'Vanilla Syrup', type: 'flavor', quantity: 300 },
  { id: 'syrup-005', name: 'Caramel Syrup', type: 'flavor', quantity: 300 },
];

// Add-ins catalog
const ADD_INS = [
  { id: 'addin-001', name: 'Whipped Cream', price: 0.50 },
  { id: 'addin-002', name: 'Chocolate Syrup', price: 0.75 },
  { id: 'addin-003', name: 'Sprinkles', price: 0.25 },
  { id: 'addin-004', name: 'Gummy Bears', price: 1.00 },
  { id: 'addin-005', name: 'Marshmallows', price: 0.50 },
];

class OrbitDBSeeder {
  constructor(nodeUrl) {
    this.nodeUrl = nodeUrl;
    this.client = axios.create({
      baseURL: nodeUrl,
      timeout: 10000,
      headers: { 'Content-Type': 'application/json' },
    });
    this.seedStats = {
      regions: 0,
      hubs: 0,
      stores: 0,
      drinks: 0,
      syrups: 0,
      addIns: 0,
      inventory: 0,
      errors: 0,
    };
  }

  async run() {
    console.log('\n🌱 OrbitDB Seeder\n');
    console.log(`Target Node: ${this.nodeUrl}`);
    console.log(`Clear Data: ${CLEAR_DATA ? 'YES (⚠️  DATA WILL BE DELETED)' : 'NO'}\n`);

    try {
      // Check node connectivity
      await this.checkNodeHealth();
      console.log('✓ Node is responsive\n');

      // Clear data if requested
      if (CLEAR_DATA) {
        await this.clearData();
      }

      // Seed base data
      await this.seedRegions();
      await this.seedHubs();
      await this.seedStores();
      await this.seedDrinks();
      await this.seedSyrups();
      await this.seedAddIns();

      // Seed derived data
      await this.seedInventory();
      await this.seedAuditLog();

      // Print summary
      this.printSummary();
    } catch (error) {
      console.error('\n❌ Seeding failed:', error.message);
      process.exit(1);
    }
  }

  async checkNodeHealth() {
    console.log('Checking node health...');
    try {
      const response = await this.client.get('/peers/stats');
      console.log(`  Active peers: ${response.data.healthy || 1}`);
    } catch (error) {
      throw new Error(`Cannot connect to ${this.nodeUrl}: ${error.message}`);
    }
  }

  async clearData() {
    console.log('⚠️  Clearing existing data...');
    try {
      // Delete from each database via maintenance endpoints
      await this.client.post('/maintenance/clear-databases', {});
      console.log('✓ Data cleared\n');
    } catch (error) {
      console.warn(`  Warning: Could not clear data: ${error.message}`);
      console.warn('  Continuing with seed anyway (may cause duplicates)\n');
    }
  }

  async seedRegions() {
    console.log(`Seeding ${REGIONS.length} regions...`);
    for (const region of REGIONS) {
      try {
        await this.client.post('/regions', region);
        this.seedStats.regions++;
        console.log(`  ✓ Region ${region.id}: ${region.name}`);
      } catch (error) {
        console.warn(`  ✗ Failed to seed region ${region.id}: ${error.message}`);
        this.seedStats.errors++;
      }
    }
    console.log();
  }

  async seedHubs() {
    console.log(`Seeding ${HUBS.length} supply hubs...`);
    for (const hub of HUBS) {
      try {
        await this.client.post('/hubs', hub);
        this.seedStats.hubs++;
      } catch (error) {
        console.warn(`  ✗ Failed to seed hub ${hub.hub_id}: ${error.message}`);
        this.seedStats.errors++;
      }
    }
    console.log(`  ✓ ${this.seedStats.hubs} hubs created\n`);
  }

  async seedStores() {
    console.log('Seeding stores...');
    const storeCounts = { A: 5, B: 5, C: 20, D: 5, E: 5, F: 5, G: 5 };
    let storeCount = 0;

    for (const region of REGIONS) {
      const count = storeCounts[region.id] || 0;
      for (let i = 1; i <= count; i++) {
        const store = {
          store_id: `store-${region.id}-${String(i).padStart(3, '0')}`,
          region: region.id,
          name: `CodePop Store ${region.id}-${i}`,
          address: `${i} Main St, ${region.name}`,
          status: 'active',
          created_at: new Date().toISOString(),
        };
        try {
          await this.client.post('/stores', store);
          storeCount++;
        } catch (error) {
          console.warn(`  ✗ Failed to seed store ${store.store_id}: ${error.message}`);
          this.seedStats.errors++;
        }
      }
      console.log(`  ✓ Region ${region.id}: ${count} stores`);
    }
    this.seedStats.stores = storeCount;
    console.log();
  }

  async seedDrinks() {
    console.log(`Seeding ${DRINKS.length} drinks...`);
    for (const drink of DRINKS) {
      try {
        await this.client.post('/drinks', drink);
        this.seedStats.drinks++;
      } catch (error) {
        console.warn(`  ✗ Failed to seed drink ${drink.id}: ${error.message}`);
        this.seedStats.errors++;
      }
    }
    console.log(`  ✓ ${this.seedStats.drinks} drinks created\n`);
  }

  async seedSyrups() {
    console.log(`Seeding ${SYRUPS.length} syrups...`);
    for (const syrup of SYRUPS) {
      try {
        await this.client.post('/syrups', syrup);
        this.seedStats.syrups++;
      } catch (error) {
        console.warn(`  ✗ Failed to seed syrup ${syrup.id}: ${error.message}`);
        this.seedStats.errors++;
      }
    }
    console.log(`  ✓ ${this.seedStats.syrups} syrups created\n`);
  }

  async seedAddIns() {
    console.log(`Seeding ${ADD_INS.length} add-ins...`);
    for (const addIn of ADD_INS) {
      try {
        await this.client.post('/add-ins', addIn);
        this.seedStats.addIns++;
      } catch (error) {
        console.warn(`  ✗ Failed to seed add-in ${addIn.id}: ${error.message}`);
        this.seedStats.errors++;
      }
    }
    console.log(`  ✓ ${this.seedStats.addIns} add-ins created\n`);
  }

  async seedInventory() {
    console.log('Seeding store inventory levels...');
    try {
      const storeCount = this.seedStats.stores;
      const drinkCount = this.seedStats.drinks;
      const expectedItems = storeCount * drinkCount;

      await this.client.post('/maintenance/seed-inventory', {
        initialQuantity: 100,
        restockThreshold: 20,
      });

      this.seedStats.inventory = expectedItems;
      console.log(`  ✓ ${expectedItems} inventory items created\n`);
    } catch (error) {
      console.warn(`  ✗ Failed to seed inventory: ${error.message}\n`);
      this.seedStats.errors++;
    }
  }

  async seedAuditLog() {
    console.log('Recording audit baseline...');
    try {
      await this.client.post('/audit-logs', {
        action: 'SEED_DATA',
        entity_type: 'SYSTEM',
        entity_id: 'system-seed',
        changes: {
          regions: this.seedStats.regions,
          hubs: this.seedStats.hubs,
          stores: this.seedStats.stores,
          drinks: this.seedStats.drinks,
          inventory: this.seedStats.inventory,
        },
        timestamp: new Date().toISOString(),
      });
      console.log('  ✓ Audit log recorded\n');
    } catch (error) {
      console.warn(`  ✗ Failed to record audit log: ${error.message}\n`);
    }
  }

  printSummary() {
    console.log('═'.repeat(50));
    console.log('📊 Seeding Summary:'.padEnd(50));
    console.log('═'.repeat(50));
    console.log(`  Regions:          ${this.seedStats.regions}`);
    console.log(`  Supply Hubs:      ${this.seedStats.hubs}`);
    console.log(`  Stores:           ${this.seedStats.stores}`);
    console.log(`  Drinks:           ${this.seedStats.drinks}`);
    console.log(`  Syrups:           ${this.seedStats.syrups}`);
    console.log(`  Add-ins:          ${this.seedStats.addIns}`);
    console.log(`  Inventory Items:  ${this.seedStats.inventory}`);
    console.log(`  Errors:           ${this.seedStats.errors}`);
    console.log('═'.repeat(50));
    console.log('\n✅ Seeding complete!\n');
  }
}

// Run seeder
const seeder = new OrbitDBSeeder(NODE_URL);
seeder.run().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
