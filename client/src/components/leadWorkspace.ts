export type LeadWorkspaceItem = {
  priority: string;
  probability: number;
  value: number | string;
  name?: string;
  property?: string;
  action?: string;
};

const priorityWeight = (priority: string) => ({ High: 3, Medium: 2, Low: 1 })[priority] ?? 0;

const numericValue = (value: number | string) => typeof value === "number" ? value : parseFloat(value) || 0;

export function getLeadWorkspaceSummary<T extends LeadWorkspaceItem>(leads: T[]) {
  const total = leads.length;
  const high = leads.filter((lead) => lead.priority === "High").length;
  const pipelineValue = leads.reduce((sum, lead) => sum + (numericValue(lead.value) * lead.probability) / 100, 0);
  const avgProbability = total ? Math.round(leads.reduce((sum, lead) => sum + lead.probability, 0) / total) : 0;
  const focusLead = [...leads].sort((a, b) => priorityWeight(b.priority) - priorityWeight(a.priority) || b.probability - a.probability || numericValue(b.value) - numericValue(a.value))[0] ?? null;
  return { total, high, pipelineValue, avgProbability, focusLead };
}
