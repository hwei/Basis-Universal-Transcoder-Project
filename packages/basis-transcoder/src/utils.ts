import { TranscoderTextureFormat } from './types.js';

/**
 * Utility functions for Basis Universal transcoding
 */

/**
 * Detect the best transcoder format for the current platform
 */
export function detectBestFormat(gl: WebGLRenderingContext): TranscoderTextureFormat {

  // Check for compressed texture extensions
  const extensions = {
    s3tc: gl.getExtension('WEBGL_compressed_texture_s3tc'),
    etc1: gl.getExtension('WEBGL_compressed_texture_etc1'),
    astc: gl.getExtension('WEBGL_compressed_texture_astc'),
    pvrtc: gl.getExtension('WEBGL_compressed_texture_pvrtc'),
    etc: gl.getExtension('WEBGL_compressed_texture_etc'),
  };

  // Prefer formats in order of quality/compression efficiency
  if (extensions.astc) {
    return TranscoderTextureFormat.cTFASTC_4x4_RGBA;
  }
  
  if (extensions.s3tc) {
    return TranscoderTextureFormat.cTFBC7_RGBA; // BC7 if available, fallback to BC3
  }
  
  if (extensions.etc) {
    return TranscoderTextureFormat.cTFRGBA32; // ETC2 variants would go here
  }
  
  if (extensions.pvrtc) {
    return TranscoderTextureFormat.cTFPVRTC1_4_RGBA;
  }

  // Fallback to uncompressed
  return TranscoderTextureFormat.cTFRGBA32;
}

/**
 * Check if a format is supported on the current platform
 */
export function isFormatSupported(format: TranscoderTextureFormat): boolean {
  if (typeof window === 'undefined') {
    // In Node.js, only uncompressed formats are meaningful
    return format === TranscoderTextureFormat.cTFRGBA32 || 
           format === TranscoderTextureFormat.cTFRGB565 ||
           format === TranscoderTextureFormat.cTFRGBA4444;
  }

  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
  
  if (!gl) {
    return format === TranscoderTextureFormat.cTFRGBA32 ||
           format === TranscoderTextureFormat.cTFRGB565 ||
           format === TranscoderTextureFormat.cTFRGBA4444;
  }

  switch (format) {
    case TranscoderTextureFormat.cTFBC1_RGB:
    case TranscoderTextureFormat.cTFBC3_RGBA:
    case TranscoderTextureFormat.cTFBC4_R:
    case TranscoderTextureFormat.cTFBC5_RG:
    case TranscoderTextureFormat.cTFBC7_RGBA:
      return !!gl.getExtension('WEBGL_compressed_texture_s3tc');
      
    case TranscoderTextureFormat.cTFASTC_4x4_RGBA:
      return !!gl.getExtension('WEBGL_compressed_texture_astc');
      
    case TranscoderTextureFormat.cTFPVRTC1_4_RGB:
    case TranscoderTextureFormat.cTFPVRTC1_4_RGBA:
    case TranscoderTextureFormat.cTFPVRTC2_4_RGB:
    case TranscoderTextureFormat.cTFPVRTC2_4_RGBA:
      return !!gl.getExtension('WEBGL_compressed_texture_pvrtc');
      
    case TranscoderTextureFormat.cTFETC2_EAC_R11:
    case TranscoderTextureFormat.cTFETC2_EAC_RG11:
      return !!gl.getExtension('WEBGL_compressed_texture_etc');
      
    case TranscoderTextureFormat.cTFRGBA32:
    case TranscoderTextureFormat.cTFRGB565:
    case TranscoderTextureFormat.cTFBGR565:
    case TranscoderTextureFormat.cTFRGBA4444:
      return true; // Always supported
      
    default:
      return false;
  }
}

/**
 * Get a human-readable name for a texture format
 */
export function getFormatName(format: TranscoderTextureFormat): string {
  const formatNames: Record<TranscoderTextureFormat, string> = {
    [TranscoderTextureFormat.cTFBC1_RGB]: 'BC1 RGB (DXT1)',
    [TranscoderTextureFormat.cTFBC3_RGBA]: 'BC3 RGBA (DXT5)',
    [TranscoderTextureFormat.cTFBC4_R]: 'BC4 R (DXT5A)',
    [TranscoderTextureFormat.cTFBC5_RG]: 'BC5 RG',
    [TranscoderTextureFormat.cTFBC7_RGBA]: 'BC7 RGBA',
    [TranscoderTextureFormat.cTFPVRTC1_4_RGB]: 'PVRTC1 4bpp RGB',
    [TranscoderTextureFormat.cTFPVRTC1_4_RGBA]: 'PVRTC1 4bpp RGBA',
    [TranscoderTextureFormat.cTFASTC_4x4_RGBA]: 'ASTC 4x4 RGBA',
    [TranscoderTextureFormat.cTFATC_RGB]: 'ATC RGB',
    [TranscoderTextureFormat.cTFATC_RGBA]: 'ATC RGBA',
    [TranscoderTextureFormat.cTFRGBA32]: 'RGBA32 Uncompressed',
    [TranscoderTextureFormat.cTFRGB565]: 'RGB565',
    [TranscoderTextureFormat.cTFBGR565]: 'BGR565',
    [TranscoderTextureFormat.cTFRGBA4444]: 'RGBA4444',
    [TranscoderTextureFormat.cTFFXT1_RGB]: 'FXT1 RGB',
    [TranscoderTextureFormat.cTFPVRTC2_4_RGB]: 'PVRTC2 4bpp RGB',
    [TranscoderTextureFormat.cTFPVRTC2_4_RGBA]: 'PVRTC2 4bpp RGBA',
    [TranscoderTextureFormat.cTFETC2_EAC_R11]: 'ETC2 EAC R11',
    [TranscoderTextureFormat.cTFETC2_EAC_RG11]: 'ETC2 EAC RG11',
  };

  return formatNames[format] || `Unknown Format (${format})`;
}
