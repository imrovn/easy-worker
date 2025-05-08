import { vi, beforeEach } from 'vitest';

let currentMockWorkerInstanceForVitest: any = null;
// @ts-ignore
globalThis.mockEasyWorkerPostMessage = vi.fn();
// @ts-ignore
globalThis.mockEasyWorkerTerminate = vi.fn();
// @ts-ignore

globalThis.Worker = vi.fn().mockImplementation((scriptURL: string) => {
  const instance = {
    // @ts-ignore
    postMessage: globalThis.mockEasyWorkerPostMessage,
    // @ts-ignore
    terminate: globalThis.mockEasyWorkerTerminate,
    onmessage: null as ((ev: MessageEvent) => any) | null,
    onerror: null as ((ev: ErrorEvent) => any) | null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    _simulateMessage(data: any) {
      if (typeof instance.onmessage === 'function') {
        instance.onmessage({ data } as MessageEvent);
      }
    },
    _simulateError(errorEvent: Partial<ErrorEvent>) {
      if (typeof instance.onerror === 'function') {
        instance.onerror(errorEvent as ErrorEvent);
      }
    },
  };
  currentMockWorkerInstanceForVitest = instance;
  return instance;
});

globalThis.URL.createObjectURL = vi.fn((blob: Blob) => {
  return `blob:mockedurl-vitest/${Math.random().toString(36).substring(7)}`;
});
globalThis.URL.revokeObjectURL = vi.fn();

globalThis.Blob = vi.fn().mockImplementation((parts: BlobPart[], options?: BlobPropertyBag) => {
  return {
    parts: parts,
    options: options,
    size: parts.reduce((acc, part) => {
      if (typeof part === 'string') return acc + part.length;
      if (part instanceof Blob) return acc + part.size;
      return acc;
    }, 0),
    type: options?.type || '',
  };
});

// @ts-ignore
globalThis.getCurrentMockWorkerInstanceForVitest = () => currentMockWorkerInstanceForVitest;

// Clean up mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
  // @ts-ignore
  globalThis.mockEasyWorkerPostMessage.mockClear();
  // @ts-ignore
  globalThis.mockEasyWorkerTerminate.mockClear();
  currentMockWorkerInstanceForVitest = null;
});
