#include "./extern/basis_universal/transcoder/basisu_transcoder.h"
#include <emscripten/emscripten.h>

using namespace basist;

extern "C" {

EMSCRIPTEN_KEEPALIVE
uint32_t basis_capi_compute_transcoded_image_size_in_bytes(transcoder_texture_format target_format, uint32_t orig_width, uint32_t orig_height) {
    return basis_compute_transcoded_image_size_in_bytes(target_format, orig_width, orig_height);
}

}
