import { z } from 'zod';

// Shared by comment forms and Server Actions (Phase 14).

export const commentSchema = z.object({
  body: z.string().trim().min(1).max(4000),
  parentId: z.string().uuid().nullish(),
});

export type CommentInput = z.infer<typeof commentSchema>;
