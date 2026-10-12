# Eval-free replacement for the bundled `js` gem loader.
#
# Upstream `/bundle/gems/js-2.10.1/lib/js.rb` builds JS::Undefined/Null/True/False
# and the `to_js` helpers through `JS.eval("return ...")`, which requires the
# `unsafe-eval` CSP source. This site deliberately forbids `unsafe-eval`, so this
# file produces the same objects without string eval:
#
#   Undefined — reading a property that does not exist yields JS `undefined`
#   Null/True/False — `JSON.parse` returns the real JS primitives
#   to_js — `Array.of` / `Reflect.construct` replace `JS.eval("return []"/"{}")`
#
# Everything else (PromiseScheduler, JS::Object methods, JS::Error) is the
# upstream implementation verbatim. `require "js.so"` below is the native
# extension: it does not use `eval` either.
#
# `JS.eval` itself stays available but raises an EvalError under this page's
# CSP; treat string evaluation as a documented limitation of this deployment.
require "js.so"

module JS
  Undefined = JS.global[:__ruby_wasm_undefined__]
  Null = JS.global[:JSON].call(:parse, "null")
  True = JS.global[:JSON].call(:parse, "true")
  False = JS.global[:JSON].call(:parse, "false")

  class PromiseScheduler
    def initialize(loop)
      @loop = loop
    end

    def await(promise)
      current = Fiber.current
      promise.call(
        :then,
        ->(value) { current.transfer(value, :success); nil },
        ->(value) { current.transfer(value, :failure); nil }
      )
      if @loop == current
        raise (
                "JS::Object#await can be called only from RubyVM#evalAsync or RbValue#callAsync JS API\n" +
                  "If you are using browser.script.iife.js, please ensure that you specify `data-eval=\"async\"` in your script tag\n" +
                  "e.g. <script type=\"text/ruby\" data-eval=\"async\">puts :hello</script>\n" +
                  "Or <script type=\"text/ruby\" data-eval=\"async\" src=\"path/to/script.rb\"></script>"
              )
      end
      value, status = @loop.transfer
      raise JS::Error.new(value) if status == :failure
      value
    end
  end

  @promise_scheduler = PromiseScheduler.new Fiber.current

  def self.promise_scheduler
    @promise_scheduler
  end

  private

  def self.__eval_async_rb(rb_code, future)
    self.__async(future) do
      JS::Object.wrap(Kernel.eval(rb_code.to_s, TOPLEVEL_BINDING, "eval_async"))
    end
  end

  def self.__call_async_method(recv, method_name, future, *args)
    self.__async(future) { recv.send(method_name.to_s, *args) }
  end

  def self.__async(future, &block)
    Fiber
      .new do
        future.resolve block.call
      rescue => e
        future.reject JS::Object.wrap(e)
      end
      .transfer
  end
end

class JS::Object < BasicObject
  def new(*args, &block)
    args = args + [block] if block
    ::JS.global[:Reflect].construct(self, args.to_js)
  end

  def to_a
    as_array = ::JS.global[:Array].from(self)
    ::Array.new(as_array[:length].to_i) { as_array[_1] }
  end

  def method_missing(sym, *args, &block)
    sym_str = sym.to_s
    if sym_str.end_with?("?")
      result = invoke_js_method(sym_str[0..-2].to_sym, *args, &block)
      return ::JS.global.Boolean(result) == ::JS::True
    end

    invoke_js_method(sym, *args, &block)
  end

  def respond_to_missing?(sym, include_private)
    sym_str = sym.to_s
    sym = sym_str[0..-2].to_sym if sym_str.end_with?("?")
    self[sym].typeof == "function"
  end

  def apply(*args, &block)
    args = args + [block] if block
    ::JS.global[:Reflect].call(:apply, self, ::JS::Undefined, args.to_js)
  end

  def await
    promise = ::JS.global[:Promise].resolve(self)
    ::JS.promise_scheduler.await(promise)
  end

  [:nil?, :is_a?, :raise, :respond_to?].each do |method|
    define_method(method, ::Object.instance_method(method))
  end

  private

  def invoke_js_method(sym, *args, &block)
    return self.call(sym, *args, &block) if self[sym].typeof == "function"

    if ::JS.global[:Reflect].call(:has, self, sym.to_s) == ::JS::True
      raise ::TypeError,
            "`#{sym}` is not a function. To reference a property, use `[:#{sym}]` syntax instead."
    end

    raise ::NoMethodError,
          "undefined method `#{sym}' for an instance of JS::Object"
  end
end

class JS::Error
  def initialize(exception)
    @exception = exception
    super
  end

  def message
    stack = @exception[:stack]
    if stack.typeof == "string"
      stack.to_s
    else
      @exception.to_s
    end
  end
end

# `to_js` reimplementations for js/hash.rb, js/array.rb and js/nil_class.rb,
# which are intentionally not required here (their upstream versions eval).
class Hash
  def to_js
    new_object = ::JS.global[:Reflect].call(
      :construct,
      ::JS.global[:Object],
      ::JS.global[:Array].call(:of),
    )
    each { |key, value| new_object[key] = value }
    new_object
  end
end

class Array
  def to_js
    ::JS.global[:Array].call(:of, *self)
  end
end

class NilClass
  def to_js
    ::JS::Null
  end
end

# Pretend the upstream loader ran so a later `require "js"` becomes a no-op
# instead of re-executing the eval-dependent original.
unless $LOADED_FEATURES.include?("/bundle/gems/js-2.10.1/lib/js.rb")
  $LOADED_FEATURES << "/bundle/gems/js-2.10.1/lib/js.rb"
end
