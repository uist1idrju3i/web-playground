(module
  (func (export "run") (result i32)
    (i32.trunc_f32_s
      (f32x4.extract_lane 0
        (f32x4.relaxed_madd
          (v128.const f32x4 2 3 4 5)
          (v128.const f32x4 3 4 5 6)
          (v128.const f32x4 4 5 6 7))))))
