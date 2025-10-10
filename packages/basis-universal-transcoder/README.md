# Basis Universal Transcoder

A WebAssembly-based Basis Universal texture transcoder with TypeScript bindings.

## Features

- 🚀 High-performance WebAssembly implementation
- 📦 TypeScript support with full type definitions
- 🎯 Support for KTX2 files only
- 🔧 Multiple output formats (BC1-7, ASTC, PVRTC, ETC, uncompressed)
- 🌐 Works in both browser and Node.js environments
- ⚡ Built with Vite using custom configuration to prevent WASM inlining

## Installation

```bash
npm install basis-universal-transcoder
```

## Quick Start

### Basic Usage

```typescript
import { BasisUniversal } from 'basis-universal-transcoder';

// Initialize the module
const basisUniversal = await BasisUniversal.getInstance();

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
import { detectBestFormat, isFormatSupported, getFormatName } from 'basis-universal-transcoder';

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

### Advanced Usage

```typescript
import { BasisUniversal, KTX2Transcoder, TranscoderTextureFormat } from 'basis-universal-transcoder';

const transcoder = await BasisUniversal.getInstance();
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

## API Reference

### Classes

#### `BasisUniversal`

Main class for managing the transcoder module.

- `static getInstance(): Promise<BasisUniversal>`
- `static getInstanceWithCustomWasm(wasm: BufferSource): Promise<BasisUniversal>`
- `createKTX2Transcoder(): KTX2Transcoder`

#### `KTX2Transcoder`

Handles KTX2 file transcoding.

- `init(data: Uint8Array): boolean` - Initialize with KTX2 file data
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