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

echo "Build completed successfully!"
echo "Output files:"
echo "  - build/basis_capi_transcoder.js"
echo "  - build/basis_capi_transcoder.wasm"