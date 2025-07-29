// Example test/demo script for SoxDrawer JS Server
import { NATSServer } from './nats-server.js';
import { ObjectStoreService } from './object-store.js';

async function runExample() {
  let natsServer = null;
  
  try {
    console.log('🧪 Running SoxDrawer JS Server Example...\n');

    // Start NATS connection
    natsServer = new NATSServer({
      servers: ['nats://localhost:4222']
    });
    
    await natsServer.start();
    console.log('✅ NATS server connected\n');

    // Create object store service
    const objectStore = new ObjectStoreService(natsServer, 'default');

    // Test 1: Store a simple text object
    console.log('📝 Test 1: Storing text object...');
    const textData = 'Hello, SoxDrawer JS!';
    const textInfo = await objectStore.put('test-text', textData, {
      description: 'Test text object',
      headers: { 'content-type': 'text/plain' }
    });
    console.log('Stored:', textInfo);
    console.log();

    // Test 2: Store binary data
    console.log('📦 Test 2: Storing binary object...');
    const binaryData = new Uint8Array([0, 1, 2, 3, 4, 5]);
    const binaryInfo = await objectStore.put('test-binary', binaryData, {
      description: 'Test binary object',
      headers: { 'content-type': 'application/octet-stream' }
    });
    console.log('Stored:', binaryInfo);
    console.log();

    // Test 3: Retrieve objects
    console.log('📥 Test 3: Retrieving objects...');
    
    const retrievedText = await objectStore.getString('test-text');
    console.log('Retrieved text:', retrievedText);
    
    const retrievedBinary = await objectStore.get('test-binary');
    console.log('Retrieved binary:', Array.from(retrievedBinary.data));
    console.log();

    // Test 4: List all objects
    console.log('📋 Test 4: Listing all objects...');
    const allObjects = await objectStore.list();
    console.log('Objects in bucket:');
    allObjects.forEach(obj => {
      console.log(`  - ${obj.name} (${obj.size} bytes, created: ${obj.created})`);
    });
    console.log();

    // Test 5: Get object info
    console.log('ℹ️ Test 5: Getting object info...');
    const textInfo2 = await objectStore.getInfo('test-text');
    console.log('Text object info:', textInfo2);
    console.log();

    // Test 6: Check existence
    console.log('🔍 Test 6: Checking object existence...');
    const exists = await objectStore.exists('test-text');
    const notExists = await objectStore.exists('nonexistent');
    console.log('test-text exists:', exists);
    console.log('nonexistent exists:', notExists);
    console.log();

    // Test 7: Get bucket status
    console.log('📊 Test 7: Getting bucket status...');
    const status = await objectStore.getStatus();
    console.log('Bucket status:', status);
    console.log();

    // Test 8: Clean up
    console.log('🧹 Test 8: Cleaning up...');
    await objectStore.delete('test-text');
    await objectStore.delete('test-binary');
    console.log('Objects deleted');
    console.log();

    // Verify cleanup
    const finalList = await objectStore.list();
    console.log('Objects remaining:', finalList.length);

    console.log('✅ All tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    if (natsServer) {
      await natsServer.stop();
    }
  }
}

// Run the example if this file is executed directly
if (import.meta.main) {
  await runExample();
}

export { runExample };
