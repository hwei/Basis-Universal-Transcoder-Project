import { BasisModuleFuncs } from './index';
import {
  BasisTextureFormat,
  TranscodeOptions,
  TranscodeResult
} from './types';

export class KTX2Transcoder {
  private readonly funcs: BasisModuleFuncs;
  private readonly imageLevelInfo: KTX2ImageLevelInfo;
  private transcoderPtr: number = 0;
  private inputMem = new Uint8Array();
  private outputMem = new Uint8Array();
  private initialized = false;
  private disposed = false;

  constructor(funcs: BasisModuleFuncs) {
    this.funcs = funcs;
    this.transcoderPtr = funcs.ktx2_transcoder_new();
    this.imageLevelInfo = new KTX2ImageLevelInfo(funcs);
  }

  /**
   * Initialize the transcoder with KTX2 file data
   * 
   * Performance tip: You can reuse the same KTX2Transcoder instance by calling
   * init() multiple times with different KTX2 data. This reduces memory allocation
   * overhead compared to creating new transcoder instances.
   * 
   * @param data KTX2 file data as Uint8Array
   * @returns true if initialization succeeded, false otherwise
   */
  init(data: Uint8Array): boolean {
    this.checkDisposed();

    // free output
    this.funcs.free(this.outputMem);
    this.outputMem = new Uint8Array();
  
    // Allocate memory
    if (this.inputMem.length < data.length) {
      this.funcs.free(this.inputMem);
      this.inputMem = this.funcs.malloc(data.length);
    }

    // Copy data
    this.inputMem.set(data);

    // Initialize the transcoder
    const success = this.funcs.ktx2_transcoder_init(this.transcoderPtr, this.inputMem.byteOffset, data.length);
    this.initialized = success;

    return success;
  }

  /**
   * Get the basis texture format
   */
  getBasisTextureFormat(): BasisTextureFormat {
    this.checkDisposed();
    this.checkInitialized();
    return this.funcs.ktx2_transcoder_get_basis_texture_format(this.transcoderPtr);
  }

  /**
   * Start transcoding (must be called before transcoding images)
   */
  startTranscoding(): boolean {
    this.checkDisposed();
    this.checkInitialized();
    return this.funcs.ktx2_transcoder_start_transcoding(this.transcoderPtr);
  }

  /**
   * Transcode an image level
   * 
   * ⚠️ IMPORTANT: The returned TranscodeResult.data references WASM-managed memory
   * and will become invalid after the next call to this method. If you need to
   * persist the data, create a copy using new Uint8Array(result.data) or 
   * result.data.slice() before calling this method again.
   * 
   * @param options Transcoding options including format, level, layer, face
   * @returns TranscodeResult with image data, or null if transcoding failed
   */
  transcodeImageLevel(options: TranscodeOptions): TranscodeResult | null {
    this.checkDisposed();
    this.checkInitialized();

    const {
      format,
      level = 0,
      layer = 0,
      face = 0,
      decodeFlags = 0
    } = options;

    const imageLevelInfo = this.imageLevelInfo;
    imageLevelInfo.init(this.transcoderPtr, level, layer, face);
    const origWidth = imageLevelInfo.origWidth;
    const origHeight = imageLevelInfo.origHeight;

    // Calculate output size
    const outputSize = this.funcs.basis_compute_transcoded_image_size_in_bytes(format, origWidth, origHeight);

    // Allocate output buffer
    if (this.outputMem.length < outputSize) {
      this.funcs.free(this.outputMem);
      this.outputMem = this.funcs.malloc(outputSize);
    }

    const uncompressed = this.funcs.basis_transcoder_format_is_uncompressed(format);

    let args: Parameters<typeof this.funcs.ktx2_transcoder_transcode_image_level>;
    if (uncompressed) {
      args = [
        this.transcoderPtr, level, layer, face,
        this.outputMem.byteOffset, origWidth * origHeight, format,
        decodeFlags, origWidth, origHeight, -1, -1, 0];
    } else {
      const bytesPerBlock = this.funcs.basis_get_bytes_per_block_or_pixel(format);
      args = [
        this.transcoderPtr, level, layer, face,
        this.outputMem.byteOffset, outputSize / bytesPerBlock, format,
        decodeFlags, 0, 0, -1, -1, 0];
    }

    // Transcode
    const success = this.funcs.ktx2_transcoder_transcode_image_level(...args);

    if (!success) {
      return null;
    }

    // Build result data view
    const resultData = new Uint8Array(this.outputMem.buffer, this.outputMem.byteOffset, outputSize);

    return {
      data: resultData,
      width: origWidth,
      height: origHeight,
    };

  }

  /**
   * Clean up resources
   */
  dispose(): void {
    if (this.disposed) {
      return;
    }

    if (this.transcoderPtr) {
      this.funcs.ktx2_transcoder_delete(this.transcoderPtr);
      this.transcoderPtr = 0;
    }

    this.funcs.free(this.inputMem);
    this.inputMem = new Uint8Array();
    this.funcs.free(this.outputMem);
    this.outputMem = new Uint8Array();

    this.initialized = false;

    this.imageLevelInfo.dispose();
    this.disposed = true;
  }

  private checkInitialized(): void {
    if (!this.initialized) {
      throw new Error('KTX2 transcoder not initialized. Call init() with KTX2 data first.');
    }
  }

  private checkDisposed(): void {
    if (this.disposed) {
      throw new Error('KTX2 transcoder already disposed.');
    }
  }
}

// // Information about a single 2D texture "image" in a KTX2 file.
// struct ktx2_image_level_info
// {
// 	// The mipmap level index (0=largest), texture array layer index, and cubemap face index of the image.
// 	uint32_t m_level_index;
// 	uint32_t m_layer_index;
// 	uint32_t m_face_index;

// 	// The image's actual (or the original source image's) width/height in pixels, which may not be divisible by 4 pixels.
// 	uint32_t m_orig_width;
// 	uint32_t m_orig_height;

// 	// The image's physical width/height, which will always be divisible by 4 pixels.
// 	uint32_t m_width;
// 	uint32_t m_height;

// 	// The texture's dimensions in 4x4 or 6x6 texel blocks.
// 	uint32_t m_num_blocks_x;
// 	uint32_t m_num_blocks_y;

// 	// The format's block width/height (currently either 4 or 6).
// 	uint32_t m_block_width;
// 	uint32_t m_block_height;

// 	// The total number of blocks
// 	uint32_t m_total_blocks;

// 	// true if the image has alpha data
// 	bool m_alpha_flag;

// 	// true if the image is an I-Frame. Currently, for ETC1S textures, the first frame will always be an I-Frame, and subsequent frames will always be P-Frames.
// 	bool m_iframe_flag;
// };

export class KTX2ImageLevelInfo {
  private readonly funcs: BasisModuleFuncs;
  private readonly dataView: Uint32Array;

  constructor(funcs: BasisModuleFuncs) {
    this.funcs = funcs;
    const structSize = 12 * 4 + 2 * 4;
    const mem = funcs.malloc(structSize);
    this.dataView = new Uint32Array(mem.buffer, mem.byteOffset, structSize / 4);
  }

  dispose(): void {
    this.funcs.free(this.dataView);
    (this.dataView as any) = null;
  }

  init(ktx2TranscoderPtr: number, level_index: number, layer_index: number, face_index: number) {
    return this.funcs.ktx2_transcoder_get_image_level_info(
      ktx2TranscoderPtr, this.dataView.byteOffset, level_index, layer_index, face_index);
  }

  get levelIndex(): number {
    return this.dataView[0];
  }

  get layerIndex(): number {
    return this.dataView[1];
  }

  get faceIndex(): number {
    return this.dataView[2];
  }

  get origWidth(): number {
    return this.dataView[3];
  }

  get origHeight(): number {
    return this.dataView[4];
  }

  get width(): number {
    return this.dataView[5];
  }

  get height(): number {
    return this.dataView[6];
  }

  get numBlocksX(): number {
    return this.dataView[7];
  }

  get numBlocksY(): number {
    return this.dataView[8];
  }

  get blockWidth(): number {
    return this.dataView[9];
  }

  get blockHeight(): number {
    return this.dataView[10];
  }

  get totalBlocks(): number {
    return this.dataView[11];
  }

  get alphaFlag(): boolean {
    return this.dataView[12] !== 0;
  }

  get iframeFlag(): boolean {
    return this.dataView[13] !== 0;
  }
}
