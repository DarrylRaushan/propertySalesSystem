import { describe, expect, it } from "vitest";
import { getPipelineStageMetrics } from "../client/src/components/pipelineHealth";

const stages = [
  { stage: "Enquiries", value: 428, color: "#416b89" },
  { stage: "Qualified", value: 164, color: "#4f8a83" },
  { stage: "Bookings", value: 18, color: "#c9a25f" },
];

describe("pipeline health metrics", () => {
  it("reports each stage's share of the opening pipeline", () => {
    expect(getPipelineStageMetrics(stages, 1).shareOfPipeline).toBe(38);
    expect(getPipelineStageMetrics(stages, 2).shareOfPipeline).toBe(4);
  });

  it("reports conversion from the preceding funnel stage", () => {
    expect(getPipelineStageMetrics(stages, 1).progressionFromPrevious).toBe(38);
    expect(getPipelineStageMetrics(stages, 2).progressionFromPrevious).toBe(11);
  });

  it("clamps an out-of-range selected stage to a valid stage", () => {
    expect(getPipelineStageMetrics(stages, 99).item?.stage).toBe("Bookings");
  });
});
