# Predictor — read the future with ball.y_at.
#
# y_at folds every wall bounce into one number: the height the ball's
# center will have when it crosses your face plane. Stand there early and
# the rally looks effortless. This is what the "Club" enemy does — read its
# source from the enemy panel to compare.

brain "Predictor" do |g|
  if g.ball.moving_toward?(g.me)
    intercept = g.ball.y_at(g.me.face_x) || g.ball.y
    g.seek(intercept, deadband: 0.8)
  else
    g.move_to(g.center + (g.ball.y - g.center) * 0.2)
  end
end

brain_debug do |g|
  if g.ball.moving_toward?(g.me)
    { target: g.ball.y_at(g.me.face_x) || g.ball.y, note: "predicted intercept" }
  else
    { target: g.center, note: "recovering" }
  end
end
