import { createInlineWorker } from '../dist/index.js';

async function main() {
  console.log('Bun Example: Error Handling');
  console.log('=============================');

  // Test 1: Error thrown synchronously inside worker function
  console.log('\n--- Test 1: Synchronous error in worker function ---');
  const syncErrorFunc = () => {
    console.log('[Worker SyncError] About to throw a synchronous error.');
    throw new Error('Intentional synchronous error from worker!');
  };

  const syncErrorWorker = createInlineWorker(syncErrorFunc);
  console.log('Main: Calling syncErrorWorker...');
  try {
    await syncErrorWorker();
    console.error('Main: syncErrorWorker did not throw (UNEXPECTED)');
  } catch (error: any) {
    console.log('Main: Caught expected error from syncErrorWorker:');
    console.log(`  Name: ${error.name}, Message: ${error.message}`);
    // console.log(`  Stack: ${error.stack}`); // Stack might be long
    if (error.message === 'Intentional synchronous error from worker!') {
      console.log('Main: Correct error caught. OK.');
    }
  } finally {
    syncErrorWorker.terminate();
    console.log('Main: syncErrorWorker terminated.');
  }

  console.log('=============================');

  // Test 2: Error thrown asynchronously inside worker function
  console.log('\n--- Test 2: Asynchronous error in worker function ---');
  const asyncErrorFunc = async () => {
    console.log('[Worker AsyncError] About to throw an asynchronous error after a delay.');
    await new Promise((resolve) => setTimeout(resolve, 20));
    throw new Error('Intentional asynchronous error from worker!');
  };

  const asyncErrorWorker = createInlineWorker(asyncErrorFunc);
  console.log('Main: Calling asyncErrorWorker...');
  try {
    await asyncErrorWorker();
    console.error('Main: asyncErrorWorker did not throw (UNEXPECTED)');
  } catch (error: any) {
    console.log('Main: Caught expected error from asyncErrorWorker:');
    console.log(`  Name: ${error.name}, Message: ${error.message}`);
    if (error.message === 'Intentional asynchronous error from worker!') {
      console.log('Main: Correct error caught. OK.');
    }
  } finally {
    asyncErrorWorker.terminate();
    console.log('Main: asyncErrorWorker terminated.');
  }
  console.log('=============================');
}

main().catch((e) => console.error('Unhandled error in main:', e));
