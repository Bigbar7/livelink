import { z } from 'zod';

export const createAgentSchema = z.object({
  displayName: z.string().min(1).max(40),
  agentName: z.string().min(1).max(60).optional(),
  role: z.string().max(80).optional(),
  city: z.string().max(80).optional()
});

export const addSourceSchema = z
  .object({
    userId: z.string().min(1),
    agentId: z.string().min(1),
    sourceKind: z.enum(['manual', 'resume', 'link']),
    sourceType: z.string().min(1),
    url: z.string().url().optional(),
    title: z.string().max(160).optional(),
    rawText: z.string().max(20000).optional(),
    userNote: z.string().max(5000).optional()
  })
  .refine((value) => value.rawText || value.url || value.userNote, {
    message: 'Provide rawText, url, or userNote'
  })
  .refine((value) => value.sourceKind !== 'link' || Boolean(value.url), {
    message: 'Link sources require url',
    path: ['url']
  });
