(module
  (type $answer-type (func (result i32)))
  (func $answer (type $answer-type) (i32.const 42))
  (table 1 funcref)
  (elem (i32.const 0) $answer)
  (func (export "run") (result i32)
    (call_indirect (type $answer-type) (i32.const 0))))
