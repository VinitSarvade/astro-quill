import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateText, createGateway, type LanguageModel } from "ai";
import { ok, err, ResultAsync, type Result } from "neverthrow";
import { ai } from "virtual:astro-quill/config";
import { aiApiKey } from "virtual:astro-quill/server";

const providers = {
  openai: { factory: createOpenAI, defaultModel: "gpt-4o" },
  anthropic: { factory: createAnthropic, defaultModel: "claude-sonnet-4-5" },
  openRouter: { factory: createOpenRouter, defaultModel: "anthropic/claude-sonnet-4.5" },
  vercelAIGateway: { factory: createGateway, defaultModel: "anthropic/claude-sonnet-4.5" },
} as const;

function resolveModel(): Result<LanguageModel, Error> {
  if (!ai?.provider) {
    return err(new Error("No AI provider configured. Set `ai.provider` in your Astro Quill options."));
  }
  if (!aiApiKey) {
    return err(new Error("API key is required. Set `ai.apiKey` in your Astro Quill options."));
  }

  if (!Object.hasOwn(providers, ai.provider)) {
    return err(new Error(`Unsupported provider: "${ai.provider}"`));
  }

  const entry = providers[ai.provider as keyof typeof providers];
  const client = entry.factory({ apiKey: aiApiKey, baseURL: ai.baseURL });
  return ok(client(ai.model || entry.defaultModel));
}

export function editMarkdown(markdownContent: string, instruction: string): ResultAsync<string, Error> {
  const modelResult = resolveModel();

  return modelResult.asyncAndThen((model) =>
    ResultAsync.fromPromise(
      generateText({
        model,
        system: `You are a content editor for a markdown-based website.
The user will describe a change. Apply it to the markdown below.
Return ONLY the updated markdown. No explanation. No code fences.
Do not modify frontmatter unless the user explicitly asks.
Do not add HTML. Do not change layout or structure beyond what is asked.`,
        prompt: `Instruction: ${instruction}\n\nMarkdown to edit:\n${markdownContent}`,
      }).then((result) => result.text.replace(/^```[a-z]*\n/, "").replace(/\n```$/, "")),
      (error) => (error instanceof Error ? error : new Error(String(error))),
    ),
  );
}
