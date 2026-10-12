#include <wasm_simd128.h>

int run(void) {
  v128_t sum = wasm_i32x4_add(wasm_i32x4_splat(21), wasm_i32x4_splat(21));
  return wasm_i32x4_extract_lane(sum, 0);
}
