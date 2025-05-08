import { describe, it, expect, beforeEach, afterEach, vi, MockInstance } from 'vitest';

import { createFallbackWorker } from '../fallback.js';

describe('createFallbackWorker', () => {
  let consoleWarnSpy: MockInstance;

  beforeEach(() => {
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
  });

  it('should log a warning that Web Workers are not supported upon creation', () => {
    createFallbackWorker(() => {}); // Calling it should trigger the initial warning
    expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('easy-worker: Web Workers are not supported in this environment.'),
    );
  });

  it('should return an object conforming to the InlineWorker structure', () => {
    const fallbackInstance = createFallbackWorker(() => {});
    expect(typeof fallbackInstance).toBe('function');
    expect(typeof fallbackInstance.terminate).toBe('function');
    expect(typeof fallbackInstance.getWorkerInstance).toBe('function');
  });

  it('should execute a synchronous user function and resolve with its result', async () => {
    const userFunc = (a: number, b: number) => {
      return a + b;
    };
    const fallbackWorker = createFallbackWorker(userFunc);

    consoleWarnSpy.mockClear();

    const result = await fallbackWorker(25, 50);
    expect(result).toBe(75);
    expect(consoleWarnSpy).not.toHaveBeenCalled();
  });

  it('should execute an asynchronous user function and resolve with its result', async () => {
    const userFunc = async (message: string) => {
      await new Promise((r) => setTimeout(r, 15)); // Simulate async work
      return `async fallback says: ${message}`;
    };
    const fallbackWorker = createFallbackWorker(userFunc);
    consoleWarnSpy.mockClear();

    const result = await fallbackWorker('hello');
    expect(result).toBe('async fallback says: hello');
    expect(consoleWarnSpy).not.toHaveBeenCalled();
  });

  it('should propagate errors from a synchronous user function', async () => {
    const errorMessage = 'Synchronous Fallback Error!';
    const userFunc = () => {
      throw new Error(errorMessage);
    };
    const fallbackWorker = createFallbackWorker(userFunc);
    consoleWarnSpy.mockClear();

    await expect(fallbackWorker()).rejects.toThrow(errorMessage);
    expect(consoleWarnSpy).not.toHaveBeenCalled();
  });

  it('should propagate errors from an asynchronous user function', async () => {
    const errorMessage = 'Asynchronous Fallback Error!';
    const userFunc = async () => {
      await new Promise((r) => setTimeout(r, 5));
      throw new Error(errorMessage);
    };
    const fallbackWorker = createFallbackWorker(userFunc);
    consoleWarnSpy.mockClear();

    await expect(fallbackWorker()).rejects.toThrow(errorMessage);
    expect(consoleWarnSpy).not.toHaveBeenCalled();
  });

  it('terminate() method should log a specific warning and be a no-op', () => {
    const fallbackWorker = createFallbackWorker(() => {});
    consoleWarnSpy.mockClear();

    fallbackWorker.terminate();
    expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('easy-worker: `terminate()` called on a fallback worker'),
    );
  });

  it('getWorkerInstance() method should log a specific warning and return null', () => {
    const fallbackWorker = createFallbackWorker(() => {});
    consoleWarnSpy.mockClear();

    const instance = fallbackWorker.getWorkerInstance();
    expect(instance).toBeNull();
    expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('easy-worker: `getWorkerInstance()` called on a fallback worker'),
    );
  });
});
