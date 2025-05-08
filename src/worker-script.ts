/**
 * Generates the JavaScript bootstrap script content for the Web Worker.
 *
 * @param {string} funcString The stringifies version of the user's function.
 * @param {string[]} [dependencies] Optional array of script URLs for importScripts.
 * @returns {string} The complete worker script as a string.
 */
export function generateWorkerBootstrapScript(funcString: string, dependencies?: string[]): string {
  const dependencyImportScript =
    dependencies && dependencies.length > 0
      ? `try { importScripts(${dependencies.map((dep) => `'${dep}'`).toString()}); } catch (e) { self.postMessage({ id: 'worker-init-error', error: { name: 'ImportScriptsError', message: 'Failed to load dependencies: ' + e.message, stack: e.stack }}); throw e; };`
      : '';

  let scriptContent = `
    ${dependencyImportScript}

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
                name: e?.name || 'Error',
                message: e?.message,
                stack: e?.stack
            };
        }
        self.postMessage({ id, error: serializableError });
      }
    };
  `;
  return scriptContent.trim();
}
