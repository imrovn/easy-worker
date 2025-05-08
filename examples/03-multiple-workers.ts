import { createInlineWorker } from '../dist/index.js';

async function main() {
  console.log('Bun Example: Multiple Workers');
  console.log('=============================');

  const taskGenerator = async (workerName: string, delay: number, taskNumber: number) => {
    console.log(`[${workerName}] Task ${taskNumber} starting (will take ${delay}ms).`);
    await new Promise((resolve) => setTimeout(resolve, delay));
    return `[${workerName}] Task ${taskNumber} completed.`;
  };
  const worker = createInlineWorker(taskGenerator);
  console.log('Main: Launching tasks on multiple workers concurrently...');

  const promiseA1 = worker('Worker A', 100, 1).then((res) => console.log(`Main received: ${res}`));
  const promiseB1 = worker('Worker B', 200, 1).then((res) => console.log(`Main received: ${res}`));
  const promiseA2 = worker('Worker A', 100, 2).then((res) => console.log(`Main received: ${res}`));
  const promiseB2 = worker('Worker B', 200, 2).then((res) => console.log(`Main received: ${res}`));

  try {
    await Promise.all([promiseA1, promiseB1, promiseA2, promiseB2]);
    console.log('\nMain: All tasks from multiple workers completed.');
  } catch (error) {
    console.error('Main: An error occurred during multiple worker execution:', error);
  } finally {
    console.log('Main: Terminating workers...');
    worker.terminate();
    console.log('Main: Workers terminated.');
  }
  console.log('=============================');
}

main().catch((e) => console.error('Unhandled error in main:', e));
