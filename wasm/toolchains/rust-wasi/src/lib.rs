#![no_std]

use core::panic::PanicInfo;

#[repr(C)]
struct Ciovec {
    buffer: *const u8,
    length: usize,
}

#[link(wasm_import_module = "wasi_snapshot_preview1")]
unsafe extern "C" {
    fn fd_write(fd: u32, vectors: *const Ciovec, count: u32, written: *mut usize) -> u32;
    fn random_get(buffer: *mut u8, length: usize) -> u32;
    fn clock_time_get(clock_id: u32, precision: u64, time: *mut u64) -> u32;
}

#[unsafe(no_mangle)]
pub extern "C" fn run() -> u32 {
    let message = b"42";
    let vector = Ciovec {
        buffer: message.as_ptr(),
        length: message.len(),
    };
    let mut written = 0;
    unsafe {
        let _ = fd_write(1, &vector, 1, &mut written);
    }
    written as u32
}

#[unsafe(no_mangle)]
pub extern "C" fn wasi_random_probe() -> u32 {
    let mut byte = 0;
    unsafe {
        let _ = random_get(&mut byte, 1);
    }
    byte as u32
}

#[unsafe(no_mangle)]
pub extern "C" fn wasi_clock_probe() -> u32 {
    let mut time = 0;
    unsafe {
        let _ = clock_time_get(0, 1, &mut time);
    }
    time as u32
}

#[panic_handler]
fn panic(_info: &PanicInfo) -> ! {
    loop {}
}
