# NOVA — the legend-tier boss brain.
#
# Same paddle, same speed cap: the only advantage is the algorithm.
# It beats Ace on four axes:
#   * predicts at the true contact plane (`me.contact_x`, one ball-radius in
#     front of the face — Ace's `face_x` prediction lands ~0.3u off)
#   * splits the wind model: `base` persists and integrates fully, `gust`
#     bursts die on their own timer (~0.65 s mean) instead of flat damping
#   * solves for the corner the opponent physically cannot reach — the
#     return's flight time against `enemy.speed_cap` (stamina already folded)
#   * spends stamina: tight tracking only once the ball is actually close,
#     and stands still during serves and recoveries

brain "NOVA" do |g|
  if g.serving? || !g.ball.moving_toward?(g.me)
    # Out-guess the return instead of camping dead center: an aimer sends
    # the ball at the corner I am away from, so pre-position toward that
    # coverage point — nearly halves the travel on every exchange and
    # banks the stamina the endgame is won with.
    cover_y = g.me.y < g.center ? g.court.h - 10 : 10
    standby = g.center * 0.3 + cover_y * 0.7
    brain_debug target: standby.round(1), note: "pre-position"
    g.seek(standby, deadband: 1.0)
  else
    t = g.ball.time_to(g.me.contact_x) || 0.0
    nominal = g.ball.y_at(g.me.contact_x) || g.ball.y
    intercept = nominal + 0.5 * g.wind_base * t**2 + 0.5 * g.wind_gust * [t, 0.65].min**2

    # Lethal-corner solve: the return needs t_ret to reach the enemy face;
    # the enemy covers speed_cap*t_ret + their reach in that window. A corner
    # beyond that is a guaranteed point — take the farthest either way.
    ret_speed = [g.ball.speed * g.rules.accel, g.rules.abs_max_speed].min
    dx = (g.enemy.face_x - g.me.face_x).abs
    t_ret = dx / (ret_speed * 0.7) # |vx| stays >= ~0.7*speed for aimed shots
    cover = g.enemy.speed_cap * t_ret + g.me.h / 2 + g.rules.ball_r
    lo, hi = 4.5, g.court.h - 4.5
    # Read enemy velocity, not just position: firing into the corner they
    # are already moving away from costs them a direction change on top
    # of the distance.
    e_vy = @prev_e_t ? (g.enemy.y - @prev_e_y) / [g.time - @prev_e_t, 0.01].max : 0.0
    @prev_e_y = g.enemy.y
    @prev_e_t = g.time
    corner =
      if e_vy > 8 then lo
      elsif e_vy < -8 then hi
      else (hi - g.enemy.y).abs > (lo - g.enemy.y).abs ? hi : lo
      end
    kill = (corner - g.enemy.y).abs > cover

    desired = Math.atan2(corner - intercept, dx) * 180 / Math::PI
    offset = g.offset_for_angle(desired).clamp(-0.85, 0.85)
    stand = g.stand_for(intercept, offset)

    # Aim hysteresis: commit to a stand target while the ball is far and
    # only re-commit on >0.9u prediction moves — re-tracking every tick's
    # sub-unit jitter is thousands of micro-moves, a permanent stamina leak
    # that loses the endgame collapse race. Near contact, track exactly.
    @aim_y = stand if @aim_y.nil? || (stand - @aim_y).abs > (t < 0.9 ? 0.1 : 0.9)

    brain_debug target: @aim_y.round(1), aim: [g.enemy.face_x, corner],
                note: kill ? "kill shot" : "aim #{desired.round(0)}deg"
    # Stamina economy: loose band while the ball is far, tight when it matters.
    g.seek(@aim_y, deadband: t < 0.6 ? 0.35 : 0.9)
  end
end
