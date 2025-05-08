import {createInlineWorker} from "../src";

const bubleSort = (input: number[]): number[] => {
    let swap;
    let n = input.length - 1;
    const sortedArray = input.slice();
    do {
        swap = false;
        for (let index = 0; index < n; index += 1) {
            if (sortedArray[index] > sortedArray[index + 1]) {
                const tmp = sortedArray[index];
                sortedArray[index] = sortedArray[index + 1];
                sortedArray[index + 1] = tmp;
                swap = true;
            }
        }
        n -= 1;
    } while (swap);

    return sortedArray;
};


const numbers: number[] = [...Array(500)].map(() =>
    Math.floor(Math.random() * 1000000)
);

const sortWorker = createInlineWorker(bubleSort);

async function performCalculation() {
    console.log('Main: Sending task to worker...');
    try {
        const result = await sortWorker(numbers);
        console.log('Main: Received result from worker:', result);
    } catch (error) {
        console.error('Main: Worker error:', error);
    } finally {
        sortWorker.terminate();
        console.log('Main: Worker terminated.');
    }
}

performCalculation();
