import type { InvokeResult, Message } from "./_core/llm";
import { invokeLLM, hasLLMConfigured, resolveEffectiveConfig } from "./_core/llm";
import {
  getLiveSystemDataContext,
  formatSystemContextForPrompt,
  formatCustomerContextForPrompt,
  type SystemDataContext,
} from "./aiContext";
import {
  generateSmartAIResponse,
  generateCustomerSmartAIResponse,
} from "./aiSmartFallback";
import * as dbFeature from "./db-feature";

export type ChatMessage = { role: "user" | "assistant"; content: string };

export const SYSTEM_PROMPT_HEADER = `You are the AI Chief Sales Strategist & Intelligence Engine for a premier Malaysian property sales platform.
You have direct, real-time access to the entire live CRM database including Leads, Properties, Confirmed Buyers, Pipeline Stages, Enquiry Sources, and Sales Performance Trends.

CORE CAPABILITIES & REASONING GUIDELINES:
1. Deep Analytical Thinking: When answering complex queries (lead prioritization, funnel conversion analysis, buyer-property matching, risk mitigation, price benchmarking), break down the problem step-by-step.
   You may write your internal analytical reasoning inside <think>...</think> tags at the beginning of your response.
   In your thinking block, calculate relevant metrics, compare database records, evaluate buyer budgets against property prices, and assess pipeline conversion drops.
2. High-Impact Strategic Advice:
   - Currency: Always use Malaysian Ringgit (RM) with proper formatting (e.g., RM 1,450,000 or RM 1.45M).
   - Specificity: Quote exact names, property titles, unit prices, stage counts, and contact data from the LIVE CRM DATA provided below.
   - Next Best Actions: For every lead or listing analyzed, provide clear tactical recommendations (e.g. WhatsApp follow-up script, private showroom booking, targeted developer incentive).
3. Visuals & Action Blocks:
   - When visual data or comparison is requested or helpful, generate a JSON chart block enclosed in <<<CHART_DATA and >>>.
   - When presenting action items or prioritization lists, generate a JSON decision block enclosed in <<<DECISION_CARD and >>>.

CHART SPECIFICATION:
<<<CHART_DATA
{
  "type": "bar" | "line" | "pie" | "donut",
  "title": "Chart Title Here",
  "description": "Short subtitle or summary",
  "data": [
    { "label": "Category 1", "value": 120, "formatted": "RM 120k" },
    { "label": "Category 2", "value": 250, "formatted": "RM 250k" }
  ],
  "xKey": "label",
  "yKey": "value",
  "color": "#284762"
}
>>>

DECISION CARD SPECIFICATION:
<<<DECISION_CARD
{
  "title": "Decision & Action Plan",
  "recommendations": [
    {
      "leadId": 1,
      "name": "Marcus Tan",
      "property": "Pavilion Damansara",
      "value": "RM 1,200,000",
      "probability": "85%",
      "action": "Offer priority unit release before weekend",
      "urgency": "High"
    }
  ],
  "quickActions": [
    { "label": "View Leads", "target": "/leads" },
    { "label": "Explore Properties", "target": "/properties" }
  ]
}
>>>
`;

export const CUSTOMER_CONCIERGE_PROMPT_HEADER = `You are the Virtual Butler & Luxury Property Concierge for Properly Marketplace in Malaysia.
You are a distinguished, polite, warm, and highly knowledgeable personal concierge speaking directly to prospective property buyers, homeowners, and real estate investors.

YOUR CORE ROLE & GUIDELINES:
1. Help buyers explore and compare our active residential listings (prices, bedroom counts, square footage, amenities, developer reputation, locations such as KLCC, Damansara Heights, Mont Kiara, Bangsar, etc.).
2. Explain Malaysian property regulations accurately:
   - Foreign purchaser rules: Minimum purchase threshold is RM 1,000,000 for strata in Kuala Lumpur (RM 2,000,000 in Selangor), State Authority Consent (EPU), and MM2H perks.
   - Malaysian tiered MOT stamp duty schedule: 1% first RM100k, 2% up to RM500k, 3% up to RM1M, 4% above RM1M.
   - Housing loans & DSR affordability: typical commercial bank mortgage rates ~4.10% – 4.35% p.a., loan tenure up to 30–35 years, recommended max DSR 60%–70%.
   - Rental yield benchmarks (e.g. 5.2% – 6.5% for prime KL/Selangor residences).
3. Tone & Demeanor:
   - Sophisticated, warm, encouraging, and clear.
   - Format answers with clean markdown headings and bullet points.
4. ABSOLUTE PRIVACY & SECURITY RESTRICTIONS:
   - You are chatting with an external customer/buyer.
   - DO NOT reveal or reference ANY internal CRM data, lead names, client identities, sales pipeline figures, conversion percentages, internal profit margins, or commissions.
   - If asked about company internal sales or leads, politely state that you specialize in property recommendations, neighborhood insights, and buyer advisory.
`;

export function buildAssistantMessages(
  messages: ChatMessage[],
  systemContextStr?: string
): Message[] {
  const fullSystemPrompt = systemContextStr
    ? `${SYSTEM_PROMPT_HEADER}\n\n${systemContextStr}`
    : SYSTEM_PROMPT_HEADER;

  return [
    { role: "system", content: fullSystemPrompt },
    ...messages.map((message) => ({ role: message.role, content: message.content })),
  ];
}

export function buildCustomerAssistantMessages(
  messages: ChatMessage[],
  customerContextStr?: string
): Message[] {
  const fullSystemPrompt = customerContextStr
    ? `${CUSTOMER_CONCIERGE_PROMPT_HEADER}\n\n${customerContextStr}`
    : CUSTOMER_CONCIERGE_PROMPT_HEADER;

  return [
    { role: "system", content: fullSystemPrompt },
    ...messages.map((message) => ({ role: message.role, content: message.content })),
  ];
}

export function extractAssistantText(response: InvokeResult): string {
  const content = response.choices[0]?.message.content;
  if (typeof content === "string" && content.trim()) return content.trim();
  if (Array.isArray(content)) {
    const text = content
      .filter((part) => part.type === "text")
      .map((part) => (part as { type: "text"; text: string }).text)
      .join("\n")
      .trim();
    if (text) return text;
  }
  return "I could not generate a response just now. Please try again.";
}

export async function processAiChat(
  messages: ChatMessage[],
  mode: "agent" | "customer" = "agent"
): Promise<{
  content: string;
  provider?: string;
  model?: string;
  isLlm?: boolean;
}> {
  const lastUserMessage = messages[messages.length - 1]?.content || "";
  const effectiveConfig = resolveEffectiveConfig();

  // ─── CUSTOMER CONCIERGE MODE (Strict Privacy & Property-Only) ────────────
  if (mode === "customer") {
    let properties: Array<any> = [];
    try {
      properties = await dbFeature.listProperties({ activeOnly: true });
    } catch (err) {
      console.error("[Customer AI Concierge] Error fetching properties:", err);
    }

    const customerContextStr = formatCustomerContextForPrompt(properties, lastUserMessage);

    if (hasLLMConfigured()) {
      try {
        const response = await invokeLLM({
          messages: buildCustomerAssistantMessages(messages, customerContextStr),
          max_tokens: 2000,
        });
        const text = extractAssistantText(response);
        if (text && !text.includes("could not generate")) {
          // Strip any think tags or internal blocks from customer view
          const cleanText = text.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
          return {
            content: cleanText,
            provider: effectiveConfig.provider,
            model: effectiveConfig.model,
            isLlm: true,
          };
        }
      } catch (llmError: any) {
        console.warn("[Customer AI Concierge] LLM invoke error:", llmError);
        const fallbackResponse = generateCustomerSmartAIResponse(lastUserMessage, properties);
        return {
          content: fallbackResponse,
          provider: "local-fallback",
          model: "Customer-Concierge-Engine",
          isLlm: false,
        };
      }
    }

    const fallbackResponse = generateCustomerSmartAIResponse(lastUserMessage, properties);
    return {
      content: fallbackResponse,
      provider: "local-fallback",
      model: "Customer-Concierge-Engine",
      isLlm: false,
    };
  }

  // ─── AGENT MODE (Full CRM & Sales Strategy Capabilities) ─────────────────
  let context: SystemDataContext;
  try {
    context = await getLiveSystemDataContext();
  } catch (err) {
    console.error("[AI Assistant] Error fetching live system context:", err);
    context = {
      metrics: {
        totalLeads: 0,
        highPriority: 0,
        activeProperties: 0,
        expectedSalesValue: 0,
        totalCustomers: 0,
        priorityDistribution: [],
      },
      leadsSummary: [],
      propertiesSummary: [],
      customersSummary: [],
      salesTrend: [],
      pipelineStages: [],
      enquirySources: [],
      followUpHealth: [],
    };
  }

  const systemContextStr = formatSystemContextForPrompt(context, lastUserMessage);

  // If LLM is configured, invoke LLM
  if (hasLLMConfigured()) {
    try {
      const response = await invokeLLM({
        messages: buildAssistantMessages(messages, systemContextStr),
        max_tokens: 2500,
      });
      const text = extractAssistantText(response);
      if (text && !text.includes("could not generate")) {
        return {
          content: text,
          provider: effectiveConfig.provider,
          model: effectiveConfig.model,
          isLlm: true,
        };
      }
    } catch (llmError: any) {
      console.warn("[AI Assistant] LLM invoke error:", llmError);
      const fallbackResponse = generateSmartAIResponse(lastUserMessage, context);
      return {
        content: `> ⚠️ **Notice**: LLM query error (*${llmError?.message || "Check API Key/Quota"}*). Switched to Local Database Intelligence Engine.\n\n${fallbackResponse}`,
        provider: "local-fallback",
        model: "Smart-Heuristic-Engine",
        isLlm: false,
      };
    }
  }

  // Use smart deterministic local engine with real live database data & chart generation
  const fallbackResponse = generateSmartAIResponse(lastUserMessage, context);
  return {
    content: fallbackResponse,
    provider: "local-fallback",
    model: "Smart-Heuristic-Engine",
    isLlm: false,
  };
}

export async function generateExecutiveSummary(
  type: "pipeline" | "leads" | "properties" | "custom",
  prompt?: string
): Promise<{ summary: string; provider: string; model: string }> {
  let context: SystemDataContext;
  try {
    context = await getLiveSystemDataContext();
  } catch {
    context = {
      metrics: { totalLeads: 0, highPriority: 0, activeProperties: 0, expectedSalesValue: 0, totalCustomers: 0, priorityDistribution: [] },
      leadsSummary: [],
      propertiesSummary: [],
      customersSummary: [],
      salesTrend: [],
      pipelineStages: [],
      enquirySources: [],
      followUpHealth: [],
    };
  }

  const contextStr = formatSystemContextForPrompt(context);

  const systemPrompt = `You are the Chief Real Estate Analyst providing crisp, high-impact executive summaries for sales directors in Malaysia.
Always quote actual figures, property titles, and lead values in Malaysian Ringgit (RM). Provide structured markdown with bold metrics and actionable takeaways.

${contextStr}`;

  const userPrompt =
    prompt ||
    `Generate an executive briefing on our active ${type} covering performance highlights, top priorities, conversion risks, and strategic next steps.`;

  try {
    const { invokeSummaryLLM } = await import("./_core/llm");
    const res = await invokeSummaryLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 1500,
    });
    const text = extractAssistantText(res);
    return {
      summary: text,
      provider: "gemini",
      model: res.model || "gemini-3.6-flash",
    };
  } catch (err) {
    console.warn("[AI Summary] Gemini summary failed, attempting Groq fallback:", err);
    const effectiveConfig = resolveEffectiveConfig();
    const res = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 1500,
    });
    return {
      summary: extractAssistantText(res),
      provider: effectiveConfig.provider || "groq",
      model: res.model || effectiveConfig.model || "qwen/qwen3.6-27b",
    };
  }
}

export async function explainBuyerPropertyFit(params: {
  buyerName: string;
  buyerKind: "Lead" | "Customer";
  buyerDetail: string;
  buyerScore: number;
  propertyName: string;
  propertyDeveloper: string;
  propertyLocation: string;
  propertyPrice: number;
  propertyType: string;
  propertyBeds: number;
  propertySize: string;
}): Promise<{
  summary: string;
  provider: string;
  model: string;
}> {
  const formatRM = (val: number) => `RM ${(val).toLocaleString("en-MY")}`;

  const prompt = `Buyer: ${params.buyerName} (${params.buyerDetail}, ${params.buyerKind}, ${params.buyerScore}% fit score).
Property: ${params.propertyName} by ${params.propertyDeveloper} in ${params.propertyLocation} — ${params.propertyType}, ${params.propertyBeds} bedrooms, ${params.propertySize}, priced at ${formatRM(params.propertyPrice)}.

Write a single, natural paragraph (3–4 sentences max) explaining in plain conversational English why this specific property is a great match for this buyer. Focus on the most compelling reason — whether that's budget alignment, location, unit size, or investment potential. Keep it concise, warm, and sales-ready. No bullet points, no headings, no structure — just a clean paragraph.`;

  try {
    const { invokeSummaryLLM } = await import("./_core/llm");
    const res = await invokeSummaryLLM({
      messages: [
        {
          role: "system",
          content: "You are a knowledgeable Malaysian real estate sales assistant. Write short, clear, friendly explanations. Plain prose only — no markdown headings, no bullet points.",
        },
        { role: "user", content: prompt },
      ],
      max_tokens: 1500,
    });
    const text = extractAssistantText(res);
    return {
      summary: text,
      provider: "gemini",
      model: res.model || "gemini-3.6-flash",
    };
  } catch (err) {
    console.warn("[AI Fit Analysis] Gemini failed, attempting Groq fallback:", err);
    const effectiveConfig = resolveEffectiveConfig();
    const res = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "You are a knowledgeable Malaysian real estate sales assistant. Write short, clear, friendly explanations. Plain prose only — no markdown headings, no bullet points.",
        },
        { role: "user", content: prompt },
      ],
      max_tokens: 1500,
    });
    return {
      summary: extractAssistantText(res),
      provider: effectiveConfig.provider || "groq",
      model: res.model || effectiveConfig.model || "qwen/qwen3.6-27b",
    };
  }
}



