import { roiFeatureCollectionSchema } from '@map-colonies/raster-shared';
import z from 'zod';

export const createExportRequestSchema = z.object({
  dbId: z.string(),
  crs: z.string().optional(),
  priority: z.number().optional(),
  roi: roiFeatureCollectionSchema.optional(),
  callbackURLs: z.array(z.string()).optional(),
  description: z.string().optional(),
});

export type CreateExportRequest = z.infer<typeof createExportRequestSchema>;
