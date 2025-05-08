// easy-worker/src/index.ts

/**
 * @file easy-worker - Main module
 * A library to create Web Workers from inline functions without needing a separate file.
 */

// Using a simple counter for message IDs to avoid external dependencies.
let messageIdCounter = 0;

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
 * - **Supported Forms**:
 * - Arrow functions: `(a, b) => a + b`
 * - Function expressions: `function(a, b) { return a + b; }`
 * - Function declarations stringified: `function myFunc(a, b) { return a + b; }`
 * - **Object Method Shorthands**: Directly passing object method shorthands
 * (e.g., `myMethod() {}` from `const obj = { myMethod() {} }`) might not serialize
 * correctly for direct execution due to how `toString()` works on them.
 * Consider wrapping them: `(...args) => obj.myMethod(...args)` (but note `obj` itself
 * won't be available in the worker unless passed or reconstructed), or define them
 * as standard function expressions.
 * - **`this` Context**: Inside the worker function, `this` will refer to the
 * worker's global scope (`self`) or be `undefined` if the function is in strict mode.
 * @param {CreateInlineWorkerOptions} [options] Configuration options for the worker.
 * @returns {InlineWorker<TFunc>} A function that, when called, executes `func` in the worker
 * and returns a Promise with the result. Also includes a `terminate`
 * method to stop the worker.
 * @throws {Error} If the provided `func` is not a function or cannot be properly serialized.
 */
export function createInlineWorker<TFunc extends (...args: any[]) => Promise<any> | any>(
    func: TFunc,
    options?: CreateInlineWorkerOptions
): InlineWorker<TFunc> {
    if (typeof func !== 'function') {
        throw new Error('Invalid argument: `func` must be a function.');
    }

    const funcString = func.toString();

    if (funcString.includes('[native code]')) {
        throw new Error('Native functions cannot be serialized for Web Workers.');
    }

    if (typeof Worker === 'undefined') {
        console.warn(
            "easy-worker: Web Workers are not supported in this environment. " +
            "The function will run on the main thread asynchronously. " +
            "Note that `dependencies` and true parallelism will not be available."
        );

        const mainThreadExecutor = async (...args: Parameters<TFunc>): Promise<ReturnType<TFunc>> => {
            try {
                await Promise.resolve();
                const result = await func(...args);
                return result;
            } catch (error) {
                throw error;
            }
        };

        const inlineWorkerFallback = mainThreadExecutor as InlineWorker<TFunc>;
        inlineWorkerFallback.terminate = () => {
            console.warn("easy-worker: `terminate()` called on a fallback worker (main thread execution). No action taken.");
        };
        inlineWorkerFallback.getWorkerInstance = () => {
            console.warn("easy-worker: `getWorkerInstance()` called on a fallback worker. No actual Worker instance exists.");
            return null;
        };
        return inlineWorkerFallback;
    }

    console.log(`${options?.dependencies?.map(dep => `'${dep.replace(/'/g, "\\'")}'`).join(', ')}`)
    let workerBootstrapScript = `
    ${options?.dependencies && options.dependencies.length > 0
        ? `try { importScripts(${options.dependencies.join(', ')}); } catch (e) { self.postMessage({ id: 'worker-init-error', error: { name: 'ImportScriptsError', message: 'Failed to load dependencies: ' + e.message, stack: e.stack }}); throw e; }`
        : ''
    }

    let userFunction;
    try {
      userFunction = (${funcString});
    } catch (e) {
       const errMessage = 'Failed to initialize user function in worker. ' +
         'This can happen if the function string is not a directly evaluatable expression (e.g. object method shorthand). ' +
         'Ensure the function is an arrow function, function expression, or wrap it. Original error: ' + e.message;
       self.postMessage({ id: 'worker-init-error', error: { name: 'FunctionInitializationError', message: errMessage, stack: e.stack }});
       throw new Error(errMessage);
    }

    self.onmessage = async (event) => {
      const { id, args } = event.data;
      if (id === undefined || !Array.isArray(args)) {
        console.warn('easy-worker: Worker received malformed message:', event.data);
        return;
      }
      try {
        if (typeof userFunction !== 'function') {
          throw new Error('User function could not be initialized or is not a function in the worker.');
        }
        const result = await userFunction(...args);
        self.postMessage({ id, result });
      } catch (e) {
        let serializableError = { name: 'Error', message: 'An unknown error occurred in the worker.' , stack: undefined };
        if (e instanceof Error) {
            serializableError = { name: e.name, message: e.message, stack: e.stack };
        } else if (typeof e === 'string') {
            serializableError = { name: 'Error', message: e, stack: undefined };
        } else if (e && typeof e === 'object' && 'message' in e) {
            serializableError = { 
                name: (e as any).name || 'Error', 
                message: (e as any).message, 
                stack: (e as any).stack 
            };
        }
        self.postMessage({ id, error: serializableError });
      }
    };
  `;

    workerBootstrapScript = workerBootstrapScript.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '').trim();

    const blob = new Blob([workerBootstrapScript], { type: 'application/javascript' });
    const workerUrl = URL.createObjectURL(blob);
    let worker: Worker | null = null;
    try {
        worker = new Worker(workerUrl);
    } catch (e) {
        URL.revokeObjectURL(workerUrl);
        console.error("easy-worker: Failed to create Worker instance:", e);
        throw new Error(`Failed to create Worker: ${e instanceof Error ? e.message : String(e)}`);
    }

    const activePromises: Map<string, { resolve: (value: any) => void; reject: (reason?: any) => void }> = new Map();

    worker.onmessage = (event: MessageEvent) => {
        const { id, result, error } = event.data;
        if (id === 'worker-init-error') {
            if (error) {
                console.error(`easy-worker: Worker initialization error: ${error.name} - ${error.message}. Terminating worker.`);
                activePromises.forEach((promiseControls, promiseId) => {
                    const initError = new Error(error.message || 'Worker failed to initialize.');
                    (initError as any).originalName = error.name;
                    promiseControls.reject(initError);
                    activePromises.delete(promiseId);
                });
                if(worker) worker.terminate();
                worker = null;
                URL.revokeObjectURL(workerUrl);
            }
            return;
        }

        if (!id || !activePromises.has(id)) {
            return;
        }

        const promiseControls = activePromises.get(id)!;
        if (error) {
            const deserializedError = new Error(error.message);
            deserializedError.name = error.name || 'WorkerError';
            if (error.stack) {
                deserializedError.stack = error.stack;
            }
            promiseControls.reject(deserializedError);
        } else {
            promiseControls.resolve(result);
        }
        activePromises.delete(id);
    };

    worker.onerror = (event: ErrorEvent) => {
        console.error("easy-worker: Unhandled error in Web Worker:", event.message, event);
        const genericError = new Error(`Unhandled worker error: ${event.message || 'Unknown worker error'}`);
        (genericError as any).event = event;
        activePromises.forEach((promiseControls, promiseId) => {
            promiseControls.reject(genericError);
            activePromises.delete(promiseId);
        });
    };

    const enhancedFunction = (...args: Parameters<TFunc>): Promise<ReturnType<TFunc>> => {
        if (!worker) {
            return Promise.reject(new Error("easy-worker: Worker is not available or has been terminated."));
        }
        return new Promise((resolve, reject) => {
            const currentId = `easy-worker-msg-${messageIdCounter++}`;
            activePromises.set(currentId, { resolve, reject });
            try {
                worker!.postMessage({ id: currentId, args });
            } catch (postMessageError) {
                activePromises.delete(currentId);
                reject(postMessageError);
            }
        });
    };

    const inlineWorkerInstance = enhancedFunction as InlineWorker<TFunc>;

    inlineWorkerInstance.terminate = () => {
        if (worker) {
            worker.terminate();
            worker = null;
        }
        URL.revokeObjectURL(workerUrl);
        activePromises.forEach((promiseControls, id) => {
            promiseControls.reject(new Error('easy-worker: Worker terminated by user.'));
            activePromises.delete(id);
        });
        activePromises.clear();
    };

    inlineWorkerInstance.getWorkerInstance = () => {
        return worker;
    }

    return inlineWorkerInstance;
}
