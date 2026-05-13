use crate::error::AppError;

/// 获取应用图标数据（嵌入编译时的 32x32 PNG）
#[tauri::command]
pub fn get_app_icon() -> Result<Vec<u8>, AppError> {
    Ok(include_bytes!("../../icons/32x32.png").to_vec())
}
