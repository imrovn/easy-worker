import {createInlineWorker} from "../src";

const testWorkerFn = () => {
    // @ts-ignore lodash will be global if imported
    if (typeof _ !== 'function') {
        throw new Error('Lodash (_) was not available or not a function.');
    }
    // @ts-ignore
    return `Lodash version: ${_.VERSION}`;
};
const myWorkerDependencies = ['https://cdnjs.cloudflare.com/ajax/libs/lodash.js/4.17.21/lodash.min.js']

const worker = createInlineWorker(testWorkerFn, {
    dependencies: myWorkerDependencies
});
worker()
    .then(message => console.log('Test worker success:', message))
    .catch(err => console.error('Test worker failed:', err.name, err.message, err.stack))
    .finally(() => {
        if (worker) worker.terminate();
    });