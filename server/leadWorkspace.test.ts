import { describe, expect, it } from "vitest";
import { getLeadWorkspaceSummary } from "../client/src/components/leadWorkspace";

describe("lead workspace summary", () => {
  it("calculates probability-weighted pipeline values and selects the strongest next lead", () => {
    const summary = getLeadWorkspaceSummary([
      { name: "Low-fit", priority: "Low", probability: 90, value: 100000 },
      { name: "High-fit", priority: "High", probability: 72, value: "1250000" },
      { name: "Medium-fit", priority: "Medium", probability: 84, value: 800000 },
    ]);

    expect(summary).toMatchObject({ total: 3, high: 1, pipelineValue: 1662000, avgProbability: 82 });
    expect(summary.focusLead?.name).toBe("High-fit");
  });
});
