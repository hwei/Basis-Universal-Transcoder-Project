# Basis Universal Transcoder Project

This project provides a WebAssembly-based Basis Universal texture transcoder with TypeScript bindings, designed for high-performance texture transcoding in web applications.

## Project Structure

```
.
├── CMakeLists.txt                 # WASM compilation configuration
├── basis_capi_transcoder.cpp      # C++ API wrapper for Emscripten
├── extern/                        # External dependencies (Basis Universal)
├── build/                         # WASM compilation output
├── packages/                      # NPM packages
│   └── basis-transcoder/          # Main TypeScript package
│       ├── src/                   # TypeScript source code
│       ├── demo/                  # Interactive demo
│       └── dist/                  # Built package output
├── scripts/                       # Build automation scripts
└── www/                          # Legacy test files
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
cd basis-transcoder-project

# Build everything (WASM + NPM package)
./scripts/build-all.sh
```

### Development Workflow

1. **WASM Development**: Modify `basis_capi_transcoder.cpp` and rebuild with `./scripts/build-wasm.sh`
2. **Package Development**: Work in `packages/basis-transcoder/src/` and use `npm run dev`
3. **Demo Testing**: Use the interactive demo at `packages/basis-transcoder/demo/`

## Package Usage

The main deliverable is the NPM package in `packages/basis-transcoder/`. See its README for detailed usage instructions.

```typescript
import BasisUniversal from 'basis-universal-transcoder';

const transcoder = await BasisUniversal.create();
// ... use the transcoder
```

## Development Commands

### WASM Building
```bash
./scripts/build-wasm.sh        # Build WASM module only
./scripts/copy-wasm.sh         # Copy WASM files to package
```

### Package Development
```bash
cd packages/basis-transcoder
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

### TypeScript Layer (`packages/basis-transcoder/src/`)
- Type-safe wrapper around WASM functions
- High-level API for easy integration
- Platform detection and format optimization
- Browser and Node.js compatibility

### Demo Application (`packages/basis-transcoder/demo/`)
- Interactive web interface
- File drag-and-drop support
- Real-time transcoding with performance metrics
- Platform capability detection

## Build Configuration

### Vite Configuration
- ES modules and UMD builds
- TypeScript declaration generation
- WASM file handling
- Development server with hot reload

### CMake Configuration
- Emscripten toolchain
- KTX2 and Zstandard support
- Optimized release builds
- Minimal runtime for smaller output

## Publishing

```bash
cd packages/basis-transcoder
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

Apache-2.0

## Acknowledgments

- [Basis Universal](https://github.com/BinomialLLC/basis_universal) by Binomial LLC
- [Emscripten](https://emscripten.org/) for WebAssembly compilation
- [Vite](https://vitejs.dev/) for modern build tooling