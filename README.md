# Vault Keeper 🔐

> 安全地在本地管理 API Key、账号密码、激活码、身份证号码等敏感信息。纯本地运行，主密码解锁 + SQLCipher 加密 + 卡片式分类管理。

**v0.1.0**

---

## ✨ 功能

- **主密码保护** — Argon2id 密钥派生 + SQLCipher 数据库透明加密
- **5 种分类模板** — API Key / 密码 / 身份证 / 激活码 / 自定义
- **快速搜索** — 同时搜索名称、字段内容、条目类型
- **一键复制** — 复制到剪贴板，10 秒自动清除
- **密码生成器** — 长度 8-64、4 种字符类型、强度指示
- **加密备份** — AES-256-GCM 独立密码导出/导入
- **自动锁定** — 闲置 5 分钟自动锁定
- **修改主密码**
- **macOS 专属** — 关闭到 Dock、状态栏图标、全局快捷键 (Cmd+Shift+V)

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

## 📦 前置条件

- **Node.js** ≥ 18
- **Rust 工具链** — 通过 [rustup](https://rustup.rs) 安装
- **SQLCipher** — macOS: `brew install sqlcipher`
- **Xcode Command Line Tools** — `xcode-select --install`

## 🚀 快速开始

```bash
# 1. 安装前端依赖
cd vault-keeper
npm install

# 2. 开发模式（热更新 + 桌面窗口）
npm run tauri dev

# 3. 构建生产版本
npm run tauri build
```

## 🔧 开发命令

```bash
npm run dev              # 仅前端开发（浏览器）
npm run tauri dev        # 完整桌面应用开发模式
npm run build            # 前端构建
npm run tauri build      # 打包桌面应用（macOS DMG）
npm run typecheck        # TypeScript 类型检查
npm run lint             # ESLint 检查

cd src-tauri && cargo check   # Rust 快速类型检查
cd src-tauri && cargo test    # 运行 Rust 测试
cd src-tauri && cargo clippy  # Rust lint 检查
```

> **注意**：首次 `cargo build` 可能需要较长时间下载编译依赖。`npm run tauri dev` 会自动完成全部构建。

## 📖 使用流程

1. **首次运行** → 设置主密码（用于解锁保险箱）
2. **添加条目** → 选择分类（API Key / 密码 / 身份证 / 激活码 / 自定义），填写字段
3. **日常使用** → 搜索条目、一键复制字段值到剪贴板（10 秒自动清除）
4. **安全退出** → 锁定保险箱或关闭窗口（自动清除内存中的密钥）
5. **备份** → 设置页导出/导入加密备份（独立备份密码）

## 📁 项目结构

```
vault-keeper/
├── src/                        # React 前端
│   ├── components/             #   组件（通用、布局、保险箱、表单、设置）
│   ├── stores/                 #   Zustand 状态管理
│   ├── types/                  #   类型定义
│   └── lib/                    #   工具函数
├── src-tauri/                  # Rust 后端
│   └── src/
│       ├── commands/           #   Tauri 命令（28 个）
│       ├── crypto/             #   加密模块（Argon2, AES-256-GCM, Keychain）
│       └── db/                 #   数据库（SQLCipher, 迁移, CRUD）
├── public/                     # 静态资源
├── package.json
└── README.md
```

---

## 🤖 AI 生成声明

> 此项目没有人工写的任何一串代码。全部代码均由 **DeepSeek v4** 模型通过 **Claude Code** 生成。

---

## 📄 许可证

[MIT](LICENSE)

Copyright © 2025 duangduang55
