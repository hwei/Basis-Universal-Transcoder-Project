import { 
  EmscriptenModule, 
  BasisTextureFormat,
  TranscodeOptions,
  TranscodeResult 
} from './types.js';


export class KTX2Transcoder {
  private readonly module: EmscriptenModule;
  private readonly imageLevelInfo: KTX2ImageLevelInfo;
  private transcoderPtr: number = 0;
  private dataPtr: number = 0;
  private initialized = false;

  constructor(module: EmscriptenModule) {
    this.module = module;
    this.transcoderPtr = this.module.ccall('ktx2_transcoder_new', 'number', [], []);
    this.imageLevelInfo = new KTX2ImageLevelInfo(this.module);
  }

  /**
   * Initialize the transcoder with KTX2 file data
   */
  init(data: Uint8Array): boolean {
    if (this.dataPtr) {
      this.module._free(this.dataPtr);
    }

    // Allocate memory and copy data
    this.dataPtr = this.module._malloc(data.length);
    this.module.HEAPU8.set(data, this.dataPtr);

    // Initialize the transcoder
    const success = this.module.ccall(
      'ktx2_transcoder_init',
      'boolean',
      ['number', 'number', 'number'],
      [this.transcoderPtr, this.dataPtr, data.length]
    );

    if (success) {
      this.initialized = true;
    }

    return success;
  }

  /**
   * Get the basis texture format
   */
  getBasisTextureFormat(): BasisTextureFormat {
    this.checkInitialized();
    
    return this.module.ccall(
      'ktx2_transcoder_get_basis_tex_format',
      'number',
      ['number'],
      [this.transcoderPtr]
    );
  }

  /**
   * Start transcoding (must be called before transcoding images)
   */
  startTranscoding(): boolean {
    this.checkInitialized();
    
    return this.module.ccall(
      'ktx2_transcoder_start_transcoding',
      'boolean',
      ['number'],
      [this.transcoderPtr]
    );
  }

  /**
   * Transcode an image level
   */
  transcodeImageLevel(options: TranscodeOptions): TranscodeResult | null {
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
    const outputSize = this.module.ccall(
      'basis_compute_transcoded_image_size_in_bytes',
      'number',
      ['number', 'number', 'number'],
      [format, origWidth, origHeight]
    );

    // Allocate output buffer
    const outputPtr = this.module._malloc(outputSize);
    
    try {
      const uncompressed = this.module.ccall(
        'basis_transcoder_format_is_uncompressed',
        'boolean',
        ['number'],
        [format]
      );

      let args: number[];
      if (uncompressed) {
          args = [
              this.transcoderPtr, level, layer, face,
              outputPtr, origWidth * origHeight, format,
              decodeFlags, origWidth, origHeight, -1, -1, 0];
      } else {
          const bytesPerBlock = this.module.ccall(
            'basis_get_bytes_per_block_or_pixel',
            'number',
            ['number'],
            [format]
          );
          args = [
              this.transcoderPtr, level, layer, face,
              outputPtr, outputSize / bytesPerBlock, format,
              decodeFlags, 0, 0, -1, -1, 0];
      }


      // Transcode
      const success = this.module.ccall(
        'transcode_image_level',
        'boolean',
        ['number', 'number', 'number', 'number', 'number', 'number', 'number', 'number', 'number', 'number', 'number', 'number', 'number'],
        args
      );

      if (!success) {
        return null;
      }

      // Copy result data
      const resultData = new Uint8Array(outputSize);
      resultData.set(this.module.HEAPU8.subarray(outputPtr, outputPtr + outputSize));

      const hasAlpha = this.module.ccall(
        'basis_transcoder_format_has_alpha',
        'boolean',
        ['number'],
        [format]
      );

      return {
        data: resultData,
        width: origWidth,
        height: origHeight,
        format,
        hasAlpha
      };
    } finally {
      this.module._free(outputPtr);
    }
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    if (this.transcoderPtr) {
      this.module.ccall('ktx2_transcoder_delete', 'void', ['number'], [this.transcoderPtr]);
      this.transcoderPtr = 0;
    }
    
    if (this.dataPtr) {
      this.module._free(this.dataPtr);
      this.dataPtr = 0;
    }
    
    this.initialized = false;

    this.imageLevelInfo.dispose();
  }

  private checkInitialized(): void {
    if (!this.initialized) {
      throw new Error('KTX2 transcoder not initialized. Call init() with KTX2 data first.');
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
  private readonly module: EmscriptenModule;
  private readonly dataView: Uint32Array;

  constructor(module: EmscriptenModule, ) {
    this.module = module;
    const structSize = 12 * 4 + 2 * 4;
    const infoPtr = module._malloc(structSize);
    this.dataView = new Uint32Array(this.module.HEAPU8.buffer, infoPtr, structSize);
  }

  dispose(): void {
    this.module._free(this.dataView.byteOffset);
    (this.dataView as any) = null;
  }

  init(ktx2TranscoderPtr: number, level_index: number, layer_index: number, face_index: number) {
    return this.module.ccall(
      'ktx2_transcoder_get_image_level_info',
      'boolean',
      ['number', 'number', 'number', 'number'],
      [ktx2TranscoderPtr, this.dataView.byteOffset, level_index, layer_index, face_index]
    );
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
