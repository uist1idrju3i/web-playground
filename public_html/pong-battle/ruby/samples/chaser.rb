# Chaser — the sample brain. Edit me and press Deploy!
#
# Your program controls the LEFT paddle. Each tick (~30x/sec) the game calls
# your brain with `g`, a snapshot of the world. Return :up, :down, :stay —
# or a Float in -1.0..1.0 for analog speed — and the paddle moves.
#
# Try:
#   g.ball.x / .y / .vx / .vy      ball position and velocity
#   g.ball.moving_toward?(g.me)    is it coming at me?
#   g.ball.y_at(x)                 predicted y at column x (wall bounces in)
#   g.me.y / .face_x / .h          your paddle
#   g.enemy.y                      the other paddle
#   g.seek(y, deadband: n)         compute the move command toward y
#   g.center                       court middle
#
# `puts` prints into the console below. Raise an error and your paddle is
# stunned — the match keeps going, so fix fast!

brain "Chaser" do |g|
  if g.ball.moving_toward?(g.me)
    # Track the ball directly. Simple — and the wall-bounce noise will beat
    # you until you learn to predict (see the "predictor" sample).
    g.seek(g.ball.y, deadband: 1.5)
  else
    # Ball moving away: slide back toward the middle and wait.
    g.move_to(g.center)
  end
end

brain_debug do |g|
  { target: g.ball.moving_toward?(g.me) ? g.ball.y : g.center, note: "tracking" }
end
