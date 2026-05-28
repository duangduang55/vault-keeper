# 清密 (Vault Keeper) 🔐

> 你的私人密码保险箱。纯本地运行，Argon2id + SQLCipher 零信任加密。

**v1.0.0** · macOS 14+

---

## 🚀 快速安装

### 方式一：Homebrew

```bash
brew tap duangduang55/vault-keeper
brew install --cask vault-keeper
```

### 方式二：手动下载

从 [GitHub Releases](https://github.com/duangduang55/vault-keeper/releases) 下载最新 `.dmg` 安装包。

---

## ✨ 功能特性

### 🔐 主密码保护
Argon2id 密钥派生（64MB / 3 轮 / 4 通道）+ SQLCipher AES-256-GCM 透明加密。密码仅存于你的设备，服务端无法访问任何数据。

### 🎨 双主题系统
暗色/亮色/自动模式，跟随系统设置或手动切换。暖色护眼亮色主题，低对比度设计减少视觉疲劳。

### 📋 5 种分类模板
API Key / 密码 / 身份证 / 激活码 / 自定义 — 每种类型预设专属字段模板，开箱即用。

### 🔍 快速搜索
同时搜索名称、字段内容、条目类型，秒级检索。

### 📋 一键复制
点击卡片右下角复制按钮，字段值自动复制到剪贴板，10 秒自动清除，防止信息残留。

### 🔄 自动锁定
闲置超时自动锁定保险箱，支持自定义锁定间隔。

### 🔑 密码生成器
长度 8-64 位，4 种字符类型自由组合，实时强度指示。

### ☁️ iCloud 云备份
手动/自动加密备份到 iCloud Drive，AES-256-GCM 独立备份密码保护，支持多地备份管理。

### 🔒 加密备份导出
独立密码保护的 AES-256-GCM 加密导出/导入，方便迁移和存档。

### ⌨️ 全局快捷键
`Cmd+Shift+V` 快速唤醒窗口，`Cmd+Shift+L` 一键锁定。

---

## 🖥 技术栈

| 层 | 技术 |
|---|------|
| 桌面框架 | [Tauri 2.0](https://v2.tauri.app) |
| 后端语言 | Rust (stable) |
| 前端框架 | React 19 + TypeScript 6 |
| 样式 | Tailwind CSS 3 + Lucide 图标 |
| 状态管理 | Zustand 5 |
| 构建 | Vite 8 |
| 数据库 | SQLite + [SQLCipher](https://www.zetetic.net/sqlcipher/) (AES-256-GCM 透明加密) |
| 密钥派生 | Argon2id (64MB / 3 轮 / 4 通道) |
| 备份加密 | AES-256-GCM (独立备份密码) |

---

## 🛠 开发

```bash
# 安装依赖
npm install

# 开发模式（热更新 + 桌面窗口）
npm run tauri dev

# 构建生产版本
npm run tauri build
```

### 前置条件

- **Node.js** ≥ 18
- **Rust 工具链** — 通过 [rustup](https://rustup.rs) 安装
- **SQLCipher** — macOS: `brew install sqlcipher`
- **Xcode Command Line Tools** — `xcode-select --install`

---

## 📄 许可证

[MIT](LICENSE)

Copyright © 2025 duangduang55
