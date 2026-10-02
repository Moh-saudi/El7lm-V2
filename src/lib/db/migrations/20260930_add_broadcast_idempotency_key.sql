-- Prevent accidental duplicate WhatsApp broadcasts when callers provide an Idempotency-Key.
alter table public.broadcasts
  add column if not exists "idempotencyKey" text;

create unique index if not exists broadcasts_idempotency_key_unique
  on public.broadcasts ("idempotencyKey")
  where "idempotencyKey" is not null;
