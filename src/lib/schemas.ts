import { z } from "zod";
import { STATUSES } from "./types";

export const metricInput = z.object({
  name: z.string().trim().min(1, "Metric name is required").max(60),
  value: z.number().finite(),
  unit: z
    .string()
    .trim()
    .max(16)
    .optional()
    .nullable()
    .transform((v) => (v ? v : null)),
});

export const studyCreate = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  summary: z
    .string()
    .trim()
    .max(300)
    .optional()
    .nullable()
    .transform((v) => (v ? v : null)),
  notes: z.string().max(50_000).default(""),
  status: z.enum(STATUSES).default("done"),
  parentId: z.string().nullable().default(null),
  metrics: z.array(metricInput).max(50).default([]),
});

export const studyUpdate = studyCreate.partial();

export type StudyCreateInput = z.infer<typeof studyCreate>;
export type StudyUpdateInput = z.infer<typeof studyUpdate>;
export type MetricInput = z.infer<typeof metricInput>;
