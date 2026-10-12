(module
  (memory $first 1)
  (memory $second 1)
  (func (export "run") (result i32)
    (i32.store $second (i32.const 0) (i32.const 42))
    (i32.load $second (i32.const 0))))
