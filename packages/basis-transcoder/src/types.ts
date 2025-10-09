// TypeScript definitions for Basis Universal transcoder

export interface EmscriptenModule {
  HEAPU8: Uint8Array;
  ccall: (name: string, returnType: string, argTypes: string[], args: any[]) => any;
  cwrap: (name: string, returnType: string, argTypes: string[]) => Function;
  _malloc: (size: number) => number;
  _free: (ptr: number) => void;
}

export enum TranscoderTextureFormat {
  // Compressed formats
  cTFBC1_RGB = 0,                    // DXT1 RGB
  cTFBC3_RGBA = 1,                   // DXT5 RGBA  
  cTFBC4_R = 2,                      // DXT5A R
  cTFBC5_RG = 3,                     // BC5 RG
  cTFBC7_RGBA = 4,                   // BC7 RGBA
  cTFPVRTC1_4_RGB = 8,              // PVRTC1 4bpp RGB
  cTFPVRTC1_4_RGBA = 9,             // PVRTC1 4bpp RGBA
  cTFASTC_4x4_RGBA = 10,            // ASTC 4x4 RGBA
  cTFATC_RGB = 11,                   // ATC RGB
  cTFATC_RGBA = 12,                  // ATC RGBA
  cTFFXT1_RGB = 17,                  // FXT1 RGB
  cTFPVRTC2_4_RGB = 18,             // PVRTC2 4bpp RGB
  cTFPVRTC2_4_RGBA = 19,            // PVRTC2 4bpp RGBA
  cTFETC2_EAC_R11 = 20,             // ETC2 EAC R11
  cTFETC2_EAC_RG11 = 21,            // ETC2 EAC RG11
  
  // Uncompressed formats
  cTFRGBA32 = 13,                    // 32bpp RGBA
  cTFRGB565 = 14,                    // 16bpp RGB
  cTFBGR565 = 15,                    // 16bpp BGR
  cTFRGBA4444 = 16,                  // 16bpp RGBA
}

export enum BasisTextureFormat {
  cETC1S = 0,
  cUASTC4x4 = 1
}

export interface TranscodeOptions {
  format: TranscoderTextureFormat;
  level?: number;
  layer?: number;
  face?: number;
  getAlphaForOpaqueFormats?: boolean;
  decodeFlags?: number;
}

export interface TranscodeResult {
  data: Uint8Array;
  width: number;
  height: number;
  format: TranscoderTextureFormat;
  hasAlpha: boolean;
}
