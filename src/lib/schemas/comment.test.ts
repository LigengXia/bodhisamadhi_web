import { describe, it, expect } from 'vitest';
import { commentSchema } from './comment';

describe('commentSchema', () => {
  it('accepts a normal body with no parent', () => {
    expect(commentSchema.safeParse({ body: 'A reflection.' }).success).toBe(
      true,
    );
  });
  it('rejects empty / whitespace-only', () => {
    expect(commentSchema.safeParse({ body: '   ' }).success).toBe(false);
  });
  it('rejects over 4000 chars', () => {
    expect(commentSchema.safeParse({ body: 'x'.repeat(4001) }).success).toBe(
      false,
    );
  });
  it('accepts a uuid parentId and rejects a non-uuid', () => {
    expect(
      commentSchema.safeParse({ body: 'r', parentId: crypto.randomUUID() })
        .success,
    ).toBe(true);
    expect(
      commentSchema.safeParse({ body: 'r', parentId: 'nope' }).success,
    ).toBe(false);
  });
});
