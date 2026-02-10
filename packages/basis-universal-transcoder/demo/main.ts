import {
  BasisUniversal,
  KTX2Transcoder,
  TranscoderTextureFormat,
  BasisTextureFormat,
  detectBestFormat,
  isFormatSupported,
  getFormatName,
  TranscodeResult
} from '../src/index';
import * as THREE from 'three';
import wasmUrl from '/basis_capi_transcoder.wasm?url';

class BasisDemo {
  private basisUniversal: BasisUniversal | null = null;
  private currentTranscoder: KTX2Transcoder | null = null;
  private scene: THREE.Scene | null = null;
  private camera: THREE.OrthographicCamera | null = null;
  private renderer: THREE.WebGLRenderer | null = null;
  private currentMesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial> | null = null;

  constructor() {
    this.initializeUI();
    this.initializeThreeJS();
    this.detectPlatformSupport();
    this.loadTranscoder();
  }

  private initializeThreeJS() {
    // 创建 Three.js 场景、相机和渲染器
    this.scene = new THREE.Scene();
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(512, 512); // 默认尺寸，会根据纹理调整
    this.renderer.setClearColor(0x222222);

    // 将渲染器添加到 canvas 容器
    const canvasContainer = document.querySelector('.canvas-container') as HTMLElement;
    if (canvasContainer) {
      // 清空容器并添加 Three.js canvas
      canvasContainer.innerHTML = '';
      canvasContainer.appendChild(this.renderer.domElement);
    }

    // 创建正交相机（默认配置，会根据纹理尺寸调整）
    this.camera = new THREE.OrthographicCamera(-256, 256, 256, -256, 1, 1000);
    this.camera.position.z = 5;
  }

  private async loadTranscoder() {
    try {
      console.log('Loading Basis Universal module...');
      const basisUniversal = await BasisUniversal.getInstance(async (imports) => {
        const fetchPromise = fetch(wasmUrl);
        // 1. 尝试使用 instantiateStreaming（流式编译）
        if (WebAssembly.instantiateStreaming) {
          try {
            return WebAssembly.instantiateStreaming(fetchPromise, imports);
          } catch (e) {
            console.warn('instantiateStreaming 失败，回退到 ArrayBuffer 方式:', e);
            // 如果流式编译失败（例如 MIME 类型不正确），继续执行降级方案
          }
        }

        // 2. 降级方案（手动编译）：
        // 这适用于不支持 instantiateStreaming 的旧浏览器，或流式编译失败的情况
        const response = await fetchPromise;
        const buffer = await response.arrayBuffer(); // 获取 ArrayBuffer
        return WebAssembly.instantiate(buffer, imports);
      });
      this.basisUniversal = basisUniversal;
      this.currentTranscoder = basisUniversal.createKTX2Transcoder();
      console.log('Basis Universal module loaded successfully');
      this.updateStatus('Ready to load files');
    } catch (error) {
      console.error('Failed to load Basis Universal module:', error);
      this.updateStatus('Failed to load WASM module', true);
    }
  }

  private initializeUI() {
    const fileInput = document.getElementById('fileInput') as HTMLInputElement;
    const transcodeBtn = document.getElementById('transcodeBtn') as HTMLButtonElement;
    const targetFormat = document.getElementById('targetFormat') as HTMLSelectElement;
    const uploadArea = document.querySelector('.upload-area') as HTMLElement;

    // File input handling
    fileInput.addEventListener('change', (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        this.loadFile(file);
      }
    });

    // Drag and drop
    uploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadArea.classList.add('dragover');
    });

    uploadArea.addEventListener('dragleave', () => {
      uploadArea.classList.remove('dragover');
    });

    uploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadArea.classList.remove('dragover');
      const file = e.dataTransfer?.files[0];
      if (file) {
        this.loadFile(file);
      }
    });

    // Transcode button
    transcodeBtn.addEventListener('click', () => {
      this.transcodeImage();
    });

    // Format selection
    targetFormat.addEventListener('change', () => {
      this.updateFormatSupport();
    });

    // Mip level selection
    const mipLevel = document.getElementById('mipLevel') as HTMLSelectElement;
    mipLevel.addEventListener('change', () => {
      this.displayImageLevelInfo();
    });
  }

  private async loadFile(file: File) {
    try {
      this.updateStatus('Loading file...');

      const arrayBuffer = await file.arrayBuffer();
      const fileData = new Uint8Array(arrayBuffer);

      if (!this.currentTranscoder) {
        throw new Error('No transcoder instance available');
      }

      // Clean up previous transcoder
      if (!this.currentTranscoder.init(fileData)) {
        throw new Error('Failed to initialize KTX2 transcoder');
      }

      this.updateStatus('File loaded successfully');
      this.displayFileInfo();

      const transcodeBtn = document.getElementById('transcodeBtn') as HTMLButtonElement;
      transcodeBtn.disabled = false;

    } catch (error) {
      console.error('Error loading file:', error);
      this.updateStatus('Error loading file', true);
    }
  }

  private async transcodeImage() {
    if (!this.currentTranscoder) return;

    try {
      this.updateStatus('Transcoding...');

      const targetFormat = parseInt((document.getElementById('targetFormat') as HTMLSelectElement).value) as TranscoderTextureFormat;
      const mipLevel = parseInt((document.getElementById('mipLevel') as HTMLSelectElement).value);

      const startTime = performance.now();

      if (!this.currentTranscoder.startTranscoding()) {
        throw new Error('Failed to start transcoding');
      }

      const result = this.currentTranscoder.transcodeImageLevel({
        format: targetFormat,
        level: mipLevel
      });

      const endTime = performance.now();

      if (!result) {
        throw new Error('Transcoding failed');
      }

      this.displayResult(result, targetFormat, endTime - startTime);
      this.updateStatus('Transcoding completed successfully');

    } catch (error) {
      console.error('Transcoding error:', error);
      this.updateStatus('Transcoding failed', true);
    }
  }

  private getThreeJSFormat(format: TranscoderTextureFormat): THREE.CompressedPixelFormat | null {
    // 映射 TranscoderTextureFormat 到 Three.js 压缩纹理格式
    switch (format) {
      case TranscoderTextureFormat.cTFBC1_RGB:
        return THREE.RGB_S3TC_DXT1_Format;
      case TranscoderTextureFormat.cTFBC3_RGBA:
        return THREE.RGBA_S3TC_DXT5_Format;
      case TranscoderTextureFormat.cTFBC4_R:
        return THREE.RED_RGTC1_Format;
      case TranscoderTextureFormat.cTFBC5_RG:
        return THREE.RED_GREEN_RGTC2_Format;
      case TranscoderTextureFormat.cTFBC7_RGBA:
        return THREE.RGBA_BPTC_Format;
      case TranscoderTextureFormat.cTFASTC_4x4_RGBA:
        return THREE.RGBA_ASTC_4x4_Format;
      case TranscoderTextureFormat.cTFPVRTC1_4_RGB:
        return THREE.RGB_PVRTC_4BPPV1_Format;
      case TranscoderTextureFormat.cTFPVRTC1_4_RGBA:
        return THREE.RGBA_PVRTC_4BPPV1_Format;
      case TranscoderTextureFormat.cTFPVRTC2_4_RGB:
        return THREE.RGB_PVRTC_2BPPV1_Format;
      case TranscoderTextureFormat.cTFPVRTC2_4_RGBA:
        return THREE.RGBA_PVRTC_2BPPV1_Format;
      case TranscoderTextureFormat.cTFETC2_EAC_R11:
        return THREE.RED_RGTC1_Format;
      case TranscoderTextureFormat.cTFETC2_EAC_RG11:
        return THREE.RED_GREEN_RGTC2_Format;
      default:
        return null; // 不支持的压缩格式或未压缩格式
    }
  }

  private displayResult(result: TranscodeResult, format: TranscoderTextureFormat, duration: number) {
    const hasAlpha = this.basisUniversal?.funcs.basis_transcoder_format_has_alpha(format);

    // Display transcoding info
    const transcodeInfo = document.getElementById('transcodeInfo')!;
    transcodeInfo.innerHTML = `
      <div><strong>Output Format:</strong> ${getFormatName(format)}</div>
      <div><strong>Dimensions:</strong> ${result.width} × ${result.height}</div>
      <div><strong>Data Size:</strong> ${this.formatBytes(result.data.length)}</div>
      <div><strong>Has Alpha:</strong> ${hasAlpha ? 'Yes' : 'No'}</div>
    `;

    // Display performance info
    const performanceInfo = document.getElementById('performanceInfo')!;
    performanceInfo.innerHTML = `
      <div><strong>Transcode Time:</strong> ${duration.toFixed(2)}ms</div>
      <div><strong>Throughput:</strong> ${(result.data.length / 1024 / 1024 / (duration / 1000)).toFixed(2)} MB/s</div>
    `;

    // 使用 Three.js 显示纹理
    this.displayTextureWithThreeJS(result, format);
  }

  private displayTextureWithThreeJS(result: TranscodeResult, format: TranscoderTextureFormat) {
    if (!this.scene || !this.camera || !this.renderer) {
      console.error('Three.js not initialized');
      return;
    }

    const { data, width, height } = result;

    // 移除之前的网格
    if (this.currentMesh) {
      this.scene.remove(this.currentMesh);
      this.currentMesh.geometry.dispose();
      this.currentMesh.material.dispose();
      if (this.currentMesh.material.map) {
        this.currentMesh.material.map.dispose();
      }
    }

    // 调整渲染器尺寸和相机
    const maxSize = 512;
    const aspectRatio = width / height;
    let renderWidth, renderHeight;

    if (aspectRatio > 1) {
      renderWidth = Math.min(maxSize, width);
      renderHeight = renderWidth / aspectRatio;
    } else {
      renderHeight = Math.min(maxSize, height);
      renderWidth = renderHeight * aspectRatio;
    }

    this.renderer.setSize(renderWidth, renderHeight);

    // 调整相机视野以适应纹理尺寸
    this.camera.left = width / -2;
    this.camera.right = width / 2;
    this.camera.top = height / 2;
    this.camera.bottom = height / -2;
    this.camera.updateProjectionMatrix();

    let texture: THREE.Texture;

    // 检查是否为压缩格式
    const threeJSFormat = this.getThreeJSFormat(format);
    console.log(`threeJSFormat format: ${threeJSFormat}`);

    if (threeJSFormat !== null) {
      // 创建压缩纹理
      texture = new THREE.CompressedTexture(
        [{
          data: data,
          width: width,
          height: height,
        }],
        width,
        height,
        threeJSFormat
      );
      texture.needsUpdate = true;
      texture.colorSpace = THREE.SRGBColorSpace;

      console.log(`Created compressed texture with format: ${threeJSFormat}`);
    } else if (format === TranscoderTextureFormat.cTFRGBA32) {
      // 未压缩的 RGBA32 格式
      texture = new THREE.DataTexture(
        new Uint8Array(data),
        width,
        height,
        THREE.RGBAFormat,
        THREE.UnsignedByteType
      );
      texture.needsUpdate = true;
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.flipY = true;

      console.log('Created uncompressed RGBA32 texture');
    } else if (format === TranscoderTextureFormat.cTFRGB565) {
      // RGB565 格式
      texture = new THREE.DataTexture(
        new Uint8Array(data),
        width,
        height,
        THREE.RGBFormat,
        THREE.UnsignedShort5551Type
      );
      texture.needsUpdate = true;
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.flipY = true;

      console.log('Created RGB565 texture');
    } else if (format === TranscoderTextureFormat.cTFRGBA4444) {
      // RGBA4444 格式
      texture = new THREE.DataTexture(
        new Uint8Array(data),
        width,
        height,
        THREE.RGBAFormat,
        THREE.UnsignedShort4444Type
      );
      texture.needsUpdate = true;
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.flipY = true;

      console.log('Created RGBA4444 texture');
    } else {
      // 其他未支持格式的处理
      console.warn(`Unsupported format for Three.js display: ${format} (${getFormatName(format)})`);
      this.displayFallbackMessage(`Unsupported format: ${getFormatName(format)}`);
      return;
    }

    // 创建材质和几何体
    const hasAlpha = this.basisUniversal?.funcs.basis_transcoder_format_has_alpha(format);
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: hasAlpha,
      side: THREE.DoubleSide
    });

    const geometry = new THREE.PlaneGeometry(width, height);

    // 对于压缩纹理，需要手动翻转 UV（因为 texture.flipY 不支持压缩纹理）
    if (threeJSFormat !== null) {
      const uvs = geometry.attributes.uv;
      for (let i = 0; i < uvs.count; i++) {
        uvs.setY(i, 1 - uvs.getY(i));
      }
    }

    // 创建网格并添加到场景
    this.currentMesh = new THREE.Mesh(geometry, material);
    this.currentMesh.position.z = 0;
    this.scene.add(this.currentMesh);

    // 渲染场景
    this.renderer.render(this.scene, this.camera);

    console.log(`Displayed texture: ${width}x${height}, format: ${getFormatName(format)}`);
  }

  private displayFallbackMessage(message: string) {
    if (!this.renderer) return;

    // 创建一个简单的错误显示
    const canvas = this.renderer.domElement;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#333333';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#ffffff';
      ctx.font = '16px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(message, canvas.width / 2, canvas.height / 2);
    }
  }

  private detectPlatformSupport() {
    const platformInfo = document.getElementById('platformInfo')!;

    const formats = [
      { name: 'BC1/BC3 (S3TC)', format: TranscoderTextureFormat.cTFBC3_RGBA },
      { name: 'BC7', format: TranscoderTextureFormat.cTFBC7_RGBA },
      { name: 'ASTC', format: TranscoderTextureFormat.cTFASTC_4x4_RGBA },
      { name: 'PVRTC', format: TranscoderTextureFormat.cTFPVRTC1_4_RGBA },
      { name: 'ETC2', format: TranscoderTextureFormat.cTFETC2_EAC_R11 },
    ];

    formats.forEach(({ name, format }) => {
      const div = document.createElement('div');
      div.className = `platform-support ${isFormatSupported(format) ? 'supported' : 'not-supported'}`;
      div.textContent = `${name}: ${isFormatSupported(format) ? '✓' : '✗'}`;
      platformInfo.appendChild(div);
    });

    // Set recommended format as default
    const bestFormat = detectBestFormat(this.renderer?.getContext() as any);
    const targetFormatSelect = document.getElementById('targetFormat') as HTMLSelectElement;
    targetFormatSelect.value = bestFormat.toString();
    this.updateFormatSupport();
  }

  private updateFormatSupport() {
    const targetFormat = parseInt((document.getElementById('targetFormat') as HTMLSelectElement).value);
    const supported = isFormatSupported(targetFormat as TranscoderTextureFormat);

    const select = document.getElementById('targetFormat') as HTMLSelectElement;
    select.style.borderColor = supported ? '#27ae60' : '#e74c3c';
    select.title = supported ? 'Format is supported on this platform' : 'Format may not be supported on this platform';
  }

  private updateStatus(message: string, isError = false) {
    console.log(isError ? 'Error:' : 'Status:', message);
    // You could add a status display element to show this to users
  }

  private displayFileInfo() {
    if (!this.currentTranscoder) return;

    const header = this.currentTranscoder.getHeader();
    const basisFormat = this.currentTranscoder.getBasisTextureFormat();

    const fileInfoSection = document.getElementById('fileInfoSection')!;
    fileInfoSection.style.display = '';

    const headerInfo = document.getElementById('fileHeaderInfo')!;
    headerInfo.innerHTML = `
      <div class="info-item"><label>Dimensions</label><span>${header.width} × ${header.height}</span></div>
      <div class="info-item"><label>Levels</label><span>${header.levels}</span></div>
      <div class="info-item"><label>Layers</label><span>${header.layers}</span></div>
      <div class="info-item"><label>Faces</label><span>${header.faces}</span></div>
      <div class="info-item"><label>Depth</label><span>${header.depth}</span></div>
      <div class="info-item"><label>vkFormat</label><span>${header.vkFormat}</span></div>
      <div class="info-item"><label>Basis Format</label><span>${this.getBasisFormatName(basisFormat)}</span></div>
    `;

    this.populateMipLevelDropdown(header.levels);
    this.displayImageLevelInfo();
  }

  private populateMipLevelDropdown(levels: number) {
    const mipLevel = document.getElementById('mipLevel') as HTMLSelectElement;
    mipLevel.innerHTML = '';
    for (let i = 0; i < levels; i++) {
      const option = document.createElement('option');
      option.value = i.toString();
      option.textContent = i === 0 ? `Level 0 (Full Size)` : `Level ${i}`;
      mipLevel.appendChild(option);
    }
  }

  private displayImageLevelInfo() {
    if (!this.currentTranscoder) return;

    const mipLevel = parseInt((document.getElementById('mipLevel') as HTMLSelectElement).value);
    const info = this.currentTranscoder.getImageLevelInfo(mipLevel, 0, 0);

    const imageLevelInfo = document.getElementById('imageLevelInfo')!;
    if (!info) {
      imageLevelInfo.innerHTML = '<div class="info-item"><label>Error</label><span>Failed to get image level info</span></div>';
      return;
    }

    imageLevelInfo.innerHTML = `
      <div class="info-item"><label>Orig Width</label><span>${info.origWidth}</span></div>
      <div class="info-item"><label>Orig Height</label><span>${info.origHeight}</span></div>
      <div class="info-item"><label>Width</label><span>${info.width}</span></div>
      <div class="info-item"><label>Height</label><span>${info.height}</span></div>
      <div class="info-item"><label>Blocks X</label><span>${info.numBlocksX}</span></div>
      <div class="info-item"><label>Blocks Y</label><span>${info.numBlocksY}</span></div>
      <div class="info-item"><label>Block Width</label><span>${info.blockWidth}</span></div>
      <div class="info-item"><label>Block Height</label><span>${info.blockHeight}</span></div>
      <div class="info-item"><label>Total Blocks</label><span>${info.totalBlocks}</span></div>
      <div class="info-item"><label>Alpha</label><span>${info.alphaFlag ? 'Yes' : 'No'}</span></div>
      <div class="info-item"><label>I-Frame</label><span>${info.iframeFlag ? 'Yes' : 'No'}</span></div>
    `;
  }

  private getBasisFormatName(format: BasisTextureFormat): string {
    switch (format) {
      case BasisTextureFormat.cETC1S: return 'ETC1S';
      case BasisTextureFormat.cUASTC4x4: return 'UASTC 4x4';
      case BasisTextureFormat.cUASTC_HDR_4x4: return 'UASTC HDR 4x4';
      case BasisTextureFormat.cASTC_HDR_6x6: return 'ASTC HDR 6x6';
      case BasisTextureFormat.cASTC_HDR_6x6_INTERMEDIATE: return 'ASTC HDR 6x6 Intermediate';
      default: return `Unknown (${format})`;
    }
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// Initialize the demo when the page loads
new BasisDemo();