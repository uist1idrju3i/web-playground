#![no_std]

#[cfg(target_arch = "wasm32")]
use core::panic::PanicInfo;
use core::ptr;

const GRID_W: usize = 176;
const GRID_H: usize = 112;
const CELL_COUNT: usize = GRID_W * GRID_H;
const CELL_MM: f32 = 1.5;
const RHO: f32 = 1100.0;
const G: f32 = 9.81;
const MU_PA_S: f32 = 4.0;
// K is expressed in mm^-1 s^-1.
const K: f32 = RHO * G / (3.0 * MU_PA_S) / 1000.0;
const CAVITY_COUNT: usize = 6;
const CAVITY_STRIDE: usize = 16;
const MAX_PARTICLES: usize = 4096;
const PARTICLE_STRIDE: usize = 8;
const STATS_STRIDE: usize = 16;
const SWEEPS: usize = 12;
const PI: f32 = core::f32::consts::PI;
const CAVITY_RADIUS: f32 = 36.0;
const CAVITY_DEPTH: f32 = 14.0;
const CAVITY_FLAT_RADIUS: f32 = 30.0;
const STEFAN_BOLTZMANN_EXPONENT: f32 = 12027.0;
const BROWNING_PREFACTOR: f32 = 1_220_000_000.0;

#[derive(Clone, Copy)]
struct Cell {
    h: f32,
    bottom_temp: f32,
    top_temp: f32,
    moisture: f32,
    set: f32,
    b_bot: f32,
    b_top: f32,
    oil: f32,
    bubbles: f32,
    filling: f32,
    plate_temp: f32,
}

impl Cell {
    const ZERO: Self = Self {
        h: 0.0,
        bottom_temp: 0.0,
        top_temp: 0.0,
        moisture: 0.0,
        set: 0.0,
        b_bot: 0.0,
        b_top: 0.0,
        oil: 0.0,
        bubbles: 0.0,
        filling: 0.0,
        plate_temp: 0.0,
    };

    const EMPTY: Self = Self {
        h: 0.0,
        bottom_temp: 20.0,
        top_temp: 20.0,
        moisture: 0.0,
        set: 0.0,
        b_bot: 0.0,
        b_top: 0.0,
        oil: 0.0,
        bubbles: 0.0,
        filling: 0.0,
        plate_temp: 185.0,
    };
}

#[derive(Clone, Copy)]
struct Particle {
    x: f32,
    y: f32,
    z: f32,
    size: f32,
    life: f32,
    kind: f32,
    alpha: f32,
    seed: f32,
    vz: f32,
    volume_mm3: f32,
}

impl Particle {
    const ZERO: Self = Self {
        x: 0.0,
        y: 0.0,
        z: 0.0,
        size: 0.0,
        life: 0.0,
        kind: 0.0,
        alpha: 0.0,
        seed: 0.0,
        vz: 0.0,
        volume_mm3: 0.0,
    };

    const EMPTY: Self = Self {
        x: 0.0,
        y: 0.0,
        z: 0.0,
        size: 0.0,
        life: 0.0,
        kind: 0.0,
        alpha: 0.0,
        seed: 0.0,
        vz: 0.0,
        volume_mm3: 0.0,
    };
}

#[derive(Clone, Copy)]
struct Filling {
    kind: u32,
    x: f32,
    y: f32,
    grams: f32,
    temp: f32,
}

impl Filling {
    const ZERO: Self = Self {
        kind: 0,
        x: 0.0,
        y: 0.0,
        grams: 0.0,
        temp: 0.0,
    };

    const EMPTY: Self = Self {
        kind: 0,
        x: 0.0,
        y: 0.0,
        grams: 0.0,
        temp: 20.0,
    };
}

#[derive(Clone, Copy)]
struct Flip {
    elapsed: f32,
    angle: f32,
    angular_velocity: f32,
    landed: bool,
}

impl Flip {
    const ZERO: Self = Self {
        elapsed: 0.0,
        angle: 0.0,
        angular_velocity: 0.0,
        landed: false,
    };

    const EMPTY: Self = Self {
        elapsed: 0.0,
        angle: 0.0,
        angular_velocity: 0.0,
        landed: false,
    };
}

struct Simulation {
    cells: [Cell; CELL_COUNT],
    delta: [f32; CELL_COUNT],
    cx: [f32; CELL_COUNT],
    cy: [f32; CELL_COUNT],
    mold_heights: [f32; CELL_COUNT],
    field_a: [u16; CELL_COUNT * 4],
    field_b: [u16; CELL_COUNT * 4],
    particles: [Particle; MAX_PARTICLES],
    particle_output: [f32; MAX_PARTICLES * PARTICLE_STRIDE],
    particle_count: usize,
    cavities: [f32; CAVITY_COUNT * CAVITY_STRIDE],
    audio: [f32; 8],
    stats: [f32; CAVITY_COUNT * STATS_STRIDE],
    fillings: [Filling; CAVITY_COUNT],
    flips: [Flip; 3],
    time: f32,
    heat: f32,
    nozzle_x: f32,
    nozzle_y: f32,
    nozzle_rate: f32,
    rng: u32,
    bubble_pops: f32,
    flip_events: f32,
    contact_burst: f32,
}

impl Simulation {
    const fn new() -> Self {
        Self {
            cells: [Cell::ZERO; CELL_COUNT],
            delta: [0.0; CELL_COUNT],
            cx: [0.0; CELL_COUNT],
            cy: [0.0; CELL_COUNT],
            mold_heights: [0.0; CELL_COUNT],
            field_a: [0; CELL_COUNT * 4],
            field_b: [0; CELL_COUNT * 4],
            particles: [Particle::ZERO; MAX_PARTICLES],
            particle_output: [0.0; MAX_PARTICLES * PARTICLE_STRIDE],
            particle_count: 0,
            cavities: [0.0; CAVITY_COUNT * CAVITY_STRIDE],
            audio: [0.0; 8],
            stats: [0.0; CAVITY_COUNT * STATS_STRIDE],
            fillings: [Filling::ZERO; CAVITY_COUNT],
            flips: [Flip::ZERO; 3],
            time: 0.0,
            heat: 0.0,
            nozzle_x: 0.0,
            nozzle_y: 0.0,
            nozzle_rate: 0.0,
            rng: 0,
            bubble_pops: 0.0,
            flip_events: 0.0,
            contact_burst: 0.0,
        }
    }
}

static mut SIM: Simulation = Simulation::new();

#[cfg(target_arch = "wasm32")]
#[panic_handler]
fn panic(_: &PanicInfo<'_>) -> ! {
    loop {}
}

unsafe fn sim_mut() -> &'static mut Simulation {
    unsafe { &mut *ptr::addr_of_mut!(SIM) }
}

fn reset_simulation(sim: &mut Simulation) {
    let mut index = 0;
    while index < CELL_COUNT {
        sim.cells[index] = Cell::EMPTY;
        let (x, y) = cell_xy(index);
        sim.mold_heights[index] =
            mold_height((x as f32 + 0.5) * CELL_MM, (y as f32 + 0.5) * CELL_MM);
        index += 1;
    }
    sim.delta.fill(0.0);
    sim.cx.fill(0.0);
    sim.cy.fill(0.0);
    sim.field_a.fill(0);
    sim.field_b.fill(0);
    sim.particles.fill(Particle::EMPTY);
    sim.particle_output.fill(0.0);
    sim.particle_count = 0;
    sim.cavities.fill(0.0);
    sim.audio.fill(0.0);
    sim.stats.fill(0.0);
    sim.fillings.fill(Filling::EMPTY);
    sim.flips.fill(Flip::EMPTY);
    sim.time = 0.0;
    sim.heat = 0.6;
    sim.nozzle_x = 42.0;
    sim.nozzle_y = 42.0;
    sim.nozzle_rate = 0.0;
    sim.rng = 1;
    sim.bubble_pops = 0.0;
    sim.flip_events = 0.0;
    sim.contact_burst = 0.0;
}

fn exp_approx(value: f32) -> f32 {
    if value < -40.0 {
        return 0.0;
    }
    if value > 16.0 {
        return 8_886_112.0;
    }
    let reduced = value * 0.0625;
    let mut term = 1.0;
    let mut sum = 1.0;
    let mut n = 1.0;
    while n <= 12.0 {
        term *= reduced / n;
        sum += term;
        n += 1.0;
    }
    let mut count = 0;
    while count < 4 {
        sum *= sum;
        count += 1;
    }
    sum
}

fn random01(sim: &mut Simulation) -> f32 {
    let mut value = sim.rng;
    value ^= value << 13;
    value ^= value >> 17;
    value ^= value << 5;
    if value == 0 {
        value = 0x9e37_79b9;
    }
    sim.rng = value;
    (value >> 8) as f32 * (1.0 / 16_777_215.0)
}

fn clamp01(value: f32) -> f32 {
    value.clamp(0.0, 1.0)
}

fn sqrt(value: f32) -> f32 {
    if value <= 0.0 {
        return 0.0;
    }
    let mut estimate = f32::from_bits((value.to_bits() >> 1) + 0x1fc0_0000);
    let mut iteration = 0;
    while iteration < 6 {
        estimate = 0.5 * (estimate + value / estimate);
        iteration += 1;
    }
    estimate
}

fn cavity_center(cavity: usize) -> (f32, f32) {
    let column = cavity % 3;
    let row = cavity / 3;
    (42.0 + 90.0 * column as f32, 42.0 + 84.0 * row as f32)
}

fn distance(x0: f32, y0: f32, x1: f32, y1: f32) -> f32 {
    let dx = x0 - x1;
    let dy = y0 - y1;
    sqrt(dx * dx + dy * dy)
}

fn mold_height(x: f32, y: f32) -> f32 {
    let mut result = 0.0;
    let mut cavity = 0;
    while cavity < CAVITY_COUNT {
        let (cx, cy) = cavity_center(cavity);
        let r = distance(x, y, cx, cy);
        if r < CAVITY_RADIUS {
            let t = clamp01((r - CAVITY_FLAT_RADIUS) / (CAVITY_RADIUS - CAVITY_FLAT_RADIUS));
            let smooth = t * t * (3.0 - 2.0 * t);
            let z = -CAVITY_DEPTH * (1.0 - smooth);
            if z < result {
                result = z;
            }
        }
        cavity += 1;
    }
    result
}

fn plate_setpoint(heat: f32) -> f32 {
    let root = sqrt(sqrt(sqrt(heat)));
    if root > 0.0 {
        110.0 + 220.0 * heat * heat / root
    } else {
        110.0
    }
}

fn cell_index(x: usize, y: usize) -> usize {
    y * GRID_W + x
}

fn cell_xy(index: usize) -> (usize, usize) {
    (index % GRID_W, index / GRID_W)
}

fn surface_height(sim: &Simulation, x: usize, y: usize) -> f32 {
    let cell = sim.cells[cell_index(x, y)];
    mold_height((x as f32 + 0.5) * CELL_MM, (y as f32 + 0.5) * CELL_MM) + cell.h
}

fn add_particle(sim: &mut Simulation, particle: Particle) -> bool {
    let mut index = 0;
    while index < sim.particle_count {
        if sim.particles[index].life <= 0.0 {
            sim.particles[index] = particle;
            return true;
        }
        index += 1;
    }
    if sim.particle_count == MAX_PARTICLES {
        return false;
    }
    sim.particles[sim.particle_count] = particle;
    sim.particle_count += 1;
    true
}

fn deposit_gaussian(sim: &mut Simulation, x: f32, y: f32, volume_mm3: f32) {
    if volume_mm3 <= 0.0 {
        return;
    }
    let sigma = 4.0;
    let radius = 12.0;
    let min_x = (((x - radius) / CELL_MM) as isize).max(0) as usize;
    let max_x = (((x + radius) / CELL_MM) as usize + 1).min(GRID_W - 1);
    let min_y = (((y - radius) / CELL_MM) as isize).max(0) as usize;
    let max_y = (((y + radius) / CELL_MM) as usize + 1).min(GRID_H - 1);
    let mut weight_sum = 0.0;
    let mut weights = [0.0; 289];
    let mut indices = [0usize; 289];
    let mut count = 0usize;
    let mut iy = min_y;
    while iy <= max_y {
        let mut ix = min_x;
        while ix <= max_x {
            let px = (ix as f32 + 0.5) * CELL_MM;
            let py = (iy as f32 + 0.5) * CELL_MM;
            let dx = px - x;
            let dy = py - y;
            let r2 = dx * dx + dy * dy;
            if r2 <= radius * radius && count < weights.len() {
                let weight = exp_approx(-r2 / (2.0 * sigma * sigma));
                weights[count] = weight;
                indices[count] = cell_index(ix, iy);
                weight_sum += weight;
                count += 1;
            }
            ix += 1;
        }
        iy += 1;
    }
    if weight_sum <= 0.0 || count == 0 {
        return;
    }
    let area = CELL_MM * CELL_MM;
    let mut index = 0;
    while index < count {
        let cell_index = indices[index];
        let share = volume_mm3 * weights[index] / weight_sum / area;
        let was_empty = sim.cells[cell_index].h <= 0.0;
        sim.cells[cell_index].h += share;
        if was_empty {
            sim.cells[cell_index].moisture = 1.0;
            sim.cells[cell_index].bottom_temp = 20.0;
            sim.cells[cell_index].top_temp = 20.0;
        }
        index += 1;
    }
}

fn update_particles(sim: &mut Simulation, dt: f32) {
    let mut index = 0;
    while index < sim.particle_count {
        let mut particle = sim.particles[index];
        if particle.life > 0.0 {
            if particle.kind == 1.0 {
                particle.vz -= 9_810.0 * dt;
                particle.z += particle.vz * dt;
                particle.life = (particle.life - dt * 0.35).max(0.0);
                if particle.z <= surface_height(
                    sim,
                    ((particle.x / CELL_MM) as usize).min(GRID_W - 1),
                    ((particle.y / CELL_MM) as usize).min(GRID_H - 1),
                ) {
                    let was_hot = sim.cells[cell_index(
                        ((particle.x / CELL_MM) as usize).min(GRID_W - 1),
                        ((particle.y / CELL_MM) as usize).min(GRID_H - 1),
                    )]
                    .plate_temp
                        > 120.0;
                    deposit_gaussian(sim, particle.x, particle.y, particle.volume_mm3);
                    if was_hot {
                        sim.contact_burst = sim.contact_burst.max(1.0);
                    }
                    particle.life = 0.0;
                    particle.volume_mm3 = 0.0;
                }
            } else {
                particle.vz += dt * 45.0;
                particle.x += (random01(sim) - 0.5) * dt * 8.0;
                particle.y += (random01(sim) - 0.5) * dt * 8.0;
                particle.z += particle.vz * dt;
                particle.life = (particle.life - dt / particle.size.max(0.01)).max(0.0);
                particle.alpha = particle.life.min(1.0);
            }
        }
        sim.particles[index] = particle;
        index += 1;
    }
    let mut packed = 0usize;
    index = 0;
    while index < sim.particle_count {
        let particle = sim.particles[index];
        if particle.life > 0.0 {
            let offset = packed * PARTICLE_STRIDE;
            sim.particle_output[offset] = particle.x;
            sim.particle_output[offset + 1] = particle.y;
            sim.particle_output[offset + 2] = particle.z;
            sim.particle_output[offset + 3] = particle.size;
            sim.particle_output[offset + 4] = particle.life;
            sim.particle_output[offset + 5] = particle.kind;
            sim.particle_output[offset + 6] = particle.alpha;
            sim.particle_output[offset + 7] = particle.seed;
            sim.particles[packed] = particle;
            packed += 1;
        }
        index += 1;
    }
    sim.particle_count = packed;
    if packed < MAX_PARTICLES {
        sim.particles[packed..].fill(Particle::EMPTY);
    }
    sim.particle_count = packed;
}

fn flow_batter(sim: &mut Simulation, dt: f32) {
    let area = CELL_MM * CELL_MM;
    let mut wet_rows = [false; GRID_H];
    let mut y = 0;
    while y < GRID_H {
        let mut x = 0;
        while x < GRID_W {
            let index = cell_index(x, y);
            let cell = sim.cells[index];
            if cell.h > 0.000001 {
                wet_rows[y] = true;
            }
            sim.cx[index] = if x + 1 < GRID_W {
                flow_conductance(cell, sim.cells[index + 1], dt, area)
            } else {
                0.0
            };
            sim.cy[index] = if y + 1 < GRID_H {
                flow_conductance(cell, sim.cells[index + GRID_W], dt, area)
            } else {
                0.0
            };
            x += 1;
        }
        y += 1;
    }

    let mut sweep = 0;
    while sweep < SWEEPS {
        let mut parity = 0;
        while parity < 2 {
            y = 0;
            while y < GRID_H {
                if flow_row_active(&wet_rows, y) {
                    let mut x = parity;
                    while x + 1 < GRID_W {
                        let index = cell_index(x, y);
                        let conductance = sim.cx[index];
                        relax_flow_face(sim, index, index + 1, conductance);
                        x += 2;
                    }
                }
                y += 1;
            }
            parity += 1;
        }

        parity = 0;
        while parity < 2 {
            y = parity;
            while y + 1 < GRID_H {
                if flow_row_active(&wet_rows, y) || flow_row_active(&wet_rows, y + 1) {
                    let mut x = 0;
                    while x < GRID_W {
                        let index = cell_index(x, y);
                        let conductance = sim.cy[index];
                        relax_flow_face(sim, index, index + GRID_W, conductance);
                        x += 1;
                    }
                }
                y += 2;
            }
            parity += 1;
        }

        sweep += 1;
    }
}

fn flow_row_active(wet_rows: &[bool; GRID_H], y: usize) -> bool {
    wet_rows[y]
        || (y > 0 && wet_rows[y - 1])
        || (y + 1 < GRID_H && wet_rows[y + 1])
}

#[inline]
fn relax_flow_face(sim: &mut Simulation, a: usize, b: usize, conductance: f32) {
    if conductance <= 0.0 {
        return;
    }

    let height_a = sim.cells[a].h;
    let height_b = sim.cells[b].h;
    let potential_difference =
        (sim.mold_heights[a] + height_a) - (sim.mold_heights[b] + height_b);
    let mut movement = potential_difference * conductance / (1.0 + 2.0 * conductance);
    if movement > 0.0 {
        movement = movement.min(height_a);
    } else {
        movement = movement.max(-height_b);
    }
    sim.cells[a].h = height_a - movement;
    sim.cells[b].h = height_b + movement;
}

fn flow_conductance(cell_a: Cell, cell_b: Cell, dt: f32, area: f32) -> f32 {
    if cell_a.h <= 0.000001 && cell_b.h <= 0.000001 {
        return 0.0;
    }
    let h_face = (cell_a.h + cell_b.h) * 0.5;
    let flow_set = (1.0 - (cell_a.set + cell_b.set) * 0.5).max(0.0);
    let flow_temperature =
        ((cell_a.bottom_temp + cell_b.bottom_temp) * 0.5 - 20.0).clamp(0.0, 100.0);
    let mobility = flow_set * flow_set * flow_set * (0.2 + 0.8 * flow_temperature / 100.0);
    K * h_face * h_face * h_face * mobility * dt / area
}

fn update_fields(sim: &mut Simulation) {
    let mut index = 0;
    while index < CELL_COUNT {
        let cell = sim.cells[index];
        let offset = index * 4;
        sim.field_a[offset] = f32_to_f16(cell.h);
        sim.field_a[offset + 1] = f32_to_f16(cell.b_top);
        sim.field_a[offset + 2] = f32_to_f16(cell.b_bot);
        sim.field_a[offset + 3] = f32_to_f16(cell.moisture * (1.0 - cell.set));
        sim.field_b[offset] = f32_to_f16(cell.plate_temp);
        sim.field_b[offset + 1] = f32_to_f16(cell.bubbles);
        sim.field_b[offset + 2] = f32_to_f16(cell.oil);
        sim.field_b[offset + 3] = f32_to_f16(cell.filling);
        index += 1;
    }
    update_cavity_output(sim);
}

fn update_cavity_output(sim: &mut Simulation) {
    sim.cavities.fill(0.0);
    let mut cavity = 0usize;
    while cavity < CAVITY_COUNT {
        let (cx, cy) = cavity_center(cavity);
        let mut volume = 0.0;
        let mut top_set = 0.0;
        let mut b_bot = 0.0;
        let mut b_top = 0.0;
        let mut core_temp = 0.0;
        let mut burnt = 0.0;
        let mut raw = 0.0;
        let mut plate = 0.0;
        let mut cells: f32 = 0.0;
        let mut y = 0;
        while y < GRID_H {
            let mut x = 0;
            while x < GRID_W {
                let cell = sim.cells[cell_index(x, y)];
                let dx = (x as f32 + 0.5) * CELL_MM - cx;
                let dy = (y as f32 + 0.5) * CELL_MM - cy;
                if dx * dx + dy * dy <= CAVITY_RADIUS * CAVITY_RADIUS && cell.h > 0.0 {
                    volume += cell.h * CELL_MM * CELL_MM;
                    top_set += cell.set;
                    b_bot += cell.b_bot;
                    b_top += cell.b_top;
                    core_temp += (cell.bottom_temp + cell.top_temp) * 0.5;
                    burnt += if cell.b_bot > 1.2 || cell.b_top > 1.2 {
                        1.0
                    } else {
                        0.0
                    };
                    raw += if cell.set < 0.95 { 1.0 } else { 0.0 };
                    plate += cell.plate_temp;
                    cells += 1.0;
                }
                x += 1;
            }
            y += 1;
        }
        let offset = cavity * CAVITY_STRIDE;
        let filling = sim.fillings[cavity];
        sim.cavities[offset] = if volume > 0.0 {
            if filling.kind > 0 {
                2.0
            } else {
                1.0
            }
        } else {
            0.0
        };
        if sim.flips[cavity % 3].landed && cavity >= 3 {
            sim.cavities[offset] = 4.0;
        } else if sim.flips[cavity % 3].elapsed > 0.0 && cavity < 3 {
            sim.cavities[offset] = 3.0;
        }
        sim.cavities[offset + 1] = volume / 1000.0;
        sim.cavities[offset + 2] = filling.kind as f32;
        sim.cavities[offset + 3] = filling.x;
        sim.cavities[offset + 4] = filling.y;
        sim.cavities[offset + 5] = filling.grams;
        let divisor = cells.max(1.0);
        sim.cavities[offset + 6] = top_set / divisor;
        sim.cavities[offset + 7] = b_bot / divisor;
        sim.cavities[offset + 8] = b_top / divisor;
        sim.cavities[offset + 9] = core_temp / divisor;
        if cavity < 3 {
            sim.cavities[offset + 10] = sim.flips[cavity].angle;
            sim.cavities[offset + 11] = if sim.flips[cavity].landed { 1.0 } else { 0.0 };
        }
        sim.cavities[offset + 12] = if cells > 0.0 {
            plate / divisor
        } else {
            sim.cells[cell_index(
                ((cx / CELL_MM) as usize).min(GRID_W - 1),
                ((cy / CELL_MM) as usize).min(GRID_H - 1),
            )]
            .plate_temp
        };
        sim.cavities[offset + 13] = burnt / divisor;
        sim.cavities[offset + 14] = raw / divisor;
        sim.cavities[offset + 15] = if volume > 0.0 { sim.time } else { 0.0 };
        cavity += 1;
    }
}

fn f32_to_f16(value: f32) -> u16 {
    let bits = value.to_bits();
    let sign = ((bits >> 16) & 0x8000) as u16;
    let exponent = ((bits >> 23) & 0xff) as i32;
    let mantissa = bits & 0x7f_ffff;
    if exponent == 0xff {
        return sign
            | if mantissa == 0 {
                0x7c00
            } else {
                0x7e00 | ((mantissa >> 13) as u16 & 0x01ff)
            };
    }
    let half_exponent = exponent - 127 + 15;
    if half_exponent >= 31 {
        return sign | 0x7c00;
    }
    if half_exponent <= 0 {
        if half_exponent < -10 {
            return sign;
        }
        let significand = mantissa | 0x80_0000;
        let shift = (14 - half_exponent) as u32;
        let base = significand >> shift;
        let remainder = significand & ((1 << shift) - 1);
        let midpoint = 1 << (shift - 1);
        let rounded = base + u32::from(remainder > midpoint || (remainder == midpoint && base & 1 == 1));
        return sign | rounded as u16;
    }
    let mut base = sign | ((half_exponent as u16) << 10) | (mantissa >> 13) as u16;
    let remainder = mantissa & 0x1fff;
    if remainder > 0x1000 || (remainder == 0x1000 && base & 1 == 1) {
        base = base.wrapping_add(1);
    }
    base
}

fn clear_cavity(sim: &mut Simulation, cavity: usize) {
    let (cx, cy) = cavity_center(cavity);
    let mut index = 0usize;
    while index < CELL_COUNT {
        let (x, y) = cell_xy(index);
        let px = (x as f32 + 0.5) * CELL_MM;
        let py = (y as f32 + 0.5) * CELL_MM;
        if distance(px, py, cx, cy) <= CAVITY_RADIUS + 12.0 {
            let plate_temp = sim.cells[index].plate_temp;
            let oil = sim.cells[index].oil;
            sim.cells[index] = Cell::EMPTY;
            sim.cells[index].plate_temp = plate_temp;
            sim.cells[index].oil = oil;
        }
        index += 1;
    }
    sim.fillings[cavity] = Filling::EMPTY;
}

fn cavity_volume(sim: &Simulation, cavity: usize) -> f32 {
    let (cx, cy) = cavity_center(cavity);
    let mut volume = 0.0;
    let mut y = 0;
    while y < GRID_H {
        let mut x = 0;
        while x < GRID_W {
            if distance(
                (x as f32 + 0.5) * CELL_MM,
                (y as f32 + 0.5) * CELL_MM,
                cx,
                cy,
            ) <= CAVITY_RADIUS
            {
                volume += sim.cells[cell_index(x, y)].h * CELL_MM * CELL_MM;
            }
            x += 1;
        }
        y += 1;
    }
    volume
}

fn write_stats(sim: &mut Simulation, pair: usize) {
    let top = pair;
    let bottom = pair + 3;
    let stats_offset = pair * STATS_STRIDE;
    let (top_x, top_y) = cavity_center(top);
    let (cx, cy) = cavity_center(bottom);
    let mut volume = 0.0;
    let mut top_brown_sum = 0.0;
    let mut top_brown_sq = 0.0;
    let mut bottom_brown_sum = 0.0;
    let mut bottom_brown_sq = 0.0;
    let mut burnt = 0.0;
    let mut raw = 0.0;
    let mut core_temp = 0.0;
    let mut oil_sum = 0.0;
    let mut bubbles_sum = 0.0;
    let mut count: f32 = 0.0;
    let mut ring_brown = 0.0;
    let mut ring_count: f32 = 0.0;
    let mut y = 0;
    while y < GRID_H {
        let mut x = 0;
        while x < GRID_W {
            let px = (x as f32 + 0.5) * CELL_MM;
            let py = (y as f32 + 0.5) * CELL_MM;
            let rb = distance(px, py, cx, cy);
            let rt = distance(px, py, cavity_center(top).0, cavity_center(top).1);
            let mut cell = Cell::EMPTY;
            if rb <= CAVITY_RADIUS || rt <= CAVITY_RADIUS {
                cell = sim.cells[cell_index(x, y)];
            }
            if cell.h > 0.0 {
                let brown_top = if rb <= CAVITY_RADIUS {
                    cell.b_top
                } else {
                    cell.b_bot
                };
                let brown_bottom = cell.b_bot;
                volume += cell.h * CELL_MM * CELL_MM;
                top_brown_sum += brown_top;
                top_brown_sq += brown_top * brown_top;
                bottom_brown_sum += brown_bottom;
                bottom_brown_sq += brown_bottom * brown_bottom;
                burnt += if cell.b_bot > 1.2 || brown_top > 1.2 { 1.0 } else { 0.0 };
                raw += if cell.set < 0.95 { 1.0 } else { 0.0 };
                core_temp += (cell.bottom_temp + cell.top_temp) * 0.5;
                oil_sum += cell.oil;
                bubbles_sum += cell.bubbles;
                if rb > CAVITY_RADIUS - 6.0 && rb <= CAVITY_RADIUS {
                    ring_brown += cell.b_bot;
                    ring_count += 1.0;
                }
                count += 1.0;
            }
            x += 1;
        }
        y += 1;
    }
    let count = count.max(1.0);
    let filling = sim.fillings[bottom];
    let (bottom_x, bottom_y) = cavity_center(bottom);
    let offset = distance(filling.x, filling.y, bottom_x, bottom_y);
    let mean_top = top_brown_sum / count;
    let mean_bottom = bottom_brown_sum / count;
    let mut spill = 0.0;
    y = 0;
    while y < GRID_H {
        let mut x = 0;
        while x < GRID_W {
            let px = (x as f32 + 0.5) * CELL_MM;
            let py = (y as f32 + 0.5) * CELL_MM;
            let near_pair = distance(px, py, top_x, top_y) <= CAVITY_RADIUS + 12.0
                || distance(px, py, cx, cy) <= CAVITY_RADIUS + 12.0;
            let in_cavity = distance(px, py, top_x, top_y) <= CAVITY_RADIUS
                || distance(px, py, cx, cy) <= CAVITY_RADIUS;
            if near_pair && !in_cavity {
                spill += sim.cells[cell_index(x, y)].h * CELL_MM * CELL_MM;
            }
            x += 1;
        }
        y += 1;
    }
    sim.stats[stats_offset] = mean_top;
    sim.stats[stats_offset + 1] = sqrt((top_brown_sq / count - mean_top * mean_top).max(0.0));
    sim.stats[stats_offset + 2] = mean_bottom;
    sim.stats[stats_offset + 3] =
        sqrt((bottom_brown_sq / count - mean_bottom * mean_bottom).max(0.0));
    sim.stats[stats_offset + 4] = burnt / count;
    sim.stats[stats_offset + 5] = raw / count;
    sim.stats[stats_offset + 6] = (volume + spill) / 1000.0;
    sim.stats[stats_offset + 7] = spill / 1000.0;
    sim.stats[stats_offset + 8] = filling.kind as f32;
    sim.stats[stats_offset + 9] = filling.grams;
    sim.stats[stats_offset + 10] = offset;
    sim.stats[stats_offset + 11] = core_temp / count;
    sim.stats[stats_offset + 12] = 1.0 - ring_brown / ring_count.max(1.0);
    sim.stats[stats_offset + 13] = (oil_sum / count).min(1.0);
    sim.stats[stats_offset + 14] = bubbles_sum / count;
    sim.stats[stats_offset + 15] = sim.time;
}

fn advance_flip(sim: &mut Simulation, dt: f32) {
    let mut pair = 0usize;
    while pair < 3 {
        let mut flip = sim.flips[pair];
        let mut did_land = false;
        if flip.elapsed > 0.0 && !flip.landed {
            flip.elapsed += dt;
            let steps = 4;
            let sub_dt = dt / steps as f32;
            let mut substep = 0;
            while substep < steps && !flip.landed {
                let gravity_torque = 8.0 * flip.angle * (PI - flip.angle).max(0.0) / (PI * PI);
                let damping = 0.35 * flip.angular_velocity;
                flip.angular_velocity += (gravity_torque - damping) * sub_dt;
                flip.angle += flip.angular_velocity * sub_dt;
                if flip.angle >= PI || flip.elapsed >= 0.5 {
                    flip.angle = PI;
                    flip.landed = true;
                    sim.flip_events += 1.0;
                }
                substep += 1;
            }
            if flip.landed {
                did_land = true;
            }
            sim.flips[pair] = flip;
        }
        if did_land {
            merge_flip(sim, pair);
        }
        pair += 1;
    }
}

fn merge_flip(sim: &mut Simulation, pair: usize) {
    let top = pair;
    let bottom = pair + 3;
    let (top_x, top_y) = cavity_center(top);
    let mut y = 0;
    while y < GRID_H {
        let mut x = 0;
        while x < GRID_W {
            let source = cell_index(x, y);
            let target = cell_index(x, GRID_H - 1 - y);
            let source_cell = sim.cells[source];
            let px = (x as f32 + 0.5) * CELL_MM;
            let py = (y as f32 + 0.5) * CELL_MM;
            let dx = px - top_x;
            let dy = py - top_y;
            if source_cell.h > 0.0 && dx * dx + dy * dy <= CAVITY_RADIUS * CAVITY_RADIUS {
                let destination = &mut sim.cells[target];
                let old_h = destination.h;
                let new_h = old_h + source_cell.h;
                destination.b_top = source_cell.b_bot.max(destination.b_top);
                destination.h = new_h;
                destination.moisture = if new_h > 0.0 {
                    (destination.moisture * old_h + source_cell.moisture * source_cell.h) / new_h
                } else {
                    0.0
                };
                destination.set = destination.set.max(source_cell.set);
                destination.top_temp =
                    (destination.top_temp * old_h + source_cell.bottom_temp * source_cell.h)
                        / new_h.max(0.0001);
                destination.bottom_temp = destination.bottom_temp.max(source_cell.top_temp);
                destination.bubbles = destination.bubbles.max(source_cell.bubbles);
                destination.filling = destination.filling.max(source_cell.filling);
            }
            x += 1;
        }
        y += 1;
    }
    let filling = sim.fillings[top];
    if filling.kind > 0 {
        sim.fillings[bottom] = Filling {
            y: 168.0 - filling.y,
            ..filling
        };
        sim.fillings[top] = Filling::EMPTY;
    }
    clear_cavity(sim, top);
    if filling.kind == 0 {
        sim.fillings[bottom] = Filling::EMPTY;
    }
    let mut index = 0;
    while index < CELL_COUNT {
        let (x, y) = cell_xy(index);
        let px = (x as f32 + 0.5) * CELL_MM;
        let py = (y as f32 + 0.5) * CELL_MM;
        if distance(px, py, cavity_center(top).0, cavity_center(top).1) <= CAVITY_RADIUS {
            sim.cells[index] = Cell::EMPTY;
        }
        index += 1;
    }
}

fn sim_step_internal(sim: &mut Simulation, dt: f32) {
    sim.audio.fill(0.0);
    sim.bubble_pops = 0.0;
    sim.flip_events = 0.0;
    sim.contact_burst = 0.0;
    sim.audio[2] = sim.nozzle_rate;
    let target = plate_setpoint(sim.heat);
    let plate_alpha = 1.0 - exp_approx(-dt / 45.0);
    let mut evaporation = 0.0;
    let mut sizzle = 0.0f32;
    let mut burn_audio = 0.0f32;
    let mut index = 0;
    while index < CELL_COUNT {
        let mut cell = sim.cells[index];
        cell.plate_temp += (target - cell.plate_temp) * plate_alpha;
        sim.cells[index] = cell;
        index += 1;
    }
    sim.delta.fill(0.0);
    let mut y = 0;
    while y < GRID_H {
        let mut x = 0;
        while x < GRID_W {
            let index = cell_index(x, y);
            if x + 1 < GRID_W {
                let neighbor = index + 1;
                let flux = (sim.cells[neighbor].plate_temp - sim.cells[index].plate_temp) * 0.00015 * dt;
                sim.delta[index] += flux;
                sim.delta[neighbor] -= flux;
            }
            if y + 1 < GRID_H {
                let neighbor = index + GRID_W;
                let flux = (sim.cells[neighbor].plate_temp - sim.cells[index].plate_temp) * 0.00015 * dt;
                sim.delta[index] += flux;
                sim.delta[neighbor] -= flux;
            }
            x += 1;
        }
        y += 1;
    }
    index = 0;
    while index < CELL_COUNT {
        sim.cells[index].plate_temp += sim.delta[index];
        index += 1;
    }
    if sim.nozzle_rate > 0.0 {
        let volume = sim.nozzle_rate * dt * 1000.0;
        let particle = Particle {
            x: sim.nozzle_x,
            y: sim.nozzle_y,
            z: 60.0,
            size: 2.5,
            life: 1.0,
            kind: 1.0,
            alpha: 1.0,
            seed: random01(sim),
            vz: 0.0,
            volume_mm3: volume,
        };
        if !add_particle(sim, particle) {
            deposit_gaussian(sim, sim.nozzle_x, sim.nozzle_y, volume);
        }
    }
    index = 0;
    while index < CELL_COUNT {
        let mut cell = sim.cells[index];
        if cell.h > 0.000001 {
            let thickness = cell.h.max(0.5);
            cell.plate_temp -= (cell.plate_temp - cell.bottom_temp).max(0.0) * dt * 0.004;
            cell.plate_temp = cell.plate_temp.clamp(15.0, 400.0);
            let plate = cell.plate_temp;
            let bottom_alpha = 1.0 - exp_approx(-dt * 0.09 / (1.0 + thickness * 0.025));
            let mut bottom = cell.bottom_temp + (plate - cell.bottom_temp) * bottom_alpha;
            let evap_rate = (plate - 80.0).max(0.0) * 0.00024;
            let lost = (evap_rate * dt).min(cell.moisture);
            cell.moisture = (cell.moisture - lost).max(0.0);
            evaporation += lost * thickness * CELL_MM * CELL_MM;
            if cell.moisture > 0.0 {
                bottom = bottom.min(100.0);
            }
            cell.bottom_temp = bottom.clamp(15.0, 400.0);
            let top_alpha = 1.0 - exp_approx(-dt * 0.013 / (1.0 + thickness * 0.025));
            cell.top_temp += (cell.bottom_temp - cell.top_temp) * top_alpha;
            cell.top_temp -= (cell.top_temp - 20.0).max(0.0) * dt * 0.002;
            cell.top_temp = cell.top_temp.clamp(15.0, 400.0);
            if cell.filling > 0.0 {
                let (x, y) = cell_xy(index);
                let px = (x as f32 + 0.5) * CELL_MM;
                let py = (y as f32 + 0.5) * CELL_MM;
                let mut cavity = 0;
                while cavity < CAVITY_COUNT {
                    let (cx, cy) = cavity_center(cavity);
                    let dx = px - cx;
                    let dy = py - cy;
                    if sim.fillings[cavity].kind > 0
                        && dx * dx + dy * dy <= CAVITY_RADIUS * CAVITY_RADIUS
                    {
                        let filling_temp = sim.fillings[cavity].temp;
                        let exchange = (cell.top_temp - filling_temp)
                            * dt
                            * 0.004
                            * (cell.filling / 6.0).min(1.0);
                        cell.top_temp -= exchange * 0.7;
                        cell.bottom_temp -= exchange * 0.3;
                        sim.fillings[cavity].temp += exchange * 4.0;
                        break;
                    }
                    cavity += 1;
                }
            }
            let mean_temp = (cell.bottom_temp + cell.top_temp) * 0.5;
            if mean_temp > 65.0 {
                let rate = (mean_temp - 65.0).max(0.0) * 0.000044 + 0.000572;
                cell.set = (cell.set + rate * dt).min(1.0);
            }
            let brown_temp = cell.bottom_temp.min(215.0) + 273.15;
            let arrhenius = exp_approx(-STEFAN_BOLTZMANN_EXPONENT / brown_temp);
            let dryness = 0.08 + 0.92 * (1.0 - cell.moisture) * (1.0 - cell.moisture);
            let oil_factor = 1.0 + 0.22 * cell.oil;
            let brown_rate = BROWNING_PREFACTOR
                * arrhenius
                * dryness
                * oil_factor
                * if cell.b_bot > 0.6 { 0.52 } else { 1.0 };
            cell.b_bot += brown_rate * dt;
            cell.b_bot = cell.b_bot.min(4.0);
            let evaporated = lost > 0.0;
            if evaporated && cell.bottom_temp > 90.0 {
                sizzle += lost * 4.0;
            }
            if cell.bottom_temp >= 100.0 && cell.set < 0.7 {
                cell.bubbles = (cell.bubbles - dt * 0.08).max(0.0);
                if random01(sim) < dt * 0.04 {
                    cell.bubbles = (cell.bubbles + 0.25 + random01(sim) * 0.3).min(1.0);
                }
                if cell.bubbles >= 0.8 {
                    sim.bubble_pops += 1.0;
                    cell.bubbles *= 0.25;
                }
            }
            cell.oil = (cell.oil - ((plate - 150.0).max(0.0) * 0.00001 * dt)).max(0.0);
            let progress = ((cell.b_bot - 0.9) / 0.3).clamp(0.0, 1.0);
            burn_audio = burn_audio.max(progress);
            // Thin batter spilled on the flat plate desiccates and flakes off:
            // once fully dry and set, it crumbles away with an occasional wisp.
            let (cx, cy) = cell_xy(index);
            let px = (cx as f32 + 0.5) * CELL_MM;
            let py = (cy as f32 + 0.5) * CELL_MM;
            if mold_height(px, py) > -0.5 && cell.h < 2.0 && cell.moisture <= 0.002
                && cell.set > 0.5
            {
                cell.h -= dt * 0.05;
                if cell.h <= 0.02 {
                    cell.h = 0.0;
                    cell.set = 0.0;
                    cell.b_bot = 0.0;
                    cell.b_top = 0.0;
                    cell.bubbles = 0.0;
                    let seed = random01(sim);
                    if seed < 0.3 {
                        add_particle(
                            sim,
                            Particle {
                                x: px,
                                y: py,
                                z: mold_height(px, py) + 1.0,
                                size: 1.5 + seed * 2.0,
                                life: 1.0 + seed,
                                kind: 0.0,
                                alpha: 0.4,
                                seed,
                                vz: 6.0 + seed * 5.0,
                                volume_mm3: 0.0,
                            },
                        );
                    }
                }
            }
        } else {
            cell.set = cell.set.max(0.0);
        }
        sim.cells[index] = cell;
        index += 1;
    }
    update_particles(sim, dt);
    if evaporation > 0.0 {
        let requested_count = evaporation * 0.015;
        let count = ((requested_count as usize)
            + if requested_count > requested_count as usize as f32 {
                1
            } else {
                0
            })
        .min(8);
        let mut particle_index = 0;
        while particle_index < count {
            let cell_index = (random01(sim) * CELL_COUNT as f32) as usize % CELL_COUNT;
            let cell = sim.cells[cell_index];
            if cell.h > 0.0 && cell.bottom_temp > 80.0 {
                let (x, y) = cell_xy(cell_index);
                let seed = random01(sim);
                add_particle(
                    sim,
                    Particle {
                        x: (x as f32 + 0.5) * CELL_MM,
                        y: (y as f32 + 0.5) * CELL_MM,
                        z: mold_height((x as f32 + 0.5) * CELL_MM, (y as f32 + 0.5) * CELL_MM)
                            + cell.h,
                        size: 1.5 + seed * 1.5,
                        life: 1.5 + seed * 1.5,
                        kind: 0.0,
                        alpha: 0.6,
                        seed,
                        vz: 8.0 + seed * 6.0,
                        volume_mm3: 0.0,
                    },
                );
            }
            particle_index += 1;
        }
    }
    flow_batter(sim, dt);
    advance_flip(sim, dt);
    sim.time += dt;
    sim.audio[0] = clamp01(sizzle * 0.08);
    sim.audio[1] = sim.bubble_pops;
    sim.audio[3] = sim.contact_burst;
    sim.audio[4] = sim.flip_events;
    sim.audio[5] = burn_audio;
    sim.audio[6] = clamp01(evaporation * 0.01);
    update_fields(sim);
}

#[unsafe(no_mangle)]
pub extern "C" fn sim_init(seed: u32) {
    let sim = unsafe { sim_mut() };
    reset_simulation(sim);
    sim.rng = if seed == 0 { 1 } else { seed };
    update_fields(sim);
}

#[unsafe(no_mangle)]
pub extern "C" fn sim_step(dt_s: f32) {
    if !dt_s.is_finite() || dt_s <= 0.0 {
        return;
    }
    let dt = dt_s.min(0.5);
    let sim = unsafe { sim_mut() };
    sim_step_internal(sim, dt);
}

#[unsafe(no_mangle)]
pub extern "C" fn sim_time() -> f32 {
    unsafe { (*ptr::addr_of!(SIM)).time }
}

#[unsafe(no_mangle)]
pub extern "C" fn set_heat(level: f32) {
    if level.is_finite() {
        unsafe { sim_mut() }.heat = clamp01(level);
    }
}

#[unsafe(no_mangle)]
pub extern "C" fn set_nozzle(x_mm: f32, y_mm: f32, rate_ml_s: f32) {
    if x_mm.is_finite() && y_mm.is_finite() && rate_ml_s.is_finite() {
        let sim = unsafe { sim_mut() };
        sim.nozzle_x = x_mm.max(0.0).min(GRID_W as f32 * CELL_MM);
        sim.nozzle_y = y_mm.max(0.0).min(GRID_H as f32 * CELL_MM);
        sim.nozzle_rate = rate_ml_s.clamp(0.0, 1000.0);
    }
}

#[unsafe(no_mangle)]
pub extern "C" fn grease(x_mm: f32, y_mm: f32, radius_mm: f32, amount: f32) {
    if !x_mm.is_finite()
        || !y_mm.is_finite()
        || !radius_mm.is_finite()
        || !amount.is_finite()
        || radius_mm <= 0.0
    {
        return;
    }
    let sim = unsafe { sim_mut() };
    let mut index = 0;
    while index < CELL_COUNT {
        let (x, y) = cell_xy(index);
        let px = (x as f32 + 0.5) * CELL_MM;
        let py = (y as f32 + 0.5) * CELL_MM;
        let r = distance(px, py, x_mm, y_mm);
        if r <= radius_mm {
            let falloff = 1.0 - r / radius_mm;
            sim.cells[index].oil =
                (sim.cells[index].oil + amount.max(0.0) * falloff).min(1.0);
        }
        index += 1;
    }
}

// The oil brush also wipes spilled batter off the flat plate. Only cells
// outside the cavities are touched, so batter inside a mold is never removed.
#[unsafe(no_mangle)]
pub extern "C" fn wipe(x_mm: f32, y_mm: f32, radius_mm: f32, amount: f32) {
    if !x_mm.is_finite()
        || !y_mm.is_finite()
        || !radius_mm.is_finite()
        || !amount.is_finite()
        || radius_mm <= 0.0
    {
        return;
    }
    let sim = unsafe { sim_mut() };
    let mut index = 0;
    while index < CELL_COUNT {
        let (x, y) = cell_xy(index);
        let px = (x as f32 + 0.5) * CELL_MM;
        let py = (y as f32 + 0.5) * CELL_MM;
        let r = distance(px, py, x_mm, y_mm);
        if r <= radius_mm && mold_height(px, py) > -0.5 {
            let mut cell = sim.cells[index];
            if cell.h > 0.0 {
                let falloff = 1.0 - r / radius_mm;
                cell.h -= amount.max(0.0) * falloff;
                if cell.h <= 0.02 {
                    cell.h = 0.0;
                    cell.moisture = 0.0;
                    cell.set = 0.0;
                    cell.b_bot = 0.0;
                    cell.b_top = 0.0;
                    cell.bubbles = 0.0;
                }
                sim.cells[index] = cell;
            }
        }
        index += 1;
    }
}

#[unsafe(no_mangle)]
pub extern "C" fn add_filling(cavity: u32, kind: u32, x_mm: f32, y_mm: f32) -> i32 {
    let cavity = cavity as usize;
    if cavity >= CAVITY_COUNT || !(1..=4).contains(&kind) || !x_mm.is_finite() || !y_mm.is_finite()
    {
        return -1;
    }
    if cavity >= 3 {
        return -2;
    }
    let sim = unsafe { sim_mut() };
    if cavity_volume(sim, cavity) < 25_000.0 {
        return -3;
    }
    if sim.fillings[cavity].kind > 0 {
        return -4;
    }
    let grams = match kind {
        1 | 2 => 25.0,
        3 => 20.0,
        _ => 22.0,
    };
    sim.fillings[cavity] = Filling {
        kind,
        x: x_mm,
        y: y_mm,
        grams,
        temp: if kind == 2 || kind == 4 { 8.0 } else { 20.0 },
    };
    let mut index = 0;
    while index < CELL_COUNT {
        let (x, y) = cell_xy(index);
        let px = (x as f32 + 0.5) * CELL_MM;
        let py = (y as f32 + 0.5) * CELL_MM;
        let r = distance(px, py, x_mm, y_mm);
        if r <= 18.0 {
            let dome = (1.0 - (r / 18.0) * (r / 18.0)).max(0.0) * 6.0;
            sim.cells[index].filling = dome;
            sim.cells[index].bottom_temp -= (dome * 0.12).min(3.0);
            sim.cells[index].top_temp -= (dome * 0.08).min(2.0);
        }
        index += 1;
    }
    0
}

#[unsafe(no_mangle)]
pub extern "C" fn start_flip(pair: u32) -> i32 {
    let pair = pair as usize;
    if pair >= 3 {
        return -1;
    }
    let sim = unsafe { sim_mut() };
    if sim.flips[pair].elapsed > 0.0 || sim.flips[pair].landed {
        return -3;
    }
    if cavity_volume(sim, pair) < 25_000.0 || cavity_volume(sim, pair + 3) < 25_000.0 {
        return -2;
    }
    sim.flips[pair] = Flip {
        elapsed: 0.000001,
        angle: 0.0,
        angular_velocity: 10.0,
        landed: false,
    };
    0
}

#[unsafe(no_mangle)]
pub extern "C" fn take_out(pair: u32) -> i32 {
    let pair = pair as usize;
    if pair >= 3 {
        return -1;
    }
    let sim = unsafe { sim_mut() };
    if !sim.flips[pair].landed {
        return -2;
    }
    write_stats(sim, pair);
    clear_cavity(sim, pair);
    clear_cavity(sim, pair + 3);
    sim.flips[pair] = Flip::EMPTY;
    update_fields(sim);
    0
}

#[unsafe(no_mangle)]
pub extern "C" fn reset_pair(pair: u32) {
    let pair = pair as usize;
    if pair >= 3 {
        return;
    }
    let sim = unsafe { sim_mut() };
    clear_cavity(sim, pair);
    clear_cavity(sim, pair + 3);
    sim.flips[pair] = Flip::EMPTY;
    sim.stats[pair * STATS_STRIDE..(pair + 1) * STATS_STRIDE].fill(0.0);
    update_fields(sim);
}

#[unsafe(no_mangle)]
pub extern "C" fn grid_w() -> u32 {
    GRID_W as u32
}

#[unsafe(no_mangle)]
pub extern "C" fn grid_h() -> u32 {
    GRID_H as u32
}

#[unsafe(no_mangle)]
pub extern "C" fn cell_mm() -> f32 {
    CELL_MM
}

#[unsafe(no_mangle)]
pub extern "C" fn cavity_count() -> u32 {
    CAVITY_COUNT as u32
}

#[unsafe(no_mangle)]
pub extern "C" fn cavity_x(cavity: u32) -> f32 {
    if cavity as usize >= CAVITY_COUNT {
        return 0.0;
    }
    cavity_center(cavity as usize).0
}

#[unsafe(no_mangle)]
pub extern "C" fn cavity_y(cavity: u32) -> f32 {
    if cavity as usize >= CAVITY_COUNT {
        return 0.0;
    }
    cavity_center(cavity as usize).1
}

#[unsafe(no_mangle)]
pub extern "C" fn cavity_radius() -> f32 {
    CAVITY_RADIUS
}

#[unsafe(no_mangle)]
pub extern "C" fn cavity_depth() -> f32 {
    CAVITY_DEPTH
}

#[unsafe(no_mangle)]
pub extern "C" fn mold_z(x_mm: f32, y_mm: f32) -> f32 {
    if x_mm.is_finite() && y_mm.is_finite() {
        mold_height(x_mm, y_mm)
    } else {
        0.0
    }
}

#[unsafe(no_mangle)]
pub extern "C" fn field_a_ptr() -> u32 {
    unsafe { ptr::addr_of!(SIM.field_a) as *const u16 as usize as u32 }
}

#[unsafe(no_mangle)]
pub extern "C" fn field_b_ptr() -> u32 {
    unsafe { ptr::addr_of!(SIM.field_b) as *const u16 as usize as u32 }
}

#[unsafe(no_mangle)]
pub extern "C" fn particle_ptr() -> u32 {
    unsafe { ptr::addr_of!(SIM.particle_output) as *const f32 as usize as u32 }
}

#[unsafe(no_mangle)]
pub extern "C" fn particle_count() -> u32 {
    unsafe { (*ptr::addr_of!(SIM)).particle_count as u32 }
}

#[unsafe(no_mangle)]
pub extern "C" fn cavity_ptr() -> u32 {
    unsafe { ptr::addr_of!(SIM.cavities) as *const f32 as usize as u32 }
}

#[unsafe(no_mangle)]
pub extern "C" fn audio_ptr() -> u32 {
    unsafe { ptr::addr_of!(SIM.audio) as *const f32 as usize as u32 }
}

#[unsafe(no_mangle)]
pub extern "C" fn stats_ptr() -> u32 {
    unsafe { ptr::addr_of!(SIM.stats) as *const f32 as usize as u32 }
}
