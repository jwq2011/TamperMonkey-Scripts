
# Reddit Chinese Translation Detector

一个 Tampermonkey 脚本，用于检测 Reddit 帖子是否支持中文翻译功能，并提供一键切换。

## 功能特性

- ✅ 自动检测 Reddit 帖子是否支持 `?tl=zh-hans` 中文翻译参数
- ✅ 提供可视化按钮，一键切换到中文翻译版本
- ✅ 可配置的开关控制，默认隐藏，按需启用
- ✅ 响应式设计，适配桌面端和移动端
- ✅ 实时状态显示（检测中/支持切换/无中文版本/已禁用）
- ✅ 智能错误页面识别，准确区分真正支持翻译的页面
- ✅ 增强的网络错误处理和超时保护

## 安装方式

### 方法一：Greasy Fork（推荐）
1. 访问 [Greasy Fork 安装页面](https://greasyfork.org/scripts/reddit-chinese-translation-detector)
2. 点击 "安装此脚本" 按钮
3. Tampermonkey 会自动处理安装

### 方法二：手动安装
1. 确保已安装 [Tampermonkey](https://www.tampermonkey.net/) 浏览器扩展
2. 复制脚本代码
3. 打开 Tampermonkey 面板 → 添加新脚本
4. 粘贴代码并保存

## 使用说明

### 启用功能
1. 访问任意 Reddit 帖子页面
2. 在页面右上角找到控制面板
3. 勾选 "翻译检测:" 复选框启用功能
4. 脚本会自动检测当前页面是否支持中文翻译

### 操作按钮状态说明
- **检测中...** - 正在检测翻译版本是否存在（灰色不可点击）
- **切换到中文** - 检测到中文版本，可点击切换（蓝色可点击）
- **无中文版本** - 该帖子不支持中文翻译（灰色不可点击）
- **已禁用** - 功能未启用（灰色不可点击）
- **已是中文** - 当前页面已经是中文翻译版本（灰色不可点击）
- **仅限帖子页** - 当前页面不是帖子页面（灰色不可点击）
- **检测失败** - 检测过程中出现网络错误（灰色不可点击）
- **检测超时** - 检测请求超时（灰色不可点击）

### 配置说明
- 设置会自动保存在浏览器本地存储中
- 刷新页面或重新访问时保持上次的启用状态
- 取消勾选复选框可完全禁用检测功能

## 适用场景

此脚本适用于以下 Reddit URL 格式：
- `https://www.reddit.com/r/subreddit/comments/post_id/post_title/`
- `https://www.reddit.com/r/subreddit/comments/post_id/post_title/?show=original`

脚本会自动为这些 URL 添加 `?tl=zh-hans` 参数来检测中文翻译版本。

## 技术原理

### 智能检测机制
脚本采用多重验证确保准确识别翻译支持：

1. **HTTP 状态验证**：检查响应状态码为 200
2. **URL 参数验证**：确认翻译参数 `tl=zh-hans` 正确传递
3. **错误页面识别**：智能识别 `/no_think` 等错误页面
4. **内容有效性验证**：检查页面是否包含帖子相关内容
5. **翻译标识验证**：确认页面包含翻译相关特征
6. **网络错误处理**：处理各种网络连接异常情况

### 高级错误处理
- **/no_think 页面检测**：准确识别重定向到错误页面的情况
- **网络超时保护**：15秒超时机制避免长时间等待
- **多重错误捕获**：网络错误、解析错误、超时错误分别处理
- **调试信息输出**：详细的检测过程日志便于问题排查

## 注意事项

- 仅在帖子详情页面生效，首页和列表页面不显示按钮
- 检测基于 HTTP HEAD 请求，不会影响页面加载性能
- 不会收集或发送任何用户数据
- 兼容主流浏览器（Chrome、Firefox、Edge等）
- 某些新发布的帖子可能需要一段时间才生成翻译版本
- 部分帖子可能确实不支持机器翻译

## 故障排除

### 看不到控制面板？
1. 确认脚本已正确安装并启用
2. 确认当前页面是 Reddit 帖子页面
3. 检查 Tampermonkey 是否在 Reddit 网站上启用
4. 刷新页面重试

### 检测结果不准确？
- 某些新发布的帖子可能需要一段时间才生成翻译版本
- 部分帖子可能确实不支持机器翻译
- Reddit 的翻译功能可能存在地区限制
- 重试几次或稍后再检测

### 调试信息查看
打开浏览器开发者工具 (F12) → Console 标签页，可以查看详细检测日志：
```
Translation check debug info: {
  status: 200,
  finalUrl: "...",
  hasTranslationParam: true,
  isNoThinkPage: false,
  hasNetworkError: false,
  hasPostContent: true,
  hasTranslationInTitle: true,
  hasChineseLangAttr: false
}
```

## 版本更新

### v1.2
- 🚀 增强 `/no_think` 页面智能识别
- 🛡️ 改进网络错误和超时处理
- 🔍 添加多重内容验证机制
- 📊 输出详细调试信息便于问题排查
- ⚡ 优化检测算法提高准确性

### v1.1
- 改进按钮可见性和样式
- 增强移动端兼容性
- 优化检测逻辑
- 添加排除规则避免在登录页面显示

### v1.0
- 初始版本发布

## 许可证

MIT License

## 支持与反馈

如遇到问题或有功能建议，请提交 issue 或联系作者。

GitHub: [项目地址]
Greasy Fork: [Reddit Chinese Translation Detector](https://greasyfork.org/zh-CN/scripts/543406-reddit-chinese-translation-detector)
