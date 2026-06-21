const assert = require("node:assert/strict");
const fs = require("node:fs");
const Module = require("node:module");
const path = require("node:path");

const rootDir = path.resolve(__dirname, "..");
const mainPath = path.join(rootDir, "main.js");

function loadMainForTests() {
  const source = fs.readFileSync(mainPath, "utf8");
  const testSource = `${source}

module.exports.__test = {
  buildPrompt,
  parseTagsFromModelContent,
  getOpenAICompatibleContent,
  buildAnthropicBody,
  getAnthropicContent,
  buildGeminiBody,
  getGeminiContent,
  buildGeminiUrl,
  normalizeGeminiModelName,
  appendQueryParam,
  cleanApiKey,
  filterSuggestedTags,
  normalizeFrontmatterTags,
  mergeTags,
  normalizeTag,
  stripFrontmatter,
  truncateText,
  sanitizeNumber
};
`;
  const testModule = new Module(mainPath, module);
  testModule.filename = mainPath;
  testModule.paths = Module._nodeModulePaths(rootDir);

  const originalLoad = Module._load;
  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === "obsidian") {
      class Plugin {}
      class PluginSettingTab {}
      class Setting {}
      class TFile {}

      return {
        Plugin,
        PluginSettingTab,
        Setting,
        TFile,
        getAllTags: () => [],
        requestUrl: async () => ({ status: 200, json: {}, text: "" })
      };
    }

    return originalLoad.call(this, request, parent, isMain);
  };

  try {
    testModule._compile(testSource, mainPath);
    return testModule.exports.__test;
  } finally {
    Module._load = originalLoad;
  }
}

function runTest(name, testFn) {
  try {
    testFn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`not ok - ${name}`);
    throw error;
  }
}

const helpers = loadMainForTests();

runTest("parseTagsFromModelContent accepts fenced JSON", () => {
  assert.deepEqual(
    helpers.parseTagsFromModelContent('```json\n{"tags":["ai","#work"]}\n```'),
    ["ai", "#work"]
  );
});

runTest("parseTagsFromModelContent ignores non-JSON output", () => {
  assert.deepEqual(helpers.parseTagsFromModelContent("tags: ai, work"), []);
});

runTest("filterSuggestedTags keeps only existing non-current tags", () => {
  assert.deepEqual(
    helpers.filterSuggestedTags(
      ["#AI", "writing", "new-tag", "Writing"],
      ["ai", "Writing"],
      ["ai"]
    ),
    ["Writing"]
  );
});

runTest("normalizeFrontmatterTags supports arrays and strings", () => {
  assert.deepEqual(
    helpers.normalizeFrontmatterTags([" ai ", 12, "#work"]),
    ["ai", "#work"]
  );
  assert.deepEqual(
    helpers.normalizeFrontmatterTags("ai, work #daily"),
    ["ai", "work", "#daily"]
  );
});

runTest("mergeTags preserves existing casing and appends new tags", () => {
  assert.deepEqual(
    helpers.mergeTags(["AI", "writing"], ["ai", "Research"]),
    ["AI", "writing", "Research"]
  );
});

runTest("stripFrontmatter removes only leading frontmatter", () => {
  assert.equal(
    helpers.stripFrontmatter("---\ntags: [ai]\n---\nBody\n---\nLater"),
    "Body\n---\nLater"
  );
});

runTest("buildAnthropicBody separates system and user messages", () => {
  assert.deepEqual(
    helpers.buildAnthropicBody(
      [
        { role: "system", content: "System" },
        { role: "user", content: "User" }
      ],
      "claude-test"
    ),
    {
      model: "claude-test",
      max_tokens: 1024,
      temperature: 0,
      messages: [{ role: "user", content: "User" }],
      system: "System"
    }
  );
});

runTest("buildGeminiUrl normalizes model names and appends key once", () => {
  assert.equal(
    helpers.buildGeminiUrl(
      "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
      "models/gemini-2.5-flash",
      "abc 123"
    ),
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=abc%20123"
  );
  assert.equal(
    helpers.appendQueryParam("https://example.com?key=old", "key", "new"),
    "https://example.com?key=old"
  );
});

runTest("provider content readers extract plain text", () => {
  assert.equal(
    helpers.getOpenAICompatibleContent({
      choices: [{ message: { content: "openai" } }]
    }),
    "openai"
  );
  assert.equal(
    helpers.getAnthropicContent({
      content: [{ type: "text", text: "anthropic" }, { type: "image" }]
    }),
    "anthropic"
  );
  assert.equal(
    helpers.getGeminiContent({
      candidates: [{ content: { parts: [{ text: "gemini" }] } }]
    }),
    "gemini"
  );
});

runTest("cleanApiKey trims copied quote characters", () => {
  assert.equal(helpers.cleanApiKey(" “sk-test” "), "sk-test");
});

runTest("sanitizeNumber enforces defaults and minimums", () => {
  assert.equal(helpers.sanitizeNumber("abc", 60, 10), 60);
  assert.equal(helpers.sanitizeNumber("5", 60, 10), 10);
  assert.equal(helpers.sanitizeNumber("30", 60, 10), 30);
});

console.log("All lightweight tests passed.");
