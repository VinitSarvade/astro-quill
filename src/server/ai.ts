import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateText, createGateway, type LanguageModel } from "ai";
import { ai } from "virtual:astro-quill/config";

const providers = {
  openai: { factory: createOpenAI, defaultModel: "gpt-4o" },
  anthropic: { factory: createAnthropic, defaultModel: "claude-sonnet-4-5" },
  openRouter: { factory: createOpenRouter, defaultModel: "anthropic/claude-sonnet-4.5" },
  vercelAIGateway: { factory: createGateway, defaultModel: "anthropic/claude-sonnet-4.5" },
} as const;

function resolveModel(): LanguageModel {
  if (!ai?.provider) {
    throw new Error("No AI provider configured. Set `ai.provider` in your Astro Quill options.");
  }
  if (!ai.apiKey) {
    throw new Error("API key is required. Set `ai.apiKey` in your Astro Quill options.");
  }

  const entry = providers[ai.provider as keyof typeof providers];
  if (!entry) {
    throw new Error(`Unsupported provider: "${ai.provider}"`);
  }

  const client = entry.factory({ apiKey: ai.apiKey, baseURL: ai.baseURL });
  return client(ai.model || entry.defaultModel);
}

export async function editMarkdown(markdownContent: string, instruction: string): Promise<string> {
  const model = resolveModel();
  const result = await generateText({
    model,
    system: `You are a content editor for a markdown-based website.
The user will describe a change. Apply it to the markdown below.
Return ONLY the updated markdown. No explanation. No code fences.
Do not modify frontmatter unless the user explicitly asks.
Do not add HTML. Do not change layout or structure beyond what is asked.`,
    prompt: `Instruction: ${instruction}\n\nMarkdown to edit:\n${markdownContent}`,
  });
  return result.text.replace(/^```[a-z]*\n/, "").replace(/\n```$/, "");
}
