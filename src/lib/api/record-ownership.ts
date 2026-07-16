import type { User } from '@supabase/supabase-js';

const OWNER_ID_FIELDS = [
  'userId',
  'user_id',
  'playerId',
  'player_id',
  'createdBy',
  'created_by',
  'customerId',
  'customer_id',
];

const OWNER_EMAIL_FIELDS = [
  'email',
  'userEmail',
  'user_email',
  'customerEmail',
  'customer_email',
  'accountEmail',
];

export function isRecordOwner(record: Record<string, unknown>, user: User): boolean {
  const ownsById = OWNER_ID_FIELDS.some((field) => String(record[field] || '') === user.id);
  if (ownsById) return true;

  const userEmail = String(user.email || '').trim().toLowerCase();
  return Boolean(userEmail) && OWNER_EMAIL_FIELDS.some(
    (field) => String(record[field] || '').trim().toLowerCase() === userEmail
  );
}
