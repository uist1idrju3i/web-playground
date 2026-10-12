# Ace — the level-3 enemy brain.
#
# Same paddle, same speed cap: the only advantage is the algorithm.
#   * predicts the intercept exactly, every tick (no think interval)
#   * corrects the intercept for the wind the referee is blowing
#   * always aims the return at the corner the opponent is away from
#   * recovers to dead center — maximum coverage for whatever comes back

brain "Ace" do |g|
  if g.ball.moving_toward?(g.me)
    t_hit = g.ball.time_to(g.me.face_x) || 0.0
    # Nominal prediction plus a damped wind correction (gusts switch off
    # mid-flight, so the full 0.5*ay*t^2 integral over-corrects).
    intercept = (g.ball.y_at(g.me.face_x) || g.ball.y) + 0.35 * g.wind_ay * t_hit**2

    # Always offense: meet the ball off-center so the return carves into
    # the corner the opponent is away from.
    corner = g.enemy.y < g.center ? g.court.h - 4.5 : 4.5
    dx = (g.enemy.face_x - g.me.face_x).abs
    desired = Math.atan2(corner - intercept, dx) * 180 / Math::PI
    offset = g.offset_for_angle(desired).clamp(-0.8, 0.8)
    stand = g.stand_for(intercept, offset)

    brain_debug target: stand.round(1), aim: [g.enemy.face_x, corner],
                note: "aim #{desired.round(0)}deg"
    g.seek(stand, deadband: 0.4)
  else
    brain_debug target: g.center, note: "recover"
    g.seek(g.center, deadband: 0.8)
  end
end
