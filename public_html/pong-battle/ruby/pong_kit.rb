# frozen_string_literal: true

# Pong Kit — the Ruby SDK every paddle brain runs on.
#
# A brain is any object that answers `call(game)` (or `update`/`tick`). The
# easiest way to write one is the `brain` DSL:
#
#   brain "Chaser" do |g|
#     g.seek(g.ball.y)
#   end
#
# `game` (Pong::Game) is a fresh, frozen snapshot of the world each tick.
# Brains return one of :up :down :stay (or nil), or a Float in -1.0..1.0 for
# analog speed control. State in @ivars persists between ticks and matches.

require 'json'

module Pong
  # Physical rules of the arena, mirrored from the JS simulation. Everything a
  # predictor needs is here — brains and physics share one source of truth.
  class Rules
    ATTRS = %i[
      ball_r start_speed max_speed abs_max_speed accel paddle_speed paddle_h paddle_w
      face_left face_right max_bounce_deg step_hz court_w court_h
    ].freeze
    attr_reader(*ATTRS)

    def initialize(hash)
      ATTRS.each { |a| instance_variable_set("@#{a}", hash[a]) }
      freeze
    end
  end

  class Court
    attr_reader :w, :h, :center_y

    def initialize(hash)
      @w = hash[:w]
      @h = hash[:h]
      @center_y = hash[:center_y]
      freeze
    end

    alias width w
    alias height h
  end

  class Paddle
    attr_reader :x, :y, :h, :w, :side, :dir, :speed_cap, :face_x, :contact_x, :stamina

    def initialize(hash, rules)
      @side = hash[:side]&.to_sym
      @dir = hash[:dir]
      @h = hash[:h] || rules.paddle_h
      @w = hash[:w] || rules.paddle_w
      @x = hash[:x] || (@side == :left ? rules.face_left - @w / 2.0 : rules.face_right + @w / 2.0)
      @y = hash[:y]
      @speed_cap = hash[:speed_cap] || rules.paddle_speed
      @stamina = hash[:stamina] || 1.0
      @face_x = @side == :left ? rules.face_left : rules.face_right
      # The plane the ball actually contacts: one ball-radius in front of the
      # face. Predict with `ball.y_at(me.contact_x)`, not face_x, or every
      # intercept lands ~0.3u off.
      @contact_x = @face_x + (@side == :left ? rules.ball_r : -rules.ball_r)
      freeze
    end

    attr_reader :contact_x

    def top = y - h / 2.0
    def bottom = y + h / 2.0
  end

  class Ball
    attr_reader :x, :y, :vx, :vy, :speed

    def initialize(hash, rules)
      @x = hash[:x]
      @y = hash[:y]
      @vx = hash[:vx]
      @vy = hash[:vy]
      @speed = hash[:speed]
      @rules = rules
    end

    # True while the ball travels toward `paddle` (a Paddle or :left/:right).
    def moving_toward?(paddle)
      dir = paddle.is_a?(Paddle) ? paddle.dir : (paddle == :left ? -1 : 1)
      vx * dir > 0
    end

    # Seconds until the ball's leading edge reaches column x (nil if it is
    # moving away). Wall reflections are already folded into y_at.
    def time_to(x)
      return nil if vx.zero?

      t = (x - @x) / vx
      t.negative? ? nil : t
    end

    # Sim ticks (1/step_hz seconds) until the ball reaches column x.
    def ticks_to(x)
      t = time_to(x)
      t && (t * @rules.step_hz).ceil
    end

    # Predicted center-y of the ball when it crosses column x, folding every
    # reflection off the top/bottom walls (the ball center travels inside
    # [ball_r, court_h - ball_r]). nil while the ball moves away.
    def y_at(x)
      t = time_to(x)
      return nil unless t

      r = @rules.ball_r
      span = @rules.court_h - 2 * r
      raw = @y + vy * t
      m = (raw - r) % (2 * span)
      m > span ? (r + 2 * span - m) : (r + m)
    end

    # Predicted direction the ball travels when it crosses x (:up/:down/:level).
    def heading_at(x)
      t = time_to(x)
      return nil unless t

      r = @rules.ball_r
      span = @rules.court_h - 2 * r
      raw = @y + vy * t
      m = (raw - r) % (2 * span)
      return :level if vy.zero?

      # After folding, odd segments mean the y-velocity has flipped sign.
      (((raw - r) / span).floor % 2).zero? ? (vy.positive? ? :down : :up) : (vy.positive? ? :up : :down)
    end
  end

  class Game
    attr_reader :ball, :me, :enemy, :court, :rules, :tick, :time, :score, :rally, :serve_dir, :wind_ay

    def initialize(state)
      @rules = Rules.new(state[:rules])
      @court = Court.new(state[:court])
      @me = Paddle.new(state[:me], @rules)
      @enemy = Paddle.new(state[:enemy], @rules)
      @ball = Ball.new(state[:ball], @rules)
      @tick = state[:tick]
      @time = state[:time]
      @rally = state[:rally]
      @serving = state[:serve][:in]
      @serve_dir = state[:serve][:dir]
      @wind_ay = state[:wind] ? state[:wind][:ay] : 0.0
      @wind_base = state[:wind] ? state[:wind][:base] : 0.0
      @wind_gust = state[:wind] ? state[:wind][:gust] : 0.0
      s = state[:score]
      @score = Score.new(s[:me], s[:you], s[:total], s[:win_at])
      freeze
    end

    Score = Struct.new(:me, :you, :total, :win_at)

    def serving? = @serving

    def center = court.center_y

    # Current gust acceleration pushing the ball up/down (units/s^2, signed:
    # positive pushes toward larger y). Zero while the air is still. Brains
    # that correct their intercept by `0.5 * wind_ay * t**2` ride gusts;
    # brains that ignore it get punished — that is the point of the weather.
    attr_reader :wind_ay

    # Split components of the wind: `base` persists for the rest of the rally,
    # `gust` is a burst that ends on its own timer (mean ~0.65s). Correcting
    # with `0.5*base*t**2 + 0.5*gust*min(t, 0.65)**2` beats flat damping.
    attr_reader :wind_base, :wind_gust

    # Command toward absolute court y: full speed beyond ~3u, easing inside.
    # Returns -1.0..1.0 (the value your brain should return).
    def seek(y, deadband: 0.4)
      dy = y - me.y
      return 0.0 if dy.abs <= deadband

      (dy / 3.0).clamp(-1.0, 1.0)
    end

    def move_to(y) = seek(y, deadband: 0.15)

    # Convenience: where to stand so the ball contacts the paddle `offset`
    # units away from its center (offset -1..1 = edge-to-edge, like the hit
    # model the physics uses).
    def stand_for(intercept_y, offset)
      reach = me.h / 2.0 + rules.ball_r
      intercept_y - offset * reach
    end

    # Contact offset (-1..1) needed to send the return at `angle_deg`.
    def offset_for_angle(angle_deg)
      (angle_deg / rules.max_bounce_deg).clamp(-1.0, 1.0)
    end

    # Small deterministic-free jitter helper for brains that want noise.
    def noise(amplitude = 1.0) = (rand * 2 - 1) * amplitude
  end

  # Registry holding the loaded brain. A brain is a Proc/lambda/object that
  # responds to call/update/tick, optionally named, optionally exposing
  # `debug_info(game)` for the thought-visualization overlay.
  module Brain
    # Every Proc brain runs under its own runner: the block's `self` is the
    # runner, not top-level `main`, so its @ivars reset on each deploy while
    # still persisting across ticks within a match. (Ivars on `main` leaked
    # across loads — a @think_at from the previous match parked the paddle.)
    class Runner
      def initialize(block)
        @block = block
      end

      def call(game)
        instance_exec(game, &@block)
      end
    end

    @impl = nil
    @name = nil
    @debug_impl = nil

    class << self
      attr_reader :name, :impl

      def register(impl, name: nil)
        unless impl.respond_to?(:call) || impl.respond_to?(:update) || impl.respond_to?(:tick)
          raise ArgumentError, 'a brain must respond to call, update, or tick'
        end

        @impl = impl.is_a?(Proc) ? Runner.new(impl) : impl
        @name =
          name ||
          (impl.brain_name if impl.respond_to?(:brain_name)) ||
          (impl.is_a?(Proc) ? 'Anonymous Brain' : impl.class.name)
        impl
      end

      def debug(&block)
        @debug_impl = Runner.new(block)
      end

      # Called from inside a brain block: stash this tick's thought snapshot.
      def note(hash)
        @current_debug = hash
      end

      def clear_debug
        @current_debug = nil
      end

      def reset!
        @impl = nil
        @name = nil
        @debug_impl = nil
        @current_debug = nil
      end

      def call(game)
        impl = @impl or raise 'no brain registered'
        if impl.respond_to?(:call)
          impl.call(game)
        elsif impl.respond_to?(:update)
          impl.update(game)
        else
          impl.tick(game)
        end
      end

      # Variable watch for the debug panel: the brain's own @ivars, kept
      # primitive so they survive JSON. Runner internals (@block) are hidden.
      def vars
        impl = @impl or return nil
        out = {}
        impl.instance_variables.each do |iv|
          next if iv == :@block
          v = impl.instance_variable_get(iv)
          case v
          when Numeric then out[iv[1..]] = v.is_a?(Float) ? v.round(4) : v
          when String then out[iv[1..]] = v[0, 40]
          when true, false then out[iv[1..]] = v
          end
          break if out.size >= 16
        end
        out.empty? ? nil : out
      rescue StandardError
        nil
      end

      def debug_info(game)
        impl = @impl
        value =
          if impl.respond_to?(:debug_info)
            impl.debug_info(game)
          elsif @current_debug
            @current_debug
          elsif @debug_impl
            @debug_impl.call(game)
          end
        return nil unless value.is_a?(Hash)

        out = {}
        out[:target] = value[:target].to_f if value[:target].is_a?(Numeric)
        out[:note] = value[:note].to_s[0, 80] if value[:note]
        if value[:aim].is_a?(Array) && value[:aim].size == 2
          out[:aim] = value[:aim].map { |v| v.to_f }
        end
        out.empty? ? nil : out
      rescue StandardError
        nil
      end
    end
  end
end

# Short alias so `Brain.register(...)` reads naturally in user code.
Brain = Pong::Brain

# DSL: `brain "name" do |g| ... end` and `brain_debug do |g| {...} end`.
module Kernel
  private

  def brain(name = nil, &block)
    raise ArgumentError, 'usage: brain "name" do |g| ... end' unless block

    Pong::Brain.register(block, name: name)
  end

  # Two forms: top-level `brain_debug do |g| {...} end` registers a debug
  # callback; inside a brain block, `brain_debug target: ..., note: "..."`
  # records the thought for the tick currently running.
  def brain_debug(value = nil, &block)
    return Pong::Brain.debug(&block) if block
    return Pong::Brain.note(value) if value.is_a?(Hash)

    raise ArgumentError, 'usage: brain_debug(target: y, aim: [x, y], note: "...") or a block'
  end
end

# Protocol the JS worker calls each tick / on deploy. All methods return JSON
# strings so the worker just forwards text.
module Battle
  ERROR_KEYS = %i[class message line].freeze

  class << self
    def load_brain(source)
      Pong::Brain.reset!
      begin
        eval(source, TOPLEVEL_BINDING, 'brain.rb', 1)
      rescue Exception => e # rubocop:disable Lint/RescueException — report, never crash the VM
        return JSON.generate(ok: false, error: serialize(e))
      end
      if Pong::Brain.impl.nil?
        return JSON.generate(
          ok: false,
          error: {
            class: 'NoBrainError',
            message: 'no brain registered — use `brain "name" do |g| ... end` or `Brain.register(obj)`',
            line: nil,
          },
        )
      end
      JSON.generate(ok: true, name: Pong::Brain.name)
    rescue Exception => e # rubocop:disable Lint/RescueException
      JSON.generate(ok: false, error: serialize(e))
    end

    def tick(json, opts = nil)
      state = JSON.parse(json, symbolize_names: true)
      game = Pong::Game.new(state)
      move = nil
      error = nil
      lines = nil
      vars = nil
      begin
        Pong::Brain.clear_debug
        seen = nil
        last_line = nil
        tp = nil
        if opts&.dig(:trace)
          # Line-execution trace: record every brain.rb line this tick touches.
          # A unique set keeps loop-heavy brains cheap; `last` is the final line.
          seen = {}
          tp = TracePoint.new(:line) do |t|
            if t.path == 'brain.rb'
              seen[t.lineno] = true
              last_line = t.lineno
            end
          end
          tp.enable
        end
        begin
          move = Pong::Brain.call(game)
        rescue Exception => e # rubocop:disable Lint/RescueException — a raise stuns the paddle, not the VM
          error = serialize(e)
        ensure
          tp&.disable
        end
        lines = { last: last_line, run: seen.keys.sort } if seen
        vars = Pong::Brain.vars if opts&.dig(:watch)
      rescue Exception => e # rubocop:disable Lint/RescueException
        error = serialize(e)
      end
      JSON.generate(
        move: normalize(move),
        error: error,
        debug: Pong::Brain.debug_info(game),
        lines: lines,
        vars: vars,
      )
    rescue Exception => e # rubocop:disable Lint/RescueException
      JSON.generate(move: 0.0, error: serialize(e), debug: nil, lines: nil, vars: nil)
    end

    private

    def normalize(move)
      case move
      when Numeric
        # NaN/Infinity would emit bare `NaN` in the JSON and kill the worker's
        # JSON.parse — a brain returning garbage must stun, not crash the tick.
        move.finite? ? move.clamp(-1.0, 1.0) : 0.0
      when Symbol
        { up: -1.0, down: 1.0, stay: 0.0, idle: 0.0, none: 0.0, stop: 0.0, halt: 0.0 }.fetch(move, 0.0)
      else
        0.0
      end
    end

    def serialize(error)
      line = error.message[/brain\.rb:(\d+)/, 1] ||
             (error.backtrace || []).map { |b| b[/brain\.rb:(\d+)/, 1] }.compact.first
      { class: error.class.name, message: error.message.to_s[0, 400], line: line&.to_i }
    end
  end
end
