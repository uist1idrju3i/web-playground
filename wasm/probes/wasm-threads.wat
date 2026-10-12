(module
  (memory (export "memory") 1 1 shared)
  (func (export "run") (result i32)
    (i32.atomic.rmw.add
      (i32.const 0)
      (i32.const 1))))
