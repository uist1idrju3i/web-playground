# Greedy — a class-style brain with memory and a shot plan.
#
# `brain` takes a block, but `Brain.register` accepts any object that
# responds to call (or update/tick). A class can keep instance state,
# choose tactics per phase, and expose debug_info for the overlay.

class Greedy
  def initialize
    @mode = :idle
  end

  def call(g)
    @g = g
    if g.ball.moving_toward?(g.me)
      @mode = :receive
      intercept = g.ball.y_at(g.me.face_x) || g.ball.y
      # Alternate high and low shots so the enemy cannot sit still.
      @shots = (@shots || -1) + 1
      offset = (@shots % 2).zero? ? -0.75 : 0.75
      @target = g.stand_for(intercept, offset)
    else
      @mode = :reset
      @target = g.center
    end
    g.seek(@target, deadband: 0.8)
  end

  def debug_info(_g)
    { target: @target, note: @mode.to_s }
  end
end

Brain.register Greedy.new
