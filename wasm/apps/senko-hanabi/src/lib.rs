#![no_std]

#[cfg(target_arch = "wasm32")]
use core::panic::PanicInfo;
use core::ptr;

// Senko-hanabi (線香花火) simulation: a molten-salt fireball hanging from a
// twisted paper cord, ejecting droplets that burst in a cascading micro-
// explosion chain (up to ~8 generations) — the reduced-order model follows
// Inoue et al. (PRL 2017) and the JVS high-speed visualizations.
//
// Two entropy regimes share one draw order:
//   mode 0 "feel" — seeded xoshiro128** plus game-style shaping (PRD phase
//     transitions, quantile shuffle-bags for intervals/counts/depths/speeds,
//     azimuth-bin coverage for ejection directions, stratified burst fans,
//     and a floor on successive ejection intervals).
//   mode 1 "trng" — raw u32 words from crypto.getRandomValues, fed by JS
//     through a ring; all distributions are memoryless/unshaped.
// Positions are millimetres, times are seconds, angles are radians.

const SUBSTEP: f32 = 1.0 / 240.0;
const MAX_SUBSTEPS: usize = 480;
const GRAVITY: f32 = 9800.0; // mm/s^2
const DRAG: f32 = 4.5; // /s — molten droplets decelerate hard in air
const FLOOR_Y: f32 = -330.0;
const PIVOT_Y: f32 = 55.0; // cord hangs from the hand pivot
const TILT_MAX: f32 = 0.26; // ~15 deg
const BALL_R: f32 = 1.05; // mm
const STAGE_TOTAL: f32 = 36.0; // nominal burn for stats displays

const PHASE_IDLE: f32 = 0.0;
// Phases: 0 idle, 1 tsubomi, 2 botan, 3 matsuba, 4 chirigiku, 5 fall, 6 spent.
const PHASE_TSUBOMI: f32 = 1.0;
const PHASE_CHIRIGIKU: f32 = 4.0;
const PHASE_FALL: f32 = 5.0;
const PHASE_SPENT: f32 = 6.0;

// Per-phase tables, indexed by (phase - 1): tsubomi, botan, matsuba, chirigiku.
const PHASE_MEAN: [f32; 4] = [9.0, 8.0, 12.0, 7.0];
const EJECT_MEAN: [f32; 4] = [5.5, 0.85, 0.07, 0.6];
const EJECT_MIN: [f32; 4] = [1.0, 1.0, 2.0, 1.0];
const EJECT_SPAN: [f32; 4] = [1.0, 2.0, 4.0, 2.0]; // count = min + u*span
const DEPTH_MIN: [f32; 4] = [1.0, 4.0, 5.0, 2.0];
const DEPTH_SPAN: [f32; 4] = [2.0, 4.0, 4.0, 3.0]; // max = min + span
const SPEED_MIN: [f32; 4] = [200.0, 480.0, 360.0, 180.0];
const SPEED_SPAN: [f32; 4] = [320.0, 900.0, 760.0, 340.0];
const GEO_P: [f32; 4] = [0.55, 0.5, 0.42, 0.55]; // trng cascade continuation odds

const PARTICLE_CAP: usize = 2048;
const P_STRIDE: usize = 12; // x y z vx vy vz age heat lvl burst_at life reserved
const EVENT_CAP: usize = 256;
const EVENT_STRIDE: usize = 4;
const STATE_STRIDE: usize = 16;
const BALL_STRIDE: usize = 8;
const ENTROPY_CAP: usize = 4096;
const BAG: usize = 8;
const DIR_BINS: usize = 16;

const EV_LIGHT: f32 = 1.0;
const EV_PHASE: f32 = 2.0; // a = phase
const EV_EJECT: f32 = 3.0; // a = droplets, b = interval since last eject
const EV_BURST: f32 = 4.0; // a = children
const EV_FALL: f32 = 5.0;
const EV_LAND: f32 = 6.0;
const EV_SPENT: f32 = 7.0;
const EV_STARVE: f32 = 8.0; // a = starved draws so far

// Particle block indices.
const P_X: usize = 0;
const P_Y: usize = 1;
const P_Z: usize = 2;
const P_VX: usize = 3;
const P_VY: usize = 4;
const P_VZ: usize = 5;
const P_AGE: usize = 6;
const P_HEAT: usize = 7;
const P_GEN: usize = 8;
const P_BURST: usize = 9;
const P_LIFE: usize = 10;
const P_DEPTH: usize = 11;

// State block indices.
const S_PHASE: usize = 0;
const S_ELAPSED: usize = 1;
const S_PHASE_T: usize = 2;
const S_TILT: usize = 3;
const S_BREEZE: usize = 4;
const S_SPARKS: usize = 5;
const S_FINISHED: usize = 6;
const S_EJECTED: usize = 7;
const S_BURSTS: usize = 8;
const S_MODE: usize = 9;
const S_LAST_INT: usize = 10;
const S_PRESSURE: usize = 11;
const S_STARVED: usize = 12;
const S_SEED: usize = 13;

// Ball block indices.
const B_X: usize = 0;
const B_Y: usize = 1;
const B_R: usize = 2;
const B_HEAT: usize = 3;
const B_SWELL: usize = 4;
const B_TILT: usize = 5;
const B_DETACH: usize = 6;
const B_VY: usize = 7;

struct Rng {
    s: [u32; 4],
}

impl Rng {
    fn seed(&mut self, seed: u32) {
        // splitmix32 expands the 32-bit seed into the xoshiro state.
        let mut x = seed.wrapping_add(0x9E37_79B9);
        for slot in self.s.iter_mut() {
            x ^= x >> 16;
            x = x.wrapping_mul(0x21F0_AAAD);
            x ^= x >> 15;
            x = x.wrapping_mul(0x735A_2D97);
            x ^= x >> 15;
            *slot = x;
        }
    }

    fn u32(&mut self) -> u32 {
        let result = self.s[1].wrapping_mul(5).rotate_left(7).wrapping_mul(9);
        let t = self.s[1] << 9;
        self.s[2] ^= self.s[0];
        self.s[3] ^= self.s[1];
        self.s[1] ^= self.s[2];
        self.s[0] ^= self.s[3];
        self.s[2] ^= t;
        self.s[3] = self.s[3].rotate_left(11);
        result
    }

    fn f32(&mut self) -> f32 {
        (self.u32() >> 8) as f32 / 16_777_216.0 // [0,1)
    }
}

struct Sim {
    particles: [f32; PARTICLE_CAP * P_STRIDE],
    ball: [f32; BALL_STRIDE],
    state: [f32; STATE_STRIDE],
    events: [f32; EVENT_CAP * EVENT_STRIDE],
    entropy: [u32; ENTROPY_CAP],
    event_head: u32,
    entropy_head: u32,
    entropy_tail: u32,
    rng: Rng,
    interval_bag: [f32; BAG],
    interval_pos: usize,
    count_bag: [f32; BAG],
    count_pos: usize,
    depth_bag: [f32; BAG],
    depth_pos: usize,
    speed_bag: [f32; BAG],
    speed_pos: usize,
    dir_bins: [u32; DIR_BINS],
    step: u32,
    prd_n: u32,
    next_eject: f32,
    last_eject: f32,
    sway_t: f32,
    sway_speed: f32,
    sway_amp: f32,
    free_cursor: usize,
    spent_t: f32,
    starve_msg_t: f32,
    accum: f32,
}

impl Sim {
    const fn new() -> Self {
        Self {
            particles: [0.0; PARTICLE_CAP * P_STRIDE],
            ball: [0.0; BALL_STRIDE],
            state: [0.0; STATE_STRIDE],
            events: [0.0; EVENT_CAP * EVENT_STRIDE],
            entropy: [0; ENTROPY_CAP],
            event_head: 0,
            entropy_head: 0,
            entropy_tail: 0,
            rng: Rng { s: [0; 4] },
            // All-zero const init keeps the whole static out of the wasm
            // data section; init() marks the bags empty via `BAG`.
            interval_bag: [0.0; BAG],
            interval_pos: 0,
            count_bag: [0.0; BAG],
            count_pos: 0,
            depth_bag: [0.0; BAG],
            depth_pos: 0,
            speed_bag: [0.0; BAG],
            speed_pos: 0,
            dir_bins: [0; DIR_BINS],
            step: 0,
            prd_n: 0,
            next_eject: 0.0,
            last_eject: 0.0,
            sway_t: 0.0,
            sway_speed: 0.0,
            sway_amp: 0.0,
            free_cursor: 0,
            spent_t: 0.0,
            starve_msg_t: 0.0,
            accum: 0.0,
        }
    }

    fn emit(&mut self, kind: f32, a: f32, b: f32, c: f32) {
        let slot = (self.event_head as usize % EVENT_CAP) * EVENT_STRIDE;
        self.events[slot] = kind;
        self.events[slot + 1] = a;
        self.events[slot + 2] = b;
        self.events[slot + 3] = c;
        self.event_head = self.event_head.wrapping_add(1);
    }

    // One raw uniform u32: trng mode consumes the JS-fed ring first and only
    // drifts to the seeded PRNG (marking starvation) when the ring is empty.
    fn next_u32(&mut self) -> u32 {
        if self.state[S_MODE] > 0.5 && self.entropy_tail != self.entropy_head {
            let idx = (self.entropy_tail as usize) % ENTROPY_CAP;
            self.entropy_tail = self.entropy_tail.wrapping_add(1);
            return self.entropy[idx];
        }
        if self.state[S_MODE] > 0.5 && self.starve_msg_t <= 0.0 {
            self.state[S_STARVED] += 1.0;
            self.emit(EV_STARVE, self.state[S_STARVED], 0.0, 0.0);
            self.starve_msg_t = 2.0;
        }
        self.rng.u32()
    }

    fn u(&mut self) -> f32 {
        (self.next_u32() >> 8) as f32 / 16_777_216.0
    }

    // Shuffle-bag of normalized quantiles {(k+0.5)/8}: every refill produces
    // a fresh permutation, so draws spread across the whole range instead of
    // clustering — the "human-fair" substitute for iid sampling.
    fn shaped(&mut self, which: usize) -> f32 {
        // which: 0 interval, 1 count, 2 depth, 3 speed. trng: raw uniform.
        if self.state[S_MODE] > 0.5 {
            return self.u();
        }
        let need_fill = match which {
            0 => self.interval_pos,
            1 => self.count_pos,
            2 => self.depth_pos,
            _ => self.speed_pos,
        } >= BAG;
        if need_fill {
            let mut bag = [0f32; BAG];
            for (k, slot) in bag.iter_mut().enumerate() {
                *slot = (k as f32 + 0.5) / BAG as f32;
            }
            // Fisher-Yates through the normal draw stream.
            let mut i = BAG;
            while i > 1 {
                i -= 1;
                let j = (self.u() * (i + 1) as f32) as usize;
                bag.swap(i, j.min(i));
            }
            match which {
                0 => {
                    self.interval_bag = bag;
                    self.interval_pos = 0;
                }
                1 => {
                    self.count_bag = bag;
                    self.count_pos = 0;
                }
                2 => {
                    self.depth_bag = bag;
                    self.depth_pos = 0;
                }
                _ => {
                    self.speed_bag = bag;
                    self.speed_pos = 0;
                }
            }
        }
        match which {
            0 => {
                let v = self.interval_bag[self.interval_pos];
                self.interval_pos += 1;
                v
            }
            1 => {
                let v = self.count_bag[self.count_pos];
                self.count_pos += 1;
                v
            }
            2 => {
                let v = self.depth_bag[self.depth_pos];
                self.depth_pos += 1;
                v
            }
            _ => {
                let v = self.speed_bag[self.speed_pos];
                self.speed_pos += 1;
                v
            }
        }
    }

    // Azimuth coverage: pick the longest-unused direction bin, jitter inside
    // it — sparks then sweep the whole circle instead of clumping.
    fn dir_angle(&mut self) -> f32 {
        if self.state[S_MODE] > 0.5 {
            return self.u() * core::f32::consts::TAU;
        }
        let mut best = 0usize;
        let mut best_age = self.step.wrapping_sub(self.dir_bins[0]);
        let mut ties = 1u32;
        for i in 1..DIR_BINS {
            let age = self.step.wrapping_sub(self.dir_bins[i]);
            if age > best_age {
                best_age = age;
                best = i;
                ties = 1;
            } else if age == best_age {
                ties += 1;
                if self.u() * ties as f32 >= 1.0 {
                    best = i;
                }
            }
        }
        self.dir_bins[best] = self.step;
        let width = core::f32::consts::TAU / DIR_BINS as f32;
        (best as f32 + 0.5 + (self.u() - 0.5) * 0.9) * width
    }

    fn phase_index(&self) -> usize {
        (self.state[S_PHASE] as usize).saturating_sub(1).min(3)
    }

    // Draw an ejection interval. trng: exponential (memoryless Poisson).
    // feel: quantile-bagged exponential with a floor — bounded gaps, and
    // no two pops close enough to feel simultaneous.
    fn draw_interval(&mut self) -> f32 {
        let mean = EJECT_MEAN[self.phase_index()];
        let u = self.shaped(0);
        let raw = -ln(1.0 - u.min(0.9999)) * mean;
        if self.state[S_MODE] > 0.5 {
            raw
        } else {
            raw.max(mean * 0.25)
        }
    }

    fn draw_count(&mut self) -> f32 {
        let i = self.phase_index();
        EJECT_MIN[i] + floor(self.shaped(1) * EJECT_SPAN[i])
    }

    fn draw_depth(&mut self) -> f32 {
        let i = self.phase_index();
        if self.state[S_MODE] > 0.5 {
            // Geometric continuation, clamped to the phase's depth window.
            let mut d = DEPTH_MIN[i];
            let mut guard = 0;
            while d < DEPTH_MIN[i] + DEPTH_SPAN[i] && guard < 16 {
                if self.u() > GEO_P[i] {
                    break;
                }
                d += 1.0;
                guard += 1;
            }
            d
        } else {
            DEPTH_MIN[i] + floor(self.shaped(2) * (DEPTH_SPAN[i] + 1.0))
        }
    }

    fn light(&mut self) {
        if self.state[S_PHASE] != PHASE_IDLE {
            return;
        }
        self.state[S_PHASE] = PHASE_TSUBOMI;
        self.ball[B_HEAT] = 1.0;
        self.next_eject = 2.0 + self.u() * 3.0;
        self.emit(EV_LIGHT, 0.0, 0.0, 0.0);
        self.emit(EV_PHASE, PHASE_TSUBOMI, 0.0, 0.0);
    }

    fn free_slot(&mut self) -> usize {
        // Linear probe for a dead slot; particles stay put so addresses are
        // stable for the renderer across frames.
        for k in 0..PARTICLE_CAP {
            let i = (self.free_cursor + k) % PARTICLE_CAP;
            if self.particles[i * P_STRIDE + P_HEAT] <= 0.0 {
                self.free_cursor = (i + 1) % PARTICLE_CAP;
                return i;
            }
        }
        usize::MAX
    }

    fn spawn_droplet(&mut self, x: f32, y: f32, angle: f32, speed: f32, lvl: f32, depth: f32) {
        let i = self.free_slot();
        if i == usize::MAX {
            return;
        }
        let z = (self.u() - 0.5) * 2.0; // [-1,1] depth cue, scaled by the renderer
        let base = i * P_STRIDE;
        self.particles[base + P_X] = x;
        self.particles[base + P_Y] = y;
        self.particles[base + P_Z] = z;
        self.particles[base + P_VX] = cos(angle) * speed;
        self.particles[base + P_VY] = sin(angle) * speed;
        self.particles[base + P_VZ] = 0.0;
        self.particles[base + P_AGE] = 0.0;
        self.particles[base + P_HEAT] = 1.0;
        self.particles[base + P_GEN] = lvl;
        self.particles[base + P_DEPTH] = depth;
        self.particles[base + P_BURST] =
            0.045 * (0.7 + self.u() * 0.6) * (1.0 + lvl * 0.06);
        self.particles[base + P_LIFE] = 0.85 + self.u() * 0.35;
    }

    fn eject(&mut self) {
        let count = self.draw_count() as usize;
        let interval = self.state[S_ELAPSED] - self.last_eject;
        self.last_eject = self.state[S_ELAPSED];
        self.state[S_LAST_INT] = interval;
        self.state[S_EJECTED] += count as f32;
        self.emit(EV_EJECT, count as f32, interval, 0.0);
        let (bx, by, br) = (self.ball[B_X], self.ball[B_Y], self.ball[B_R]);
        for _ in 0..count {
            let angle = self.dir_angle();
            let i = self.phase_index();
            let speed = SPEED_MIN[i] + self.shaped(3) * SPEED_SPAN[i];
            let depth = self.draw_depth();
            self.spawn_droplet(bx + cos(angle) * br * 0.6, by + sin(angle) * br * 0.6, angle, speed, 1.0, depth);
        }
        // The pop shrinks the ball; the next interval sets the new swell target.
        self.state[S_PRESSURE] = 0.0;
        self.next_eject = self.state[S_ELAPSED] + self.draw_interval();
    }

    fn burst(&mut self, i: usize) {
        let base = i * P_STRIDE;
        let lvl = self.particles[base + P_GEN];
        let depth = self.particles[base + P_DEPTH];
        let (px, py, pz) = (
            self.particles[base + P_X],
            self.particles[base + P_Y],
            self.particles[base + P_Z],
        );
        let (pvx, pvy) = (self.particles[base + P_VX], self.particles[base + P_VY]);
        let heat = self.particles[base + P_HEAT];
        self.particles[base + P_HEAT] = 0.0; // parent dies in the flash
        if lvl >= depth {
            return;
        }
        let speed = sqrt(pvx * pvx + pvy * pvy);
        if speed < 30.0 {
            return;
        }
        // Spawn budget: when the pool is nearly full a burst just dies out,
        // so density stays bounded and the event ring is never flooded.
        if self.state[S_SPARKS] > 700.0 {
            return;
        }
        let heading = atan2(pvy, pvx);
        let children = 2 + (self.u() * 1.2) as usize; // 2-3
        self.state[S_BURSTS] += 1.0;
        // Throttle: one EV_BURST per batch keeps the ring free for phase
        // transitions even at matsuba peak rates.
        if (self.state[S_BURSTS] as u32) % 24 == 0 {
            self.emit(EV_BURST, children as f32, self.state[S_BURSTS], 0.0);
        }
        for k in 0..children {
            let spread = if self.state[S_MODE] > 0.5 {
                (self.u() - 0.5) * 1.5
            } else {
                // Stratified fan: children cover the whole ±0.75rad fan
                // evenly with a small jitter each, so every burst looks
                // balanced instead of leaning to one side.
                ((k as f32 + 0.5) / children as f32 - 0.5) * 1.5
                    + (self.u() - 0.5) * (1.5 / children as f32)
            };
            let angle = heading + spread;
            let child_speed = speed * (0.5 + self.u() * 0.35);
            let child = self.free_slot();
            if child == usize::MAX {
                return;
            }
            let cb = child * P_STRIDE;
            self.particles[cb + P_X] = px;
            self.particles[cb + P_Y] = py;
            self.particles[cb + P_Z] = pz + (self.u() - 0.5) * 0.3;
            self.particles[cb + P_VX] = cos(angle) * child_speed;
            self.particles[cb + P_VY] = sin(angle) * child_speed;
            self.particles[cb + P_VZ] = 0.0;
            self.particles[cb + P_AGE] = 0.0;
            self.particles[cb + P_HEAT] = heat * 0.78;
            self.particles[cb + P_GEN] = lvl + 1.0;
            self.particles[cb + P_DEPTH] = depth;
            self.particles[cb + P_BURST] = 0.04 * (0.7 + self.u() * 0.6) * (1.0 + lvl * 0.05);
            self.particles[cb + P_LIFE] = 0.55;
        }
    }

    // Phase advance: trng uses a memoryless hazard (geometric durations,
    // large spread). feel uses a PRD hazard C·n — a Rayleigh distribution
    // concentrated near the mean, matching the Warcraft III engine mechanic.
    fn maybe_advance(&mut self) {
        let phase = self.state[S_PHASE];
        if !(PHASE_TSUBOMI..=PHASE_CHIRIGIKU).contains(&phase) {
            return;
        }
        let mean_s = PHASE_MEAN[self.phase_index()];
        let mean_steps = mean_s / SUBSTEP;
        self.prd_n += 1;
        let p = if self.state[S_MODE] > 0.5 {
            1.0 / mean_steps
        } else {
            (core::f32::consts::PI / 2.0) / (mean_steps * mean_steps) * self.prd_n as f32
        };
        if self.u() < p.min(1.0) {
            self.prd_n = 0;
            self.advance_phase();
        }
    }

    fn advance_phase(&mut self) {
        let next = self.state[S_PHASE] + 1.0;
        if next > PHASE_CHIRIGIKU {
            // End of life: the spent ball elongates, detaches and falls.
            self.state[S_PHASE] = PHASE_FALL;
            self.ball[B_DETACH] = 1.0;
            self.ball[B_VY] = 0.0;
            self.emit(EV_PHASE, PHASE_FALL, 0.0, 0.0);
            self.emit(EV_FALL, 0.0, 0.0, 0.0);
        } else {
            self.state[S_PHASE] = next;
            self.emit(EV_PHASE, next, 0.0, 0.0);
            // First ejection of a phase comes quickly so the change reads.
            self.next_eject = self.state[S_ELAPSED] + self.draw_interval().min(0.4);
        }
        self.state[S_PHASE_T] = 0.0;
    }

    fn step_ball(&mut self, dt: f32) {
        let tilt = self.state[S_TILT].clamp(-1.0, 1.0) * TILT_MAX;
        let breeze = self.state[S_BREEZE].clamp(-1.0, 1.0);
        // Pendulum sway plus a fine hand tremor. Sway period/amp are drawn
        // once at init so every stick hangs a little differently.
        self.sway_t += dt * self.sway_speed;
        let tremor = if self.state[S_MODE] > 0.5 {
            (self.u() - 0.5) * 0.5
        } else {
            // Feel mode: smooth value noise instead of white jitter.
            (self.u() + self.u() - 1.0) * 0.35
        };
        let sway = sin(self.sway_t) * self.sway_amp + tremor + breeze * 6.0;
        let ball_hang = PIVOT_Y - BALL_R;
        if self.ball[B_DETACH] > 0.5 {
            // Free fall with light drag, then a soft landing and a last sputter.
            self.ball[B_VY] -= GRAVITY * dt;
            self.ball[B_VY] *= 1.0 / (1.0 + 0.4 * dt);
            self.ball[B_Y] += self.ball[B_VY] * dt;
            self.ball[B_HEAT] *= 1.0 / (1.0 + 1.6 * dt);
            if self.ball[B_Y] <= FLOOR_Y {
                self.ball[B_Y] = FLOOR_Y;
                if self.ball[B_VY] < -20.0 {
                    self.emit(EV_LAND, -self.ball[B_VY], 0.0, 0.0);
                    for _ in 0..6 {
                        let angle = core::f32::consts::FRAC_PI_2 + (self.u() - 0.5) * 1.6;
                        let speed = 120.0 + self.u() * 160.0;
                        self.spawn_droplet(self.ball[B_X], FLOOR_Y + 1.0, angle, speed, 7.0, 7.0);
                    }
                }
                self.ball[B_VY] = 0.0;
                self.ball[B_R] = BALL_R * 0.4;
            }
        } else {
            let dx = tilt;
            self.ball[B_TILT] = tilt;
            self.ball[B_X] = sin(dx) * ball_hang + sway;
            self.ball[B_Y] = PIVOT_Y - cos(dx) * ball_hang;
            // Heat: steady glow that flickers, fading in the last stage.
            let target = if self.state[S_PHASE] >= PHASE_CHIRIGIKU { 0.72 } else { 1.0 };
            let flicker = (self.u() - 0.5) * if self.state[S_MODE] > 0.5 { 0.10 } else { 0.05 };
            self.ball[B_HEAT] += (target + flicker - self.ball[B_HEAT]) * (dt * 3.0).min(1.0);
            // Gas pressure builds between pops; the ball swells visibly.
            let mean = EJECT_MEAN[self.phase_index()];
            let span = (self.next_eject - self.state[S_ELAPSED]).max(0.0);
            let progress = (1.0 - span / mean.max(0.05)).clamp(0.0, 1.0);
            self.state[S_PRESSURE] = progress;
            self.ball[B_SWELL] = progress;
            self.ball[B_R] = BALL_R * (1.0 + 0.12 * progress);
        }
    }

    fn step_particles(&mut self, dt: f32) {
        let mut alive = 0usize;
        for i in 0..PARTICLE_CAP {
            let base = i * P_STRIDE;
            if self.particles[base + P_HEAT] <= 0.0 {
                continue;
            }
            let age = self.particles[base + P_AGE] + dt;
            self.particles[base + P_AGE] = age;
            // Strong aerodynamic drag + gravity, implicit-in-drag Euler.
            let damp = 1.0 / (1.0 + DRAG * dt);
            self.particles[base + P_VX] *= damp;
            self.particles[base + P_VZ] *= damp;
            self.particles[base + P_VY] = self.particles[base + P_VY] * damp - GRAVITY * dt;
            self.particles[base + P_X] += self.particles[base + P_VX] * dt;
            self.particles[base + P_Y] += self.particles[base + P_VY] * dt;
            // Micro-explosion schedule: droplets heat up then burst or die.
            let cool = 1.0 / (1.0 + 5.0 * dt);
            self.particles[base + P_HEAT] *= cool;
            if age >= self.particles[base + P_BURST] && self.particles[base + P_LIFE] > 0.0 {
                self.burst(i);
            }
            if self.particles[base + P_HEAT] < 0.04
                || age > self.particles[base + P_LIFE]
                || self.particles[base + P_Y] < FLOOR_Y
            {
                self.particles[base + P_HEAT] = 0.0;
            }
            if self.particles[base + P_HEAT] > 0.0 {
                alive += 1;
            }
        }
        self.state[S_SPARKS] = alive as f32;
    }

    fn substep(&mut self, dt: f32) {
        if self.state[S_FINISHED] > 0.0 {
            return;
        }
        self.step = self.step.wrapping_add(1);
        self.starve_msg_t = (self.starve_msg_t - dt).max(0.0);
        let phase = self.state[S_PHASE];
        if phase == PHASE_IDLE {
            return;
        }
        self.state[S_ELAPSED] += dt;
        self.state[S_PHASE_T] += dt;

        if phase == PHASE_FALL {
            self.step_ball(dt);
            self.step_particles(dt);
            if self.ball[B_Y] <= FLOOR_Y && self.ball[B_HEAT] < 0.12 {
                self.state[S_PHASE] = PHASE_SPENT;
                self.spent_t = 0.0;
                self.emit(EV_PHASE, PHASE_SPENT, 0.0, 0.0);
            }
            return;
        }
        if phase == PHASE_SPENT {
            self.spent_t += dt;
            self.step_particles(dt);
            if self.spent_t > 0.8 {
                self.state[S_FINISHED] = 1.0;
                self.emit(EV_SPENT, self.state[S_ELAPSED], self.state[S_BURSTS], 0.0);
            }
            return;
        }

        if self.state[S_ELAPSED] >= self.next_eject {
            self.eject();
        }
        self.maybe_advance();
        self.step_ball(dt);
        self.step_particles(dt);
    }

    fn init(&mut self, seed: u32, mode: f32) {
        // Field-by-field reset: assigning a whole Sim::new() would embed a
        // ~100 KB template in the binary.
        self.particles = [0.0; PARTICLE_CAP * P_STRIDE];
        self.ball = [0.0; BALL_STRIDE];
        self.state = [0.0; STATE_STRIDE];
        self.events = [0.0; EVENT_CAP * EVENT_STRIDE];
        self.entropy = [0; ENTROPY_CAP];
        self.event_head = 0;
        self.entropy_head = 0;
        self.entropy_tail = 0;
        // Bags start empty so the first shaped() draw refills + shuffles.
        self.interval_pos = BAG;
        self.count_pos = BAG;
        self.depth_pos = BAG;
        self.speed_pos = BAG;
        self.dir_bins = [0; DIR_BINS];
        self.step = 0;
        self.prd_n = 0;
        self.next_eject = 0.0;
        self.last_eject = 0.0;
        self.sway_t = 0.0;
        self.free_cursor = 0;
        self.spent_t = 0.0;
        self.starve_msg_t = 0.0;
        self.accum = 0.0;
        self.state[S_MODE] = mode;
        self.state[S_SEED] = seed as f32;
        self.rng.seed(seed ^ 0x5EED_5EED);
        self.sway_amp = 1.2 + self.rng.f32() * 1.8;
        self.sway_speed = 2.2 + self.rng.f32() * 1.6;
        self.ball[B_R] = BALL_R;
        self.ball[B_X] = 0.0;
        self.ball[B_Y] = PIVOT_Y - BALL_R; // unlit tip hangs at the cord end
        self.ball[B_HEAT] = 0.0;
    }
}

// no_std math helpers, shared style with the other sims.
fn floor(x: f32) -> f32 {
    let t = x as i64;
    let tf = t as f32;
    if x < tf { tf - 1.0 } else { tf }
}

fn sqrt(x: f32) -> f32 {
    if x <= 0.0 {
        return 0.0;
    }
    let mut y = f32::from_bits((x.to_bits() >> 1).wrapping_add(0x1fbd_1df5));
    y = 0.5 * (y + x / y);
    y = 0.5 * (y + x / y);
    0.5 * (y + x / y)
}

fn sin(mut x: f32) -> f32 {
    const PI: f32 = core::f32::consts::PI;
    const TAU: f32 = core::f32::consts::TAU;
    x -= TAU * floor(x / TAU + 0.5);
    if x > PI / 2.0 {
        x = PI - x;
    } else if x < -PI / 2.0 {
        x = -PI - x;
    }
    let x2 = x * x;
    x * (1.0 + x2 * (-1.0 / 6.0 + x2 * (1.0 / 120.0 + x2 * (-1.0 / 5040.0 + x2 / 362_880.0))))
}

fn cos(x: f32) -> f32 {
    sin(x + core::f32::consts::FRAC_PI_2)
}

fn atan2(y: f32, x: f32) -> f32 {
    // Two-quadrant fallback is enough: headings stay near-horizontal.
    if x.abs() > 1e-6 {
        let r = atan(y / x);
        if x < 0.0 {
            if y >= 0.0 { r + core::f32::consts::PI } else { r - core::f32::consts::PI }
        } else {
            r
        }
    } else {
        core::f32::consts::FRAC_PI_2.copysign(y)
    }
}

fn atan(x: f32) -> f32 {
    // |x| <= 1 branch via folding; err < 1e-5 on the folded range.
    let x = if x > 1.0 {
        return core::f32::consts::FRAC_PI_2 - atan(1.0 / x);
    } else if x < -1.0 {
        return -core::f32::consts::FRAC_PI_2 - atan(1.0 / x);
    } else {
        x
    };
    let x2 = x * x;
    x * (1.0 + x2 * (-1.0 / 3.0 + x2 * (0.2 + x2 * (-1.0 / 7.0 + x2 / 9.0))))
}

fn ln(x: f32) -> f32 {
    // ln via atanh series: ln(m) = 2(z + z^3/3 + z^5/5 + ...), z=(m-1)/(m+1),
    // m in [sqrt(2)/2, sqrt(2)] after extracting the exponent.
    if x <= 0.0 {
        return 0.0;
    }
    let bits = x.to_bits();
    let mut e = ((bits >> 23) & 0xff) as i32 - 127;
    let mut m = f32::from_bits((bits & 0x007f_ffff) | 0x3f00_0000);
    if m < 0.707_106_77 {
        m *= 2.0;
        e -= 1;
    }
    let z = (m - 1.0) / (m + 1.0);
    let z2 = z * z;
    let mut t = z;
    let mut sum = z;
    for k in 1..6 {
        t *= z2;
        sum += t / (2 * k + 1) as f32;
    }
    2.0 * sum + (e as f32) * 0.693_147_2
}

static mut SIM: Sim = Sim::new();

#[cfg(target_arch = "wasm32")]
#[panic_handler]
fn panic(_: &PanicInfo<'_>) -> ! {
    loop {}
}

unsafe fn sim_mut() -> &'static mut Sim {
    unsafe { &mut *ptr::addr_of_mut!(SIM) }
}

// mode: 0 = feel (seeded, shaped), 1 = trng (crypto-fed ring).
#[unsafe(no_mangle)]
pub extern "C" fn sim_init(seed: u32, mode: u32) {
    let sim = unsafe { sim_mut() };
    sim.init(seed, if mode == 1 { 1.0 } else { 0.0 });
}

#[unsafe(no_mangle)]
pub extern "C" fn sim_light() {
    unsafe { sim_mut() }.light();
}

#[unsafe(no_mangle)]
pub extern "C" fn sim_step(dt_s: f32) {
    let sim = unsafe { sim_mut() };
    let dt = if dt_s.is_finite() && dt_s > 0.0 { dt_s.min(0.5) } else { 0.0 };
    sim.accum += dt;
    let mut steps = 0usize;
    while sim.accum >= SUBSTEP && steps < MAX_SUBSTEPS {
        sim.substep(SUBSTEP);
        sim.accum -= SUBSTEP;
        steps += 1;
    }
    if steps >= MAX_SUBSTEPS {
        sim.accum = 0.0;
    }
}

#[unsafe(no_mangle)]
pub extern "C" fn set_tilt(x: f32) {
    unsafe { sim_mut() }.state[S_TILT] = if x.is_finite() { x } else { 0.0 };
}

#[unsafe(no_mangle)]
pub extern "C" fn set_breeze(x: f32) {
    unsafe { sim_mut() }.state[S_BREEZE] = if x.is_finite() { x } else { 0.0 };
}

// JS writes `n` u32 words starting at entropy[head % ENTROPY_CAP], then calls
// this to publish them. The ring never wraps the tail by construction: JS
// must only write up to entropy_free() words.
#[unsafe(no_mangle)]
pub extern "C" fn feed_entropy(n: u32) {
    let sim = unsafe { sim_mut() };
    let used = sim.entropy_head.wrapping_sub(sim.entropy_tail);
    let n = (n as usize).min(ENTROPY_CAP.saturating_sub(used as usize));
    sim.entropy_head = sim.entropy_head.wrapping_add(n as u32);
}

#[unsafe(no_mangle)]
pub extern "C" fn entropy_free() -> u32 {
    let sim = unsafe { sim_mut() };
    (ENTROPY_CAP as u32).saturating_sub(sim.entropy_head.wrapping_sub(sim.entropy_tail))
}

#[unsafe(no_mangle)]
pub extern "C" fn entropy_head() -> u32 {
    unsafe { (*ptr::addr_of!(SIM)).entropy_head }
}

#[unsafe(no_mangle)]
pub extern "C" fn event_head() -> u32 {
    unsafe { (*ptr::addr_of!(SIM)).event_head }
}

#[unsafe(no_mangle)]
pub extern "C" fn event_cap() -> u32 {
    EVENT_CAP as u32
}

#[unsafe(no_mangle)]
pub extern "C" fn particle_cap() -> u32 {
    PARTICLE_CAP as u32
}

#[unsafe(no_mangle)]
pub extern "C" fn stage_total() -> f32 {
    STAGE_TOTAL
}

#[unsafe(no_mangle)]
pub extern "C" fn particle_ptr() -> u32 {
    unsafe { ptr::addr_of!(SIM.particles) as *const f32 as usize as u32 }
}

#[unsafe(no_mangle)]
pub extern "C" fn ball_ptr() -> u32 {
    unsafe { ptr::addr_of!(SIM.ball) as *const f32 as usize as u32 }
}

#[unsafe(no_mangle)]
pub extern "C" fn state_ptr() -> u32 {
    unsafe { ptr::addr_of!(SIM.state) as *const f32 as usize as u32 }
}

#[unsafe(no_mangle)]
pub extern "C" fn event_ptr() -> u32 {
    unsafe { ptr::addr_of!(SIM.events) as *const f32 as usize as u32 }
}

#[unsafe(no_mangle)]
pub extern "C" fn entropy_ptr() -> u32 {
    unsafe { ptr::addr_of!(SIM.entropy) as *const u32 as usize as u32 }
}

#[unsafe(no_mangle)]
pub extern "C" fn entropy_cap() -> u32 {
    ENTROPY_CAP as u32
}
