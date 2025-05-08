import { createInlineWorker } from '../dist/index.js';

async function main() {
  // Test 1: Simple synchronous function
  console.log('\n--- Test 1: Simple Synchronous Function ---');
  const cpuIntensiveTask = (iterations: number) => {
    console.log(`[Worker Sync] Starting CPU-intensive task with ${iterations} iterations.`);
    let result = 0;
    for (let i = 0; i < iterations; i++) {
      result += Math.sqrt(i) * Math.sin(i);
    }
    console.log(`[Worker Sync] Task completed. Result (sample): ${result.toFixed(2)}`);
    return `Completed ${iterations} iterations. Result sample: ${result.toFixed(2)}`;
  };

  const syncWorker = createInlineWorker(cpuIntensiveTask);
  console.log('Main: Calling syncWorker...');
  try {
    const startTime = Date.now();
    const result = await syncWorker(1e7);
    const duration = Date.now() - startTime;
    console.log(`Main: SyncWorker result: "${result}" (took ${duration}ms)`);
  } catch (error) {
    console.error('Main: Error from syncWorker:', error);
  } finally {
    syncWorker.terminate();
    console.log('Main: syncWorker terminated.');
  }

  console.log('====================================');

  // Test 2: Simple asynchronous function
  console.log('\n--- Test 2: Simple Asynchronous Function ---');
  const asyncTask = async (name: string, delay: number) => {
    console.log(`[Worker Async] Received name: "${name}". Will respond after ${delay}ms.`);
    await new Promise((resolve) => setTimeout(resolve, delay));
    const greeting = `Hello, ${name}, from the async worker! Response after ${delay}ms.`;
    console.log(`[Worker Async] Sending greeting.`);
    return greeting;
  };

  const asyncWorker = createInlineWorker(asyncTask);
  console.log('Main: Calling asyncWorker("Bun User", 50)...');
  try {
    const startTime = Date.now();
    const message = await asyncWorker('Bun User', 50);
    const duration = Date.now() - startTime;
    console.log(`Main: asyncWorker result: "${message}" (took ${duration}ms)`);
  } catch (error) {
    console.error('Main: Error from asyncWorker:', error);
  } finally {
    asyncWorker.terminate();
    console.log('Main: asyncWorker terminated.');
  }
  console.log('====================================');
}

main().catch((e) => console.error('Unhandled error in main:', e));
