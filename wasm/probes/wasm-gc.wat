(module
  (type $value (struct (field i32)))
  (func (export "run") (result i32)
    (struct.get $value 0
      (struct.new $value (i32.const 42)))))
