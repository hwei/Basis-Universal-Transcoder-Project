import type { BasisModuleFuncs } from './index.js';

/** Default single-decompress output cap (does not pre-allocate). */
export const ZSTD_DEFAULT_MAX_SIZE = 64 * 1024 * 1024;

/**
 * Custom status / error codes from our C/TS API layer (not native zstd codes).
 * Native zstd failures from `zstd_decompress` use zstd's own negative/error size_t codes.
 */
export const ZstdApiErrorCode = {
  ContentSizeError: 1,
  ContentSizeUnknown: 2,
  ContentSizeTooLarge: 3,
  ExceedsMaxSize: 4,
  InvalidArgument: 5,
  Disposed: 6,
} as const;

export type ZstdSizeResult =
  | { ok: true; size: number }
  | { ok: false; code: number };

export type ZstdDecompressResult =
  | { ok: true; data: Uint8Array }
  | { ok: false; code: number };

export interface ZstdDecompressOptions {
  /**
   * Known decompressed size. When omitted, size is read from the zstd frame header.
   */
  expectedSize?: number;
  /**
   * Maximum allowed decompressed size for this call. Rejects larger frames without
   * allocating that much memory. Defaults to {@link ZSTD_DEFAULT_MAX_SIZE}.
   */
  maxSize?: number;
}

/** Native ZSTD_ErrorCode enum values from vendored zstd 1.4.x (zstddeclib). */
const NATIVE_ZSTD_ERROR_NAMES: Record<number, string> = {
  0: 'No error detected',
  1: 'Error (generic)',
  10: 'Unknown frame descriptor',
  12: 'Version not supported',
  14: 'Unsupported frame parameter',
  16: 'Frame requires too much memory for decoding',
  20: 'Corrupted block detected',
  22: "Restored data doesn't match checksum",
  30: 'Dictionary is corrupted',
  32: 'Dictionary mismatch',
  34: 'Cannot create Dictionary from provided samples',
  40: 'Unsupported parameter',
  42: 'Parameter is out of bound',
  44: 'tableLog requires too much memory : unsupported',
  46: 'Unsupported max Symbol Value : too large',
  48: 'Specified maxSymbolValue is too small',
  60: 'Operation not authorized at current processing stage',
  62: 'Context should be init first',
  64: 'Allocation error : not enough memory',
  66: 'workSpace buffer is not large enough',
  70: 'Destination buffer is too small',
  72: 'Src size is incorrect',
  74: 'Operation on NULL destination buffer',
  100: 'Frame index is too large',
  102: 'Seekable IO error',
  104: 'Destination buffer is wrong',
  105: 'Source buffer is wrong',
};

const API_ERROR_NAMES: Record<number, string> = {
  [ZstdApiErrorCode.ContentSizeError]: 'Invalid zstd frame or content size error',
  [ZstdApiErrorCode.ContentSizeUnknown]: 'Zstd frame content size is unknown',
  [ZstdApiErrorCode.ContentSizeTooLarge]: 'Zstd content size exceeds uint32 range',
  [ZstdApiErrorCode.ExceedsMaxSize]: 'Decompressed size exceeds maxSize limit',
  [ZstdApiErrorCode.InvalidArgument]: 'Invalid argument',
  [ZstdApiErrorCode.Disposed]: 'ZstdDecompressor already disposed',
};

/**
 * Convert a zstd / API error code to a human-readable name.
 * Does not call into WASM; uses a static table matching vendored zstd.
 *
 * - Custom API codes: small positive values from {@link ZstdApiErrorCode}
 * - Native zstd codes: size_t error results from `zstd_decompress` (typically negative in JS)
 */
export function zstdErrorName(code: number): string {
  if (Object.prototype.hasOwnProperty.call(API_ERROR_NAMES, code)) {
    return API_ERROR_NAMES[code];
  }

  const nativeCode = nativeZstdErrorEnum(code);
  if (nativeCode !== null && NATIVE_ZSTD_ERROR_NAMES[nativeCode]) {
    return NATIVE_ZSTD_ERROR_NAMES[nativeCode];
  }

  return `Unknown error (${code})`;
}

/** Map a zstd size_t-style error result to ZSTD_ErrorCode enum value. */
function nativeZstdErrorEnum(code: number): number | null {
  // Signed interpretation (common with emscripten i32 returns)
  if (code < 0 && code >= -120) {
    return -code;
  }
  // Unsigned 32-bit interpretation: (size_t)(-enum)
  if (code > 0xffff0000) {
    return (0x100000000 - code) >>> 0;
  }
  return null;
}

/**
 * Standalone Zstandard decompressor sharing the Basis Universal WASM instance.
 *
 * Buffers grow on demand and are reused across calls (no large pre-allocation).
 * Successful `data` is a view into WASM heap memory — copy with `data.slice()`
 * if you need to retain it across later decompress/dispose calls.
 */
export class ZstdDecompressor {
  private inputMemPtr = 0;
  private inputMemSize = 0;
  private outputMemPtr = 0;
  private outputMemSize = 0;
  private disposed = false;

  constructor(private readonly funcs: BasisModuleFuncs) {}

  /**
   * Read decompressed size from a zstd frame header.
   */
  getDecompressedSize(src: Uint8Array): ZstdSizeResult {
    if (this.disposed) {
      return { ok: false, code: ZstdApiErrorCode.Disposed };
    }
    if (!src || src.length === 0) {
      return { ok: false, code: ZstdApiErrorCode.InvalidArgument };
    }

    const inputPtr = this.ensureInputBuffer(src);
    if (!inputPtr) {
      return { ok: false, code: ZstdApiErrorCode.InvalidArgument };
    }

    const outSizePtr = this.funcs.malloc(4);
    if (!outSizePtr) {
      return { ok: false, code: ZstdApiErrorCode.InvalidArgument };
    }

    try {
      const status = this.funcs.zstd_get_decompressed_size(inputPtr, src.length, outSizePtr);
      if (status !== 0) {
        return { ok: false, code: status };
      }
      const size = new DataView(this.funcs.heap.buffer, outSizePtr, 4).getUint32(0, true);
      return { ok: true, size };
    } finally {
      this.funcs.free(outSizePtr);
    }
  }

  /**
   * Decompress zstd data in memory.
   *
   * ⚠️ IMPORTANT: On success, `data` references WASM-managed memory and may become
   * invalid after the next `decompress()` / `dispose()` (or other WASM allocations).
   * Copy with `result.data.slice()` if you need to keep the bytes.
   */
  decompress(src: Uint8Array, options: ZstdDecompressOptions = {}): ZstdDecompressResult {
    if (this.disposed) {
      return { ok: false, code: ZstdApiErrorCode.Disposed };
    }
    if (!src || src.length === 0) {
      return { ok: false, code: ZstdApiErrorCode.InvalidArgument };
    }

    const maxSize = options.maxSize ?? ZSTD_DEFAULT_MAX_SIZE;
    if (maxSize <= 0) {
      return { ok: false, code: ZstdApiErrorCode.InvalidArgument };
    }

    let outSize: number;
    if (options.expectedSize !== undefined) {
      if (!Number.isFinite(options.expectedSize) || options.expectedSize < 0 || options.expectedSize > 0xffffffff) {
        return { ok: false, code: ZstdApiErrorCode.InvalidArgument };
      }
      outSize = options.expectedSize >>> 0;
    } else {
      const sizeResult = this.getDecompressedSize(src);
      if (!sizeResult.ok) {
        return sizeResult;
      }
      outSize = sizeResult.size;
    }

    if (outSize > maxSize) {
      return { ok: false, code: ZstdApiErrorCode.ExceedsMaxSize };
    }

    const inputPtr = this.ensureInputBuffer(src);
    if (!inputPtr) {
      return { ok: false, code: ZstdApiErrorCode.InvalidArgument };
    }

    const outputPtr = this.ensureOutputBuffer(outSize);
    if (!outputPtr && outSize > 0) {
      return { ok: false, code: ZstdApiErrorCode.InvalidArgument };
    }

    const result = this.funcs.zstd_decompress(outputPtr, outSize, inputPtr, src.length);
    if (this.funcs.zstd_is_error(result)) {
      return { ok: false, code: result };
    }

    // result is the number of bytes written
    return {
      ok: true,
      data: this.funcs.heap.subarray(outputPtr, outputPtr + result),
    };
  }

  dispose(): void {
    if (this.disposed) {
      return;
    }

    this.funcs.free(this.inputMemPtr);
    this.inputMemPtr = 0;
    this.inputMemSize = 0;

    this.funcs.free(this.outputMemPtr);
    this.outputMemPtr = 0;
    this.outputMemSize = 0;

    this.disposed = true;
  }

  private ensureInputBuffer(src: Uint8Array): number {
    if (this.inputMemSize < src.length) {
      this.funcs.free(this.inputMemPtr);
      this.inputMemPtr = this.funcs.malloc(src.length);
      this.inputMemSize = src.length;
    }
    if (!this.inputMemPtr && src.length > 0) {
      return 0;
    }
    this.funcs.heap.subarray(this.inputMemPtr, this.inputMemPtr + src.length).set(src);
    return this.inputMemPtr;
  }

  private ensureOutputBuffer(size: number): number {
    if (size === 0) {
      return this.outputMemPtr;
    }
    if (this.outputMemSize < size) {
      this.funcs.free(this.outputMemPtr);
      this.outputMemPtr = this.funcs.malloc(size);
      this.outputMemSize = size;
    }
    return this.outputMemPtr;
  }
}
