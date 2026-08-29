export type Metric = {
  id: string;
  name: string;
  value: number;
  unit: string | null;
  order: number;
};

export type Study = {
  id: string;
  title: string;
  summary: string | null;
  notes: string;
  status: string;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
  metrics: Metric[];
};

export type StudyNodeData = Study & {
  depth: number;
  children: StudyNodeData[];
};

export const STATUSES = ["planned", "running", "done", "failed"] as const;
export type Status = (typeof STATUSES)[number];

export const STATUS_COLOR: Record<string, string> = {
  planned: "#94a3b8",
  running: "#f59e0b",
  done: "#10b981",
  failed: "#ef4444",
};
