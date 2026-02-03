import { BasisModuleFuncs } from './index';
import {
  BasisTextureFormat,
  TranscodeOptions,
  TranscodeResult
} from './types';

export class KTX2Transcoder {
  private readonly imageLevelInfo: KTX2ImageLevelInfo;
  private transcoderPtr: number = 0;
  private readonly header = new KTX2Header();
  private inputMemPtr = 0;
  private inputMemSize = 0;
  private outputMemPtr = 0;
  private outputMemSize = 0;
  private initialized = false;
  private disposed = false;

  constructor(private readonly funcs: BasisModuleFuncs) {
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
    this.funcs.free(this.outputMemPtr);
    this.outputMemPtr = 0;
    this.outputMemSize = 0;
  
    // Allocate memory
    if (this.inputMemSize < data.length) {
      this.funcs.free(this.inputMemPtr);
      this.inputMemPtr = this.funcs.malloc(data.length);
      this.inputMemSize = data.length;
    }

    // Copy data
    this.funcs.heap.subarray(this.inputMemPtr, this.inputMemPtr + data.length).set(data);

    // Initialize the transcoder
    const success = this.funcs.ktx2_transcoder_init(this.transcoderPtr, this.inputMemPtr, data.length);
    this.initialized = success;

    return success;
  }

  /** Returns the KTX2 header. Valid after init(). */
  getHeader() {
    this.checkDisposed();
    this.checkInitialized();
    const ptr = this.funcs.ktx2_transcoder_get_header(this.transcoderPtr);
    const header = this.header;
    header.view(this.funcs.heap.buffer, ptr);
    return header;
  }

  /**
   * Get the basis texture format
   */
  getBasisTextureFormat(): BasisTextureFormat {
    this.checkDisposed();
    this.checkInitialized();
    return this.funcs.ktx2_transcoder_get_basis_tex_format(this.transcoderPtr);
  }

  /**
   * get_image_level_info() be called after init(), but the m_iframe_flag's won't be valid until start_transcoding() is called.
   * You can call this method before calling transcode_image_level() to retrieve basic information about the mipmap level's dimensions, etc.
   */
  getImageLevelInfo(levelIndex: number, layerIndex: number, faceIndex: number): KTX2ImageLevelInfo | null {
    this.checkDisposed();
    this.checkInitialized();
    const imageLevelInfo = this.imageLevelInfo;
    if (!imageLevelInfo.fill(this.transcoderPtr, levelIndex, layerIndex, faceIndex)) {
      return null;
    }
    return imageLevelInfo;
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
    if (!imageLevelInfo.fill(this.transcoderPtr, level, layer, face)) {
      return null;
    }
    const origWidth = imageLevelInfo.origWidth;
    const origHeight = imageLevelInfo.origHeight;

    // Calculate output size
    const outputSize = this.funcs.basis_compute_transcoded_image_size_in_bytes(format, origWidth, origHeight);

    // Allocate output buffer
    if (this.outputMemSize < outputSize) {
      this.funcs.free(this.outputMemPtr);
      this.outputMemPtr = this.funcs.malloc(outputSize);
      this.outputMemSize = outputSize;
    }

    const uncompressed = this.funcs.basis_transcoder_format_is_uncompressed(format);

    let args: Parameters<typeof this.funcs.ktx2_transcoder_transcode_image_level>;
    if (uncompressed) {
      args = [
        this.transcoderPtr, level, layer, face,
        this.outputMemPtr, origWidth * origHeight, format,
        decodeFlags, origWidth, origHeight, -1, -1, 0];
    } else {
      const bytesPerBlock = this.funcs.basis_get_bytes_per_block_or_pixel(format);
      args = [
        this.transcoderPtr, level, layer, face,
        this.outputMemPtr, outputSize / bytesPerBlock, format,
        decodeFlags, 0, 0, -1, -1, 0];
    }

    // Transcode
    const success = this.funcs.ktx2_transcoder_transcode_image_level(...args);

    if (!success) {
      return null;
    }

    return {
      data: this.funcs.heap.subarray(this.outputMemPtr, this.outputMemPtr + outputSize),
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

    this.funcs.free(this.inputMemPtr);
    this.inputMemPtr = 0;
    this.inputMemSize = 0;
    this.funcs.free(this.outputMemPtr);
    this.outputMemPtr = 0;
    this.outputMemSize = 0;

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

class KTX2ImageLevelInfo {
  private dataView: Uint32Array;

  constructor(private readonly funcs: BasisModuleFuncs) {
    const structSize = 12 * 4 + 2 * 4;
    const ptr = funcs.malloc(structSize);
    this.dataView = new Uint32Array(funcs.heap.buffer, ptr, structSize / 4);
  }

  dispose(): void {
    this.funcs.free(this.dataView.byteOffset);
  }

  fill(ktx2TranscoderPtr: number, level_index: number, layer_index: number, face_index: number) {
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


// struct ktx2_header
// {
// 	uint8_t m_identifier[12];
// 	basisu::packed_uint<4> m_vk_format;
// 	basisu::packed_uint<4> m_type_size;
// 	basisu::packed_uint<4> m_pixel_width;
// 	basisu::packed_uint<4> m_pixel_height;
// 	basisu::packed_uint<4> m_pixel_depth;
// 	basisu::packed_uint<4> m_layer_count;
// 	basisu::packed_uint<4> m_face_count;
// 	basisu::packed_uint<4> m_level_count;
// 	basisu::packed_uint<4> m_supercompression_scheme;
// 	basisu::packed_uint<4> m_dfd_byte_offset;
// 	basisu::packed_uint<4> m_dfd_byte_length;
// 	basisu::packed_uint<4> m_kvd_byte_offset;
// 	basisu::packed_uint<4> m_kvd_byte_length;
// 	basisu::packed_uint<8> m_sgd_byte_offset;
// 	basisu::packed_uint<8> m_sgd_byte_length;
// };
const KTX2HeaderSize = 12 + 4 * 13 + 8 * 2;
class KTX2Header {
  private dataView: Uint32Array<ArrayBufferLike> = new Uint32Array();

  view(buffer: ArrayBufferLike, ptr: number) {
    this.dataView = new Uint32Array(buffer, ptr, KTX2HeaderSize / 4);
  }

  get vkFormat() {
    return this.dataView[3];
  }

  get typeSize() {
    return this.dataView[4];
  }

  /** Returns the texture's width in texels. Always non-zero, might not be divisible by 4. Valid after init(). */
  get width() {
    return this.dataView[5];
  }

  /** Returns the texture's height in texels. Always non-zero, might not be divisible by 4. Valid after init(). */
  get height() {
    return this.dataView[6];
  }

  get depth() {
    return this.dataView[7];
  }

  /** Returns 0 or the number of layers in the texture array or texture video. Valid after init(). */
  get layers() {
    return this.dataView[8];
  }

  /* Returns the number of faces. Returns 1 for 2D textures and or 6 for cubemaps. Valid after init(). **/
  get faces() {
    return this.dataView[9];
  }

  /** Returns the texture's number of mipmap levels. Always returns 1 or higher. Valid after init(). */
   get levels() {
    return this.dataView[10];
  }
}