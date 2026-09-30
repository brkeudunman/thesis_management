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

const studyFields = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  summary: z
    .string()
    .trim()
    .max(300)
    .optional()
    .nullable()
    .transform((v) => (v ? v : null)),
  notes: z.string().max(50_000),
  status: z.enum(STATUSES),
  parentId: z.string().nullable(),
  metrics: z.array(metricInput).max(50),
});

export const studyCreate = studyFields.extend({
  notes: studyFields.shape.notes.default(""),
  status: studyFields.shape.status.default("done"),
  parentId: studyFields.shape.parentId.default(null),
  metrics: studyFields.shape.metrics.default([]),
});

// Defaults belong only to creation; omitted PATCH fields must remain unchanged.
export const studyUpdate = studyFields.partial();

export type StudyCreateInput = z.infer<typeof studyCreate>;
export type StudyUpdateInput = z.infer<typeof studyUpdate>;
export type MetricInput = z.infer<typeof metricInput>;
