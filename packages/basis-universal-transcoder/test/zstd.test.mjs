import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// Emscripten MINIMAL_RUNTIME glue still references CJS globals in some paths.
// Provide Node-compatible shims before importing the package bundle.
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);
globalThis.require = require;
globalThis.__filename = __filename;
globalThis.__dirname = __dirname;

const pkgRoot = resolve(__dirname, '..');
const testdataDir = resolve(pkgRoot, 'testdata');
const distIndex = resolve(pkgRoot, 'dist/index.mjs');
const wasmPath = resolve(pkgRoot, 'dist/basis_capi_transcoder.wasm');

async function createNodeWasmInstantiator(path) {
  const wasmBytes = await readFile(path);
  return async (imports) => WebAssembly.instantiate(wasmBytes, imports);
}

describe('ZstdDecompressor', () => {
  /** @type {any} */
  let api;
  /** @type {any} */
  let basis;
  /** @type {Uint8Array} */
  let plain;
  /** @type {Uint8Array} */
  let compressed;

  before(async () => {
    api = await import(pathToFileURL(distIndex).href);
    plain = await readFile(resolve(testdataDir, 'hello.txt'));
    compressed = await readFile(resolve(testdataDir, 'hello.txt.zst'));
    basis = await api.BasisUniversal.getInstance(await createNodeWasmInstantiator(wasmPath));
  });

  it('reads decompressed size from frame header', () => {
    const zstd = basis.createZstdDecompressor();
    try {
      const sizeResult = zstd.getDecompressedSize(compressed);
      assert.equal(sizeResult.ok, true);
      assert.equal(sizeResult.size, plain.length);
    } finally {
      zstd.dispose();
    }
  });

  it('decompresses fixture bytes', () => {
    const zstd = basis.createZstdDecompressor();
    try {
      const result = zstd.decompress(compressed);
      assert.equal(result.ok, true);
      assert.equal(result.data.length, plain.length);
      assert.deepEqual(Array.from(result.data), Array.from(plain));
    } finally {
      zstd.dispose();
    }
  });

  it('accepts expectedSize override', () => {
    const zstd = basis.createZstdDecompressor();
    try {
      const result = zstd.decompress(compressed, { expectedSize: plain.length });
      assert.equal(result.ok, true);
      assert.deepEqual(Array.from(result.data), Array.from(plain));
    } finally {
      zstd.dispose();
    }
  });

  it('rejects frames larger than maxSize without large pre-allocation', () => {
    const zstd = basis.createZstdDecompressor();
    try {
      const result = zstd.decompress(compressed, { maxSize: plain.length - 1 });
      assert.equal(result.ok, false);
      assert.equal(result.code, api.ZstdApiErrorCode.ExceedsMaxSize);
      assert.match(api.zstdErrorName(result.code), /maxSize/i);
    } finally {
      zstd.dispose();
    }
  });

  it('returns native error code when expectedSize is too small', () => {
    const zstd = basis.createZstdDecompressor();
    try {
      const result = zstd.decompress(compressed, {
        expectedSize: Math.max(1, plain.length - 1),
      });
      assert.equal(result.ok, false);
      assert.notEqual(result.code, 0);
      assert.match(api.zstdErrorName(result.code), /too small|Unknown error/i);
    } finally {
      zstd.dispose();
    }
  });

  it('fails on invalid input and maps error name', () => {
    const zstd = basis.createZstdDecompressor();
    try {
      const bad = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7]);
      const sizeResult = zstd.getDecompressedSize(bad);
      assert.equal(sizeResult.ok, false);
      assert.equal(sizeResult.code, api.ZstdApiErrorCode.ContentSizeError);
      assert.equal(
        api.zstdErrorName(sizeResult.code),
        'Invalid zstd frame or content size error',
      );

      const decomp = zstd.decompress(bad, { expectedSize: 16 });
      assert.equal(decomp.ok, false);
      assert.notEqual(decomp.code, 0);
      assert.notEqual(api.zstdErrorName(decomp.code), '');
    } finally {
      zstd.dispose();
    }
  });

  it('default maxSize is 64MB constant', () => {
    assert.equal(api.ZSTD_DEFAULT_MAX_SIZE, 64 * 1024 * 1024);
  });

  it('dispose makes further calls fail', () => {
    const zstd = basis.createZstdDecompressor();
    zstd.dispose();
    const result = zstd.decompress(compressed);
    assert.equal(result.ok, false);
    assert.equal(result.code, api.ZstdApiErrorCode.Disposed);
  });
});
