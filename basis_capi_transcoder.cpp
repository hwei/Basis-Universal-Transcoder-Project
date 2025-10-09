#include "./extern/basis_universal/transcoder/basisu_transcoder.h"
#include <emscripten/emscripten.h>

extern "C" {

EMSCRIPTEN_KEEPALIVE
void basisu_transcoder_init()
{
    return basist::basisu_transcoder_init();
}

EMSCRIPTEN_KEEPALIVE
uint32_t basis_compute_transcoded_image_size_in_bytes(basist::transcoder_texture_format target_format, uint32_t orig_width, uint32_t orig_height)
{
    return basist::basis_compute_transcoded_image_size_in_bytes(target_format, orig_width, orig_height);
}

EMSCRIPTEN_KEEPALIVE
uint32_t basis_get_bytes_per_block_or_pixel(basist::transcoder_texture_format fmt)
{
    return basist::basis_get_bytes_per_block_or_pixel(fmt);
}

EMSCRIPTEN_KEEPALIVE
bool basis_transcoder_format_has_alpha(basist::transcoder_texture_format fmt)
{
    return basist::basis_transcoder_format_has_alpha(fmt);
}

EMSCRIPTEN_KEEPALIVE
bool basis_transcoder_format_is_hdr(basist::transcoder_texture_format fmt)
{
    return basist::basis_transcoder_format_is_hdr(fmt);
}

EMSCRIPTEN_KEEPALIVE
bool basis_is_format_supported(basist::transcoder_texture_format tex_type, basist::basis_tex_format fmt)
{
    return  basist::basis_is_format_supported(tex_type, fmt);
}

EMSCRIPTEN_KEEPALIVE
basisu::texture_format basis_get_basisu_texture_format(basist::transcoder_texture_format fmt)
{
    return basist::basis_get_basisu_texture_format(fmt);
}

EMSCRIPTEN_KEEPALIVE
bool basis_transcoder_format_is_uncompressed(basist::transcoder_texture_format tex_type)
{
    return basist::basis_transcoder_format_is_uncompressed(tex_type);
}


EMSCRIPTEN_KEEPALIVE
uint32_t basis_tex_format_get_block_width(basist::basis_tex_format fmt)
{
    return basist::basis_tex_format_get_block_width(fmt);
}

EMSCRIPTEN_KEEPALIVE
uint32_t basis_tex_format_get_block_height(basist::basis_tex_format fmt)
{
    return basist::basis_tex_format_get_block_height(fmt);
}

EMSCRIPTEN_KEEPALIVE
uint32_t basis_tex_format_is_hdr(basist::basis_tex_format fmt)
{
    return basist::basis_tex_format_is_hdr(fmt);
}

EMSCRIPTEN_KEEPALIVE
basist::ktx2_transcoder* ktx2_transcoder_new()
{
    return new basist::ktx2_transcoder();
}

EMSCRIPTEN_KEEPALIVE
void ktx2_transcoder_delete(basist::ktx2_transcoder* self)
{
    delete self;
}

EMSCRIPTEN_KEEPALIVE
bool ktx2_transcoder_init(basist::ktx2_transcoder* self, const void* pData, uint32_t data_size)
{
    return self->init(pData, data_size);
}

EMSCRIPTEN_KEEPALIVE
const basist::ktx2_header* ktx2_transcoder_get_header(const basist::ktx2_transcoder* self)
{
    return &self->get_header();
}

EMSCRIPTEN_KEEPALIVE
basist::basis_tex_format ktx2_transcoder_get_basis_tex_format(const basist::ktx2_transcoder* self)
{
    return self->get_basis_tex_format();
}

EMSCRIPTEN_KEEPALIVE
bool ktx2_transcoder_start_transcoding(basist::ktx2_transcoder* self)
{
    return self->start_transcoding();
}

EMSCRIPTEN_KEEPALIVE
bool ktx2_transcoder_get_image_level_info(const basist::ktx2_transcoder* self, basist::ktx2_image_level_info& level_info, uint32_t level_index, uint32_t layer_index, uint32_t face_index)
{
    return self->get_image_level_info(level_info, level_index, layer_index, face_index);
}

EMSCRIPTEN_KEEPALIVE
bool transcode_image_level(
    basist::ktx2_transcoder* self,
    uint32_t level_index, uint32_t layer_index, uint32_t face_index,
    void* pOutput_blocks, uint32_t output_blocks_buf_size_in_blocks_or_pixels,
    basist::transcoder_texture_format fmt,
    uint32_t decode_flags, uint32_t output_row_pitch_in_blocks_or_pixels, uint32_t output_rows_in_pixels, int channel0, int channel1,
    basist::ktx2_transcoder_state *pState)
{
    return self->transcode_image_level(
        level_index, layer_index, face_index,
        pOutput_blocks, output_blocks_buf_size_in_blocks_or_pixels,
        fmt, decode_flags, output_row_pitch_in_blocks_or_pixels, output_rows_in_pixels, channel0, channel1, pState);
}

}
