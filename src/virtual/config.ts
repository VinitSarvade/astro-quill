export const virtualModuleName = "virtual:astro-quill/config";
export const resolvedVirtualModuleId = "\0" + virtualModuleName;

export const virtualServerModuleName = "virtual:astro-quill/server";
export const resolvedVirtualServerModuleId = "\0" + virtualServerModuleName;

export const virtualModuleDts = `
declare module '${virtualModuleName}' {
  export const ai: {
    provider?: 'openai' | 'anthropic' | 'openRouter' | 'vercelAIGateway';
    model?: string;
    baseURL?: string;
  } | undefined;
  export const github: {
    owner?: string;
    repo?: string;
    baseBranch?: string;
  } | undefined;
}

declare module '${virtualServerModuleName}' {
  export const password: string | undefined;
  export const aiApiKey: string | undefined;
  export const githubToken: string | undefined;
}
`;
