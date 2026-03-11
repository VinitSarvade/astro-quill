/// <reference types="astro/client" />

declare module "virtual:astro-quill/config" {
  export const ai:
    | {
        provider?: "openai" | "anthropic" | "openRouter" | "vercelAIGateway";
        model?: string;
        baseURL?: string;
      }
    | undefined;
  export const github:
    | {
        owner?: string;
        repo?: string;
        baseBranch?: string;
      }
    | undefined;
}

declare module "virtual:astro-quill/server" {
  export const password: string | undefined;
  export const aiApiKey: string | undefined;
  export const githubToken: string | undefined;
}
