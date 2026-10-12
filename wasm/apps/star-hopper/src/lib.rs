#![no_std]

#[cfg(target_arch = "wasm32")]
use core::panic::PanicInfo;
use core::ptr;

// Star Hopper simulation: deterministic fixed-substep platforming physics on
// floating islands, plus a seeded world generator. All data JS reads lives in
// flat f32 blocks addressed by the *_ptr exports, like the mochocho sim.

const GRAVITY: f32 = 22.0;
const MOVE_SPEED: f32 = 7.0;
const ACCEL_GROUND: f32 = 60.0;
const ACCEL_AIR: f32 = 25.0;
const DECEL_GROUND: f32 = 45.0;
const JUMP_SPEED: f32 = 9.4;
const DOUBLE_JUMP_SPEED: f32 = 8.6;
const JUMP_CUT: f32 = 0.45;
const COYOTE_S: f32 = 0.12;
const BUFFER_S: f32 = 0.15;
const SUBSTEP: f32 = 1.0 / 240.0;
const MAX_SUBSTEPS: usize = 480;
const EYE_HEIGHT: f32 = 1.55;
const CAPSULE_HALF: f32 = 0.85;
const CAPSULE_RADIUS: f32 = 0.35;
const PICKUP_RADIUS: f32 = 1.45;
const MAGNET_RADIUS: f32 = 4.2;
const MAGNET_SPEED: f32 = 9.0;
const COMBO_WINDOW: f32 = 4.0;
const COMBO_MAX: f32 = 8.0;
const TIME_LIMIT: f32 = 240.0;
const FALL_PENALTY: f32 = 4.0;
const RESPAWN_Y: f32 = -18.0;
const LAND_MIN_VY: f32 = 3.0;

const ISLAND_COUNT: usize = 7;
const ISLAND_STRIDE: usize = 8; // x, top_y, z, radius, thickness, tone, wobble, reserved
const SHARD_COUNT: usize = 21;
const SHARD_STRIDE: usize = 8; // x, y, z, taken, kind, phase, reserved, reserved
const PLAYER_STRIDE: usize = 16;
const STATE_STRIDE: usize = 16;
const EVENT_CAP: usize = 64;
const EVENT_STRIDE: usize = 4; // type, a, b, c

// Event types.
const EV_PICKUP: f32 = 1.0; // a = shard index, b = combo after pickup
const EV_JUMP: f32 = 2.0;
const EV_DOUBLE_JUMP: f32 = 3.0;
const EV_LAND: f32 = 4.0; // a = impact speed
const EV_FALL: f32 = 5.0;
const EV_FINISH: f32 = 6.0; // a = reason (1 win, 2 timeout)
const EV_COMBO: f32 = 7.0; // a = new combo milestone

// Shard kinds.
const KIND_NORMAL: f32 = 0.0;
const KIND_BONUS: f32 = 1.0;

// finish_reason values.
const REASON_WIN: f32 = 1.0;
const REASON_TIMEOUT: f32 = 2.0;

struct Sim {
    islands: [f32; ISLAND_COUNT * ISLAND_STRIDE],
    shards: [f32; SHARD_COUNT * SHARD_STRIDE],
    player: [f32; PLAYER_STRIDE],
    state: [f32; STATE_STRIDE],
    events: [f32; EVENT_CAP * EVENT_STRIDE],
    event_head: u32,
    move_x: f32,
    move_z: f32,
    look_yaw: f32,
    look_pitch: f32,
    jump_held: bool,
    substep_accum: f32,
    seed: u32,
    rng: u64,
}

// player block indices
const P_X: usize = 0;
const P_Y: usize = 1;
const P_Z: usize = 2;
const P_VX: usize = 3;
const P_VY: usize = 4;
const P_VZ: usize = 5;
const P_YAW: usize = 6;
const P_PITCH: usize = 7;
const P_GROUNDED: usize = 8;
const P_COYOTE: usize = 9;
const P_BUFFER: usize = 10;
const P_AIR_JUMPS: usize = 11;
const P_LAST_ISLAND: usize = 12;
const P_ISLAND: usize = 13; // island currently stood on, -1 airborne
const P_LAND_IMPACT: usize = 14;

// state block indices
const S_TIME_LEFT: usize = 0;
const S_ELAPSED: usize = 1;
const S_SCORE: usize = 2;
const S_COMBO: usize = 3;
const S_COMBO_TIMER: usize = 4;
const S_TAKEN: usize = 5;
const S_FALLS: usize = 6;
const S_BEST_COMBO: usize = 7;
const S_FINISHED: usize = 8;
const S_FINISH_REASON: usize = 9;
const S_RESPAWN_T: usize = 10;

impl Sim {
    const fn new() -> Self {
        Self {
            islands: [0.0; ISLAND_COUNT * ISLAND_STRIDE],
            shards: [0.0; SHARD_COUNT * SHARD_STRIDE],
            player: [0.0; PLAYER_STRIDE],
            state: [0.0; STATE_STRIDE],
            events: [0.0; EVENT_CAP * EVENT_STRIDE],
            event_head: 0,
            move_x: 0.0,
            move_z: 0.0,
            look_yaw: 0.0,
            look_pitch: 0.0,
            jump_held: false,
            substep_accum: 0.0,
            seed: 0,
            rng: 0,
        }
    }

    fn rand(&mut self) -> f32 {
        // xorshift64* — deterministic across platforms.
        self.rng ^= self.rng >> 12;
        self.rng ^= self.rng << 25;
        self.rng ^= self.rng >> 27;
        let v = (self.rng.wrapping_mul(0x2545F4914F6CDD1D) >> 40) & 0xFF_FFFF;
        v as f32 / 16_777_216.0
    }

    fn emit(&mut self, kind: f32, a: f32, b: f32) {
        let slot = (self.event_head as usize % EVENT_CAP) * EVENT_STRIDE;
        self.events[slot] = kind;
        self.events[slot + 1] = a;
        self.events[slot + 2] = b;
        self.events[slot + 3] = 0.0;
        self.event_head = self.event_head.wrapping_add(1);
    }

    fn island(&self, i: usize) -> &[f32] {
        &self.islands[i * ISLAND_STRIDE..i * ISLAND_STRIDE + ISLAND_STRIDE]
    }

    fn gen_world(&mut self) {
        self.rng = 0x9E3779B97F4A7C15 ^ (self.seed as u64).wrapping_mul(0xD1B54A32D192ED03);
        // Island 0: the start platform, wide and low.
        self.islands[0] = 0.0;
        self.islands[1] = 0.0;
        self.islands[2] = 0.0;
        self.islands[3] = 9.5;
        self.islands[4] = 7.0;
        self.islands[5] = self.rand();
        self.islands[6] = 0.0;
        // Islands 1..6: golden-angle spiral drifting outward and upward.
        let mut angle = self.rand() * core::f32::consts::TAU;
        for i in 1..ISLAND_COUNT {
            let radius = 6.0 + self.rand() * 3.5;
            let distance = 15.0 + i as f32 * 9.0 + self.rand() * 6.0;
            let top = 3.0 + i as f32 * 6.5 + self.rand() * 4.0;
            angle += 2.399_963_1; // golden angle in radians
            let x = cos(angle) * distance;
            let z = sin(angle) * distance;
            let base = i * ISLAND_STRIDE;
            self.islands[base] = x;
            self.islands[base + 1] = top;
            self.islands[base + 2] = z;
            self.islands[base + 3] = radius;
            self.islands[base + 4] = 4.0 + self.rand() * 5.0;
            self.islands[base + 5] = self.rand();
            self.islands[base + 6] = self.rand();
        }

        // Shards: two grounded + one bonus per island. Bonus shards hover just
        // past the rim or on the jump arc to the next island.
        let mut s = 0usize;
        for i in 0..ISLAND_COUNT {
            let island = self.island(i);
            let (ix, iy, iz, ir) = (island[0], island[1], island[2], island[3]);
            for k in 0..3 {
                let base = s * SHARD_STRIDE;
                if k < 2 {
                    let a = self.rand() * core::f32::consts::TAU;
                    let d = (0.25 + self.rand() * 0.55) * ir;
                    self.shards[base] = ix + cos(a) * d;
                    self.shards[base + 1] = iy + 1.2;
                    self.shards[base + 2] = iz + sin(a) * d;
                    self.shards[base + 4] = KIND_NORMAL;
                } else if i + 1 < ISLAND_COUNT {
                    // Arc apex between this island and the next.
                    let (nx, ny, nz) = {
                        let next = self.island(i + 1);
                        (next[0], next[1], next[2])
                    };
                    let t = 0.5 + (self.rand() - 0.5) * 0.3;
                    self.shards[base] = ix + (nx - ix) * t;
                    let apex = iy.max(ny) + 3.2 + self.rand() * 1.5;
                    self.shards[base + 1] = apex;
                    self.shards[base + 2] = iz + (nz - iz) * t;
                    self.shards[base + 4] = KIND_BONUS;
                } else {
                    // Last island: high float above the rim.
                    self.shards[base] = ix + ir * 0.8;
                    self.shards[base + 1] = iy + 4.5;
                    self.shards[base + 2] = iz + ir * 0.6;
                    self.shards[base + 4] = KIND_BONUS;
                }
                self.shards[base + 3] = 0.0;
                self.shards[base + 5] = self.rand();
                s += 1;
            }
        }
    }

    fn reset_run(&mut self) {
        // shards[base+3] is `taken`; reset without touching positions.
        let mut i = 0;
        while i < SHARD_COUNT {
            self.shards[i * SHARD_STRIDE + 3] = 0.0;
            i += 1;
        }
        self.events = [0.0; EVENT_CAP * EVENT_STRIDE];
        self.event_head = 0;
        self.player = [0.0; PLAYER_STRIDE];
        self.player[P_X] = self.islands[0];
        self.player[P_Y] = self.islands[1];
        self.player[P_Z] = self.islands[2];
        self.player[P_GROUNDED] = 1.0;
        self.player[P_ISLAND] = 0.0;
        self.player[P_LAST_ISLAND] = 0.0;
        self.state = [0.0; STATE_STRIDE];
        self.state[S_TIME_LEFT] = TIME_LIMIT;
        self.substep_accum = 0.0;
        self.move_x = 0.0;
        self.move_z = 0.0;
        self.jump_held = false;
    }

    fn respawn(&mut self) {
        let idx = self.player[P_LAST_ISLAND] as usize;
        let (ix, iy, iz) = {
            let island = self.island(idx);
            (island[0], island[1], island[2])
        };
        self.player[P_X] = ix;
        self.player[P_Y] = iy;
        self.player[P_Z] = iz;
        self.player[P_VX] = 0.0;
        self.player[P_VY] = 0.0;
        self.player[P_VZ] = 0.0;
        self.player[P_GROUNDED] = 1.0;
        self.player[P_ISLAND] = idx as f32;
        self.player[P_AIR_JUMPS] = 0.0;
        self.player[P_COYOTE] = 0.0;
        self.player[P_BUFFER] = 0.0;
        self.state[S_FALLS] += 1.0;
        self.state[S_COMBO] = 0.0;
        self.state[S_COMBO_TIMER] = 0.0;
        self.state[S_TIME_LEFT] = (self.state[S_TIME_LEFT] - FALL_PENALTY).max(0.0);
        self.state[S_RESPAWN_T] = self.state[S_ELAPSED];
        self.emit(EV_FALL, 0.0, 0.0);
    }

    fn substep(&mut self, dt: f32) {
        if self.state[S_FINISHED] > 0.0 {
            return;
        }
        self.state[S_ELAPSED] += dt;
        self.state[S_TIME_LEFT] -= dt;
        if self.state[S_TIME_LEFT] <= 0.0 {
            self.state[S_TIME_LEFT] = 0.0;
            self.finish(REASON_TIMEOUT);
            return;
        }

        // --- horizontal velocity toward desired move ---
        let mut mx = self.move_x;
        let mut mz = self.move_z;
        let mag = sqrt(mx * mx + mz * mz);
        if mag > 1.0 {
            mx /= mag;
            mz /= mag;
        }
        let wish_x = mx * MOVE_SPEED;
        let wish_z = mz * MOVE_SPEED;
        let grounded = self.player[P_GROUNDED] > 0.0;
        let accel = if grounded { ACCEL_GROUND } else { ACCEL_AIR };
        let pvx = self.player[P_VX];
        let pvz = self.player[P_VZ];
        if mag > 0.02 {
            self.player[P_VX] = approach(pvx, wish_x, accel * dt);
            self.player[P_VZ] = approach(pvz, wish_z, accel * dt);
        } else if grounded {
            self.player[P_VX] = approach(pvx, 0.0, DECEL_GROUND * dt);
            self.player[P_VZ] = approach(pvz, 0.0, DECEL_GROUND * dt);
        }

        // --- jump ---
        self.player[P_BUFFER] = (self.player[P_BUFFER] - dt).max(0.0);
        self.player[P_COYOTE] = (self.player[P_COYOTE] - dt).max(0.0);
        if self.player[P_BUFFER] > 0.0 {
            if self.player[P_GROUNDED] > 0.0 || self.player[P_COYOTE] > 0.0 {
                self.player[P_VY] = JUMP_SPEED;
                self.player[P_GROUNDED] = 0.0;
                self.player[P_ISLAND] = -1.0;
                self.player[P_COYOTE] = 0.0;
                self.player[P_BUFFER] = 0.0;
                self.emit(EV_JUMP, 0.0, 0.0);
            } else if self.player[P_AIR_JUMPS] < 1.0 {
                self.player[P_VY] = DOUBLE_JUMP_SPEED;
                self.player[P_AIR_JUMPS] += 1.0;
                self.player[P_BUFFER] = 0.0;
                // A little forward kick keeps double jumps feeling springy.
                self.player[P_VX] += mx * 1.6;
                self.player[P_VZ] += mz * 1.6;
                self.emit(EV_DOUBLE_JUMP, 0.0, 0.0);
            }
        }

        // --- gravity + integrate ---
        self.player[P_VY] -= GRAVITY * dt;
        let prev_y = self.player[P_Y];
        self.player[P_X] += self.player[P_VX] * dt;
        self.player[P_Y] += self.player[P_VY] * dt;
        self.player[P_Z] += self.player[P_VZ] * dt;

        // --- island collision ---
        let px = self.player[P_X];
        let py = self.player[P_Y];
        let pz = self.player[P_Z];
        let vy = self.player[P_VY];
        let mut on_island = -1.0f32;
        let mut i = 0;
        while i < ISLAND_COUNT {
            let (ix, iy, iz, ir, thick) = {
                let island = self.island(i);
                (island[0], island[1], island[2], island[3], island[4])
            };
            let dx = px - ix;
            let dz = pz - iz;
            let dist = sqrt(dx * dx + dz * dz);
            let r = ir + CAPSULE_RADIUS;
            if dist < r {
                // Top landing: feet crossed the surface while falling.
                if vy <= 0.0 && prev_y >= iy - 0.001 && py <= iy {
                    self.player[P_Y] = iy;
                    let impact = -vy;
                    if impact > LAND_MIN_VY && self.player[P_GROUNDED] <= 0.0 {
                        self.emit(EV_LAND, impact, 0.0);
                        self.player[P_LAND_IMPACT] = impact;
                    }
                    self.player[P_VY] = 0.0;
                    on_island = i as f32;
                } else if py < iy - 0.4 && py > iy - thick - 0.2 {
                    // Side wall: push out radially.
                    let nx = if dist > 0.001 { dx / dist } else { 1.0 };
                    let nz = if dist > 0.001 { dz / dist } else { 0.0 };
                    let push = r - dist;
                    self.player[P_X] += nx * push;
                    self.player[P_Z] += nz * push;
                    let dot = self.player[P_VX] * nx + self.player[P_VZ] * nz;
                    if dot < 0.0 {
                        self.player[P_VX] -= nx * dot;
                        self.player[P_VZ] -= nz * dot;
                    }
                } else if vy > 0.0 && py + CAPSULE_HALF * 2.0 > iy - thick && py < iy - thick {
                    // Head bumps the underside slab.
                    self.player[P_VY] = 0.0;
                }
            } else if on_island < 0.0 && (self.player[P_ISLAND] - i as f32).abs() < 0.5
                && self.player[P_GROUNDED] > 0.0
            {
                // Stepped off the island we were standing on.
                self.player[P_GROUNDED] = 0.0;
                self.player[P_COYOTE] = COYOTE_S;
                self.player[P_ISLAND] = -1.0;
            }
            i += 1;
        }

        if on_island >= 0.0 {
            self.player[P_GROUNDED] = 1.0;
            self.player[P_ISLAND] = on_island;
            self.player[P_LAST_ISLAND] = on_island;
            self.player[P_AIR_JUMPS] = 0.0;
        } else {
            // Still grounded? Only while standing on the surface in radius.
            if self.player[P_GROUNDED] > 0.0 {
                let gi = self.player[P_ISLAND] as usize;
                let (gx, gz, gr) = {
                    let island = self.island(gi);
                    (island[0], island[2], island[3])
                };
                let dx = self.player[P_X] - gx;
                let dz = self.player[P_Z] - gz;
                let edge = gr + CAPSULE_RADIUS * 0.5;
                if dx * dx + dz * dz > edge * edge {
                    self.player[P_GROUNDED] = 0.0;
                    self.player[P_COYOTE] = COYOTE_S;
                    self.player[P_ISLAND] = -1.0;
                }
            }
        }

        // --- void fall ---
        if self.player[P_Y] < RESPAWN_Y {
            self.respawn();
        }

        // --- shards: magnet + pickup ---
        let head_y = self.player[P_Y] + EYE_HEIGHT;
        let mut j = 0;
        while j < SHARD_COUNT {
            let base = j * SHARD_STRIDE;
            if self.shards[base + 3] < 0.5 {
                let sx = self.shards[base];
                let sy = self.shards[base + 1];
                let sz = self.shards[base + 2];
                // Measure to the eye so ground pickups feel generous.
                let dx = self.player[P_X] - sx;
                let dy = head_y - sy;
                let dz = self.player[P_Z] - sz;
                let dist = sqrt(dx * dx + dy * dy + dz * dz);
                if dist < PICKUP_RADIUS {
                    self.shards[base + 3] = 1.0;
                    let combo = if self.state[S_COMBO_TIMER] > 0.0 {
                        (self.state[S_COMBO] + 1.0).min(COMBO_MAX)
                    } else {
                        1.0
                    };
                    let milestone = combo > self.state[S_BEST_COMBO].max(self.state[S_COMBO]);
                    self.state[S_COMBO] = combo;
                    self.state[S_COMBO_TIMER] = COMBO_WINDOW;
                    if combo > self.state[S_BEST_COMBO] {
                        self.state[S_BEST_COMBO] = combo;
                    }
                    let kind = self.shards[base + 4];
                    self.state[S_SCORE] += 100.0 * combo + if kind > 0.5 { 50.0 } else { 0.0 };
                    self.state[S_TAKEN] += 1.0;
                    self.emit(EV_PICKUP, j as f32, combo);
                    if milestone && combo >= 4.0 {
                        self.emit(EV_COMBO, combo, 0.0);
                    }
                    if self.state[S_TAKEN] as usize >= SHARD_COUNT {
                        self.finish(REASON_WIN);
                        return;
                    }
                } else if dist < MAGNET_RADIUS {
                    let pull = (MAGNET_SPEED * dt).min(dist - PICKUP_RADIUS * 0.5).max(0.0);
                    if dist > 0.001 {
                        self.shards[base] += dx / dist * pull;
                        self.shards[base + 1] += dy / dist * pull;
                        self.shards[base + 2] += dz / dist * pull;
                    }
                }
            }
            j += 1;
        }

        self.state[S_COMBO_TIMER] = (self.state[S_COMBO_TIMER] - dt).max(0.0);
        if self.state[S_COMBO_TIMER] <= 0.0 && self.state[S_COMBO] > 0.0 {
            self.state[S_COMBO] = 0.0;
        }
    }

    fn finish(&mut self, reason: f32) {
        if self.state[S_FINISHED] > 0.0 {
            return;
        }
        self.state[S_FINISHED] = 1.0;
        self.state[S_FINISH_REASON] = reason;
        if reason == REASON_WIN {
            self.state[S_SCORE] += self.state[S_TIME_LEFT] * 25.0;
            if self.state[S_FALLS] == 0.0 {
                self.state[S_SCORE] += 1500.0;
            }
        }
        self.emit(EV_FINISH, reason, self.state[S_SCORE]);
    }
}

fn approach(current: f32, target: f32, step: f32) -> f32 {
    if current < target {
        (current + step).min(target)
    } else {
        (current - step).max(target)
    }
}

// no_std math helpers: the standard trig/sqrt methods are std-only. These are
// pure f32 arithmetic, so they are deterministic across platforms.
fn floor(x: f32) -> f32 {
    // `as` truncates toward zero; adjust when the input is negative.
    let t = x as i64;
    let tf = t as f32;
    if x < tf { tf - 1.0 } else { tf }
}

fn sqrt(x: f32) -> f32 {
    if x <= 0.0 {
        return 0.0;
    }
    // Bit-trick seed plus Newton iterations; accurate to ~1 ulp.
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
    // 9th-order Taylor on the folded range; error < 4e-6.
    x * (1.0 + x2 * (-1.0 / 6.0 + x2 * (1.0 / 120.0 + x2 * (-1.0 / 5040.0 + x2 / 362_880.0))))
}

fn cos(x: f32) -> f32 {
    sin(x + core::f32::consts::FRAC_PI_2)
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

#[unsafe(no_mangle)]
pub extern "C" fn sim_init(seed: u32) {
    let sim = unsafe { sim_mut() };
    sim.seed = seed;
    sim.gen_world();
    sim.reset_run();
}

#[unsafe(no_mangle)]
pub extern "C" fn sim_step(dt_s: f32) {
    let sim = unsafe { sim_mut() };
    let dt = if dt_s.is_finite() && dt_s > 0.0 {
        dt_s.min(0.5)
    } else {
        0.0
    };
    sim.substep_accum += dt;
    let mut steps = 0usize;
    while sim.substep_accum >= SUBSTEP && steps < MAX_SUBSTEPS {
        sim.substep(SUBSTEP);
        sim.substep_accum -= SUBSTEP;
        steps += 1;
    }
    if steps >= MAX_SUBSTEPS {
        sim.substep_accum = 0.0;
    }
}

#[unsafe(no_mangle)]
pub extern "C" fn set_move(x: f32, z: f32) {
    let sim = unsafe { sim_mut() };
    sim.move_x = if x.is_finite() { x } else { 0.0 };
    sim.move_z = if z.is_finite() { z } else { 0.0 };
}

#[unsafe(no_mangle)]
pub extern "C" fn set_look(yaw: f32, pitch: f32) {
    let sim = unsafe { sim_mut() };
    sim.look_yaw = yaw;
    sim.look_pitch = pitch;
    sim.player[P_YAW] = yaw;
    sim.player[P_PITCH] = pitch;
}

#[unsafe(no_mangle)]
pub extern "C" fn set_jump(held: u32) {
    let sim = unsafe { sim_mut() };
    let down = held != 0;
    if down && !sim.jump_held {
        sim.player[P_BUFFER] = BUFFER_S;
    }
    if !down && sim.jump_held && sim.player[P_VY] > 0.0 {
        sim.player[P_VY] *= JUMP_CUT;
    }
    sim.jump_held = down;
}

#[unsafe(no_mangle)]
pub extern "C" fn sim_teleport(x: f32, y: f32, z: f32) {
    let sim = unsafe { sim_mut() };
    sim.player[P_X] = x;
    sim.player[P_Y] = y;
    sim.player[P_Z] = z;
    sim.player[P_VX] = 0.0;
    sim.player[P_VY] = 0.0;
    sim.player[P_VZ] = 0.0;
    sim.player[P_GROUNDED] = 0.0;
    sim.player[P_ISLAND] = -1.0;
}

#[unsafe(no_mangle)]
pub extern "C" fn island_count() -> u32 {
    ISLAND_COUNT as u32
}

#[unsafe(no_mangle)]
pub extern "C" fn shard_count() -> u32 {
    SHARD_COUNT as u32
}

#[unsafe(no_mangle)]
pub extern "C" fn eye_height() -> f32 {
    EYE_HEIGHT
}

#[unsafe(no_mangle)]
pub extern "C" fn time_limit() -> f32 {
    TIME_LIMIT
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
pub extern "C" fn island_ptr() -> u32 {
    unsafe { ptr::addr_of!(SIM.islands) as *const f32 as usize as u32 }
}

#[unsafe(no_mangle)]
pub extern "C" fn shard_ptr() -> u32 {
    unsafe { ptr::addr_of!(SIM.shards) as *const f32 as usize as u32 }
}

#[unsafe(no_mangle)]
pub extern "C" fn player_ptr() -> u32 {
    unsafe { ptr::addr_of!(SIM.player) as *const f32 as usize as u32 }
}

#[unsafe(no_mangle)]
pub extern "C" fn state_ptr() -> u32 {
    unsafe { ptr::addr_of!(SIM.state) as *const f32 as usize as u32 }
}

#[unsafe(no_mangle)]
pub extern "C" fn event_ptr() -> u32 {
    unsafe { ptr::addr_of!(SIM.events) as *const f32 as usize as u32 }
}
