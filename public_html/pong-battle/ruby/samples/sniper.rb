# Sniper — predict the intercept, then choose the contact point.
#
# The physics gives a return angle of (contact offset) * max_bounce_deg:
# meeting the ball off-center aims the shot. stand_for(intercept, offset)
# converts "the offset I want" into "where to stand". This is Ace's trick —
# see if you can do it better.

brain "Sniper" do |g|
  if g.ball.moving_toward?(g.me)
    intercept = g.ball.y_at(g.me.face_x) || g.ball.y

    # Aim away from the enemy: farthest corner gets the meanest angle.
    corner = g.enemy.y < g.center ? g.court.h - 4 : 4
    dx = (g.enemy.face_x - g.me.face_x).abs
    desired = Math.atan2(corner - intercept, dx) * 180.0 / Math::PI
    offset = g.offset_for_angle(desired).clamp(-0.8, 0.8)

    @aim = [g.enemy.face_x, corner]
    @target = g.stand_for(intercept, offset)
    g.seek(@target, deadband: 0.5)
  else
    @aim = nil
    @target = g.center
    g.move_to(g.center)
  end
end

brain_debug do |g|
  { target: @target, aim: @aim, note: @aim ? "aiming corner" : "centering" }
end
