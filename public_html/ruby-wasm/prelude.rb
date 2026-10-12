# prelude.rb — loaded into the Ruby VM at boot. It provides a thin, readable
# wrapper over the page's DOM bridge (worker -> main thread). Everything here is
# plain Ruby: read it, copy it, and talk to the page the same way in your own code.
#
# Two styles exist:
#   * selector shortcuts (Dom.text, Dom.on, Dom.raf, Dom.audio) are
#     fire-and-forget and work in both sync `eval` and `evalAsync` runs.
#   * handle calls (Dom.qs/qs_result/Dom.call/Dom.get/Dom.batch) return values
#     from the page, so they must run under `evalAsync` and use `.await`.
require "js"
require "json"

module Dom
  # -- selector shortcuts (fire-and-forget; no await needed) --
  def self.text(selector, value)
    JS.global[:__dom].call(:text, selector.to_s, value.to_s)
    nil
  end

  def self.on(selector, event, &block)
    JS.global[:__dom].call(:on, selector.to_s, event.to_s, block)
  end

  def self.raf(&block)
    JS.global[:__dom].call(:raf, block)
  end

  def self.off(id)
    JS.global[:__dom].call(:off, id)
    nil
  end

  def self.audio(samples, rate: 24000)
    JS.global[:__dom].call(:audio, JSON.generate(samples), rate)
    nil
  end

  def self.reset
    JS.global[:__dom].call(:reset)
    nil
  end

  # -- handle API (returns values; call under evalAsync) --
  def self.qs(selector)
    JS.global[:__dom].call(:qs, selector.to_s).await
  end

  def self.call(handle, method, *args)
    JS.global[:__dom].call(:call, handle, method.to_s, *args).await
  end

  def self.call!(handle, method, *args)
    JS.global[:__dom].call(:call, handle, method.to_s, *args)
    nil
  end

  def self.get(handle, key)
    JS.global[:__dom].call(:get, handle, key.to_s).await
  end

  def self.set(handle, key, value)
    JS.global[:__dom].call(:set, handle, key.to_s, value)
    nil
  end

  def self.batch(ops)
    JS.global[:__dom].call(:batch, JSON.generate(ops)).await
  end

  def self.batch!(ops)
    JS.global[:__dom].call(:batch, JSON.generate(ops))
    nil
  end

  # Event objects arrive as JS::Object; undefined fields surface as
  # JS::Undefined, so read them through this helper to get clean nils.
  def self.field(event, key)
    v = event[key]
    v.typeof == "undefined" ? nil : v
  end
end

# Canvas wrapper bound to the stage <canvas>. Handles are resolved once here at
# boot (inside evalAsync), so draw calls afterwards are fire-and-forget and work
# from sync evals, event callbacks, and rAF frames alike.
class Canvas
  attr_reader :handle, :ctx

  def initialize(selector)
    @selector = selector
    rebind
  end

  # Called again after a bridge reset, when all handles were dropped.
  def rebind
    @handle = Dom.qs(@selector)
    @ctx = Dom.call(@handle, "getContext", "2d")
  end

  def width = Dom.get(@handle, "width")
  def height = Dom.get(@handle, "height")

  def clear(w, h)
    Dom.call!(@ctx, "clearRect", 0, 0, w, h)
  end

  def rect(x, y, w, h, style)
    Dom.set(@ctx, "fillStyle", style)
    Dom.call!(@ctx, "fillRect", x, y, w, h)
  end

  def circle(x, y, r, style)
    Dom.set(@ctx, "fillStyle", style)
    Dom.call!(@ctx, "beginPath")
    Dom.call!(@ctx, "arc", x, y, r, 0, Math::PI * 2)
    Dom.call!(@ctx, "fill")
  end

  def line(x1, y1, x2, y2, style, width: 1)
    Dom.set(@ctx, "strokeStyle", style)
    Dom.set(@ctx, "lineWidth", width)
    Dom.call!(@ctx, "beginPath")
    Dom.call!(@ctx, "moveTo", x1, y1)
    Dom.call!(@ctx, "lineTo", x2, y2)
    Dom.call!(@ctx, "stroke")
  end
end

module Playground
  STAGE_CANVAS_SELECTOR = "#stage-canvas"
  STAGE_OUT_SELECTOR = "#stage-out"

  # The stage canvas, pre-bound at boot so it is ready in any eval mode.
  STAGE_CANVAS = Canvas.new(STAGE_CANVAS_SELECTOR)

  def self.canvas = STAGE_CANVAS
  def self.out(text) = Dom.text(STAGE_OUT_SELECTOR, text)

  # Re-resolve bridge handles after a stage reset. Called by the worker's
  # dom-reset op inside evalAsync, so .await is legal here.
  def self.rebind
    STAGE_CANVAS.rebind
    nil
  end

  # Synthesize `seconds` of a sine tone and play it through the page's
  # AudioContext (created inside the Run click, so no permission prompt).
  def self.beep(frequency = 440, seconds = 0.2, rate: 24000)
    n = (rate * seconds).to_i
    samples = Array.new(n) { |i| Math.sin(2 * Math::PI * frequency * i / rate) * 0.25 }
    Dom.audio(samples, rate: rate)
    nil
  end
end
