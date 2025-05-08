/**
 * Options for creating an inline worker.
 */
export interface CreateInlineWorkerOptions {
    /**
     * An array of script URLs to be imported into the worker's scope
     * using `importScripts()`. These scripts are loaded before your function executes.
     * @example ["https://cdn.jsdelivr.net/npm/lodash@4.17.21/lodash.min.js"]
     */
    dependencies?: string[];
    /**
     * // TODO: Future enhancement: A key-value map of data to be available in the worker's global scope.
     * // This could help simulate some closure-like behavior for simple, serializable values.
     * // context?: Record<string, any>;
     */
}

/**
 * Represents an executable inline worker function.
 * Calling this function will execute the underlying logic in a Web Worker.
 *
 * @template TFunc The type of the function executed in the worker.
 * @param {...Parameters<TFunc>} args Arguments to pass to the worker function.
 * @returns {Promise<ReturnType<TFunc>>} A Promise that resolves with the result of the worker function
 * or rejects if an error occurs.
 */
export interface InlineWorker<TFunc extends (...args: any[]) => any> {
    (...args: Parameters<TFunc>): Promise<ReturnType<TFunc>>;
    /**
     * Terminates the Web Worker.
     * Any pending operations will be rejected. The worker instance cannot be reused after termination.
     */
    terminate: () => void;
    /**
     * Gets the underlying Worker instance.
     * Useful for advanced scenarios, like attaching custom error handlers or message listeners
     * outside the Promise-based request/response cycle.
     * @returns {Worker | null} The Worker instance, or null if workers are not supported and a fallback is used.
     */
    getWorkerInstance: () => Worker | null;
}