import { ENV } from "./env";

export type Role = "system" | "user" | "assistant" | "tool" | "function";

export type TextContent = {
  type: "text";
  text: string;
};

export type ImageContent = {
  type: "image_url";
  image_url: {
    url: string;
    detail?: "auto" | "low" | "high";
  };
};

export type FileContent = {
  type: "file_url";
  file_url: {
    url: string;
    mime_type?: "audio/mpeg" | "audio/wav" | "application/pdf" | "audio/mp4" | "video/mp4" ;
  };
};

export type MessageContent = string | TextContent | ImageContent | FileContent;

export type Message = {
  role: Role;
  content: MessageContent | MessageContent[];
  name?: string;
  tool_call_id?: string;
};

export type Tool = {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  };
};

export type ToolChoicePrimitive = "none" | "auto" | "required";
export type ToolChoiceByName = { name: string };
export type ToolChoiceExplicit = {
  type: "function";
  function: {
    name: string;
  };
};

export type ToolChoice =
  | ToolChoicePrimitive
  | ToolChoiceByName
  | ToolChoiceExplicit;

export type InvokeParams = {
  messages: Message[];
  tools?: Tool[];
  toolChoice?: ToolChoice;
  tool_choice?: ToolChoice;
  maxTokens?: number;
  max_tokens?: number;
  outputSchema?: OutputSchema;
  output_schema?: OutputSchema;
  responseFormat?: ResponseFormat;
  response_format?: ResponseFormat;
  model?: string;
  thinking?: Record<string, unknown>;
  reasoning?: Record<string, unknown>;
};

export type ToolCall = {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
};

export type InvokeResult = {
  id: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: Role;
      content: string | Array<TextContent | ImageContent | FileContent>;
      tool_calls?: ToolCall[];
    };
    finish_reason: string | null;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
};

export type JsonSchema = {
  name: string;
  schema: Record<string, unknown>;
  strict?: boolean;
};

export type OutputSchema = JsonSchema;

export type ResponseFormat =
  | { type: "text" }
  | { type: "json_object" }
  | { type: "json_schema"; json_schema: JsonSchema };

const ensureArray = (
  value: MessageContent | MessageContent[]
): MessageContent[] => (Array.isArray(value) ? value : [value]);

const normalizeContentPart = (
  part: MessageContent
): TextContent | ImageContent | FileContent => {
  if (typeof part === "string") {
    return { type: "text", text: part };
  }

  if (part.type === "text") {
    return part;
  }

  if (part.type === "image_url") {
    return part;
  }

  if (part.type === "file_url") {
    return part;
  }

  throw new Error("Unsupported message content part");
};

const normalizeMessage = (message: Message) => {
  const { role, name, tool_call_id } = message;

  if (role === "tool" || role === "function") {
    const content = ensureArray(message.content)
      .map(part => (typeof part === "string" ? part : JSON.stringify(part)))
      .join("\n");

    return {
      role,
      name,
      tool_call_id,
      content,
    };
  }

  const contentParts = ensureArray(message.content).map(normalizeContentPart);

  // If there's only text content, collapse to a single string for compatibility
  if (contentParts.length === 1 && contentParts[0].type === "text") {
    return {
      role,
      name,
      content: contentParts[0].text,
    };
  }

  return {
    role,
    name,
    content: contentParts,
  };
};

const normalizeToolChoice = (
  toolChoice: ToolChoice | undefined,
  tools: Tool[] | undefined
): "none" | "auto" | ToolChoiceExplicit | undefined => {
  if (!toolChoice) return undefined;

  if (toolChoice === "none" || toolChoice === "auto") {
    return toolChoice;
  }

  if (toolChoice === "required") {
    if (!tools || tools.length === 0) {
      throw new Error(
        "tool_choice 'required' was provided but no tools were configured"
      );
    }

    if (tools.length > 1) {
      throw new Error(
        "tool_choice 'required' needs a single tool or specify the tool name explicitly"
      );
    }

    return {
      type: "function",
      function: { name: tools[0].function.name },
    };
  }

  if ("name" in toolChoice) {
    return {
      type: "function",
      function: { name: toolChoice.name },
    };
  }

  return toolChoice;
};

export interface LLMRuntimeConfig {
  provider?: "gemini" | "openai" | "deepseek" | "groq" | "openrouter" | "ollama" | "custom" | "auto";
  apiKey?: string;
  baseUrl?: string;
  model?: string;
}

// In-memory runtime override settings (can be updated via UI)
let runtimeConfig: LLMRuntimeConfig = {};

export function setLLMRuntimeConfig(config: Partial<LLMRuntimeConfig>) {
  runtimeConfig = { ...runtimeConfig, ...config };
}

export function getLLMRuntimeConfig(): {
  provider: string;
  model: string;
  baseUrl: string;
  hasKey: boolean;
  maskedKey: string;
} {
  const effective = resolveEffectiveConfig();
  const rawKey = effective.apiKey || "";
  const maskedKey = rawKey.length > 8
    ? `${rawKey.slice(0, 4)}••••${rawKey.slice(-4)}`
    : rawKey.length > 0
    ? "••••••••"
    : "";

  return {
    provider: effective.provider,
    model: effective.model,
    baseUrl: effective.baseUrl,
    hasKey: rawKey.length > 0,
    maskedKey,
  };
}

export function resolveEffectiveConfig(): {
  provider: string;
  apiKey: string;
  baseUrl: string;
  model: string;
} {
  // 1. Check runtime overrides
  const customKey = runtimeConfig.apiKey?.trim();
  const customBaseUrl = runtimeConfig.baseUrl?.trim();
  const customModel = runtimeConfig.model?.trim();
  const customProvider = runtimeConfig.provider;

  // 2. Determine Provider
  let provider = customProvider || ENV.aiProvider || "auto";
  if (provider === "auto" || !provider) {
    if (customKey) {
      if (customKey.startsWith("AIzaSy")) provider = "gemini";
      else if (customKey.startsWith("gsk_")) provider = "groq";
      else if (customKey.startsWith("sk-or-v1-")) provider = "openrouter";
      else if (customKey.startsWith("sk-")) provider = "openai";
      else provider = "gemini";
    } else if (ENV.groqApiKey) {
      provider = "groq";
    } else if (ENV.geminiApiKey) {
      provider = "gemini";
    } else if (ENV.deepseekApiKey) {
      provider = "deepseek";
    } else if (ENV.openaiApiKey) {
      provider = "openai";
    } else if (ENV.forgeApiKey) {
      provider = "forge";
    } else {
      provider = "groq";
    }
  }

  // 3. Resolve API Key based on provider
  let apiKey = customKey || "";
  if (!apiKey) {
    switch (provider) {
      case "groq":
        apiKey = ENV.groqApiKey || ENV.openaiApiKey || "";
        break;
      case "gemini":
        apiKey = ENV.geminiApiKey || "";
        break;
      case "deepseek":
        apiKey = ENV.deepseekApiKey || ENV.openaiApiKey || "";
        break;
      case "openai":
        apiKey = ENV.openaiApiKey || "";
        break;
      case "forge":
        apiKey = ENV.forgeApiKey || "";
        break;
      default:
        apiKey =
          ENV.groqApiKey ||
          ENV.geminiApiKey ||
          ENV.openaiApiKey ||
          ENV.deepseekApiKey ||
          "";
        break;
    }
  }

  // 4. Resolve Base URL
  let baseUrl = customBaseUrl || ENV.openaiBaseUrl || "";
  if (!baseUrl) {
    switch (provider) {
      case "gemini":
        baseUrl = "https://generativelanguage.googleapis.com/v1beta/openai";
        break;
      case "openai":
        baseUrl = "https://api.openai.com/v1";
        break;
      case "deepseek":
        baseUrl = "https://api.deepseek.com";
        break;
      case "groq":
        baseUrl = "https://api.groq.com/openai/v1";
        break;
      case "openrouter":
        baseUrl = "https://openrouter.ai/api/v1";
        break;
      case "ollama":
        baseUrl = "http://localhost:11434/v1";
        break;
      case "forge":
        baseUrl = ENV.forgeApiUrl || "https://forge.manus.im/v1";
        break;
      default:
        baseUrl = "https://api.groq.com/openai/v1";
        break;
    }
  }

  // 5. Resolve Default Model
  let model = customModel || ENV.aiModel || "";
  if (!model) {
    switch (provider) {
      case "gemini":
        model = "gemini-3.6-flash";
        break;
      case "openai":
        model = "gpt-4o-mini";
        break;
      case "deepseek":
        model = "deepseek-chat";
        break;
      case "groq":
        model = "qwen/qwen3.6-27b";
        break;
      case "openrouter":
        model = "google/gemini-2.0-flash-exp:free";
        break;
      case "ollama":
        model = "llama3.2";
        break;
      default:
        model = "gemini-3.6-flash";
        break;
    }
  }


  return {
    provider,
    apiKey,
    baseUrl: baseUrl.replace(/\/$/, ""),
    model,
  };
}


export const resolveApiKey = () => {
  return resolveEffectiveConfig().apiKey;
};

export const hasLLMConfigured = () => {
  return resolveApiKey().trim().length > 0;
};

const resolveApiUrl = () => {
  const config = resolveEffectiveConfig();
  if (config.baseUrl.endsWith("/chat/completions")) {
    return config.baseUrl;
  }
  return `${config.baseUrl}/chat/completions`;
};

const assertApiKey = () => {
  if (!hasLLMConfigured()) {
    throw new Error("No LLM API Key is configured. Please provide a GEMINI_API_KEY, OPENAI_API_KEY, or configure it in AI Settings.");
  }
};

const normalizeResponseFormat = ({
  responseFormat,
  response_format,
  outputSchema,
  output_schema,
}: {
  responseFormat?: ResponseFormat;
  response_format?: ResponseFormat;
  outputSchema?: OutputSchema;
  output_schema?: OutputSchema;
}):
  | { type: "json_schema"; json_schema: JsonSchema }
  | { type: "text" }
  | { type: "json_object" }
  | undefined => {
  const explicitFormat = responseFormat || response_format;
  if (explicitFormat) {
    if (
      explicitFormat.type === "json_schema" &&
      !explicitFormat.json_schema?.schema
    ) {
      throw new Error(
        "responseFormat json_schema requires a defined schema object"
      );
    }
    return explicitFormat;
  }

  const schema = outputSchema || output_schema;
  if (!schema) return undefined;

  if (!schema.name || !schema.schema) {
    throw new Error("outputSchema requires both name and schema");
  }

  return {
    type: "json_schema",
    json_schema: {
      name: schema.name,
      schema: schema.schema,
      ...(typeof schema.strict === "boolean" ? { strict: schema.strict } : {}),
    },
  };
};

const RETRY_MAX_RETRIES = process.env.NODE_ENV === "test" ? 0 : 2;
const RETRY_BASE_DELAY_MS = 200;
const RETRY_MAX_DELAY_MS = 4_000;

type FetchInit = NonNullable<Parameters<typeof fetch>[1]>;

const sleep = (ms: number) =>
  new Promise<void>(resolve => setTimeout(resolve, ms));

const parseRetryAfter = (value: string | null): number | undefined => {
  if (!value) return undefined;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const at = Date.parse(value);
  return Number.isNaN(at) ? undefined : Math.max(0, at - Date.now());
};

const computeBackoffDelay = (
  attempt: number,
  retryAfterMs?: number
): number => {
  const cap = Math.min(RETRY_BASE_DELAY_MS * 2 ** attempt, RETRY_MAX_DELAY_MS);
  const jittered = cap / 2 + Math.random() * (cap / 2);
  return Math.min(Math.max(jittered, retryAfterMs ?? 0), RETRY_MAX_DELAY_MS);
};

const fetchWithBackoff = async (
  url: string,
  init: FetchInit
): Promise<Response> => {
  let lastError: unknown;

  for (let attempt = 0; attempt <= RETRY_MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(url, init);
      if (response.ok || attempt === RETRY_MAX_RETRIES) {
        return response;
      }

      const retryAfterMs = parseRetryAfter(
        response.headers.get("retry-after")
      );
      try {
        await response.body?.cancel();
      } catch {
        // Body already settled; nothing to clean up.
      }
      console.warn(
        `LLM request retry ${attempt + 1}/${RETRY_MAX_RETRIES} after status ${response.status}`
      );
      await sleep(computeBackoffDelay(attempt, retryAfterMs));
    } catch (error) {
      lastError = error;
      if (attempt === RETRY_MAX_RETRIES) throw error;
      console.warn(
        `LLM request retry ${attempt + 1}/${RETRY_MAX_RETRIES} after network error`
      );
      await sleep(computeBackoffDelay(attempt));
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("LLM request failed after exhausting retries");
};

export async function invokeLLM(params: InvokeParams): Promise<InvokeResult> {
  assertApiKey();

  const config = resolveEffectiveConfig();

  const {
    messages,
    tools,
    toolChoice,
    tool_choice,
    outputSchema,
    output_schema,
    responseFormat,
    response_format,
    model,
    thinking,
    reasoning,
    maxTokens,
    max_tokens,
  } = params;

  const selectedModel = model || config.model;

  const payload: Record<string, unknown> = {
    messages: messages.map(normalizeMessage),
    model: selectedModel,
  };

  if (tools && tools.length > 0) {
    payload.tools = tools;
  }

  const normalizedToolChoice = normalizeToolChoice(
    toolChoice || tool_choice,
    tools
  );
  if (normalizedToolChoice) {
    payload.tool_choice = normalizedToolChoice;
  }

  const resolvedMaxTokens = max_tokens ?? maxTokens;
  if (typeof resolvedMaxTokens === "number") {
    payload.max_tokens = resolvedMaxTokens;
  }

  if (thinking) {
    payload.thinking = thinking;
  }
  if (reasoning) {
    payload.reasoning = reasoning;
  }

  const normalizedResponseFormat = normalizeResponseFormat({
    responseFormat,
    response_format,
    outputSchema,
    output_schema,
  });

  if (normalizedResponseFormat) {
    payload.response_format = normalizedResponseFormat;
  }

  const headers: Record<string, string> = {
    "content-type": "application/json",
  };

  if (config.apiKey) {
    headers["authorization"] = `Bearer ${config.apiKey}`;
  }

  const targetUrl = resolveApiUrl();

  const response = await fetchWithBackoff(targetUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `LLM invoke failed (${config.provider} - ${selectedModel}): ${response.status} ${response.statusText} – ${errorText}`
    );
  }

  return (await response.json()) as InvokeResult;
}

export async function testLLMConnection(testConfig?: LLMRuntimeConfig): Promise<{
  success: boolean;
  provider: string;
  model: string;
  latencyMs: number;
  message?: string;
  error?: string;
}> {
  if (testConfig) {
    setLLMRuntimeConfig(testConfig);
  }

  const config = resolveEffectiveConfig();
  const startTime = Date.now();

  try {
    const res = await invokeLLM({
      messages: [
        { role: "user", content: "Reply with 'LLM connection successful' in 4 words." },
      ],
      max_tokens: 20,
    });

    const latencyMs = Date.now() - startTime;
    const replyText = typeof res.choices[0]?.message.content === "string"
      ? res.choices[0].message.content
      : "Connected";

    return {
      success: true,
      provider: config.provider,
      model: config.model,
      latencyMs,
      message: replyText,
    };
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    return {
      success: false,
      provider: config.provider,
      model: config.model,
      latencyMs,
      error: err?.message || String(err),
    };
  }
}

export type ModelInfo = {
  id: string;
  object: string;
  created: number;
  owned_by: string;
};

export type ModelsResponse = {
  object: string;
  data: ModelInfo[];
};

export async function listLLMModels(): Promise<ModelsResponse> {
  const config = resolveEffectiveConfig();
  assertApiKey();

  const url = `${config.baseUrl}/models`;

  const response = await fetchWithBackoff(url, {
    headers: { authorization: `Bearer ${config.apiKey}` },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `List LLM models failed: ${response.status} ${response.statusText} – ${errorText}`
    );
  }

  return (await response.json()) as ModelsResponse;
}

export async function invokeSummaryLLM(params: InvokeParams): Promise<InvokeResult> {
  const geminiKey = ENV.geminiApiKey || resolveEffectiveConfig().apiKey;
  const baseUrl = "https://generativelanguage.googleapis.com/v1beta/openai";
  const model = ENV.summaryAiModel || "gemini-3.6-flash";

  const {
    messages,
    maxTokens,
    max_tokens,
  } = params;

  const payload: Record<string, unknown> = {
    messages: messages.map(normalizeMessage),
    model,
  };

  const resolvedMaxTokens = max_tokens ?? maxTokens;
  if (typeof resolvedMaxTokens === "number") {
    payload.max_tokens = resolvedMaxTokens;
  }

  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  if (geminiKey) {
    headers["authorization"] = `Bearer ${geminiKey}`;
  }

  const response = await fetchWithBackoff(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Summary LLM failed (Gemini - ${model}): ${response.status} – ${errorText}`);
  }

  return (await response.json()) as InvokeResult;
}


