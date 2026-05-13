fn main() {
	// 添加 Homebrew 安装的 sqlcipher 库搜索路径
	println!("cargo:rustc-link-search=/opt/homebrew/Cellar/sqlcipher/4.16.0/lib");
	tauri_build::build()
}
