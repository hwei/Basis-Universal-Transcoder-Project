# Basis Universal Transcoder Project

This project provides a WebAssembly-based Basis Universal texture transcoder with TypeScript bindings, designed for high-performance texture transcoding in web applications.

🎮 **[Try the Live Demo →](https://hwei.github.io/Basis-Universal-Transcoder-Project/)**

## Comparison with Official Basis Universal WebGL Transcoder

This project is an alternative implementation to the [official Basis Universal WebGL transcoder](https://github.com/BinomialLLC/basis_universal/tree/master/webgl). The key differences are:

| Feature | This Project | Official Transcoder |
|---------|-------------|---------------------|
| **Dynamic Code Generation** | ❌ No `eval()` / `new Function()` | ✅ Uses `new Function()` for invoker generation |
| **WeChat Mini Game Support** | ✅ Fully compatible | ❌ Not supported (CSP blocks dynamic code) |
| **Mini Program Support** | ✅ Works in restricted environments | ❌ Blocked by security policies |
| **Input Formats** | KTX2 only | KTX2 + .basis files |
| **Encoder Support** | ❌ Transcoder only | ✅ Includes BasisEncoder class |
| **API Style** | Custom C API + TypeScript wrapper | Embind C++ bindings |
| **Bundle Size** | Smaller (minimal features) | Larger (full feature set) |
| **WASM Loading** | Custom instantiator callback | Built-in loader |

### Why No `eval()`?

The official Basis Universal transcoder uses Emscripten's embind, which generates JavaScript wrapper functions at runtime using `new Function()`:

```javascript
// Official transcoder pattern (simplified)
var invokerFnBody = `return function (${argsList}) {...}`;
var invokerFunction = new Function(Object.keys(captures), functionBody);
```

This approach is blocked in environments with strict Content Security Policy (CSP):
- **WeChat Mini Games** (微信小游戏)
- **Alipay Mini Programs** (支付宝小程序)
- **ByteDance Mini Games** (抖音小游戏)
- **Chrome Extensions** with strict CSP
- **Cloudflare Workers**

This project avoids dynamic code generation by using a custom C API that exports plain functions, making it compatible with all these restricted environments.

### When to Use Each

**Use this project when:**
- Building for WeChat Mini Games or other mini programs
- Working in CSP-restricted environments
- Only need KTX2 transcoding (not .basis files)
- Want a smaller bundle size

**Use the official transcoder when:**
- Need to encode textures (BasisEncoder)
- Need .basis file support
- Need all helper functions and format queries
- Working in standard browser environments

## Project Structure

```
.
├── CMakeLists.txt                 # WASM compilation configuration
├── basis_capi_transcoder.cpp      # C++ API wrapper for Emscripten
├── extern/                        # External dependencies (Basis Universal)
├── build/                         # WASM compilation output (generated)
├── packages/                      # NPM packages
│   └── basis-universal-transcoder/ # Main TypeScript package (@h00w/basis-universal-transcoder)
│       ├── src/                   # TypeScript source code
│       ├── demo/                  # Interactive demo
│       └── dist/                  # Built package output (generated)
└── scripts/                       # Build automation scripts
```

## Quick Start

### Prerequisites

- [Emscripten SDK](https://emscripten.org/docs/getting_started/downloads.html) for WASM compilation
- Node.js 16+ for package development
- Git with submodules for external dependencies

### Building Everything

```bash
# Clone with submodules
git clone --recursive <your-repo-url>
cd basis-universal-transcoder

# Build everything (WASM + NPM package)
./scripts/build-all.sh
```

### Development Workflow

1. **WASM Development**: Modify `basis_capi_transcoder.cpp` and rebuild with `./scripts/build-wasm.sh`
2. **Package Development**: Work in `packages/basis-universal-transcoder/src/` and use `npm run dev`
3. **Demo Testing**: Use the interactive demo at `packages/basis-universal-transcoder/demo/`

## Package Usage

### Installation

Install the package from npm:

```bash
npm install @h00w/basis-universal-transcoder
```

Or with other package managers:

```bash
# Yarn
yarn add @h00w/basis-universal-transcoder

# pnpm
pnpm add @h00w/basis-universal-transcoder
```

### Quick Usage Example

```typescript
import { BasisUniversal, TranscoderTextureFormat } from '@h00w/basis-universal-transcoder';
import wasmUrl from '@h00w/basis-universal-transcoder/basis_capi_transcoder.wasm';

// Helper: Create WASM instantiator (no eval needed!)
function createWasmInstantiator(url: string) {
  return async (imports: WebAssembly.Imports) => {
    const response = await fetch(url);
    const buffer = await response.arrayBuffer();
    return WebAssembly.instantiate(buffer, imports);
  };
}

// Initialize
const basisUniversal = await BasisUniversal.getInstance(createWasmInstantiator(wasmUrl));

// Load and transcode KTX2 texture
const ktx2Data = new Uint8Array(await fetch('texture.ktx2').then(r => r.arrayBuffer()));
const transcoder = basisUniversal.createKTX2Transcoder();

if (transcoder.init(ktx2Data) && transcoder.startTranscoding()) {
  const result = transcoder.transcodeImageLevel({
    format: TranscoderTextureFormat.cTFRGBA32,
    level: 0
  });

  if (result) {
    // Important: copy data if you need to persist it
    const textureData = new Uint8Array(result.data);
    console.log(`Transcoded: ${result.width}x${result.height}`);
  }
}

transcoder.dispose();
```

### WeChat Mini Game Usage

```typescript
// WeChat Mini Game environment - no eval() issues!
import { BasisUniversal, TranscoderTextureFormat } from '@h00w/basis-universal-transcoder';

function createWxWasmInstantiator(wasmFilePath: string) {
  return async (imports: WebAssembly.Imports) => {
    // Use WeChat's file system API
    const fs = wx.getFileSystemManager();
    const buffer = fs.readFileSync(wasmFilePath);
    return WebAssembly.instantiate(buffer, imports);
  };
}

// Initialize with WeChat-compatible loader
const basisUniversal = await BasisUniversal.getInstance(
  createWxWasmInstantiator('path/to/basis_capi_transcoder.wasm')
);

// Use the same transcoding API...
```

📖 **[See the package README for detailed usage instructions →](packages/basis-universal-transcoder/README.md)**

## Development Commands

### WASM Building
```bash
./scripts/build-wasm.sh        # Build WASM module only
```

### Package Development
```bash
cd packages/basis-universal-transcoder
npm run dev                    # Start development server
npm run build                  # Build package for distribution
npm run preview                # Preview built package
```

### Complete Build
```bash
./scripts/build-all.sh         # Build everything from scratch
```

## Architecture

### WASM Layer (`basis_capi_transcoder.cpp`)
- C++ wrapper around Basis Universal transcoder
- Exports C functions for Emscripten binding
- Handles KTX2 and Basis file formats
- Optimized for size and performance

### TypeScript Layer (`packages/basis-universal-transcoder/src/`)
- Type-safe wrapper around WASM functions
- High-level API for easy integration
- Platform detection and format optimization
- Browser and Node.js compatibility

### Demo Application (`packages/basis-universal-transcoder/demo/`)
- Interactive web interface
- File drag-and-drop support
- Real-time transcoding with performance metrics
- Platform capability detection

🎮 **[Try the Live Demo →](https://hwei.github.io/Basis-Universal-Transcoder-Project/)**

## Build Configuration

### Vite Configuration
- ES modules build targeting `.mjs` output format
- Custom Rollup configuration for file naming (`entryFileNames: '[name].mjs'`)
- TypeScript declaration generation with `vite-plugin-dts`
- Public directory configured for WASM file distribution
- Relative asset paths with `base: './'`
- Development server with hot reload on port 3150 and demo auto-open
- File system allowlist for monorepo structure (`fs: { allow: ['..', '../..'] }`)

### CMake Configuration
- Emscripten toolchain
- KTX2 and Zstandard support
- Optimized release builds
- Minimal runtime for smaller output

## Publishing

```bash
cd packages/basis-universal-transcoder
npm run build
npm publish
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test with the demo application
5. Submit a pull request

## License

MIT

## Acknowledgments

- [Basis Universal](https://github.com/BinomialLLC/basis_universal) by Binomial LLC
- [Emscripten](https://emscripten.org/) for WebAssembly compilation
- [Vite](https://vitejs.dev/) for modern build tooling