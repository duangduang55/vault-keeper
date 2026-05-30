use crate::error::AppError;

/// 获取应用图标数据
/// - `dark`: 是否使用深色主题图标（默认 true）
#[tauri::command]
pub fn get_app_icon(dark: Option<bool>) -> Result<Vec<u8>, AppError> {
    let bytes: &[u8] = if dark.unwrap_or(true) {
        include_bytes!("../../icons/128x128.png")
    } else {
        include_bytes!("../../icons/128x128-light.png")
    };
    Ok(bytes.to_vec())
}
