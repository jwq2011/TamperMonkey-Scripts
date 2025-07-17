
# TamperMonkey-Scripts

这是一个 Tampermonkey 脚本集合，用于增强网页功能，尤其是表格提取和数据处理等场景。此项目旨在提供灵活、易扩展的脚本框架，并支持多人协作开发。

## 目录结构

```
TamperMonkey-Scripts/
├── scripts/                      # 存放所有脚本的目录
│   ├── script1.user.js           # 脚本1：表格提取与多格式导出工具
│   ├── script2.user.js           # 脚本2：其他功能脚本
│   └── script3.user.js           # 脚本3：更多功能脚本
├── utils/                        # 共享工具函数或辅助代码
│   ├── common.js                 # 通用工具函数
│   └── config.js                 # 配置文件
├── README.md                     # 仓库说明文档
├── LICENSE                       # 开源许可证
└── package.json                  # 可选，用于依赖管理或脚本构建
```

## 功能说明

### 当前脚本列表

1. **表格提取与多格式导出工具** (`scripts/script1.user.js`)
   - 自动检测网页中的表格（至少包含 2 行 2 列）。
   - 支持通过快捷键 (`Alt + E`) 或点击按钮提取表格数据。
   - 提供多种格式导出选项，包括 JSON、CSV、Excel、Markdown、SQL、HTML 和 XML。
   - 支持固定按钮位置，确保用户可以顺利点击。

## 安装与使用

### 1. 安装 Tampermonkey 扩展
请确保您的浏览器已安装 [Tampermonkey](https://www.tampermonkey.net/) 扩展。

### 2. 添加脚本
将 `scripts/` 目录下的 `.user.js` 文件添加到 Tampermonkey 中：
   1. 打开 Tampermonkey 扩展面板。
   2. 点击“创建新脚本”。
   3. 将脚本代码粘贴到编辑器中并保存。

### 3. 使用脚本
- 将鼠标悬停在目标表格上，点击“提取表格”按钮或按下快捷键 `Alt + E`。
- 在弹出的菜单中选择所需的导出格式，数据会自动下载。

## 开发指南

### 1. 新增脚本
- 在 `scripts/` 目录下创建新的 `.user.js` 文件。
- 遵循现有的代码风格，确保每个脚本都有明确的功能描述和注释。

### 2. 工具函数复用
- 如果某个功能需要复用，请将相关代码存放在 `utils/` 目录中。
- 例如，`utils/common.js` 可以包含通用的数据处理函数。

### 3. 依赖管理
- 如果脚本需要外部库，请通过 `@require` 标签引入（如 `xlsx` 和 `FileSaver.js`）。
- 也可以通过 `package.json` 安装本地依赖，并将其打包为适合浏览器使用的格式。

## 贡献指南

欢迎任何形式的贡献！如果您希望改进现有脚本、修复问题或新增功能，请遵循以下步骤：
1. Fork 本项目。
2. 创建一个新的分支。
3. 提交 Pull Request 并描述改动内容。

## 许可证

本项目采用 [MIT License](LICENSE)。
```

---

### **package.json**

以下是一个基本的 `package.json` 配置文件，您可以根据实际需求进行调整：

```json
{
  "name": "tampermonkey-scripts",
  "version": "1.0.0",
  "description": "A collection of Tampermonkey scripts for enhancing web functionality, including table extraction and data export utilities.",
  "main": "index.js",
  "scripts": {
    "build": "node build.js", // 示例脚本，用于构建或打包（可选）
    "test": "echo \"No tests implemented yet\""
  },
  "repository": {
    "type": "git",
    "url": "https://github.com/yourusername/TamperMonkey-Scripts.git" // 替换为您的仓库地址
  },
  "keywords": [
    "tampermonkey",
    "userscript",
    "table-extraction",
    "data-export"
  ],
  "author": "YourName",
  "license": "MIT",
  "devDependencies": {
    "uglify-js": "^3.15.3" // 示例依赖：用于脚本压缩（可选）
  }
}
```

---

### 说明

#### **README.md**
1. **用途**: 提供项目概述、安装指南、使用方法以及开发建议。
2. **未来扩展**:
   - 可以添加更多功能模块的详细说明。
   - 如果有多个脚本，可以为每个脚本单独创建小节。

#### **package.json**
1. **用途**: 管理项目的元信息、依赖项和构建脚本。
2. **未来扩展**:
   - 如果需要构建流程（例如合并多个脚本或压缩代码），可以在 `scripts` 中添加相关命令。
   - 可以加入更多的工具（如 Linters、Prettier）来规范化代码风格。
