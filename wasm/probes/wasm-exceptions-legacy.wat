(module
  (tag $probe (param i32))
  (func (export "run") (result i32)
    (try (result i32)
      (do (throw $probe (i32.const 42)))
      (catch $probe))))
