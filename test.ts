import {createInlineWorker} from "./src";

const complexCalculation = (num1: number, num2: string): string => {
    console.log('Worker: Starting complex calculation...');
    // Simulate some work
    let result = 0;
    for (let i = 0; i < 100000000; i++) {
        result += Math.sqrt(i) * Math.random();
    }
    console.log('Worker: Calculation finished.');
    return `Result of ${num1} and ${parseFloat(num2)} is ${result.toFixed(2)}`;
};

// 2. Create the inline worker
const calculateWorker = createInlineWorker(complexCalculation);
// 3. Call the worker function
async function performCalculation() {
    console.log('Main: Sending task to worker...');
    try {
        const result = await calculateWorker(100, "200.5");
        console.log('Main: Received result from worker:', result);
    } catch (error) {
        console.error('Main: Worker error:', error);
    } finally {
        // 4. Terminate the worker when no longer needed
        calculateWorker.terminate();
        console.log('Main: Worker terminated.');
    }
}

performCalculation();