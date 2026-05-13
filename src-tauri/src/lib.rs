#[cfg(target_os = "macos")]
use window_vibrancy::{apply_vibrancy, NSVisualEffectMaterial, NSVisualEffectState};

use tauri::{Emitter, Manager, RunEvent};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            #[cfg(target_os = "macos")]
            {
                let window = app.get_webview_window("main").expect("main window missing");
                if let Err(err) = apply_vibrancy(
                    &window,
                    NSVisualEffectMaterial::Sidebar,
                    Some(NSVisualEffectState::Active),
                    Some(12.0),
                ) {
                    eprintln!("marka.md: apply_vibrancy failed: {err:?}");
                }
            }
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application");

    app.run(|app_handle, event| {
        // macOS Finder "Open With → marka.md" emits this event with file URLs
        if let RunEvent::Opened { urls } = event {
            for url in urls {
                if let Ok(path) = url.to_file_path() {
                    let path_str = path.to_string_lossy().to_string();
                    if let Err(err) = app_handle.emit("marka:open-file", path_str.clone()) {
                        eprintln!("marka.md: failed to emit open-file event: {err:?}");
                    } else {
                        eprintln!("marka.md: open-file requested: {path_str}");
                    }
                }
            }
        }
    });
}
