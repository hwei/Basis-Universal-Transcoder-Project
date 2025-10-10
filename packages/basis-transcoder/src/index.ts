/**
 * Basis Universal Transcoder - WebAssembly TypeScript Wrapper
 * 
 * This library provides a TypeScript wrapper around the Basis Universal
 * texture transcoder compiled to WebAssembly.
 */

import { EmscriptenModule, TranscoderTextureFormat } from './types';
import { KTX2Transcoder } from './transcoder';
import basis_capi_transcoder_wasm_url from '../../../build/basis_capi_transcoder.wasm?url';
import basis_capi_transcoder_js from '../../../build/basis_capi_transcoder.js';

// Re-export types and utilities
export * from './types';
export * from './transcoder';
export * from './utils';

const BasisFuncProtos = {
  basisu_transcoder_init: () => {},
  basis_transcoder_format_has_alpha: (_format: TranscoderTextureFormat) => false,
  basis_transcoder_format_is_hdr: (_format: TranscoderTextureFormat) => false,
  basis_transcoder_format_is_uncompressed: (_format: TranscoderTextureFormat) => false,
  basis_get_bytes_per_block_or_pixel: (_format: TranscoderTextureFormat) => 0,
  basis_compute_transcoded_image_size_in_bytes: (_format: TranscoderTextureFormat, _width: number, _height: number) => 0,
  ktx2_transcoder_new: () => 0,
  ktx2_transcoder_delete: (_transcoderPtr: number) => {},
  ktx2_transcoder_init: (_transcoderPtr: number, _dataPtr: number, _dataSize: number) => false,
  ktx2_transcoder_get_header: (_transcoderPtr: number) => 0,
  ktx2_transcoder_get_basis_texture_format: (_transcoderPtr: number) => 0,
  ktx2_transcoder_start_transcoding: (_transcoderPtr: number) => false,
  ktx2_transcoder_get_image_level_info: (
    _transcoderPtr: number,
    _levelInfoPtr: number,
    _levelIndex: number,
    _layerIndex: number,
    _faceIndex: number
  ) => false,
  ktx2_transcoder_transcode_image_level: (
    _transcoderPtr: number,
    _levelIndex: number,
    _layerIndex: number,
    _faceIndex: number,
    _outputBlocksPtr: number,
    _outputBlocksBufSizeInBlocksOrPixels: number,
    _fmt: TranscoderTextureFormat,
    _decodeFlags: number,
    _outputRowPitchInBlocksOrPixels: number,
    _outputRowsInPixels: number,
    _channel0: number,
    _channel1: number,
    _statePtr: number,
  ) => false,
} as const;

export type BasisModuleFuncs = typeof BasisFuncProtos & {
  malloc: (size: number) => Uint8Array<ArrayBuffer>;
  free: (mem: ArrayBufferView) => void;
}

function getProtoReturnType(v: false): 'boolean'
function getProtoReturnType(v: 0): 'number'
function getProtoReturnType(v: void): 'void'
function getProtoReturnType(v: any) {
  if (v === false) {
    return 'boolean';
  } else if (v === 0) {
    return 'number';
  } else if (v === void 0) {
    return 'void';
  }
  throw new Error(`Unknown return type: ${v}`);
}

function getAllBasisFuncs(module: EmscriptenModule) {
  const funcs = Object.entries(BasisFuncProtos).reduce((acc, [key, func]) => {
    const returnValue = (func as any)();
    const returnType = getProtoReturnType(returnValue);
    acc[key] = module.cwrap(key, returnType, numberArgTypes(func.length)) as any;
    return acc;
  }, {} as any);
  funcs.malloc = (size: number) => {
    const ptr = module._malloc(size);
    return new Uint8Array(module.HEAPU8.buffer, ptr, size);
  };
  funcs.free = (mem: Uint8Array) => {
    module._free(mem.byteOffset);
  };
  return funcs as BasisModuleFuncs;
}

/**
 * High-level API for quick transcoding
 */
export class BasisUniversal {
  private static instance: BasisUniversal | null = null;
  readonly funcs: BasisModuleFuncs;

  private constructor(module: EmscriptenModule) {
    this.funcs = getAllBasisFuncs(module);
    this.funcs.basisu_transcoder_init();
  }

  /**
   * Get or create a BasisUniversal instance
   */
  static async getInstance(): Promise<BasisUniversal> {
    return BasisUniversal.getInstanceInternal(initBasisModule);
  }

  /**
   * Get or create a BasisUniversal instance with custom WASM
   */
  static async getInstanceWithCustomWasm(wasm: BufferSource): Promise<BasisUniversal> {
    return BasisUniversal.getInstanceInternal(() => initBasisModuleWithCustomWasm(wasm));
  }

  private static async getInstanceInternal(getModuleAsync: () => Promise<EmscriptenModule>): Promise<BasisUniversal> {
    if (BasisUniversal.instance) {
      return BasisUniversal.instance;
    }
    const module = await getModuleAsync();
    const inst = new BasisUniversal(module);
    BasisUniversal.instance = inst;
    return inst;
  }

  /**
   * Create a KTX2 transcoder for the given data
   */
  createKTX2Transcoder(): KTX2Transcoder {
    return new KTX2Transcoder(this.funcs);
  }
}

/**
 * Initialize the Basis Universal transcoder module
 */
async function initBasisModule(): Promise<EmscriptenModule> {
  const wasmResponse = await fetch(basis_capi_transcoder_wasm_url);
  const wasmArrayBuffer = await wasmResponse.arrayBuffer();
  const module = await basis_capi_transcoder_js({
    wasm: wasmArrayBuffer,
  });

  return module as EmscriptenModule;
}

/**
 * Initialize the Basis Universal transcoder module with custom WASM
 */
async function initBasisModuleWithCustomWasm(wasm: BufferSource): Promise<EmscriptenModule> {
  const module = await basis_capi_transcoder_js({
    wasm,
  });

  return module as EmscriptenModule;
}

function numberArgTypes(count: number) {
  return Array.from({ length: count }, () => 'number');
}
