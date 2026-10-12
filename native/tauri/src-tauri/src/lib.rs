// Tauri v2 shell for Web Playground's Browser Features app.
// The site is served unmodified from the embedded frontendDist through
// Tauri's built-in `tauri:` protocol; the site's security headers are
// reproduced via app.security in tauri.conf.json (kept in parity with
// native/headers.json, asserted by tests/unit/native-headers.test.js).

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .setup(|_app| Ok(()))
    .run(tauri::generate_context!())
    .expect("error while running Browser Features");
}
