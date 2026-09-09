export type PipelineStageData = { stage: string; value: number; color: string };

export function getPipelineStageMetrics(items: PipelineStageData[], requestedIndex: number) {
  const index = Math.min(Math.max(requestedIndex, 0), Math.max(items.length - 1, 0));
  const item = items[index];
  const pipelineBase = Math.max(items[0]?.value ?? 0, 1);
  const previous = index > 0 ? items[index - 1] : undefined;

  return {
    index,
    item,
    previous,
    shareOfPipeline: item ? Math.round((item.value / pipelineBase) * 100) : 0,
    progressionFromPrevious: previous && item ? Math.round((item.value / Math.max(previous.value, 1)) * 100) : 100,
  };
}
