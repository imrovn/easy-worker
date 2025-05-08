import type {InlineWorker} from './types';

/**
 * Creates a fallback worker that executes the function on the main thread asynchronously.
 * This is used when Web Workers are not supported in the environment.
 *
 * @template TFunc The type of the function to be executed.
 * @param {TFunc} func The function to execute.
 * @returns {InlineWorker<TFunc>} An InlineWorker-compatible object that runs on the main thread.
 */
export function createFallbackWorker<
    TFunc extends (...args: any[]) => Promise<any> | any
>(func: TFunc): InlineWorker<TFunc> {
    console.warn(
        'easy-worker: Web Workers are not supported in this environment. ' +
        'The function will run on the main thread asynchronously. ' +
        'Note that `dependencies` and true parallelism will not be available.'
    );

    const mainThreadExecutor = async (
        ...args: Parameters<TFunc>
    ): Promise<ReturnType<TFunc>> => {
        try {
            // Simulate async behavior even if func is synchronous by yielding to the event loop
            await Promise.resolve();
             // Supports both sync and async user functions
            return await func(...args);
        } catch (error) {
            throw error; // Re-throw to be caught by the caller's .catch()
        }
    };

    const inlineWorkerFallback = mainThreadExecutor as InlineWorker<TFunc>;

    inlineWorkerFallback.terminate = () => {
        // No actual worker to terminate
        console.warn(
            'easy-worker: `terminate()` called on a fallback worker (main thread execution). No action taken.'
        );
    };

    inlineWorkerFallback.getWorkerInstance = () => {
        console.warn(
            'easy-worker: `getWorkerInstance()` called on a fallback worker. No actual Worker instance exists.'
        );
        return null;
    };

    return inlineWorkerFallback;
}