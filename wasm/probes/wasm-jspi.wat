(module
  (import "env" "async_value" (func $async-value (result i32)))
  (func (export "run") (result i32)
    (call $async-value)))
