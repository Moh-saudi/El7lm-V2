ALTER TABLE users ADD COLUMN IF NOT EXISTS "contract_end_date" TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "previousAccountType" TEXT;
ALTER TABLE marketers ADD COLUMN IF NOT EXISTS "client_type" TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS "receiverAccountType" TEXT;
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS "durationDays" INTEGER;
ALTER TABLE tournament_registrations ADD COLUMN IF NOT EXISTS "geideaTransactionId" TEXT;
