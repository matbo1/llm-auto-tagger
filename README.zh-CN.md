# Auto Tagger

Auto Tagger 是一个 Obsidian 插件，可以通过 LLM 自动为 Markdown 笔记追加已有 vault 标签。

它适合已经建立了标签体系的 vault。插件会读取当前 vault 中已经存在的标签，让你配置的 LLM 从这些标签中选择适合当前笔记的标签，并只把匹配到的已有标签写回笔记 frontmatter。

## 功能

- 在 Markdown 笔记停止编辑一段时间后自动运行。
- 每次打标前从 Obsidian metadata 中读取候选标签。
- LLM 只能从 vault 已有标签中选择标签。
- 将标签写入 `frontmatter.tags`。
- 保留笔记已有标签和其他 frontmatter 字段。
- 支持 OpenAI-compatible API、OpenAI、Anthropic Claude、Google Gemini，以及常见国内厂商预设。
- 提供连接测试，用于检查 API URL、API Key 和模型设置是否可用。

## 支持的 Provider

- OpenAI-compatible 自定义接口
- OpenAI
- Anthropic Claude
- Google Gemini
- DeepSeek
- 通义千问 / 阿里云百炼
- Moonshot Kimi
- 智谱 GLM
- 火山方舟 / 豆包
- 腾讯混元

## 必填设置

- Provider
- LLM API URL
- API Key

`Model` 只在 OpenAI-compatible 自定义模式下可选。内置厂商通常需要填写模型名。

设置页中带红点的字段是必填项。

建议先在插件设置页点击 `Test connection`，确认当前 Provider 可以正常连接后，再依赖自动打标签。

## 隐私说明

Auto Tagger 会把笔记内容发送给你配置的 LLM 服务商。API Key 会保存在 Obsidian 本地插件设置中。

在处理私人笔记前，请先确认所选服务商的隐私政策、计费规则、数据使用方式和数据保留条款。

## Gemini 说明

Google Gemini 的默认 API URL 是：

```text
https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent
```

模型名可以填写为：

```text
gemini-2.5-flash
```

如果模型名前带有 `models/` 前缀，Auto Tagger 会自动兼容并移除该前缀。

测试 Gemini 连接时，插件会先检查当前模型是否支持 `generateContent`。如果 API Key 可用但模型不可用，插件会提示可尝试的模型名。

## 本地安装

将本插件目录复制到：

```text
你的Vault/.obsidian/plugins/auto-tagger/
```

插件目录中应包含：

```text
manifest.json
main.js
styles.css
```

复制完成后，在 Obsidian 的社区插件设置中启用 Auto Tagger。

## 许可证

MIT
