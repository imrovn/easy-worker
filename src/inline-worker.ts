import type {
    CreateInlineWorkerOptions,
    InlineWorker,
} from './types';
import { getNextMessageId } from './utils';
import { generateWorkerBootstrapScript } from './worker-script';
import { createFallbackWorker } from './fallback';

export function createInlineWorker<
    TFunc extends (...args: any[]) => Promise<any> | any
>(
    func: TFunc,
    options?: CreateInlineWorkerOptions
): InlineWorker<TFunc> {
    if (typeof func !== 'function') {
        throw new Error('easy-worker: Invalid argument: `func` must be a function.');
    }

    const funcString = func.toString();
    if (funcString.includes('[native code]')) {
        throw new Error(
            'easy-worker: Native functions cannot be serialized for Web Workers.'
        );
    }

    if (typeof Worker === 'undefined') {
        return createFallbackWorker(func);
    }

    const workerBootstrapScript = generateWorkerBootstrapScript(
        funcString,
        options?.dependencies
    );
    console.log("--- BEGIN Generated Worker Script ---");
    console.log(workerBootstrapScript);
    console.log("--- END Generated Worker Script ---");
    const blob = new Blob([workerBootstrapScript], {
        type: 'application/javascript',
    });
    const workerUrl = URL.createObjectURL(blob);
    let worker: Worker | null = null;
    try {
        worker =  new Worker(workerUrl);
    } catch (e) {
        URL.revokeObjectURL(workerUrl);
        console.error('easy-worker: Failed to create Worker instance:', e);
        throw new Error(
            `easy-worker: Failed to create Worker: ${
                e instanceof Error ? e.message : String(e)
            }`
        );
    }

    const activePromises: Map<
        string,
        { resolve: (value: any) => void; reject: (reason?: any) => void }
    > = new Map();

    let hasInitErrorOccurred = false; // Flag to prevent double handling

    // Centralized cleanup function
    const cleanupDueToError = (errorContext: { message?: string, name?: string, stack?: string, originalName?: string }) => {
        const baseMessage = errorContext.message || 'Unhandled worker error or initialization failure.';
        const errorName = errorContext.name || 'WorkerError';

        activePromises.forEach((promiseControls) => {
            const wrappedError = new Error(baseMessage);
            wrappedError.name = errorContext.originalName || errorName; // Prefer original name if available
            if (errorContext.stack) wrappedError.stack = errorContext.stack;
            promiseControls.reject(wrappedError);
        });
        activePromises.clear();

        if (worker) {
            worker.terminate();
            worker = null;
        }
        URL.revokeObjectURL(workerUrl); // Ensure blob URL is always cleaned up on error
    };

    worker.onmessage = (event: MessageEvent) => {
        const { id, result, error: errorPayload } = event.data;

        if (id === 'worker-init-error' && errorPayload) {
            if (hasInitErrorOccurred) return; // Already handled by onerror or another init error message
            hasInitErrorOccurred = true;
            console.error(
                `easy-worker: Worker initialization error (via postMessage): Name: ${errorPayload.name}, Message: ${errorPayload.message}. Stack: ${errorPayload.stack}. Terminating worker.`
            );
            cleanupDueToError(errorPayload);
            return;
        }

        if (!id || !activePromises.has(id)) {
            return;
        }

        console.log("onmessage", id, result);

        const promiseControls = activePromises.get(id)!;
        if (errorPayload) {
            const deserializedError = new Error(errorPayload.message);
            deserializedError.name = errorPayload.name || 'WorkerError';
            if (errorPayload.stack) deserializedError.stack = errorPayload.stack;
            promiseControls.reject(deserializedError);
        } else {
            promiseControls.resolve(result);
        }
        activePromises.delete(id);
    };

    worker.onerror = (event: ErrorEvent) => {
        console.log("worker error", JSON.stringify(event), JSON.stringify(event, ["message", "arguments", "type", "name"]));
        if (hasInitErrorOccurred) {
            // If onmessage already processed a 'worker-init-error', this global onerror might be redundant for that specific init failure.
            // However, it could also be a *different* unhandled error.
            // For safety, we'll log it but note that an init error might have been the root cause.
            console.warn(`easy-worker: onerror event (Message: "${event.message}") received, possibly related to an earlier initialization error.`);
            // Avoid double cleanup if already done, but if worker still exists, it means it wasn't the init-error path that cleaned up.
            if (!worker) return; // Already cleaned up
        }
        hasInitErrorOccurred = true; // Mark that an error state has been reached

        console.error(
            `easy-worker: Unhandled error event in Web Worker (via onerror): Message: "${event.message}" (Filename: ${event.filename}, Lineno: ${event.lineno})`
        );
        if (event.error) { // event.error might contain the actual error object in some browsers
            console.error("easy-worker: Underlying error object from onerror:", event.error);
        }
        cleanupDueToError({ message: event.message, name: "WorkerGlobalError" });
    };

    const enhancedFunction = (
        ...args: Parameters<TFunc>
    ): Promise<ReturnType<TFunc>> => {
        if (!worker) {
            return Promise.reject(
                new Error('easy-worker: Worker is not available or has been terminated.')
            );
        }
        return new Promise((resolve, reject) => {
            const currentMessageId = getNextMessageId();
            activePromises.set(currentMessageId, { resolve, reject });
            try {
                worker!.postMessage({ id: currentMessageId, args });
            } catch (postMessageError) {
                activePromises.delete(currentMessageId);
                reject(postMessageError);
            }
        });
    };

    const inlineWorkerInstance = enhancedFunction as InlineWorker<TFunc>;

    inlineWorkerInstance.terminate = () => {
        if (worker) { // Normal termination
            activePromises.forEach((promiseControls) => {
                promiseControls.reject(
                    new Error('easy-worker: Worker terminated by user.')
                );
            });
            activePromises.clear();
            worker.terminate();
            worker = null;
        }
        URL.revokeObjectURL(workerUrl); // Always cleanup blob URL
    };

    inlineWorkerInstance.getWorkerInstance = () => {
        return worker;
    };

    return inlineWorkerInstance;
}