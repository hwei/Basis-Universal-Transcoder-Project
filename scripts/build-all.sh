#!/bin/bash

# Complete build script for the entire project

set -e

echo "=== Building Basis Universal Transcoder Package ==="

# Step 1: Build WASM module
echo ""
echo "Step 1: Building WASM module..."
./scripts/build-wasm.sh

# Step 2: Install npm dependencies
echo ""
echo "Step 2: Installing npm dependencies..."
cd packages/basis-universal-transcoder
npm install

# Step 3: Build the package
echo ""
echo "Step 3: Building npm package..."
npm run build

echo ""
echo "=== Build completed successfully! ==="
echo ""
echo "You can now:"
echo "  - Test the package: cd packages/basis-universal-transcoder && npm run dev"
echo "  - Preview the build: cd packages/basis-universal-transcoder && npm run preview"
echo "  - Publish the package: cd packages/basis-universal-transcoder && npm publish"