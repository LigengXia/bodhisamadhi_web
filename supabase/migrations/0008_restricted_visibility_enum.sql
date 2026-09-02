-- ═══════════════════════════════════════════════════════════════════════
-- 0008 · Add the 'restricted' content-visibility tier
--
-- Docs/9 §4, §6.1. The third tier: empowerment-only material, gated per
-- empowerment (Docs/9 §6.3, migration 0010), hidden entirely from anyone
-- not qualified.
--
-- This lives in its own migration on purpose: `ALTER TYPE … ADD VALUE`
-- cannot be used in the same transaction that adds it, so nothing else in
-- this file (or a later statement here) may reference 'restricted'. The
-- constraint, the RLS policies and the seed all land in 0010.
-- ═══════════════════════════════════════════════════════════════════════

alter type public.visibility add value if not exists 'restricted';
