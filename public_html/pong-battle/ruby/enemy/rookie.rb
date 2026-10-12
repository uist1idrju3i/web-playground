# Rookie — beginner level.
#
# Chases the ball's current height with a wide deadband and re-thinks only
# ~3 times per second. No prediction at all: fast balls and sharp angle
# shots slip straight past it. When the ball retreats it drifts home.

brain "Rookie" do |g|
  @target ||= g.center
  @think_at ||= -1.0

  if g.time >= @think_at
    @think_at = g.time + 0.28
    @target =
      if g.ball.moving_toward?(g.me)
        g.ball.y + g.noise(4.0) # sloppy aim: a jittery copy of the ball's y
      else
        g.center
      end
  end

  g.seek(@target, deadband: 5.0)
end

brain_debug do |g|
  { target: @target, note: "chasing" }
end
