(module
  (memory 1)
  (data (i32.const 8) "\2a\00\00\00")
  (func (export "run") (result i32)
    (memory.copy (i32.const 0) (i32.const 8) (i32.const 4))
    (i32.load (i32.const 0))))
