(module
  (func (export "run") (result i32)
    (i32x4.extract_lane 0
      (i32x4.add
        (v128.const i32x4 1 2 3 4)
        (v128.const i32x4 10 20 30 40)))))
