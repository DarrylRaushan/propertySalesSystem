import "dotenv/config";

export const ENV = {
  get appId() { return process.env.VITE_APP_ID ?? ""; },
  get cookieSecret() { return process.env.JWT_SECRET ?? ""; },
  get databaseUrl() { return process.env.DATABASE_URL ?? ""; },
  get oAuthServerUrl() { return process.env.OAUTH_SERVER_URL ?? ""; },
  get ownerOpenId() { return process.env.OWNER_OPEN_ID ?? ""; },
  get isProduction() { return process.env.NODE_ENV === "production"; },
  get forgeApiUrl() { return process.env.BUILT_IN_FORGE_API_URL ?? ""; },
  get forgeApiKey() { return process.env.BUILT_IN_FORGE_API_KEY ?? ""; },
  get openaiApiKey() { return process.env.OPENAI_API_KEY ?? ""; },
  get openaiBaseUrl() { return process.env.OPENAI_BASE_URL ?? ""; },
  get geminiApiKey() { return process.env.GEMINI_API_KEY ?? ""; },
  get deepseekApiKey() { return process.env.DEEPSEEK_API_KEY ?? ""; },
  get groqApiKey() { return process.env.GROQ_API_KEY ?? ""; },
  get aiModel() { return process.env.AI_MODEL ?? ""; },
  get aiProvider() { return process.env.AI_PROVIDER ?? ""; },
  get summaryAiProvider() { return process.env.SUMMARY_AI_PROVIDER ?? "gemini"; },
  get summaryAiModel() { return process.env.SUMMARY_AI_MODEL ?? "gemini-3.6-flash"; },
};



