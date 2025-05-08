# Easy Worker

A lightweight, zero-dependency TypeScript library to create and manage **Web Workers** from inline functions, eliminating the need for separate worker files. Ideal for simplifying parallelism in web applications.

## Features

- **No Separate Worker File**: Define worker logic directly in your main script.
- **TypeScript Native**: Written in TypeScript with full type support.
- **Async/Await Friendly**: Returns Promises for easy integration.
- **Dependency Imports**: Supports importing external scripts into the worker using `importScripts()`.
- **Simple API**: `createInlineWorker` function to get started quickly.
- **Fallback**: Gracefully handles environments where Web Workers are not supported by running tasks on the main thread asynchronously.
- **Zero Dependencies**: The core library has no runtime dependencies.

## Installation

```bash
npm install easy-worker
# or
yarn add easy-worker
```

## Usage

- [`01-basic-execution.ts`](examples/01-basic-execution.ts): Basic synchronous and asynchronous function execution.
- [`02-error-handling.ts`](examples/02-error-handling.ts): Demonstrates how errors from worker functions are propagated.
- [`03-multiple-workers.ts`](examples/03-multiple-workers.ts): Shows creating and using multiple worker instances.
- [`index.html`](index.html): External dependencies imports. HTML file uses easy-worker via ESM module since Bun JS engine does not have `importScripts`

See [Examples](examples)

## API

`createInlineWorker<TFunc>(func: TFunc, options?: CreateInlineWorkerOptions): InlineWorker<TFunc>`

Creates and returns an `InlineWorker`.

- `func` The function to execute in the Web Worker.

  - **Important**: This function is serialized using `toString()`. It must be self-contained and cannot rely on lexical closures from its original scope unless variables are simple constants or globally available in a worker context (e.g., `Math`, `JSON`, or imported via `dependencies`). Pass all dynamic data as arguments.
  - `this` context inside the worker function will be the worker's global scope (`self`) or `undefined` in strict mode.

- `options` (optional):
  - `dependencies?: string[]`: An array of script URLs for `importScripts()`.

`InlineWorker<TFunc>`

An executable function that is also an object with methods:

- `(...args: Parameters<TFunc>)`: Promise<ReturnType<TFunc>>: Call the worker.
- `terminate()`: void: Terminates the worker.
- `getWorkerInstance(): Worker | null`: Returns the raw `Worker` object (or `null` in fallback mode).

## Limitations

- **Closures**: True lexical closures are not transferred. Functions must be self-contained or rely on passed arguments / importScripts.
- **DOM Access**: Workers cannot directly access the main thread's DOM.
- **Function Serialization**: The function passed to createInlineWorker is converted to a string. This has implications for complex functions, this context, and prototypes. Standard arrow functions, function expressions, and named function declarations work best. Object method shorthands might require wrapping.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request. (Remember to add contribution guidelines if you wish).
