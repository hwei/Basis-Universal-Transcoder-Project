# Basis Universal Transcoder Project

This project provides a WebAssembly-based Basis Universal texture transcoder with TypeScript bindings, designed for high-performance texture transcoding in web applications.

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