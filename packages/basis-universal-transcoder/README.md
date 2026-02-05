# @h00w/basis-universal-transcoder

A WebAssembly-based Basis Universal texture transcoder with TypeScript bindings.

> **Note**: This library requires explicit WASM loading to prevent automatic WASM inlining during bundling, which could cause issues when users compile this library in their own projects.

## Features

- 🚀 High-performance WebAssembly implementation
- 📦 TypeScript support with full type definitions
- 🎯 Support for KTX2 files only
- 🔧 Multiple output formats (BC1-7, ASTC, PVRTC, ETC, uncompressed)
- 🌐 Works in both browser and Node.js environments
- ⚡ Built with Vite
- ✅ **No `eval()` or `new Function()` - Compatible with WeChat Mini Games and CSP-restricted environments**

## Why This Library?

The [official Basis Universal WebGL transcoder](https://github.com/BinomialLLC/basis_universal/tree/master/webgl) uses Emscripten's embind, which generates JavaScript wrapper functions at runtime using `new Function()`. This is **blocked** in:

- WeChat Mini Games (微信小游戏)
- Alipay Mini Programs (支付宝小程序)
- ByteDance Mini Games (抖音小游戏)
- Chrome Extensions with strict CSP
- Cloudflare Workers

This library uses a custom C API that exports plain functions, avoiding all dynamic code generation.

| Feature | This Library | Official Transcoder |
|---------|-------------|---------------------|
| **Dynamic Code Generation** | ❌ None | ✅ Uses `new Function()` |
| **WeChat Mini Game** | ✅ Works | ❌ Blocked |
| **Input Formats** | KTX2 only | KTX2 + .basis |
| **Encoder Support** | ❌ No | ✅ Yes |
| **Bundle Size** | Smaller | Larger |

## Installation

```bash
npm install @h00w/basis-universal-transcoder
```

## Quick Start

### Basic Usage

```typescript
import { BasisUniversal } from '@h00w/basis-universal-transcoder';
import wasmUrl from '@h00w/basis-universal-transcoder/basis_capi_transcoder.wasm';

// Helper function to create WASM instantiator
function createWasmInstantiator(wasmUrl: string) {
  return async (imports: WebAssembly.Imports) => {
    const fetchPromise = fetch(wasmUrl);
    // Try streaming instantiation first (better performance)
    if (WebAssembly.instantiateStreaming) {
      try {
        return await WebAssembly.instantiateStreaming(fetchPromise, imports);
      } catch (e) {
        console.warn('Streaming instantiation failed, falling back to ArrayBuffer method:', e);
      }
    }
    // Fallback to manual compilation
    const response = await fetchPromise;
    const buffer = await response.arrayBuffer();
    return WebAssembly.instantiate(buffer, imports);
  };
}

// Initialize the module
const basisUniversal = await BasisUniversal.getInstance(createWasmInstantiator(wasmUrl));

// Load a KTX2 file
const fileData = await fetch('texture.ktx2').then(r => r.arrayBuffer());
const ktx2Data = new Uint8Array(fileData);

// Create a KTX2 transcoder
const ktx2Transcoder = basisUniversal.createKTX2Transcoder();

// Initialize with KTX2 data
if (ktx2Transcoder.init(ktx2Data) && ktx2Transcoder.startTranscoding()) {
    // Transcode to RGBA32 format
    const result = ktx2Transcoder.transcodeImageLevel({
        format: TranscoderTextureFormat.cTFRGBA32,
        level: 0  // mip level 0 (full size)
    });
    
    if (result) {
        console.log('Transcoded:', result.width, 'x', result.height);
        console.log('Data size:', result.data.length, 'bytes');
        
        // Use the transcoded data...
        displayTexture(result.data, result.width, result.height);
    }
}

// Clean up
ktx2Transcoder.dispose();
```

### Format Detection

```typescript
import { detectBestFormat, isFormatSupported, getFormatName } from '@h00w/basis-universal-transcoder';

// Detect the best format for the current platform (requires WebGL context)
const canvas = document.createElement('canvas');
const gl = canvas.getContext('webgl');
const bestFormat = detectBestFormat(gl);
console.log('Best format:', getFormatName(bestFormat));

// Check if a specific format is supported
if (isFormatSupported(TranscoderTextureFormat.cTFBC7_RGBA)) {
    console.log('BC7 is supported on this platform');
}
```

### WeChat Mini Game Usage

```typescript
import { BasisUniversal, TranscoderTextureFormat } from '@h00w/basis-universal-transcoder';

// WeChat Mini Game WASM loader - no eval() issues!
function createWxWasmInstantiator(wasmFilePath: string) {
  return async (imports: WebAssembly.Imports) => {
    const fs = wx.getFileSystemManager();
    const buffer = fs.readFileSync(wasmFilePath);
    return WebAssembly.instantiate(buffer, imports);
  };
}

// Initialize
const basisUniversal = await BasisUniversal.getInstance(
  createWxWasmInstantiator('path/to/basis_capi_transcoder.wasm')
);

// Create transcoder and use as normal
const transcoder = basisUniversal.createKTX2Transcoder();
// ... same API as browser usage
```

### Advanced Usage

```typescript
import { BasisUniversal, KTX2Transcoder, TranscoderTextureFormat } from '@h00w/basis-universal-transcoder';
import wasmUrl from '@h00w/basis-universal-transcoder/basis_capi_transcoder.wasm';

// Use the createWasmInstantiator helper function from the basic usage example
const transcoder = await BasisUniversal.getInstance(createWasmInstantiator(wasmUrl));
const ktx2Transcoder = transcoder.createKTX2Transcoder();
ktx2Transcoder.init(data);

// Get basis texture format
const basisFormat = ktx2Transcoder.getBasisTextureFormat();
console.log('Basis format:', basisFormat);

// Transcode multiple mip levels
const results = [];
ktx2Transcoder.startTranscoding();
for (let level = 0; level < 4; level++) { // Adjust based on your texture
    const result = ktx2Transcoder.transcodeImageLevel({
        format: TranscoderTextureFormat.cTFBC7_RGBA,
        level: level
    });
    if (result) {
        results.push(result);
    }
}

ktx2Transcoder.dispose();
```

## ⚠️ Important: Memory Management

### Data Persistence Warning

**Critical**: The `TranscodeResult.data` returned by `transcodeImageLevel()` references WASM-managed memory and will become **invalid** after the next call to `transcodeImageLevel()`. 

If you need to persist the transcoded data, you **must** create a copy:

```typescript
const result = ktx2Transcoder.transcodeImageLevel({
  format: TranscoderTextureFormat.cTFBC7_RGBA,
  level: 0
});

if (result) {
  // ❌ WRONG: This data will become invalid after next transcodeImageLevel() call
  const imageData = result.data;
  
  // ✅ CORRECT: Create a copy to persist the data
  const persistentData = new Uint8Array(result.data);
  // or
  const persistentData = result.data.slice();
}
```

### Performance Optimization

**Tip**: Reuse the same `KTX2Transcoder` instance for multiple textures by calling `init()` multiple times. This reduces memory allocation overhead:

```typescript
import { BasisUniversal, TranscoderTextureFormat } from '@h00w/basis-universal-transcoder';
import wasmUrl from '@h00w/basis-universal-transcoder/basis_capi_transcoder.wasm';

// Use the createWasmInstantiator helper function from the basic usage example
const transcoder = await BasisUniversal.getInstance(createWasmInstantiator(wasmUrl));
const ktx2Transcoder = transcoder.createKTX2Transcoder();

// Process multiple textures efficiently
async function processTextures(textureDataArray: Uint8Array[]) {
  for (const textureData of textureDataArray) {
    // Reuse the same transcoder instance
    if (ktx2Transcoder.init(textureData)) {
      ktx2Transcoder.startTranscoding();
      
      const result = ktx2Transcoder.transcodeImageLevel({
        format: TranscoderTextureFormat.cTFBC7_RGBA,
        level: 0
      });
      
      if (result) {
        // Create copy if you need to persist the data
        const persistentData = new Uint8Array(result.data);
        // Process the texture data...
      }
    }
  }
}

// Don't forget to dispose when done
ktx2Transcoder.dispose();
```

## API Reference

### Classes

#### `BasisUniversal`

Main class for managing the transcoder module.

- `static getInstance(instantiateWasmAsync: InstantiateWasmAsync): Promise<BasisUniversal>`
- `createKTX2Transcoder(): KTX2Transcoder`

#### `KTX2Transcoder`

Handles KTX2 file transcoding. Can be reused for multiple textures by calling `init()` multiple times for better performance.

- `init(data: Uint8Array): boolean` - Initialize with KTX2 file data (can be called multiple times)
- `getBasisTextureFormat(): BasisTextureFormat` - Get the basis texture format
- `startTranscoding(): boolean` - Start transcoding (call after init)
- `transcodeImageLevel(options: TranscodeOptions): TranscodeResult | null` - Transcode a specific level
- `dispose(): void` - Clean up resources

### Enums

#### `TranscoderTextureFormat`

Supported output texture formats:

- `cTFBC1_RGB` - BC1 RGB (DXT1)
- `cTFBC3_RGBA` - BC3 RGBA (DXT5)
- `cTFBC7_RGBA` - BC7 RGBA
- `cTFASTC_4x4_RGBA` - ASTC 4x4 RGBA
- `cTFPVRTC1_4_RGBA` - PVRTC1 4bpp RGBA
- `cTFRGBA32` - 32-bit RGBA uncompressed
- And more...

### Type Definitions

```typescript
type InstantiateWasmAsync = (imports: WebAssembly.Imports) => Promise<WebAssembly.WebAssemblyInstantiatedSource>;
```

### Direct WASM Access

You can also directly import and use the WASM file for custom loading scenarios:

```typescript
// Import WASM file directly
import wasmUrl from '@h00w/basis-universal-transcoder/basis_capi_transcoder.wasm';

// Custom WASM loading with your own instantiator
const basisUniversal = await BasisUniversal.getInstance(createWasmInstantiator(wasmUrl));
```

### Utility Functions

- `detectBestFormat(gl: WebGLRenderingContext): TranscoderTextureFormat` - Detect best format for WebGL context
- `isFormatSupported(format: TranscoderTextureFormat): boolean` - Check if format is supported on current platform
- `getFormatName(format: TranscoderTextureFormat): string` - Get human-readable format name

## Development

### Building from Source

```bash
# Install dependencies
npm install

# Build WASM module (requires Emscripten)
../../scripts/build-wasm.sh

# Build everything (WASM + package)
../../scripts/build-all.sh

# Start development server
npm run dev
```

### Demo

The package includes a comprehensive demo that shows how to use the transcoder:

```bash
npm run dev
```

Then open your browser to see the interactive demo.

## Browser Support

- Modern browsers with WebAssembly support
- Chrome 57+, Firefox 52+, Safari 11+, Edge 16+

## Node.js Support

- Node.js 16+ with WebAssembly support

## License

MIT

## Contributing

Contributions are welcome! Please read our contributing guidelines and submit pull requests to our repository.

## Credits

This package is built on top of the excellent [Basis Universal](https://github.com/BinomialLLC/basis_universal) library by Binomial LLC.