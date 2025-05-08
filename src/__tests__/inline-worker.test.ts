import { describe, it, expect, beforeEach, vi, Mock, afterEach } from 'vitest';

import { createFallbackWorker } from '../fallback.js';
import { createInlineWorker } from '../inline-worker.js';
import { generateWorkerBootstrapScript } from '../worker-script.js';

vi.mock('../worker-script', () => ({
  generateWorkerBootstrapScript: vi.fn(),
}));

let idCounterForVitest = 0;
vi.mock('../utils', () => ({
  getNextMessageId: vi.fn(() => `test-msg-vitest-${idCounterForVitest++}`),
}));
vi.mock('../fallback', () => ({
  // Mock the fallback module
  createFallbackWorker: vi.fn(),
}));

// @ts-ignore
const getMockWorker = globalThis.getCurrentMockWorkerInstanceForVitest;

describe('InlineWorker', () => {
  let originalWorkerGlobalThis: any;

  beforeEach(() => {
    idCounterForVitest = 0;
    vi.clearAllMocks();
    (generateWorkerBootstrapScript as Mock).mockClear();

    originalWorkerGlobalThis = globalThis.Worker;
  });

  afterEach(() => {
    globalThis.Worker = originalWorkerGlobalThis;
  });

  it('should create a new Worker with a blob URL', () => {
    const mockScript = '/* mock worker script for vitest */';
    (generateWorkerBootstrapScript as Mock).mockReturnValue(mockScript);
    const workerFn = () => {};
    createInlineWorker(workerFn);

    expect(generateWorkerBootstrapScript).toHaveBeenCalledWith(workerFn.toString(), undefined);
    expect(globalThis.URL.createObjectURL).toHaveBeenCalled();
    expect(globalThis.Worker).toHaveBeenCalledWith(expect.stringContaining('blob:mockedurl-vitest/'));
  });

  it('should post a message to the worker and resolve with the result', async () => {
    const mockScript = '/* worker script */';
    (generateWorkerBootstrapScript as Mock).mockReturnValue(mockScript);
    const userFunc = (a: number, b: number) => a + b;
    const workerInterface = createInlineWorker(userFunc);

    const resultPromise = workerInterface(5, 7);

    // @ts-ignore
    expect(globalThis.mockEasyWorkerPostMessage).toHaveBeenCalledWith({
      id: 'test-msg-vitest-0',
      args: [5, 7],
    });

    // Simulate worker posting result back
    const mockWorkerInstance = getMockWorker();
    expect(mockWorkerInstance).toBeTruthy();
    mockWorkerInstance._simulateMessage({ id: 'test-msg-vitest-0', result: 12 });

    await expect(resultPromise).resolves.toBe(12);
  });

  it('should reject if the worker posts an error', async () => {
    (generateWorkerBootstrapScript as Mock).mockReturnValue('/* script */');
    const userFunc = () => {
      throw new Error('Worker-side error');
    };
    const workerInterface = createInlineWorker(userFunc);

    const resultPromise = workerInterface();
    // @ts-ignore
    expect(globalThis.mockEasyWorkerPostMessage).toHaveBeenCalledWith({ id: 'test-msg-vitest-0', args: [] });

    const errorData = { name: 'Error', message: 'Worker-side error from test', stack: 'some stack' };
    getMockWorker()._simulateMessage({ id: 'test-msg-vitest-0', error: errorData });

    await expect(resultPromise).rejects.toMatchObject({
      name: errorData.name,
      message: errorData.message,
    });
  });

  describe('Fallback Invocation', () => {
    let originalWorkerGlobal: any;

    beforeEach(() => {
      originalWorkerGlobal = globalThis.Worker;
      // @ts-ignore
      globalThis.Worker = undefined;
      (createFallbackWorker as Mock).mockClear();
    });

    afterEach(() => {
      // @ts-ignore
      globalThis.Worker = originalWorkerGlobal;
    });

    it('should call createFallbackWorker if Worker global is undefined', () => {
      const userFunc = () => 'test';
      createInlineWorker(userFunc);
      expect(createFallbackWorker).toHaveBeenCalledTimes(1);
      expect(createFallbackWorker).toHaveBeenCalledWith(userFunc);
    });
  });
});
