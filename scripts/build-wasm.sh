#!/bin/bash

# Build script for Basis Universal WASM transcoder

set -e  # Exit on any error

echo "Building Basis Universal WASM transcoder..."

# Check if emscripten is available
if ! command -v emcc &> /dev/null; then
    echo "Error: Emscripten (emcc) not found. Please install and activate Emscripten SDK."
    echo "Visit: https://emscripten.org/docs/getting_started/downloads.html"
    exit 1
fi

# Create build directory if it doesn't exist
mkdir -p build

# Change to build directory
cd build

# Configure with CMake
echo "Configuring with CMake..."
emcmake cmake .. \
    -DCMAKE_BUILD_TYPE=Release \
    -DKTX2=TRUE \
    -DKTX2_ZSTANDARD=TRUE

# Build
echo "Building..."
emmake make -j$(nproc)

# Apply patch to replace WebAssembly.instantiate with Module['instantiateWasmAsync']
echo "Applying patch to basis_capi_transcoder.js..."
if [ -f "basis_capi_transcoder.js" ]; then
    # Create patched version with _patched suffix
    sed 's/WebAssembly\.instantiate(Module\["wasm"\],imports)/Module[\x27instantiateWasmAsync\x27](imports)/g' basis_capi_transcoder.js > basis_capi_transcoder_patched.js
    echo "Patch applied successfully!"
else
    echo "Warning: basis_capi_transcoder.js not found, patch not applied"
fi

# Copy WASM file to packages directory
echo "Copying WASM file to packages directory..."
PACKAGES_PUBLIC_DIR="../packages/basis-universal-transcoder/public"
mkdir -p "$PACKAGES_PUBLIC_DIR"

if [ -f "basis_capi_transcoder.wasm" ]; then
    cp basis_capi_transcoder.wasm "$PACKAGES_PUBLIC_DIR/"
    echo "Successfully copied basis_capi_transcoder.wasm to $PACKAGES_PUBLIC_DIR/"
else
    echo "Warning: basis_capi_transcoder.wasm not found, copy operation skipped"
fi

echo "Build completed successfully!"
echo ""
echo "Output files:"
echo "  - build/basis_capi_transcoder.js (original Emscripten runtime)"
echo "  - build/basis_capi_transcoder_patched.js (custom async instantiation runtime)"
echo "  - build/basis_capi_transcoder.wasm"
echo "  - packages/basis-universal-transcoder/public/basis_capi_transcoder.wasm (copied)"
echo ""
echo "Runtime behavior differences:"
echo "  Original version:"
echo "    - Uses WebAssembly.instantiate(Module[\"wasm\"], imports) for WASM loading"
echo "    - Standard Emscripten synchronous instantiation pattern"
echo "    - Direct WebAssembly API usage"
echo ""
echo "  Patched version:"
echo "    - Uses Module['instantiateWasmAsync'](imports) for WASM loading"
echo "    - Delegates instantiation to custom async handler"
echo "    - Allows external control over WASM instantiation process"
echo "    - Enables custom loading strategies (streaming, caching, etc.)"
echo ""
echo "Usage recommendation:"
echo "  - Use original version for standard Emscripten integration"
echo "  - Use patched version when you need custom WASM loading control"