export interface AstroQuillOptions {
  password?: string;
  ai?: {
    /**
     * AI Gateway: use "provider/model" format, e.g. "anthropic/claude-sonnet-4.5"
     * Direct provider: use just the model name, e.g. "claude-sonnet-4-5"
     */
    model?: string;
    /** Required when using direct provider keys (not needed for AI Gateway). */
    provider?: "openai" | "anthropic" | "openRouter" | "vercelAIGateway";
    apiKey?: string;
    /** Override the provider endpoint, e.g. for OpenRouter or Vercel AI Gateway. */
    baseURL?: string;
  };
  github?: {
    token?: string;
    owner?: string;
    repo?: string;
    baseBranch?: string;
  };
}
