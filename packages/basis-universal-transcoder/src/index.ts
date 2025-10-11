/**
 * Basis Universal Transcoder - WebAssembly TypeScript Wrapper
 * 
 * This library provides a TypeScript wrapper around the Basis Universal
 * texture transcoder compiled to WebAssembly.
 */

import { EmscriptenModule, TranscoderTextureFormat } from './types.js';
import { KTX2Transcoder } from './transcoder.js';
import basis_capi_transcoder_js from '../../../build/basis_capi_transcoder_patched.js';

// Re-export types and utilities
export * from './types.js';
export * from './transcoder.js';
export * from './utils.js';

const BasisFuncProtos = {
  basisu_transcoder_init: () => { },
  basis_transcoder_format_has_alpha: (_format: TranscoderTextureFormat) => false,
  basis_transcoder_format_is_hdr: (_format: TranscoderTextureFormat) => false,
  basis_transcoder_format_is_uncompressed: (_format: TranscoderTextureFormat) => false,
  basis_get_bytes_per_block_or_pixel: (_format: TranscoderTextureFormat) => 0,
  basis_compute_transcoded_image_size_in_bytes: (_format: TranscoderTextureFormat, _width: number, _height: number) => 0,
  ktx2_transcoder_new: () => 0,
  ktx2_transcoder_delete: (_transcoderPtr: number) => { },
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
   * Get or create a BasisUniversal instance with custom WASM loader
   */
  static async getInstance(instantiateWasmAsync: InstantiateWasmAsync): Promise<BasisUniversal> {
    if (BasisUniversal.instance) {
      return BasisUniversal.instance;
    }
    const module = await basis_capi_transcoder_js({
      instantiateWasmAsync,
    }) as EmscriptenModule;
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

export type InstantiateWasmAsync = (imports: WebAssembly.Imports) => Promise<WebAssembly.WebAssemblyInstantiatedSource>;

function numberArgTypes(count: number) {
  return Array.from({ length: count }, () => 'number');
}
