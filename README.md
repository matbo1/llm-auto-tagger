# Auto Tagger

Auto Tagger is an Obsidian plugin that uses an LLM to automatically add existing vault tags to Markdown notes.

It is designed for vaults that already have a tag system. The plugin reads the tags that exist in your vault, asks your configured LLM to choose suitable tags from that list, and writes only matching tags back to the note frontmatter.

## Features

- Automatically runs after a Markdown note has been idle.
- Reads candidate tags from Obsidian metadata before each tagging request.
- Allows the LLM to choose only from existing vault tags.
- Adds tags to `frontmatter.tags`.
- Keeps existing tags and other frontmatter fields.
- Supports OpenAI-compatible APIs, OpenAI, Anthropic Claude, Google Gemini, and common China provider presets.
- Provides a connection test for checking your API URL, API key, and model settings.

## Supported Providers

- OpenAI-compatible custom endpoint
- OpenAI
- Anthropic Claude
- Google Gemini
- DeepSeek
- Alibaba Qwen / Model Studio
- Moonshot Kimi
- Zhipu GLM
- Volcengine Ark / Doubao
- Tencent Hunyuan

## Required Settings

- Provider
- LLM API URL
- API Key

`Model` is optional only for the custom OpenAI-compatible mode. Built-in providers usually require a model name.

Required fields are marked with a red dot in the settings page.

Use the `Test connection` button before relying on automatic tagging. It sends a minimal request to verify that the configured provider can be reached.

## Privacy

Auto Tagger sends note content to the LLM provider you configure. API keys are stored locally in Obsidian plugin settings.

Before using the plugin with private notes, review the privacy, billing, data usage, and retention terms of your selected provider.

## Gemini Notes

For Google Gemini, the default API URL is:

```text
https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent
```

Use a model name such as:

```text
gemini-2.5-flash
```

If you enter a model name with a `models/` prefix, Auto Tagger normalizes it automatically.

When testing a Gemini connection, the plugin first checks whether the configured model supports `generateContent`. If the API key works but the model is unavailable, it suggests available model names.

## Local Installation

Copy this folder into:

```text
YourVault/.obsidian/plugins/auto-tagger/
```

The plugin folder should contain:

```text
manifest.json
main.js
styles.css
```

Then enable Auto Tagger in Obsidian's community plugin settings.

## License

MIT
