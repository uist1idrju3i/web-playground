# Mirror — a joke brain that is secretly solid.
#
# It never looks at the ball: it just copies the enemy paddle's height.
# Against trackers this stalls forever; against predictors it covers ground
# surprisingly well, because they aim where you *will* be — and you are
# chasing *them*.

brain "Mirror" do |g|
  g.seek(g.enemy.y, deadband: 2.0)
end

brain_debug do |g|
  { target: g.enemy.y, note: "mirroring" }
end
