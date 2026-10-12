// Snippet gallery: one click loads a runnable Ruby program into the editor.
// `needsAsync` marks snippets that must run under evalAsync (they use .await).
// `note` is shown as the snippet's tooltip/description.

export const snippetGroups = [
  {
    id: 'tour',
    title: 'Ruby tour',
    items: [
      {
        id: 'hello',
        title: 'Hello, Ruby',
        note: 'puts, interpolation, and the result of the last expression',
        code: `name = "Ruby"
puts "Hello, #{name} #{RUBY_VERSION}!"
%w[fun fast wasm].map(&:capitalize).join(" · ")
`,
      },
      {
        id: 'blocks',
        title: 'Block chains',
        note: 'map/select/sum — the bread and butter of Ruby',
        code: `(1..20).select(&:even?).map { |n| n * n }.sum
`,
      },
      {
        id: 'fizzbuzz',
        title: 'FizzBuzz one-liner',
        code: `puts (1..30).map { |n|
  (n % 15).zero? ? "FizzBuzz" : (n % 3).zero? ? "Fizz" : (n % 5).zero? ? "Buzz" : n
}
nil
`,
      },
      {
        id: 'openclass',
        title: 'Open classes',
        note: 'monkey-patch String at runtime',
        code: `class String
  def shout = upcase + "!!"
end

"ruby on wasm".shout
`,
      },
      {
        id: 'metaprog',
        title: 'method_missing',
        note: 'a tiny bit of metaprogramming magic',
        code: `class Wizard
  def method_missing(name, *args) = "cast #{name}(#{args.join(", ")})"
  def respond_to_missing?(_, _private = nil) = true
end

Wizard.new.freeze_ray("ice", "snow")
`,
      },
      {
        id: 'art',
        title: 'ASCII diamond',
        code: `7.times { |i| puts " " * (7 - i) + "◆" * (2 * i + 1) }
5.downto(0) { |i| puts " " * (7 - i) + "◆" * (2 * i + 1) }
nil
`,
      },
    ],
  },
  {
    id: 'internals',
    title: 'VM internals',
    items: [
      {
        id: 'stats',
        title: 'VM stats',
        note: 'RUBY_* constants, GC and ObjectSpace from inside the wasm VM',
        code: `{
  version: RUBY_VERSION, platform: RUBY_PLATFORM,
  objects: ObjectSpace.count_objects[:TOTAL],
  gc_runs: GC.count, loaded: $LOADED_FEATURES.size
}
`,
      },
      {
        id: 'fs',
        title: 'Write to WASI FS',
        note: 'writes a file you can see in the filesystem browser below',
        code: `File.write("/hello_from_ruby.txt", "written by Ruby at #{Time.now}\\n")
Dir.glob("/*.txt") + [File.read("/hello_from_ruby.txt").strip]
`,
      },
      {
        id: 'stdin',
        title: 'gets / stdin',
        note: 'type stdin lines into the toolbar field (use \\n between lines), then run',
        code: `3.times do
  line = gets&.chomp
  puts "you said: #{line.inspect}"
end
nil
`,
      },
      {
        id: 'bench',
        title: 'Benchmark',
        code: `require "benchmark"
t = Benchmark.measure { 30.times { (1..10_000).sum } }
puts "measured #{t.real.round(4)}s of pure wasm-Ruby work"
t.real
`,
      },
      {
        id: 'fiber',
        title: 'Fibonacci Fiber',
        note: 'Fibers work — only Threads are unavailable on WASI',
        code: `fib = Fiber.new do
  a, b = 0, 1
  loop { Fiber.yield a; a, b = b, a + b }
end

10.times.map { fib.resume }
`,
      },
    ],
  },
  {
    id: 'dom',
    title: 'Play with the page',
    items: [
      {
        id: 'counter',
        title: 'Click counter',
        note: 'registers a real event listener — press the stage button afterwards',
        code: `$clicks = 0
Dom.on("#stage-btn", "click") do |e|
  $clicks += 1
  Playground.out("stage button clicked #{$clicks} time(s) — by a Ruby proc")
end
"listener armed — go press the stage button"
`,
      },
      {
        id: 'write',
        title: 'Write to the page',
        note: 'fire-and-forget DOM write through the bridge',
        code: `Playground.out("Ruby #{RUBY_VERSION} wrote this at #{Time.now.strftime("%H:%M:%S")}")
`,
      },
      {
        id: 'keys',
        title: 'Key echo',
        note: 'keydown events on the stage input, handled by Ruby',
        code: `Dom.on("#stage-input", "keydown") do |e|
  Playground.out("key: #{Dom.field(e, :key).inspect}   code: #{Dom.field(e, :code)}")
end
"listening — click the stage input and type"
`,
      },
      {
        id: 'blink',
        title: 'Blink via rAF',
        note: 'requestAnimationFrame driving Ruby every frame',
        code: `i = 0
Dom.raf do |t|
  i += 1
  Playground.out("frame #{i} — t=#{t.to_i}ms")
  sleep 0.05
end
"updating on every animation frame — Reset stage to stop"
`,
      },
    ],
  },
  {
    id: 'canvas',
    title: 'Canvas painting',
    items: [
      {
        id: 'rainbow',
        title: 'Sine rainbow',
        note: '96 bars drawn by Ruby through the 2D context',
        code: `cv = Playground.canvas
cv.clear(480, 200)
96.times do |i|
  x = i * 5
  y = 100 + Math.sin(i * 0.35) * 60
  cv.rect(x, y, 5, [200 - y, 4].max, "hsl(#{i * 4}, 75%, 55%)")
end
"96 bars of sine"
`,
      },
      {
        id: 'mandel',
        title: 'Mandelbrot',
        note: 'fractal painted with one batched bridge call',
        code: `cv = Playground.canvas
ops = []
(-100).step(95, 4) do |py|
  (-240).step(236, 4) do |px|
    x0 = px / 240.0 * 3.5 - 2.5
    y0 = py / 100.0
    x = y = 0.0
    i = 0
    while i < 24 && x * x + y * y <= 4
      x, y = x * x - y * y + x0, 2 * x * y + y0
      i += 1
    end
    ops << ["set", cv.ctx, "fillStyle", i == 24 ? "#101a18" : "hsl(#{190 + i * 7}, 70%, #{25 + i * 3}%)"]
    ops << ["call", cv.ctx, "fillRect", px + 240, py + 100, 4, 4]
  end
end
Dom.batch!(ops)
"painted #{ops.size / 2} cells in one batch"
`,
      },
      {
        id: 'life',
        title: "Conway's Life",
        note: 'a full simulation step per animation frame — Reset stage to stop',
        code: `cv = Playground.canvas
W, H, CELL = 60, 25, 8
grid = Array.new(H) { Array.new(W) { rand < 0.22 ? 1 : 0 } }
step = ->(t) do
  nxt = Array.new(H) { Array.new(W, 0) }
  ops = []
  H.times do |y|
    W.times do |x|
      n = [-1, 0, 1].sum do |dy|
        [-1, 0, 1].count { |dx| !(dx == 0 && dy == 0) && grid[(y + dy) % H][(x + dx) % W] == 1 }
      end
      alive = grid[y][x] == 1 ? (n == 2 || n == 3) : n == 3
      nxt[y][x] = alive ? 1 : 0
      ops << ["set", cv.ctx, "fillStyle", alive ? "#146c59" : "#ecefe7"]
      ops << ["call", cv.ctx, "fillRect", x * CELL, y * CELL, CELL - 1, CELL - 1]
    end
  end
  grid = nxt
  Dom.batch!(ops)
  sleep 0.15
end
Dom.raf(&step)
"Conway's Life running — Reset stage to stop"
`,
      },
      {
        id: 'stars',
        title: 'Twinkling stars',
        note: 'rAF + batch: 90 stars twinkling via Ruby math',
        code: `cv = Playground.canvas
stars = 90.times.map { [rand(480), rand(200), rand * 1.6 + 0.4, rand * 6.28] }
step = ->(t) do
  ops = [["call", cv.ctx, "clearRect", 0, 0, 480, 200]]
  stars.each do |x, y, r, ph|
    b = 120 + (Math.sin(t / 700.0 + ph) * 100).round
    ops << ["set", cv.ctx, "fillStyle", "rgb(#{b}, #{b + 20}, 255)"]
    ops << ["call", cv.ctx, "beginPath"]
    ops << ["call", cv.ctx, "arc", x, y, r, 0, 6.283]
    ops << ["call", cv.ctx, "fill"]
  end
  Dom.batch!(ops)
  sleep 0.04
end
Dom.raf(&step)
"90 stars twinkling — Reset stage to stop"
`,
      },
    ],
  },
  {
    id: 'audio',
    title: 'Audio synthesis',
    items: [
      {
        id: 'beep',
        title: 'Sine beep',
        note: 'Ruby computes PCM samples; the page plays them via Web Audio',
        code: `Playground.beep(523.25, 0.25)  # C5
Playground.beep(659.25, 0.25)  # E5
"two sine waves queued"
`,
      },
      {
        id: 'scale',
        title: 'Do-re-mi',
        note: 'sleep-paced scale, entirely synthesized in Ruby',
        code: `[261.6, 293.7, 329.6, 349.2, 392.0, 440.0, 493.9, 523.3].each do |f|
  Playground.beep(f, 0.4)
  sleep 0.28
end
"do re mi fa sol la ti do"
`,
      },
    ],
  },
  {
    id: 'async',
    title: 'Async & network',
    items: [
      {
        id: 'fetch',
        title: 'fetch .await',
        needsAsync: true,
        note: 'same-origin fetch awaited from Ruby (CSP limits connect-src to self)',
        code: `res = JS.global.call(:fetch, "/index.html").await
puts "HTTP #{res[:status]} · #{res[:headers].call(:get, "content-type")}"
res.call(:text).await.length
`,
      },
      {
        id: 'promise',
        title: 'Promise.await ticks',
        needsAsync: true,
        note: 'JS::Object#await on a plain JS promise, three times',
        code: `3.times do |i|
  JS.global[:Promise]
    .new(->(ok, _err) { JS.global.call(:setTimeout, -> { ok.apply(i + 1) }, 400) })
    .await
  puts "tick #{i + 1} at #{Time.now.strftime("%H:%M:%S.%L")}"
end
"three awaited promises (JS.eval is intentionally unavailable under this page's CSP — Promise.new works without it)"
`,
      },
    ],
  },
  {
    id: 'break',
    title: 'Break it',
    items: [
      {
        id: 'loop',
        title: 'Infinite loop',
        note: 'never finishes — run it, then press Kill VM',
        code: `puts "looping forever… press Kill VM to recover"
$stdout.flush
loop { }
`,
      },
      {
        id: 'threads',
        title: 'Thread.new (fails)',
        note: 'documented WASI limitation: no thread APIs',
        code: `begin
  Thread.new { 1 }.join
  "unexpected: threads worked"
rescue NotImplementedError => e
  "expected: #{e.class}"
end
`,
      },
      {
        id: 'boom',
        title: 'Rescue an error',
        note: 'a raised exception becomes a JS-side RbError if uncaught',
        code: `begin
  raise "kaboom from Ruby"
rescue => e
  "rescued: #{e.message}"
end
`,
      },
    ],
  },
];
