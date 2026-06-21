const {
  Plugin,
  PluginSettingTab,
  Setting,
  TFile,
  getAllTags,
  requestUrl
} = require("obsidian");

const DEFAULT_SETTINGS = {
  provider: "openai-compatible",
  apiUrl: "",
  apiKey: "",
  model: "",
  autoTaggingEnabled: true,
  idleDelaySeconds: 60,
  maxInputCharacters: 12000,
  minContentCharacters: 100
};

const REQUEST_TIMEOUT_MS = 30000;
const PLUGIN_WRITE_IGNORE_MS = 5000;
const ANTHROPIC_VERSION = "2023-06-01";

const PROVIDERS = {
  "openai-compatible": {
    label: "OpenAI-compatible (Custom)",
    type: "openai-compatible",
    apiUrlPlaceholder: "https://api.example.com/v1/chat/completions",
    defaultApiUrl: "",
    modelPlaceholder: "Optional, depends on your endpoint",
    requiresModel: false
  },
  openai: {
    label: "OpenAI",
    type: "openai-compatible",
    defaultApiUrl: "https://api.openai.com/v1/chat/completions",
    apiUrlPlaceholder: "https://api.openai.com/v1/chat/completions",
    modelPlaceholder: "gpt-4.1-mini",
    requiresModel: true,
    apiKeyUrl: "https://platform.openai.com/api-keys",
    apiKeyUrlLabel: "Open OpenAI API keys"
  },
  anthropic: {
    label: "Anthropic Claude",
    type: "anthropic",
    defaultApiUrl: "https://api.anthropic.com/v1/messages",
    apiUrlPlaceholder: "https://api.anthropic.com/v1/messages",
    modelPlaceholder: "claude-sonnet-4-5",
    requiresModel: true,
    apiKeyUrl: "https://console.anthropic.com/settings/keys",
    apiKeyUrlLabel: "Open Anthropic API keys"
  },
  gemini: {
    label: "Google Gemini",
    type: "gemini",
    defaultApiUrl:
      "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
    apiUrlPlaceholder:
      "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
    modelPlaceholder: "gemini-2.5-flash",
    requiresModel: true,
    freeApiNote:
      "Google AI Studio may offer a free tier in supported regions. Check Google's current terms and limits before sending private notes.",
    apiKeyUrl: "https://aistudio.google.com/apikey",
    apiKeyUrlLabel: "Get a Gemini API key"
  },
  deepseek: {
    label: "DeepSeek",
    type: "openai-compatible",
    defaultApiUrl: "https://api.deepseek.com/chat/completions",
    apiUrlPlaceholder: "https://api.deepseek.com/chat/completions",
    modelPlaceholder: "deepseek-chat",
    requiresModel: true,
    apiKeyUrl: "https://platform.deepseek.com/api_keys",
    apiKeyUrlLabel: "Open DeepSeek API keys"
  },
  qwen: {
    label: "Alibaba Qwen / Model Studio",
    type: "openai-compatible",
    defaultApiUrl:
      "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
    apiUrlPlaceholder:
      "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
    modelPlaceholder: "qwen-plus",
    requiresModel: true,
    freeApiNote:
      "Alibaba Model Studio may provide new-user free quota in supported regions. Check the current quota, region, billing, and privacy terms before sending private notes.",
    apiKeyUrl: "https://bailian.console.aliyun.com/",
    apiKeyUrlLabel: "Open Qwen API keys"
  },
  kimi: {
    label: "Moonshot Kimi",
    type: "openai-compatible",
    defaultApiUrl: "https://api.moonshot.cn/v1/chat/completions",
    apiUrlPlaceholder: "https://api.moonshot.cn/v1/chat/completions",
    modelPlaceholder: "kimi-k2-0711-preview",
    requiresModel: true,
    apiKeyUrl: "https://platform.moonshot.cn/console/api-keys",
    apiKeyUrlLabel: "Open Kimi API keys"
  },
  zhipu: {
    label: "Zhipu GLM",
    type: "openai-compatible",
    defaultApiUrl: "https://open.bigmodel.cn/api/paas/v4/chat/completions",
    apiUrlPlaceholder: "https://open.bigmodel.cn/api/paas/v4/chat/completions",
    modelPlaceholder: "glm-4.5",
    requiresModel: true,
    freeApiNote:
      "Zhipu may provide trial or granted quota for eligible accounts. Check the current quota, billing, and privacy terms in the BigModel console before sending private notes.",
    apiKeyUrl: "https://open.bigmodel.cn/usercenter/proj-mgmt/apikeys",
    apiKeyUrlLabel: "Open Zhipu API keys"
  },
  doubao: {
    label: "Volcengine Ark / Doubao",
    type: "openai-compatible",
    defaultApiUrl: "https://ark.cn-beijing.volces.com/api/v3/chat/completions",
    apiUrlPlaceholder:
      "https://ark.cn-beijing.volces.com/api/v3/chat/completions",
    modelPlaceholder: "Your Ark endpoint or model id",
    requiresModel: true,
    freeApiNote:
      "Volcengine Ark may provide model-level free inference quota. Check the current quota, billing, and privacy terms before sending private notes.",
    apiKeyUrl: "https://console.volcengine.com/ark/region:ark+cn-beijing/apiKey",
    apiKeyUrlLabel: "Open Ark API keys"
  },
  hunyuan: {
    label: "Tencent Hunyuan",
    type: "openai-compatible",
    defaultApiUrl: "https://api.hunyuan.cloud.tencent.com/v1/chat/completions",
    apiUrlPlaceholder:
      "https://api.hunyuan.cloud.tencent.com/v1/chat/completions",
    modelPlaceholder: "hunyuan-turbos-latest",
    requiresModel: true,
    freeApiNote:
      "Tencent Hunyuan may provide free resource packs or trial quota for eligible services. Check the current quota, billing, and privacy terms before sending private notes.",
    apiKeyUrl: "https://console.cloud.tencent.com/hunyuan/api-key",
    apiKeyUrlLabel: "Open Hunyuan API keys"
  }
};

const UI_TEXT = {
  en: {
    title: "Auto Tagger",
    privacy:
      "Note content will be sent to the LLM service you configure. Make sure the service matches your privacy expectations.",
    ready: "Configuration is ready.",
    requiredSuffix: "is required before requests can run.",
    requiredSuffixPlural: "are required before requests can run.",
    provider: "Provider",
    providerDesc: "Choose the LLM provider or compatibility mode.",
    openApiKeys: "Open API keys",
    providerDefaultNote: "Open the provider API key page.",
    testName: "Test LLM connection",
    testDesc: "Send a minimal request to verify the current provider, API URL, API key, and model.",
    testButton: "Test connection",
    testing: "Testing connection...",
    successPrefix: "Success",
    errorPrefix: "Error",
    connectionSuccess: "Connection successful.",
    responseIncompatible: "Request succeeded, but the response format was not compatible.",
    connectionFailed: "Connection failed",
    geminiModelMissing: (model, suggestions) =>
      `Gemini API key works, but model "${model}" was not found for generateContent. Try: ${suggestions.join(", ")}`,
    bulkName: "Bulk update note tags",
    bulkStart: "Update all note tags",
    bulkCancel: "Cancel",
    bulkCancelling: "Cancelling after the current note finishes...",
    bulkReady: "Ready to update all Markdown notes.",
    bulkRunning: "Updating all note tags...",
    bulkAlreadyRunning: "A bulk update is already running.",
    bulkNoMarkdown: "No Markdown notes found in the current vault.",
    bulkNoCandidateTags: "No existing vault tags found. Add tags before bulk updating.",
    bulkDone: (summary) =>
      `Done. Updated ${summary.updated}, no new tags ${summary.noNewTags}, exceptions ${summary.exception}.`,
    bulkCancelled: (summary) =>
      `Cancelled. Processed ${summary.processed}/${summary.total}. Updated ${summary.updated}, no new tags ${summary.noNewTags}, exceptions ${summary.exception}.`,
    bulkProgress: (summary) =>
      `Processed ${summary.processed}/${summary.total} (${getProgressPercent(summary)}%). Updated ${summary.updated}, no new tags ${summary.noNewTags}, exceptions ${summary.exception}.`,
    bulkCurrent: (path) => `Current: ${path}`,
    bulkLastError: (error) => `Last error: ${error}`,
    apiUrl: "LLM API URL",
    apiUrlDesc: (label) => `${label} endpoint.`,
    useDefault: "Use default",
    apiKey: "API Key",
    apiKeyDesc: "Required. Stored locally in this plugin's settings.",
    show: "Show",
    hide: "Hide",
    model: "Model",
    modelRequired: "Required for the selected provider.",
    modelOptional: "Optional. Leave empty if your endpoint does not require it.",
    idleDelay: "Idle delay seconds",
    idleDelayDesc: "Default: 60. Minimum: 10.",
    maxInput: "Max input characters",
    maxInputDesc: "Longer notes are truncated before being sent.",
    minContent: "Min content characters",
    minContentDesc: "Shorter notes are ignored."
  },
  zh: {
    title: "Auto Tagger",
    privacy: "笔记内容会发送到你配置的 LLM 服务。请确认该服务符合你的隐私预期。",
    ready: "配置已就绪。",
    requiredSuffix: "是发起请求前的必填项。",
    requiredSuffixPlural: "是发起请求前的必填项。",
    provider: "厂商",
    providerDesc: "选择 LLM 厂商或兼容模式。",
    openApiKeys: "打开 API Key",
    providerDefaultNote: "打开该厂商的 API Key 页面。",
    testName: "测试模型连接",
    testDesc: "发送最小请求，验证当前厂商、API URL、API Key 和模型是否可用。",
    testButton: "测试连接",
    testing: "正在测试连接...",
    successPrefix: "成功",
    errorPrefix: "失败",
    connectionSuccess: "连接成功。",
    responseIncompatible: "请求已成功，但返回格式不兼容。",
    connectionFailed: "连接失败",
    geminiModelMissing: (model, suggestions) =>
      `Gemini API Key 可用，但当前模型「${model}」不支持 generateContent 或未在模型列表中找到。可尝试：${suggestions.join(", ")}`,
    bulkName: "批量更新文档标签",
    bulkStart: "更新全部文档标签",
    bulkCancel: "取消",
    bulkCancelling: "当前文档处理完成后将取消...",
    bulkReady: "准备更新所有 Markdown 文档标签。",
    bulkRunning: "正在更新全部文档标签...",
    bulkAlreadyRunning: "批量更新正在运行。",
    bulkNoMarkdown: "当前仓库中没有 Markdown 文档。",
    bulkNoCandidateTags: "当前仓库中没有已有标签。请先添加标签后再批量更新。",
    bulkDone: (summary) =>
      `已完成。已更新 ${summary.updated}，无新增标签 ${summary.noNewTags}，异常 ${summary.exception}。`,
    bulkCancelled: (summary) =>
      `已取消。已处理 ${summary.processed}/${summary.total}。已更新 ${summary.updated}，无新增标签 ${summary.noNewTags}，异常 ${summary.exception}。`,
    bulkProgress: (summary) =>
      `已处理 ${summary.processed}/${summary.total}（${getProgressPercent(summary)}%）。已更新 ${summary.updated}，无新增标签 ${summary.noNewTags}，异常 ${summary.exception}。`,
    bulkCurrent: (path) => `当前文档：${path}`,
    bulkLastError: (error) => `最后错误：${error}`,
    apiUrl: "LLM API URL",
    apiUrlDesc: (label) => `${label} 接口地址。`,
    useDefault: "使用默认值",
    apiKey: "API Key",
    apiKeyDesc: "必填。仅保存在本插件的本地设置中。",
    show: "显示",
    hide: "隐藏",
    model: "模型",
    modelRequired: "当前厂商必填。",
    modelOptional: "可选。如果你的兼容接口不需要模型名，可以留空。",
    idleDelay: "空闲触发秒数",
    idleDelayDesc: "默认 60，最小 10。",
    maxInput: "最大输入字符数",
    maxInputDesc: "较长笔记会在发送前截断。",
    minContent: "最小正文字符数",
    minContentDesc: "短于该长度的笔记会被忽略。"
  }
};

module.exports = class AutoTaggerLLMPlugin extends Plugin {
  async onload() {
    await this.loadSettings();

    this.debounceTimers = new Map();
    this.processingFiles = new Set();
    this.pluginWriteIgnoreUntil = new Map();
    this.bulkTaggingActive = false;
    this.bulkTaggingCancelRequested = false;
    this.bulkTaggingSummary = null;

    this.addSettingTab(new AutoTaggerSettingTab(this.app, this));

    this.registerEvent(
      this.app.vault.on("modify", (file) => {
        this.handleFileModify(file);
      })
    );
  }

  onunload() {
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }

    this.debounceTimers.clear();
    this.processingFiles.clear();
    this.pluginWriteIgnoreUntil.clear();
    this.bulkTaggingCancelRequested = true;
    this.bulkTaggingActive = false;
    this.bulkTaggingSummary = null;
  }

  async loadSettings() {
    const loaded = await this.loadData();
    this.settings = Object.assign({}, DEFAULT_SETTINGS, loaded || {});

    if (!PROVIDERS[this.settings.provider]) {
      this.settings.provider = DEFAULT_SETTINGS.provider;
    }

    this.settings.autoTaggingEnabled = true;

    this.settings.idleDelaySeconds = sanitizeNumber(
      this.settings.idleDelaySeconds,
      DEFAULT_SETTINGS.idleDelaySeconds,
      10
    );
    this.settings.maxInputCharacters = sanitizeNumber(
      this.settings.maxInputCharacters,
      DEFAULT_SETTINGS.maxInputCharacters,
      1000
    );
    this.settings.minContentCharacters = sanitizeNumber(
      this.settings.minContentCharacters,
      DEFAULT_SETTINGS.minContentCharacters,
      0
    );
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  clearDebounceTimers() {
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }

    this.debounceTimers.clear();
  }

  handleFileModify(file) {
    if (this.bulkTaggingActive) {
      return;
    }

    if (!this.settings.autoTaggingEnabled) {
      return;
    }

    if (!this.isReadyForRequests()) {
      return;
    }

    if (!(file instanceof TFile) || file.extension !== "md") {
      return;
    }

    const ignoreUntil = this.pluginWriteIgnoreUntil.get(file.path);
    if (ignoreUntil && Date.now() < ignoreUntil) {
      return;
    }

    const existingTimer = this.debounceTimers.get(file.path);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const delayMs = this.settings.idleDelaySeconds * 1000;
    const timer = setTimeout(() => {
      this.debounceTimers.delete(file.path);
      this.autoTagFileByPath(file.path).catch((error) => {
        console.error("Auto Tagger failed:", error);
      });
    }, delayMs);

    this.debounceTimers.set(file.path, timer);
  }

  async autoTagFileByPath(path, options = {}) {
    if (this.processingFiles.has(path)) {
      return { status: "exception", reason: "already-processing" };
    }

    const file = this.app.vault.getAbstractFileByPath(path);
    if (!(file instanceof TFile) || file.extension !== "md") {
      return { status: "exception", reason: "not-markdown" };
    }

    this.processingFiles.add(path);

    try {
      const rawContent = await this.app.vault.cachedRead(file);
      const noteContent = truncateText(
        stripFrontmatter(rawContent).trim(),
        this.settings.maxInputCharacters
      );

      if (noteContent.length < this.settings.minContentCharacters) {
        return { status: "exception", reason: "short-content" };
      }

      const candidateTags = options.candidateTags || this.getVaultTags();
      if (candidateTags.length === 0) {
        return { status: "exception", reason: "no-candidate-tags" };
      }

      const currentTags = this.getCurrentNoteTags(file);
      const suggestedTags = await this.requestSuggestedTags({
        candidateTags,
        currentTags,
        noteContent
      });

      const newTags = filterSuggestedTags(
        suggestedTags,
        candidateTags,
        currentTags
      );

      if (newTags.length === 0) {
        return { status: "no-new-tags", reason: "no-new-tags" };
      }

      await this.writeTagsToFrontmatter(file, newTags);
      return { status: "updated", tags: newTags };
    } catch (error) {
      if (options.catchErrors) {
        return {
          status: "exception",
          reason: getErrorMessage(error)
        };
      }

      throw error;
    } finally {
      this.processingFiles.delete(path);
    }
  }

  requestBulkTaggingCancel() {
    if (this.bulkTaggingActive) {
      this.bulkTaggingCancelRequested = true;
    }
  }

  getBulkTaggingSummary() {
    return this.bulkTaggingSummary;
  }

  async runBulkTagging(onProgress) {
    if (this.bulkTaggingActive) {
      return {
        total: 0,
        processed: 0,
        updated: 0,
        noNewTags: 0,
        exception: 0,
        cancelled: false,
        alreadyRunning: true,
        active: true,
        lastError: ""
      };
    }

    if (!this.isReadyForRequests()) {
      throw new Error(this.getMissingRequiredMessage());
    }

    const files = this.app.vault
      .getMarkdownFiles()
      .slice()
      .sort((a, b) => a.path.localeCompare(b.path));
    const summary = {
      total: files.length,
      processed: 0,
      updated: 0,
      noNewTags: 0,
      exception: 0,
      cancelled: false,
      currentPath: "",
      lastError: "",
      alreadyRunning: false,
      noMarkdown: files.length === 0,
      noCandidateTags: false,
      active: true
    };

    this.bulkTaggingActive = true;
    this.bulkTaggingCancelRequested = false;
    this.clearDebounceTimers();

    try {
      this.updateBulkTaggingSummary(summary, onProgress);

      if (summary.noMarkdown) {
        summary.active = false;
        this.updateBulkTaggingSummary(summary, onProgress);
        return summary;
      }

      const candidateTags = this.getVaultTags();
      if (candidateTags.length === 0) {
        summary.noCandidateTags = true;
        summary.active = false;
        this.updateBulkTaggingSummary(summary, onProgress);
        return summary;
      }

      for (const file of files) {
        if (this.bulkTaggingCancelRequested) {
          summary.cancelled = true;
          break;
        }

        summary.currentPath = file.path;
        this.updateBulkTaggingSummary(summary, onProgress);

        const result = await this.autoTagFileByPath(file.path, {
          candidateTags,
          catchErrors: true
        });

        if (result.status === "updated") {
          summary.updated += 1;
        } else if (result.status === "no-new-tags") {
          summary.noNewTags += 1;
        } else {
          summary.exception += 1;
          summary.lastError = result.reason || "";
        }

        summary.processed += 1;
        summary.currentPath = "";
        this.updateBulkTaggingSummary(summary, onProgress);
      }

      summary.active = false;
      this.updateBulkTaggingSummary(summary, onProgress);
      return summary;
    } finally {
      this.bulkTaggingActive = false;
      this.bulkTaggingCancelRequested = false;
    }
  }

  updateBulkTaggingSummary(summary, onProgress) {
    this.bulkTaggingSummary = Object.assign({}, summary);
    onProgress && onProgress(this.getBulkTaggingSummary());
  }

  isReadyForRequests() {
    const provider = this.getProviderConfig();
    return Boolean(
      this.settings.apiUrl &&
        this.settings.apiUrl.trim() &&
        this.getApiKey() &&
        (!provider.requiresModel ||
          (this.settings.model && this.settings.model.trim()))
    );
  }

  getProviderConfig() {
    return (
      PROVIDERS[this.settings.provider] || PROVIDERS[DEFAULT_SETTINGS.provider]
    );
  }

  getApiKey() {
    return cleanApiKey(this.settings.apiKey);
  }

  getVaultTags() {
    const tagsByKey = new Map();
    const files = this.app.vault.getMarkdownFiles();

    for (const file of files) {
      const cache = this.app.metadataCache.getFileCache(file);
      const tags = getAllTags(cache) || [];

      for (const tag of tags) {
        const normalized = normalizeTag(tag);
        if (!normalized) {
          continue;
        }

        tagsByKey.set(normalized.toLowerCase(), normalized);
      }
    }

    return Array.from(tagsByKey.values()).sort((a, b) => a.localeCompare(b));
  }

  getCurrentNoteTags(file) {
    const cache = this.app.metadataCache.getFileCache(file);
    const tags = getAllTags(cache) || [];
    const tagsByKey = new Map();

    for (const tag of tags) {
      const normalized = normalizeTag(tag);
      if (normalized) {
        tagsByKey.set(normalized.toLowerCase(), normalized);
      }
    }

    return Array.from(tagsByKey.values()).sort((a, b) => a.localeCompare(b));
  }

  buildOpenAICompatibleBody(messages, options = {}) {
    const body = {
      temperature: options.temperature ?? 0,
      messages
    };

    if (Number.isFinite(options.maxTokens)) {
      body.max_tokens = options.maxTokens;
    }

    const model = this.settings.model.trim();
    if (model) {
      body.model = model;
    }

    return body;
  }

  async sendJsonRequest({ url, headers, body, method = "POST" }) {
    const request = {
      url,
      method,
      headers,
      throw: false
    };

    if (body !== undefined) {
      request.body = JSON.stringify(body);
    }

    const response = await withTimeout(
      requestUrl(request),
      REQUEST_TIMEOUT_MS
    );

    const responseJson = response.json || parseJsonSafely(response.text);

    if (response.status < 200 || response.status >= 300) {
      throw new Error(
        `HTTP ${response.status}: ${getApiErrorMessage(responseJson, response.text)}`
      );
    }

    return responseJson;
  }

  async sendLLMRequest(messages, options = {}) {
    const provider = this.getProviderConfig();

    if (provider.type === "anthropic") {
      return this.sendAnthropicRequest(messages, options);
    }

    if (provider.type === "gemini") {
      return this.sendGeminiRequest(messages, options);
    }

    return this.sendOpenAICompatibleRequest(messages, options);
  }

  async sendOpenAICompatibleRequest(messages, options = {}) {
    const apiKey = this.getApiKey();
    const body = this.buildOpenAICompatibleBody(messages, options);
    const responseJson = await this.sendJsonRequest({
      url: this.settings.apiUrl.trim(),
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body
    });

    return getOpenAICompatibleContent(responseJson);
  }

  async sendAnthropicRequest(messages, options = {}) {
    const apiKey = this.getApiKey();
    const body = buildAnthropicBody(
      messages,
      this.settings.model.trim(),
      options
    );
    const responseJson = await this.sendJsonRequest({
      url: this.settings.apiUrl.trim(),
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": ANTHROPIC_VERSION
      },
      body
    });

    return getAnthropicContent(responseJson);
  }

  async sendGeminiRequest(messages, options = {}) {
    const apiKey = this.getApiKey();
    const body = buildGeminiBody(messages);
    const responseJson = await this.sendJsonRequest({
      url: buildGeminiUrl(
        this.settings.apiUrl.trim(),
        this.settings.model.trim(),
        apiKey
      ),
      headers: {
        "Content-Type": "application/json"
      },
      body
    });

    return getGeminiContent(responseJson);
  }

  async listGeminiModels() {
    const apiKey = this.getApiKey();
    const responseJson = await this.sendJsonRequest({
      url: appendQueryParam(
        "https://generativelanguage.googleapis.com/v1beta/models",
        "key",
        apiKey
      ),
      method: "GET",
      headers: {
        "Content-Type": "application/json"
      }
    });

    return Array.isArray(responseJson && responseJson.models)
      ? responseJson.models
      : [];
  }

  async testLLMConnection(uiText) {
    const text = uiText || UI_TEXT.en;
    if (!this.isReadyForRequests()) {
      return {
        ok: false,
        message: getMissingRequiredMessage(this, text)
      };
    }

    try {
      if (this.getProviderConfig().type === "gemini") {
        const models = await this.listGeminiModels();
        const generateModels = models.filter((model) =>
          (model.supportedGenerationMethods || []).includes("generateContent")
        );
        const configuredModel = normalizeGeminiModelName(this.settings.model);
        const configuredModelAvailable = generateModels.some(
          (model) => normalizeGeminiModelName(model.name) === configuredModel
        );

        if (!configuredModelAvailable) {
          const suggestions = generateModels
            .map((model) => normalizeGeminiModelName(model.name))
            .slice(0, 5);
          return {
            ok: false,
            message: text.geminiModelMissing(this.settings.model.trim(), suggestions)
          };
        }
      }

      const content = await this.sendLLMRequest(
        [
          {
            role: "system",
            content: "Reply with the word ok."
          },
          {
            role: "user",
            content: "Connection test."
          }
        ],
        { minimal: true }
      );

      if (typeof content === "string" && content.trim()) {
        return {
          ok: true,
          message: text.connectionSuccess
        };
      }

      return {
        ok: false,
        message: text.responseIncompatible
      };
    } catch (error) {
      return {
        ok: false,
        message: `${text.connectionFailed}: ${getErrorMessage(error)}`
      };
    }
  }

  async requestSuggestedTags({ candidateTags, currentTags, noteContent }) {
    const content = await this.sendLLMRequest(
      [
        {
          role: "system",
          content:
            "You are an Obsidian note tagging assistant. Choose tags only from the provided candidate list. Never invent new tags. Return only valid JSON."
        },
        {
          role: "user",
          content: buildPrompt({ candidateTags, currentTags, noteContent })
        }
      ],
      { temperature: 0 }
    );

    if (typeof content === "string") {
      return parseTagsFromModelContent(content);
    }

    return [];
  }

  getMissingRequiredMessage() {
    const missing = [];
    const provider = this.getProviderConfig();

    if (!this.settings.apiUrl || !this.settings.apiUrl.trim()) {
      missing.push("API URL");
    }

    if (!this.getApiKey()) {
      missing.push("API Key");
    }

    if (
      provider.requiresModel &&
      (!this.settings.model || !this.settings.model.trim())
    ) {
      missing.push("Model");
    }

    return `${missing.join(", ")} ${
      missing.length === 1 ? "is" : "are"
    } required before requests can run.`;
  }

  async writeTagsToFrontmatter(file, tagsToAdd) {
    this.pluginWriteIgnoreUntil.set(
      file.path,
      Date.now() + PLUGIN_WRITE_IGNORE_MS
    );

    try {
      await this.app.fileManager.processFrontMatter(file, (frontmatter) => {
        const existingTags = normalizeFrontmatterTags(frontmatter.tags);
        const mergedTags = mergeTags(existingTags, tagsToAdd);
        frontmatter.tags = mergedTags;
      });
    } finally {
      setTimeout(() => {
        this.pluginWriteIgnoreUntil.delete(file.path);
      }, PLUGIN_WRITE_IGNORE_MS);
    }
  }
};

class AutoTaggerSettingTab extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display() {
    const { containerEl } = this;
    const provider = this.plugin.getProviderConfig();
    const text = getUiText();

    containerEl.empty();
    containerEl.createEl("h2", { text: text.title });
    containerEl.createEl("p", {
      text: text.privacy
    });

    const statusEl = containerEl.createEl("p");
    const updateStatus = () => {
      statusEl.setText(
        this.plugin.isReadyForRequests()
          ? text.ready
          : getMissingRequiredMessage(this.plugin, text)
      );
    };
    updateStatus();

    let bulkStartButton = null;
    let bulkCancelButton = null;
    const updateBulkControls = (summary) => {
      const active = Boolean(summary && summary.active);

      if (bulkStartButton) {
        bulkStartButton.buttonEl.style.display = active ? "none" : "";
        bulkStartButton.setDisabled(false);
      }

      if (bulkCancelButton) {
        bulkCancelButton.buttonEl.style.display = active ? "" : "none";
        bulkCancelButton.setDisabled(false);
        bulkCancelButton.setButtonText(text.bulkCancel);
      }
    };
    const renderBulkSummary = (summary) => {
      setBulkProgress(bulkProgressEl, summary);

      if (!summary) {
        setBulkStatus(bulkStatusEl, "idle", text.bulkReady);
        updateBulkControls(summary);
        return;
      }

      if (summary.active) {
        setBulkStatus(
          bulkStatusEl,
          "testing",
          getBulkProgressMessage(summary, text)
        );
        updateBulkControls(summary);
        return;
      }

      if (summary.alreadyRunning) {
        setBulkStatus(bulkStatusEl, "error", text.bulkAlreadyRunning);
      } else if (summary.noMarkdown) {
        setBulkStatus(bulkStatusEl, "error", text.bulkNoMarkdown);
      } else if (summary.noCandidateTags) {
        setBulkStatus(bulkStatusEl, "error", text.bulkNoCandidateTags);
      } else if (summary.cancelled) {
        setBulkStatus(
          bulkStatusEl,
          "idle",
          getBulkFinalMessage(summary, text)
        );
      } else {
        setBulkStatus(
          bulkStatusEl,
          summary.exception ? "error" : "success",
          getBulkFinalMessage(summary, text)
        );
      }

      updateBulkControls(summary);
    };
    const bulkSetting = new Setting(containerEl)
      .setName(text.bulkName)
      .addButton((button) => {
        bulkStartButton = button;
        button
          .setButtonText(text.bulkStart)
          .onClick(async () => {
            if (!this.plugin.isReadyForRequests()) {
              setBulkStatus(
                bulkStatusEl,
                "error",
                getMissingRequiredMessage(this.plugin, text)
              );
              return;
            }

            updateBulkControls({ active: true });
            setBulkProgress(bulkProgressEl, {
              total: 0,
              processed: 0
            });
            setBulkStatus(bulkStatusEl, "testing", text.bulkRunning);

            try {
              const summary = await this.plugin.runBulkTagging((progress) => {
                renderBulkSummary(progress);
              });

              renderBulkSummary(summary);
            } catch (error) {
              setBulkStatus(bulkStatusEl, "error", getErrorMessage(error));
            } finally {
              updateBulkControls(this.plugin.getBulkTaggingSummary());
            }
          });
      })
      .addButton((button) => {
        bulkCancelButton = button;
        button
          .setButtonText(text.bulkCancel)
          .onClick(() => {
            this.plugin.requestBulkTaggingCancel();
            button.setDisabled(true);
            button.setButtonText(text.bulkCancelling);
            setBulkStatus(bulkStatusEl, "testing", text.bulkCancelling);
          });
        button.buttonEl.style.display = "none";
      });
    const bulkProgressEl = bulkSetting.descEl.createEl("progress", {
      cls: "auto-tagger-bulk-progress"
    });
    bulkProgressEl.max = 100;
    bulkProgressEl.value = 0;
    const bulkStatusEl = bulkSetting.descEl.createDiv({
      cls: "auto-tagger-bulk-status"
    });
    bulkSetting.settingEl.addClass("auto-tagger-bulk-setting");
    renderBulkSummary(this.plugin.getBulkTaggingSummary());

    const testSetting = new Setting(containerEl)
      .setName(text.testName)
      .setDesc(text.testDesc)
      .addButton((button) => {
        button
          .setButtonText(text.testButton)
          .onClick(async () => {
            button.setDisabled(true);
            setTestResult(testResultEl, "testing", text.testing, text);

            try {
              const result = await this.plugin.testLLMConnection(text);
              setTestResult(
                testResultEl,
                result.ok ? "success" : "error",
                result.message,
                text
              );
            } finally {
              button.setDisabled(false);
            }
          });
      });
    const testResultEl = testSetting.descEl.createDiv({
      cls: "auto-tagger-test-result"
    });
    testSetting.settingEl.addClass("auto-tagger-test-setting");

    const providerModuleEl = containerEl.createDiv({
      cls: "auto-tagger-provider-module"
    });

    new Setting(providerModuleEl)
      .setName(requiredName(text.provider))
      .setDesc(text.providerDesc)
      .addDropdown((dropdown) => {
        for (const [providerId, providerConfig] of Object.entries(PROVIDERS)) {
          dropdown.addOption(providerId, providerConfig.label);
        }

        dropdown
          .setValue(this.plugin.settings.provider)
          .onChange(async (value) => {
            const oldProvider = this.plugin.getProviderConfig();
            const shouldUseProviderDefault =
              !this.plugin.settings.apiUrl.trim() ||
              this.plugin.settings.apiUrl.trim() === oldProvider.defaultApiUrl;

            this.plugin.settings.provider = value;
            const newProvider = this.plugin.getProviderConfig();
            if (shouldUseProviderDefault && newProvider.defaultApiUrl) {
              this.plugin.settings.apiUrl = newProvider.defaultApiUrl;
            }

            await this.plugin.saveSettings();
            this.display();
          });
      });

    if (provider.apiKeyUrl) {
      providerModuleEl.createDiv({
        cls: "auto-tagger-provider-divider"
      });

      const shortcutEl = providerModuleEl.createDiv({
        cls: "auto-tagger-provider-shortcut"
      });
      shortcutEl.createDiv({
        cls: "auto-tagger-provider-shortcut-desc",
        text: getProviderApiKeyNote(provider, text)
      });
      shortcutEl
        .createEl("button", {
          text: getProviderApiKeyLabel(provider, text)
        })
        .addEventListener("click", () => {
          window.open(provider.apiKeyUrl, "_blank");
        });
    }

    new Setting(containerEl)
      .setName(requiredName(text.apiUrl))
      .setDesc(text.apiUrlDesc(provider.label))
      .addText((input) => {
        input
          .setPlaceholder(provider.apiUrlPlaceholder)
          .setValue(this.plugin.settings.apiUrl)
          .onChange(async (value) => {
            this.plugin.settings.apiUrl = value.trim();
            await this.plugin.saveSettings();
            updateStatus();
          });
      })
      .addButton((button) => {
        button.setButtonText(text.useDefault).onClick(async () => {
          if (provider.defaultApiUrl) {
            this.plugin.settings.apiUrl = provider.defaultApiUrl;
            await this.plugin.saveSettings();
            this.display();
          }
        });
      });

    let apiKeyInput = null;
    let apiKeyVisible = false;
    new Setting(containerEl)
      .setName(requiredName(text.apiKey))
      .setDesc(text.apiKeyDesc)
      .addText((input) => {
        apiKeyInput = input.inputEl;
        input.inputEl.type = "password";
        input
          .setPlaceholder("sk-...")
          .setValue(this.plugin.settings.apiKey)
          .onChange(async (value) => {
            this.plugin.settings.apiKey = cleanApiKey(value);
            await this.plugin.saveSettings();
            updateStatus();
          });
      })
      .addButton((button) => {
        button.setButtonText(text.show).onClick(() => {
          apiKeyVisible = !apiKeyVisible;
          if (apiKeyInput) {
            apiKeyInput.type = apiKeyVisible ? "text" : "password";
          }
          button.setButtonText(apiKeyVisible ? text.hide : text.show);
        });
      });

    new Setting(containerEl)
      .setName(provider.requiresModel ? requiredName(text.model) : text.model)
      .setDesc(provider.requiresModel ? text.modelRequired : text.modelOptional)
      .addText((input) => {
        input
          .setPlaceholder(provider.modelPlaceholder)
          .setValue(this.plugin.settings.model)
          .onChange(async (value) => {
            this.plugin.settings.model = value.trim();
            await this.plugin.saveSettings();
            updateStatus();
          });
      });

    new Setting(containerEl)
      .setName(text.idleDelay)
      .setDesc(text.idleDelayDesc)
      .addText((input) => {
        input.inputEl.type = "number";
        input
          .setPlaceholder("60")
          .setValue(String(this.plugin.settings.idleDelaySeconds))
          .onChange(async (value) => {
            this.plugin.settings.idleDelaySeconds = sanitizeNumber(
              value,
              DEFAULT_SETTINGS.idleDelaySeconds,
              10
            );
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName(text.maxInput)
      .setDesc(text.maxInputDesc)
      .addText((input) => {
        input.inputEl.type = "number";
        input
          .setPlaceholder("12000")
          .setValue(String(this.plugin.settings.maxInputCharacters))
          .onChange(async (value) => {
            this.plugin.settings.maxInputCharacters = sanitizeNumber(
              value,
              DEFAULT_SETTINGS.maxInputCharacters,
              1000
            );
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName(text.minContent)
      .setDesc(text.minContentDesc)
      .addText((input) => {
        input.inputEl.type = "number";
        input
          .setPlaceholder("100")
          .setValue(String(this.plugin.settings.minContentCharacters))
          .onChange(async (value) => {
            this.plugin.settings.minContentCharacters = sanitizeNumber(
              value,
              DEFAULT_SETTINGS.minContentCharacters,
              0
            );
            await this.plugin.saveSettings();
          });
      });

  }
}

function buildPrompt({ candidateTags, currentTags, noteContent }) {
  return [
    "Task: Choose suitable tags for this Obsidian note.",
    "",
    "Strict rules:",
    "1. Choose only tags from Candidate tags.",
    "2. Do not create new tags.",
    "3. Do not remove existing tags.",
    "4. Return only JSON in this format: {\"tags\":[\"tag1\",\"tag2\"]}.",
    "5. If no candidate tag fits, return {\"tags\":[]}.",
    "",
    "Candidate tags:",
    candidateTags.map((tag) => `- ${tag}`).join("\n"),
    "",
    "Current note tags:",
    currentTags.length ? currentTags.map((tag) => `- ${tag}`).join("\n") : "(none)",
    "",
    "Note content:",
    noteContent
  ].join("\n");
}

function parseTagsFromModelContent(content) {
  const cleaned = content
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();

  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    return [];
  }

  try {
    const parsed = JSON.parse(cleaned.slice(start, end + 1));
    return Array.isArray(parsed.tags) ? parsed.tags : [];
  } catch (error) {
    console.error("Auto Tagger could not parse model JSON:", error);
    return [];
  }
}

function parseJsonSafely(value) {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch (error) {
    return null;
  }
}

function getOpenAICompatibleContent(responseJson) {
  return (
    responseJson &&
    responseJson.choices &&
    responseJson.choices[0] &&
    responseJson.choices[0].message &&
    responseJson.choices[0].message.content
  );
}

function buildAnthropicBody(messages, model, options = {}) {
  const system = messages
    .filter((message) => message.role === "system")
    .map((message) => message.content)
    .join("\n\n");
  const anthropicMessages = messages
    .filter((message) => message.role !== "system")
    .map((message) => ({
      role: message.role === "assistant" ? "assistant" : "user",
      content: message.content
    }));

  const body = {
    model,
    max_tokens: Number.isFinite(options.maxTokens) ? options.maxTokens : 1024,
    temperature: options.temperature ?? 0,
    messages: anthropicMessages.length
      ? anthropicMessages
      : [{ role: "user", content: "Connection test." }]
  };

  if (system) {
    body.system = system;
  }

  return body;
}

function getAnthropicContent(responseJson) {
  if (!responseJson || !Array.isArray(responseJson.content)) {
    return "";
  }

  return responseJson.content
    .filter((part) => part && part.type === "text" && typeof part.text === "string")
    .map((part) => part.text)
    .join("\n");
}

function buildGeminiBody(messages) {
  const systemText = messages
    .filter((message) => message.role === "system")
    .map((message) => message.content)
    .join("\n\n");
  const userText = messages
    .filter((message) => message.role !== "system")
    .map((message) => message.content)
    .join("\n\n");
  const prompt = [systemText, userText || "Connection test."]
    .filter(Boolean)
    .join("\n\n");
  return {
    contents: [
      {
        parts: [{ text: prompt }]
      }
    ]
  };
}

function getGeminiContent(responseJson) {
  const parts =
    responseJson &&
    responseJson.candidates &&
    responseJson.candidates[0] &&
    responseJson.candidates[0].content &&
    responseJson.candidates[0].content.parts;

  if (!Array.isArray(parts)) {
    return "";
  }

  return parts
    .filter((part) => part && typeof part.text === "string")
    .map((part) => part.text)
    .join("\n");
}

function buildGeminiUrl(apiUrl, model, apiKey) {
  const normalizedModel = normalizeGeminiModelName(model);
  return appendQueryParam(
    apiUrl.replace("{model}", encodeURIComponent(normalizedModel)),
    "key",
    apiKey
  );
}

function normalizeGeminiModelName(model) {
  return String(model || "").trim().replace(/^models\//, "");
}

function appendQueryParam(url, key, value) {
  if (new RegExp(`[?&]${key}=`).test(url)) {
    return url;
  }

  return `${url}${url.includes("?") ? "&" : "?"}${key}=${encodeURIComponent(value)}`;
}

function getUiText() {
  return isChineseUi() ? UI_TEXT.zh : UI_TEXT.en;
}

function isChineseUi() {
  const candidates = [
    document.documentElement && document.documentElement.lang,
    navigator.language,
    Array.isArray(navigator.languages) ? navigator.languages[0] : "",
    typeof moment !== "undefined" && moment.locale ? moment.locale() : ""
  ];

  return candidates.some((value) => /^zh/i.test(String(value || "")));
}

function getProviderApiKeyNote(provider, text) {
  if (text === UI_TEXT.zh) {
    if (provider.freeApiNote) {
      return `${provider.label} 可能提供免费、试用或赠送额度。发送私人笔记前，请确认当前额度、地区限制、计费规则、数据使用条款和隐私政策。`;
    }

    return text.providerDefaultNote;
  }

  return provider.freeApiNote || text.providerDefaultNote;
}

function getProviderApiKeyLabel(provider, text) {
  if (text === UI_TEXT.zh) {
    return `打开 ${provider.label} API Key`;
  }

  return provider.apiKeyUrlLabel || text.openApiKeys;
}

function getMissingRequiredMessage(plugin, text) {
  const missing = [];
  const provider = plugin.getProviderConfig();

  if (!plugin.settings.apiUrl || !plugin.settings.apiUrl.trim()) {
    missing.push(text.apiUrl);
  }

  if (!plugin.getApiKey()) {
    missing.push(text.apiKey);
  }

  if (
    provider.requiresModel &&
    (!plugin.settings.model || !plugin.settings.model.trim())
  ) {
    missing.push(text.model);
  }

  const suffix = missing.length === 1
    ? text.requiredSuffix
    : text.requiredSuffixPlural;
  return `${missing.join(", ")} ${suffix}`;
}

function getProgressPercent(summary) {
  if (!summary || !summary.total) {
    return 0;
  }

  return Math.round((summary.processed / summary.total) * 100);
}

function setBulkProgress(element, summary) {
  if (!summary || !summary.total) {
    element.style.display = "none";
    element.value = 0;
    return;
  }

  element.style.display = "";
  element.value = getProgressPercent(summary);
}

function setBulkStatus(element, status, message) {
  element.removeClass("auto-tagger-bulk-status-success");
  element.removeClass("auto-tagger-bulk-status-error");
  element.removeClass("auto-tagger-bulk-status-testing");

  if (status !== "idle") {
    element.addClass(`auto-tagger-bulk-status-${status}`);
  }

  element.setText(message);
}

function getBulkProgressMessage(summary, text) {
  const lines = [text.bulkProgress(summary)];

  if (summary.currentPath) {
    lines.push(text.bulkCurrent(summary.currentPath));
  }

  if (summary.lastError) {
    lines.push(text.bulkLastError(summary.lastError));
  }

  return lines.join("\n");
}

function getBulkFinalMessage(summary, text) {
  const lines = [
    summary.cancelled ? text.bulkCancelled(summary) : text.bulkDone(summary)
  ];

  if (summary.lastError) {
    lines.push(text.bulkLastError(summary.lastError));
  }

  return lines.join("\n");
}

function setTestResult(element, status, message, text) {
  element.removeClass("auto-tagger-test-result-success");
  element.removeClass("auto-tagger-test-result-error");
  element.removeClass("auto-tagger-test-result-testing");
  element.addClass(`auto-tagger-test-result-${status}`);

  const prefix = {
    success: `✓ ${text.successPrefix}: `,
    error: `! ${text.errorPrefix}: `,
    testing: ""
  }[status] || "";

  element.setText(`${prefix}${message}`);
}

function requiredName(name) {
  const fragment = document.createDocumentFragment();
  fragment.appendChild(document.createTextNode(name));
  const dot = document.createElement("span");
  dot.className = "auto-tagger-required-dot";
  dot.textContent = "●";
  fragment.appendChild(dot);
  return fragment;
}

function getApiErrorMessage(responseJson, responseText) {
  if (responseJson && responseJson.error) {
    if (typeof responseJson.error === "string") {
      return responseJson.error;
    }

    const details = Array.isArray(responseJson.error.details)
      ? responseJson.error.details
          .map((detail) => detail.reason || detail.message || detail["@type"])
          .filter(Boolean)
          .join("; ")
      : "";
    return [
      responseJson.error.status,
      responseJson.error.message,
      details
    ]
      .filter(Boolean)
      .join(" - ");
  }

  if (responseJson && (responseJson.message || responseJson.code)) {
    return [responseJson.code, responseJson.message].filter(Boolean).join(" - ");
  }

  if (typeof responseText === "string" && responseText.trim()) {
    return responseText.trim().slice(0, 800);
  }

  return "Request failed";
}

function getErrorMessage(error) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return "Unknown error";
}

function cleanApiKey(value) {
  return String(value || "")
    .trim()
    .replace(/^[`"'“”‘’]+/, "")
    .replace(/[`"'“”‘’]+$/, "")
    .trim();
}

function filterSuggestedTags(suggestedTags, candidateTags, currentTags) {
  const candidateByKey = new Map();
  for (const tag of candidateTags) {
    candidateByKey.set(tag.toLowerCase(), tag);
  }

  const currentKeys = new Set(currentTags.map((tag) => tag.toLowerCase()));
  const resultByKey = new Map();

  for (const rawTag of suggestedTags || []) {
    const normalized = normalizeTag(rawTag);
    if (!normalized) {
      continue;
    }

    const key = normalized.toLowerCase();
    const canonical = candidateByKey.get(key);
    if (!canonical || currentKeys.has(key)) {
      continue;
    }

    resultByKey.set(key, canonical);
  }

  return Array.from(resultByKey.values());
}

function normalizeFrontmatterTags(value) {
  if (Array.isArray(value)) {
    return value
      .map((tag) => (typeof tag === "string" ? tag.trim() : ""))
      .filter((tag) => normalizeTag(tag));
  }

  if (typeof value === "string") {
    return value
      .split(/[,\s]+/)
      .map((tag) => tag.trim())
      .filter((tag) => normalizeTag(tag));
  }

  return [];
}

function mergeTags(existingTags, tagsToAdd) {
  const tagsByKey = new Map();

  for (const tag of existingTags) {
    const normalized = normalizeTag(tag);
    if (!normalized) {
      continue;
    }

    tagsByKey.set(normalized.toLowerCase(), tag);
  }

  for (const tag of tagsToAdd) {
    const normalized = normalizeTag(tag);
    if (!normalized) {
      continue;
    }

    if (!tagsByKey.has(normalized.toLowerCase())) {
      tagsByKey.set(normalized.toLowerCase(), normalized);
    }
  }

  return Array.from(tagsByKey.values());
}

function normalizeTag(value) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().replace(/^#+/, "").trim();
}

function stripFrontmatter(content) {
  return content.replace(/^---\s*\n[\s\S]*?\n---\s*\n?/, "");
}

function truncateText(text, maxCharacters) {
  if (text.length <= maxCharacters) {
    return text;
  }

  return text.slice(0, maxCharacters);
}

function sanitizeNumber(value, defaultValue, minValue) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    return defaultValue;
  }

  return Math.max(parsed, minValue);
}

function withTimeout(promise, timeoutMs) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Request timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}
