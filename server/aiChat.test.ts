import { describe, expect, it } from "vitest";
import { buildAssistantMessages, extractAssistantText, processAiChat } from "./aiChat";
import { formatSystemContextForPrompt, type SystemDataContext } from "./aiContext";
import { generateSmartAIResponse } from "./aiSmartFallback";

describe("AI chat helpers", () => {
  it("prepends the property-assistant context to chat history", () => {
    const messages = buildAssistantMessages([{ role: "user", content: "Which lead should I call first?" }]);
    expect(messages).toHaveLength(2);
    expect(messages[0]).toMatchObject({ role: "system" });
    expect(messages[1]).toEqual({ role: "user", content: "Which lead should I call first?" });
  });

  it("extracts text content and provides a safe fallback for empty model output", () => {
    expect(
      extractAssistantText({
        choices: [
          {
            index: 0,
            finish_reason: "stop",
            message: { role: "assistant", content: "Prioritize the highest-confidence viewing." },
          },
        ],
        id: "1",
        created: 1,
        model: "test",
      })
    ).toBe("Prioritize the highest-confidence viewing.");

    expect(extractAssistantText({ choices: [], id: "2", created: 1, model: "test" })).toContain(
      "could not generate"
    );
  });

  it("formats system context properly for prompt injection", () => {
    const mockContext: SystemDataContext = {
      metrics: {
        totalLeads: 15,
        highPriority: 5,
        activeProperties: 8,
        expectedSalesValue: 4500000,
        totalCustomers: 12,
        priorityDistribution: [{ priority: "High", count: 5 }],
      },
      leadsSummary: [
        {
          id: 1,
          name: "Marcus Tan",
          segment: "Luxury",
          priority: "High",
          probability: 85,
          value: 1200000,
          property: "Pavilion Damansara",
          action: "Schedule private viewing",
        },
      ],
      propertiesSummary: [
        {
          id: 1,
          title: "Pavilion Damansara",
          developer: "Pavilion Group",
          location: "Damansara Heights",
          type: "Condo",
          status: "Available",
          price: 1800000,
          beds: 3,
          baths: 2,
          size: "1,450 sqft",
        },
      ],
      customersSummary: [],
      salesTrend: [{ month: "Jan", value: 3000000, year: 2024 }],
      pipelineStages: [{ name: "Viewing", count: 8, conversionRate: 45 }],
      enquirySources: [{ source: "Portal", count: 12, percentage: 60 }],
      followUpHealth: [],
    };

    const formatted = formatSystemContextForPrompt(mockContext);
    expect(formatted).toContain("LIVE REAL-TIME DATABASE DUMP");
    expect(formatted).toContain("Total Active Leads: 15");
    expect(formatted).toContain("Marcus Tan");
    expect(formatted).toContain("Pavilion Damansara");
  });


  it("generates intelligent chart data and decisions on sales trend query", () => {
    const mockContext: SystemDataContext = {
      metrics: {
        totalLeads: 10,
        highPriority: 4,
        activeProperties: 6,
        expectedSalesValue: 3000000,
        totalCustomers: 5,
        priorityDistribution: [],
      },
      leadsSummary: [],
      propertiesSummary: [],
      customersSummary: [],
      salesTrend: [{ month: "Jan", value: 2000000, year: 2024 }],
      pipelineStages: [],
      enquirySources: [],
      followUpHealth: [],
    };

    const response = generateSmartAIResponse("Show me a chart of sales trends", mockContext);
    expect(response).toContain("<<<CHART_DATA");
    expect(response).toContain("<<<DECISION_CARD");
    expect(response).toContain("Monthly Sales Performance");
  });

  it("processes chat request and returns valid content", async () => {
    const result = await processAiChat([{ role: "user", content: "Who should I call first?" }]);
    expect(result).toHaveProperty("content");
    expect(typeof result.content).toBe("string");
    expect(result.content.length).toBeGreaterThan(10);
  }, 15000);


  it("handles runtime LLM config overrides", async () => {
    const { getLLMRuntimeConfig, setLLMRuntimeConfig } = await import("./_core/llm");
    setLLMRuntimeConfig({ provider: "gemini", model: "gemini-3.6-flash" });
    const config = getLLMRuntimeConfig();
    expect(config.provider).toBe("gemini");
    expect(config.model).toBe("gemini-3.6-flash");
  });
});


