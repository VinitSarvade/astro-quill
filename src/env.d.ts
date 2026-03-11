/// <reference types="astro/client" />

declare module "virtual:astro-quill/config" {
  export const password: string | undefined;
  export const ai:
    | {
        provider?: "openai" | "anthropic" | "openRouter" | "vercelAIGateway";
        apiKey?: string;
        model?: string;
        baseURL?: string;
      }
    | undefined;
  export const github:
    | {
        token?: string;
        owner?: string;
        repo?: string;
        baseBranch?: string;
      }
    | undefined;
}
