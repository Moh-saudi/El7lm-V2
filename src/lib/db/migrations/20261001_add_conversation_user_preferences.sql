-- Add per-user conversation preference maps used by the messaging UI.

alter table public.conversations
  add column if not exists "isMuted" jsonb not null default '{}'::jsonb,
  add column if not exists "isArchived" jsonb not null default '{}'::jsonb,
  add column if not exists "isPinned" jsonb not null default '{}'::jsonb;
