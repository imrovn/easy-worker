import { createInlineWorker as _createInlineWorker } from './inline-worker.js';
import type {
  CreateInlineWorkerOptions as _CreateInlineWorkerOptions,
  InlineWorker as _InlineWorker,
} from './types.js';

export type CreateInlineWorkerOptions = _CreateInlineWorkerOptions;
export type InlineWorker<TFunc extends (...args: any[]) => any> = _InlineWorker<TFunc>;

/**
 * Creates a Web Worker that executes the provided function inline, without needing a separate JS file.
 *
 * @template TFunc The type of the function to be executed in the worker.
 * This function can be synchronous or asynchronous (return a Promise).
 * @param {TFunc} func The function to execute in the Web Worker.
 * This function will be serialized using `toString()`, so it must be
 * a self-contained piece of code.
 * Key considerations:
 * - **Closures**: It cannot directly access lexical closures from its original scope
 * unless the closed-over variables are simple constants already part of the
 * function's string representation, or globally available in a worker context
 * (e.g., `Math`, `JSON`), or imported via the `dependencies` option.
 * Pass all dynamic data as arguments to the function.

 * - **`this` Context**: Inside the worker function, `this` will refer to the
 * worker's global scope (`self`) or be `undefined` if the function is in strict mode.
 * @param {CreateInlineWorkerOptions} [options] Configuration options for the worker.
 * @returns {InlineWorker<TFunc>} A function that, when called, executes `func` in the worker
 * and returns a Promise with the result. Also includes a `terminate`
 * method to stop the worker.
 * @throws {Error} If the provided `func` is not a function or cannot be properly serialized.
 *
 * @example
 * ```typescript
 * import { createInlineWorker } from 'easy-worker';
 *
 * const add = (a: number, b: number): number => a + b;
 * const workerAdd = createInlineWorker(add);
 *
 * async function main() {
 * try {
 * const sum = await workerAdd(5, 10);
 * console.log('Sum from worker:', sum); // Output: Sum from worker: 15
 * workerAdd.terminate();
 * } catch (error) {
 * console.error('Worker error:', error);
 * }
 * }
 * main();
 * ```
 */
export const createInlineWorker = _createInlineWorker;
