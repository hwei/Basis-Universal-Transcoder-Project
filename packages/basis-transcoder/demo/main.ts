import BasisUniversal, { 
  KTX2Transcoder, 
  TranscoderTextureFormat, 
  detectBestFormat, 
  isFormatSupported, 
  getFormatName 
} from '../src/index.js';

class BasisDemo {
  private basisUniversal: BasisUniversal | null = null;
  private currentTranscoder: KTX2Transcoder | null = null;
  private currentFileData: Uint8Array | null = null;

  constructor() {
    this.initializeUI();
    this.detectPlatformSupport();
    this.loadBasisModule();
  }

  private async loadBasisModule() {
    try {
      console.log('Loading Basis Universal module...');
      this.basisUniversal = await BasisUniversal.getInstance();
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
  }

  private async loadFile(file: File) {
    try {
      this.updateStatus('Loading file...');
      
      const arrayBuffer = await file.arrayBuffer();
      this.currentFileData = new Uint8Array(arrayBuffer);
      
      if (!this.basisUniversal) {
        throw new Error('Basis Universal module not loaded');
      }

      // Clean up previous transcoder
      if (this.currentTranscoder) {
        this.currentTranscoder.dispose();
      }

      // Create new transcoder
      this.currentTranscoder = this.basisUniversal.createKTX2Transcoder(this.currentFileData);

      this.updateStatus('File loaded successfully');
      
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
      
      const targetFormat = parseInt((document.getElementById('targetFormat') as HTMLSelectElement).value);
      const mipLevel = parseInt((document.getElementById('mipLevel') as HTMLSelectElement).value);
      
      const startTime = performance.now();
      
      if (!this.currentTranscoder.startTranscoding()) {
        throw new Error('Failed to start transcoding');
      }
      
      const result = this.currentTranscoder.transcodeImageLevel({
        format: targetFormat as TranscoderTextureFormat,
        level: mipLevel
      });
      
      const endTime = performance.now();
      
      if (!result) {
        throw new Error('Transcoding failed');
      }
      
      this.displayResult(result, endTime - startTime);
      this.updateStatus('Transcoding completed successfully');
      
    } catch (error) {
      console.error('Transcoding error:', error);
      this.updateStatus('Transcoding failed', true);
    }
  }

  private displayResult(result: any, duration: number) {
    // Display transcoding info
    const transcodeInfo = document.getElementById('transcodeInfo')!;
    transcodeInfo.innerHTML = `
      <div><strong>Output Format:</strong> ${getFormatName(result.format)}</div>
      <div><strong>Dimensions:</strong> ${result.width} × ${result.height}</div>
      <div><strong>Data Size:</strong> ${this.formatBytes(result.data.length)}</div>
      <div><strong>Has Alpha:</strong> ${result.hasAlpha ? 'Yes' : 'No'}</div>
    `;
    
    // Display performance info
    const performanceInfo = document.getElementById('performanceInfo')!;
    performanceInfo.innerHTML = `
      <div><strong>Transcode Time:</strong> ${duration.toFixed(2)}ms</div>
      <div><strong>Throughput:</strong> ${(result.data.length / 1024 / 1024 / (duration / 1000)).toFixed(2)} MB/s</div>
    `;
    
    // Display image if it's uncompressed RGBA
    if (result.format === TranscoderTextureFormat.cTFRGBA32) {
      this.displayImageData(result.data, result.width, result.height);
    } else {
      // For compressed formats, show a placeholder
      const canvas = document.getElementById('resultCanvas') as HTMLCanvasElement;
      const ctx = canvas.getContext('2d')!;
      canvas.width = 200;
      canvas.height = 100;
      ctx.fillStyle = '#f0f0f0';
      ctx.fillRect(0, 0, 200, 100);
      ctx.fillStyle = '#333';
      ctx.font = '14px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Compressed format', 100, 45);
      ctx.fillText('(Cannot display directly)', 100, 65);
    }
  }

  private displayImageData(data: Uint8Array, width: number, height: number) {
    const canvas = document.getElementById('resultCanvas') as HTMLCanvasElement;
    const ctx = canvas.getContext('2d')!;
    
    canvas.width = width;
    canvas.height = height;
    
    const imageData = ctx.createImageData(width, height);
    imageData.data.set(data);
    ctx.putImageData(imageData, 0, 0);
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
    const canvas = document.getElementById('resultCanvas') as HTMLCanvasElement;
    const bestFormat = detectBestFormat(canvas.getContext('webgl') as WebGLRenderingContext);
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