# Club — intermediate level.
#
# Predicts where the ball will cross the paddle's face plane, including
# every wall bounce (ball.y_at), and stands there. Between exchanges it
# eases back toward the middle while shading slightly to the ball's side.
# Re-thinks ~8 times per second with a small deadband.

brain "Club" do |g|
  @target ||= g.center
  @think_at ||= -1.0

  if g.time >= @think_at
    @think_at = g.time + 0.12
    @target =
      if g.ball.moving_toward?(g.me)
        g.ball.y_at(g.me.face_x) || g.ball.y
      else
        g.center + (g.ball.y - g.center) * 0.15
      end
  end

  g.seek(@target, deadband: 1.5)
end

brain_debug do |g|
  { target: @target, note: "intercept" }
end
