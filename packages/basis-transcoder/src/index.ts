/**
 * Basis Universal Transcoder - WebAssembly TypeScript Wrapper
 * 
 * This library provides a TypeScript wrapper around the Basis Universal
 * texture transcoder compiled to WebAssembly.
 */

import { EmscriptenModule, TranscoderTextureFormat } from './types.js';
import { KTX2Transcoder } from './transcoder.js';
import basis_capi_transcoder_wasm_url from '../../../build/basis_capi_transcoder.wasm?url';
import basis_capi_transcoder_wasm_js from '../../../build/basis_capi_transcoder.js';

// Re-export types and utilities
export * from './types.js';
export * from './transcoder.js';
export * from './utils.js';

/**
 * Initialize the Basis Universal transcoder module
 */
async function initBasisModule(): Promise<EmscriptenModule> {
  const wasmResponse = await fetch(basis_capi_transcoder_wasm_url);
  const wasmArrayBuffer = await wasmResponse.arrayBuffer();
  const module = await basis_capi_transcoder_wasm_js({
    wasm: wasmArrayBuffer,
  });

  return module as EmscriptenModule;
}

/**
 * High-level API for quick transcoding
 */
export class BasisUniversal {
  private static instance: BasisUniversal | null = null;
  private readonly module: EmscriptenModule;

  private constructor(module: EmscriptenModule) {
    this.module = module;
    this.module.ccall('basisu_transcoder_init', 'void', [], []);
  }

  /**
   * Get or create a BasisUniversal instance
   */
  static async getInstance(): Promise<BasisUniversal> {
    if (BasisUniversal.instance) {
      return BasisUniversal.instance;
    }
    const module = await initBasisModule();
    const inst = new BasisUniversal(module);
    BasisUniversal.instance = inst;
    return inst;
  }

  /**
   * Create a KTX2 transcoder for the given data
   */
  createKTX2Transcoder(data: Uint8Array): KTX2Transcoder {
    const transcoder = new KTX2Transcoder(this.module);
    if (!transcoder.init(data)) {
      transcoder.dispose();
      throw new Error('Failed to initialize KTX2 transcoder');
    }
    return transcoder;
  }

  /**
   * Get information about a texture format
   */
  getFormatInfo(format: TranscoderTextureFormat) {
    const hasAlpha = this.module!.ccall(
      'basis_transcoder_format_has_alpha',
      'boolean',
      ['number'],
      [format]
    );

    const isHdr = this.module!.ccall(
      'basis_transcoder_format_is_hdr',
      'boolean',
      ['number'],
      [format]
    );

    const isUncompressed = this.module!.ccall(
      'basis_transcoder_format_is_uncompressed',
      'boolean',
      ['number'],
      [format]
    );

    const bytesPerBlockOrPixel = this.module!.ccall(
      'basis_get_bytes_per_block_or_pixel',
      'number',
      ['number'],
      [format]
    );

    return {
      hasAlpha,
      isHdr,
      isUncompressed,
      bytesPerBlockOrPixel
    };
  }

  /**
   * Calculate the size needed for transcoded image data
   */
  calculateTranscodedSize(
    format: TranscoderTextureFormat,
    width: number,
    height: number
  ): number {
    return this.module!.ccall(
      'basis_compute_transcoded_image_size_in_bytes',
      'number',
      ['number', 'number', 'number'],
      [format, width, height]
    );
  }

}

/**
 * Default export for convenience
 */
export default BasisUniversal;