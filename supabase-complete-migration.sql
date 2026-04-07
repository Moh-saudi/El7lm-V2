-- ============================================================
-- El7lm Platform - Complete Supabase Migration SQL
-- Project: mjuaefipdzxfqazzbyke
-- Run this ENTIRE file in Supabase SQL Editor
-- ============================================================

-- تفعيل الامتدادات
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- للبحث النصي

-- ============================================================
-- SECTION 1: CORE USER TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS "users" (
  "id" TEXT PRIMARY KEY,
  "uid" TEXT,
  "email" TEXT,
  "firebaseEmail" TEXT,
  "phone" TEXT,
  "full_name" TEXT,
  "name" TEXT,
  "accountType" TEXT DEFAULT 'player',
  "profile_image" TEXT,
  "profile_image_url" TEXT,
  "avatar" TEXT,
  "nationality" TEXT,
  "country" TEXT,
  "countryCode" TEXT,
  "city" TEXT,
  "currency" TEXT,
  "currencySymbol" TEXT,
  "primary_position" TEXT,
  "position" TEXT,
  "birth_date" TEXT,
  "age" INTEGER,
  "height" TEXT,
  "weight" TEXT,
  "gender" TEXT,
  "club_id" TEXT,
  "academy_id" TEXT,
  "trainer_id" TEXT,
  "agent_id" TEXT,
  "isActive" BOOLEAN DEFAULT true,
  "isDeleted" BOOLEAN DEFAULT false,
  "isAdmin" BOOLEAN DEFAULT false,
  "verified" BOOLEAN DEFAULT false,
  "profileCompleted" BOOLEAN DEFAULT false,
  "isNewUser" BOOLEAN DEFAULT true,
  "subscriptionStatus" TEXT DEFAULT 'inactive',
  "subscriptionExpiresAt" TEXT,
  "subscriptionEndDate" TEXT,
  "lastPaymentDate" TEXT,
  "lastPaymentMethod" TEXT,
  "lastPaymentAmount" TEXT,
  "packageType" TEXT,
  "selectedPackage" TEXT,
  "referralCode" TEXT,
  "usedReferralCode" TEXT,
  "convertedFromDependent" BOOLEAN DEFAULT false,
  "unifiedPassword" BOOLEAN DEFAULT false,
  "needsPasswordChange" BOOLEAN DEFAULT false,
  "videos" JSONB,
  "stats" JSONB,
  "socialMedia" JSONB,
  "preferences" JSONB,
  "notificationSettings" JSONB,
  "profileViews" INTEGER DEFAULT 0,
  "followersCount" INTEGER DEFAULT 0,
  "following" JSONB,
  "followers" JSONB,
  "likedVideos" JSONB,
  "savedVideos" JSONB,
  "deletedAt" TEXT,
  "deletedBy" TEXT,
  "statusChangedAt" TEXT,
  "statusChangedBy" TEXT,
  "lastLogin" TEXT,
  "last_login" TEXT,
  "lastLoginIP" TEXT,
  "createdAt" TEXT,
  "updatedAt" TEXT,
  "created_at" TEXT,
  "updated_at" TEXT
);

CREATE TABLE IF NOT EXISTS "players" (
  "id" TEXT PRIMARY KEY,
  "uid" TEXT,
  "email" TEXT,
  "phone" TEXT,
  "phoneNumber" TEXT,
  "full_name" TEXT,
  "name" TEXT,
  "accountType" TEXT DEFAULT 'player',
  "profile_image" TEXT,
  "profile_image_url" TEXT,
  "avatar" TEXT,
  "nationality" TEXT,
  "country" TEXT,
  "city" TEXT,
  "primary_position" TEXT,
  "position" TEXT,
  "birth_date" TEXT,
  "birthDate" TEXT,
  "age" INTEGER,
  "height" TEXT,
  "weight" TEXT,
  "gender" TEXT,
  "foot" TEXT,
  "club_id" TEXT,
  "clubId" TEXT,
  "academy_id" TEXT,
  "academyId" TEXT,
  "trainer_id" TEXT,
  "trainerId" TEXT,
  "agent_id" TEXT,
  "agentId" TEXT,
  "organizationId" TEXT,
  "organizationCode" TEXT,
  "isActive" BOOLEAN DEFAULT true,
  "isDeleted" BOOLEAN DEFAULT false,
  "verified" BOOLEAN DEFAULT false,
  "profileCompleted" BOOLEAN DEFAULT false,
  "isNewUser" BOOLEAN DEFAULT false,
  "subscriptionStatus" TEXT DEFAULT 'inactive',
  "subscriptionExpiresAt" TEXT,
  "packageType" TEXT,
  "selectedPackage" TEXT,
  "stats" JSONB,
  "videos" JSONB,
  "gallery" JSONB,
  "achievements" JSONB,
  "socialMedia" JSONB,
  "medical" JSONB,
  "profileViews" INTEGER DEFAULT 0,
  "viewCount" INTEGER DEFAULT 0,
  "followersCount" INTEGER DEFAULT 0,
  "convertedToAccount" BOOLEAN DEFAULT false,
  "loginAccountCreated" BOOLEAN DEFAULT false,
  "migratedFromUsers" BOOLEAN DEFAULT false,
  "migrationDate" TEXT,
  "deletedAt" TEXT,
  "deletedBy" TEXT,
  "createdAt" TEXT,
  "updatedAt" TEXT,
  "created_at" TEXT,
  "updated_at" TEXT
);

CREATE TABLE IF NOT EXISTS "clubs" (
  "id" TEXT PRIMARY KEY,
  "uid" TEXT,
  "email" TEXT,
  "phone" TEXT,
  "name" TEXT,
  "full_name" TEXT,
  "club_name" TEXT,
  "accountType" TEXT DEFAULT 'club',
  "profile_image" TEXT,
  "logo" TEXT,
  "coverImage" TEXT,
  "country" TEXT,
  "city" TEXT,
  "founded" TEXT,
  "league" TEXT,
  "stadium" TEXT,
  "description" TEXT,
  "website" TEXT,
  "organizationCode" TEXT,
  "isActive" BOOLEAN DEFAULT true,
  "isDeleted" BOOLEAN DEFAULT false,
  "isVerified" BOOLEAN DEFAULT false,
  "subscriptionStatus" TEXT DEFAULT 'inactive',
  "followersCount" INTEGER DEFAULT 0,
  "socialMedia" JSONB,
  "gallery" JSONB,
  "stats" JSONB,
  "deletedAt" TEXT,
  "createdAt" TEXT,
  "updatedAt" TEXT,
  "created_at" TEXT,
  "updated_at" TEXT
);

CREATE TABLE IF NOT EXISTS "academies" (
  "id" TEXT PRIMARY KEY,
  "uid" TEXT,
  "email" TEXT,
  "phone" TEXT,
  "name" TEXT,
  "full_name" TEXT,
  "academy_name" TEXT,
  "accountType" TEXT DEFAULT 'academy',
  "profile_image" TEXT,
  "logo" TEXT,
  "country" TEXT,
  "city" TEXT,
  "description" TEXT,
  "organizationCode" TEXT,
  "isActive" BOOLEAN DEFAULT true,
  "isDeleted" BOOLEAN DEFAULT false,
  "isVerified" BOOLEAN DEFAULT false,
  "subscriptionStatus" TEXT DEFAULT 'inactive',
  "programs" JSONB,
  "socialMedia" JSONB,
  "stats" JSONB,
  "deletedAt" TEXT,
  "createdAt" TEXT,
  "updatedAt" TEXT,
  "created_at" TEXT,
  "updated_at" TEXT
);

CREATE TABLE IF NOT EXISTS "agents" (
  "id" TEXT PRIMARY KEY,
  "uid" TEXT,
  "email" TEXT,
  "phone" TEXT,
  "name" TEXT,
  "full_name" TEXT,
  "accountType" TEXT DEFAULT 'agent',
  "profile_image" TEXT,
  "country" TEXT,
  "city" TEXT,
  "description" TEXT,
  "licenseNumber" TEXT,
  "isActive" BOOLEAN DEFAULT true,
  "isDeleted" BOOLEAN DEFAULT false,
  "subscriptionStatus" TEXT DEFAULT 'inactive',
  "socialMedia" JSONB,
  "stats" JSONB,
  "deletedAt" TEXT,
  "createdAt" TEXT,
  "updatedAt" TEXT
);

CREATE TABLE IF NOT EXISTS "trainers" (
  "id" TEXT PRIMARY KEY,
  "uid" TEXT,
  "email" TEXT,
  "phone" TEXT,
  "name" TEXT,
  "full_name" TEXT,
  "accountType" TEXT DEFAULT 'trainer',
  "profile_image" TEXT,
  "country" TEXT,
  "city" TEXT,
  "specialization" TEXT,
  "licenseNumber" TEXT,
  "isActive" BOOLEAN DEFAULT true,
  "isDeleted" BOOLEAN DEFAULT false,
  "subscriptionStatus" TEXT DEFAULT 'inactive',
  "stats" JSONB,
  "socialMedia" JSONB,
  "deletedAt" TEXT,
  "createdAt" TEXT,
  "updatedAt" TEXT
);

CREATE TABLE IF NOT EXISTS "employees" (
  "id" TEXT PRIMARY KEY,
  "uid" TEXT,
  "email" TEXT,
  "phone" TEXT,
  "name" TEXT,
  "full_name" TEXT,
  "accountType" TEXT DEFAULT 'employee',
  "role" TEXT,
  "department" TEXT,
  "permissions" JSONB,
  "isActive" BOOLEAN DEFAULT true,
  "isDeleted" BOOLEAN DEFAULT false,
  "createdAt" TEXT,
  "updatedAt" TEXT
);

CREATE TABLE IF NOT EXISTS "marketers" (
  "id" TEXT PRIMARY KEY,
  "uid" TEXT,
  "email" TEXT,
  "phone" TEXT,
  "name" TEXT,
  "full_name" TEXT,
  "accountType" TEXT DEFAULT 'marketer',
  "profile_image" TEXT,
  "country" TEXT,
  "referralCode" TEXT,
  "isActive" BOOLEAN DEFAULT true,
  "subscriptionStatus" TEXT DEFAULT 'inactive',
  "stats" JSONB,
  "createdAt" TEXT,
  "updatedAt" TEXT
);

-- ============================================================
-- SECTION 2: CONTENT & SYSTEM
-- ============================================================

CREATE TABLE IF NOT EXISTS "content" (
  "id" TEXT PRIMARY KEY,
  "items" JSONB,
  "players" INTEGER,
  "countries" INTEGER,
  "successRate" INTEGER,
  "countriesList" JSONB,
  "logoUrl" TEXT,
  "darkLogoUrl" TEXT,
  "footerLogoUrl" TEXT,
  "siteName" TEXT,
  "slogan" TEXT,
  "updatedAt" TEXT
);

CREATE TABLE IF NOT EXISTS "system_configs" (
  "id" TEXT PRIMARY KEY,
  "apiKey" TEXT,
  "baseUrl" TEXT,
  "isActive" BOOLEAN DEFAULT true,
  "senderName" TEXT,
  "defaultCountryCode" TEXT,
  "webhookUrl" TEXT,
  "mode" TEXT,
  "settings" JSONB,
  "updatedAt" TEXT
);

CREATE TABLE IF NOT EXISTS "geidea_settings" (
  "id" TEXT PRIMARY KEY,
  "mode" TEXT DEFAULT 'live',
  "updatedAt" TEXT
);

CREATE TABLE IF NOT EXISTS "settings" (
  "id" TEXT PRIMARY KEY,
  "value" JSONB,
  "updatedAt" TEXT
);

CREATE TABLE IF NOT EXISTS "subscription_plans" (
  "id" TEXT PRIMARY KEY,
  "title" TEXT,
  "subtitle" TEXT,
  "period" TEXT,
  "base_currency" TEXT DEFAULT 'USD',
  "base_price" NUMERIC,
  "base_original_price" NUMERIC,
  "features" JSONB,
  "bonusFeatures" JSONB,
  "popular" BOOLEAN DEFAULT false,
  "icon" TEXT,
  "color" TEXT,
  "overrides" JSONB,
  "accountTypeOverrides" JSONB,
  "isActive" BOOLEAN DEFAULT true,
  "order" INTEGER,
  "updatedAt" TEXT
);

-- ============================================================
-- SECTION 3: PAYMENTS & BILLING
-- ============================================================

CREATE TABLE IF NOT EXISTS "subscriptions" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT,
  "plan_name" TEXT,
  "package_name" TEXT,
  "packageType" TEXT,
  "package_duration" TEXT,
  "package_price" TEXT,
  "payment_id" TEXT,
  "payment_method" TEXT,
  "start_date" TEXT,
  "end_date" TEXT,
  "expires_at" TEXT,
  "activated_at" TEXT,
  "status" TEXT DEFAULT 'inactive',
  "features" JSONB,
  "invoice_number" TEXT,
  "receipt_url" TEXT,
  "amount" TEXT,
  "currency" TEXT DEFAULT 'EGP',
  "is_auto_renew" BOOLEAN DEFAULT false,
  "updated_at" TEXT,
  "created_at" TEXT
);

CREATE TABLE IF NOT EXISTS "invoices" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT,
  "paymentId" TEXT,
  "transactionId" TEXT,
  "status" TEXT DEFAULT 'pending',
  "provider" TEXT,
  "originalStatus" TEXT,
  "amount" TEXT,
  "currency" TEXT DEFAULT 'EGP',
  "packageType" TEXT,
  "packageName" TEXT,
  "package_name" TEXT,
  "plan_name" TEXT,
  "invoice_number" TEXT,
  "customerName" TEXT,
  "customerEmail" TEXT,
  "customerPhone" TEXT,
  "country" TEXT,
  "method" TEXT,
  "paymentMethod" TEXT,
  "receiptUrl" TEXT,
  "receipt_url" TEXT,
  "paidAt" TEXT,
  "paid_at" TEXT,
  "createdAt" TEXT,
  "updatedAt" TEXT,
  "created_at" TEXT,
  "updated_at" TEXT
);

CREATE TABLE IF NOT EXISTS "geidea_payments" (
  "id" TEXT PRIMARY KEY,
  "orderId" TEXT,
  "merchantReferenceId" TEXT,
  "geideaOrderId" TEXT,
  "ourMerchantReferenceId" TEXT,
  "transactionId" TEXT,
  "status" TEXT,
  "amount" NUMERIC,
  "currency" TEXT DEFAULT 'EGP',
  "responseCode" TEXT,
  "detailedResponseCode" TEXT,
  "responseMessage" TEXT,
  "detailedResponseMessage" TEXT,
  "customerEmail" TEXT,
  "customerName" TEXT,
  "customerPhone" TEXT,
  "userId" TEXT,
  "plan_name" TEXT,
  "packageType" TEXT,
  "package_type" TEXT,
  "selectedPackage" TEXT,
  "paymentMethod" TEXT DEFAULT 'geidea',
  "source" TEXT,
  "paidAt" TEXT,
  "rawPayload" JSONB,
  "rawTransactionData" JSONB,
  "fetchedFromGeideaAt" TEXT,
  "callbackReceivedAt" TEXT,
  "migratedAt" TEXT,
  "updatedAt" TEXT,
  "createdAt" TEXT
);

CREATE TABLE IF NOT EXISTS "payments" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT,
  "playerId" TEXT,
  "amount" NUMERIC,
  "currency" TEXT DEFAULT 'EGP',
  "status" TEXT DEFAULT 'pending',
  "paymentMethod" TEXT,
  "packageType" TEXT,
  "packageName" TEXT,
  "receiptImage" TEXT,
  "receiptUrl" TEXT,
  "transactionId" TEXT,
  "notes" TEXT,
  "updatedAt" TEXT,
  "createdAt" TEXT
);

CREATE TABLE IF NOT EXISTS "bulkPayments" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT,
  "organizerId" TEXT,
  "organizerType" TEXT,
  "players" JSONB,
  "playerCount" INTEGER,
  "amount" NUMERIC,
  "currency" TEXT DEFAULT 'EGP',
  "status" TEXT DEFAULT 'pending',
  "paymentMethod" TEXT,
  "packageType" TEXT,
  "receiptImage" TEXT,
  "receiptUrl" TEXT,
  "notes" TEXT,
  "updatedAt" TEXT,
  "createdAt" TEXT
);

CREATE TABLE IF NOT EXISTS "bulk_payments" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT,
  "players" JSONB,
  "amount" NUMERIC,
  "currency" TEXT DEFAULT 'EGP',
  "status" TEXT DEFAULT 'pending',
  "paymentMethod" TEXT,
  "packageType" TEXT,
  "receiptUrl" TEXT,
  "createdAt" TEXT,
  "updatedAt" TEXT
);

CREATE TABLE IF NOT EXISTS "wallet" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT,
  "amount" NUMERIC,
  "currency" TEXT DEFAULT 'EGP',
  "status" TEXT DEFAULT 'pending',
  "walletNumber" TEXT,
  "walletName" TEXT,
  "walletProvider" TEXT,
  "receiptUrl" TEXT,
  "notes" TEXT,
  "createdAt" TEXT,
  "updatedAt" TEXT
);

CREATE TABLE IF NOT EXISTS "instapay" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT,
  "amount" NUMERIC,
  "currency" TEXT DEFAULT 'EGP',
  "status" TEXT DEFAULT 'pending',
  "transactionId" TEXT,
  "receiptUrl" TEXT,
  "notes" TEXT,
  "createdAt" TEXT,
  "updatedAt" TEXT
);

CREATE TABLE IF NOT EXISTS "vodafone_cash" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT,
  "amount" NUMERIC,
  "currency" TEXT DEFAULT 'EGP',
  "status" TEXT DEFAULT 'pending',
  "phoneNumber" TEXT,
  "receiptUrl" TEXT,
  "notes" TEXT,
  "createdAt" TEXT,
  "updatedAt" TEXT
);

CREATE TABLE IF NOT EXISTS "payment_results" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT,
  "provider" TEXT,
  "status" TEXT,
  "amount" NUMERIC,
  "currency" TEXT,
  "rawData" JSONB,
  "createdAt" TEXT
);

CREATE TABLE IF NOT EXISTS "receipts" (
  "id" TEXT PRIMARY KEY,
  "invoiceId" TEXT,
  "userId" TEXT,
  "url" TEXT,
  "status" TEXT DEFAULT 'pending',
  "timestamp" TEXT,
  "createdAt" TEXT
);

CREATE TABLE IF NOT EXISTS "proofs" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT,
  "paymentId" TEXT,
  "url" TEXT,
  "status" TEXT DEFAULT 'pending',
  "createdAt" TEXT
);

CREATE TABLE IF NOT EXISTS "payment_action_logs" (
  "id" TEXT PRIMARY KEY,
  "paymentId" TEXT,
  "userId" TEXT,
  "userName" TEXT,
  "action" TEXT,
  "details" TEXT,
  "adminId" TEXT,
  "adminName" TEXT,
  "metadata" JSONB,
  "createdAt" TEXT
);

CREATE TABLE IF NOT EXISTS "payment_settings" (
  "id" TEXT PRIMARY KEY,
  "geideaEnabled" BOOLEAN DEFAULT false,
  "skipCashEnabled" BOOLEAN DEFAULT false,
  "vodafoneCashEnabled" BOOLEAN DEFAULT false,
  "instapayEnabled" BOOLEAN DEFAULT false,
  "manualEnabled" BOOLEAN DEFAULT true,
  "settings" JSONB,
  "updatedAt" TEXT
);

-- ============================================================
-- SECTION 4: NOTIFICATIONS & MESSAGING
-- ============================================================

CREATE TABLE IF NOT EXISTS "notifications" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT,
  "adminId" TEXT,
  "type" TEXT,
  "title" TEXT,
  "message" TEXT,
  "isRead" BOOLEAN DEFAULT false,
  "priority" TEXT DEFAULT 'normal',
  "actionUrl" TEXT,
  "accountType" TEXT,
  "data" JSONB,
  "expiresAt" TEXT,
  "createdAt" TEXT,
  "updatedAt" TEXT
);

CREATE TABLE IF NOT EXISTS "admin_notifications" (
  "id" TEXT PRIMARY KEY,
  "adminId" TEXT,
  "type" TEXT,
  "title" TEXT,
  "message" TEXT,
  "isRead" BOOLEAN DEFAULT false,
  "priority" TEXT DEFAULT 'normal',
  "actionUrl" TEXT,
  "data" JSONB,
  "createdAt" TEXT,
  "updatedAt" TEXT
);

CREATE TABLE IF NOT EXISTS "interaction_notifications" (
  "id" TEXT PRIMARY KEY,
  "type" TEXT,
  "profileOwnerId" TEXT,
  "actorId" TEXT,
  "actorName" TEXT,
  "actorAvatar" TEXT,
  "actorAccountType" TEXT,
  "title" TEXT,
  "message" TEXT,
  "actionUrl" TEXT,
  "isRead" BOOLEAN DEFAULT false,
  "priority" TEXT DEFAULT 'normal',
  "dedupeKey" TEXT,
  "expiresAt" TEXT,
  "createdAt" TEXT,
  "updatedAt" TEXT
);

CREATE TABLE IF NOT EXISTS "smart_notifications" (
  "id" TEXT PRIMARY KEY,
  "type" TEXT,
  "userId" TEXT,
  "senderId" TEXT,
  "senderName" TEXT,
  "senderAvatar" TEXT,
  "senderAccountType" TEXT,
  "title" TEXT,
  "message" TEXT,
  "actionUrl" TEXT,
  "isRead" BOOLEAN DEFAULT false,
  "priority" TEXT DEFAULT 'normal',
  "accountType" TEXT,
  "dedupeKey" TEXT,
  "expiresAt" TEXT,
  "viewCount" INTEGER DEFAULT 0,
  "createdAt" TEXT,
  "updatedAt" TEXT
);

CREATE TABLE IF NOT EXISTS "broadcasts" (
  "id" TEXT PRIMARY KEY,
  "opportunityId" TEXT,
  "opportunityTitle" TEXT,
  "opportunityType" TEXT,
  "organizerName" TEXT,
  "organizerType" TEXT,
  "eventType" TEXT,
  "title" TEXT,
  "message" TEXT,
  "actionUrl" TEXT DEFAULT '/dashboard/opportunities',
  "targetType" TEXT,
  "data" JSONB,
  "createdAt" TEXT
);

CREATE TABLE IF NOT EXISTS "conversations" (
  "id" TEXT PRIMARY KEY,
  "participants" JSONB,
  "lastMessage" TEXT,
  "lastMessageTime" TEXT,
  "lastSenderId" TEXT,
  "unreadCount" JSONB,
  "isSupport" BOOLEAN DEFAULT false,
  "metadata" JSONB,
  "createdAt" TEXT,
  "updatedAt" TEXT
);

CREATE TABLE IF NOT EXISTS "messages" (
  "id" TEXT PRIMARY KEY,
  "conversationId" TEXT,
  "senderId" TEXT,
  "receiverId" TEXT,
  "senderName" TEXT,
  "message" TEXT,
  "timestamp" TEXT,
  "isRead" BOOLEAN DEFAULT false,
  "isDelivered" BOOLEAN DEFAULT false,
  "isSeen" BOOLEAN DEFAULT false,
  "messageType" TEXT DEFAULT 'text',
  "fileUrl" TEXT,
  "metadata" JSONB,
  "createdAt" TEXT
);

CREATE TABLE IF NOT EXISTS "support_conversations" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT,
  "userName" TEXT,
  "userType" TEXT,
  "subject" TEXT,
  "status" TEXT DEFAULT 'open',
  "lastMessage" TEXT,
  "lastMessageTime" TEXT,
  "unreadAdmin" INTEGER DEFAULT 0,
  "unreadUser" INTEGER DEFAULT 0,
  "assignedTo" TEXT,
  "createdAt" TEXT,
  "updatedAt" TEXT
);

CREATE TABLE IF NOT EXISTS "support_messages" (
  "id" TEXT PRIMARY KEY,
  "conversationId" TEXT,
  "senderId" TEXT,
  "senderName" TEXT,
  "senderRole" TEXT,
  "message" TEXT,
  "isRead" BOOLEAN DEFAULT false,
  "attachments" JSONB,
  "createdAt" TEXT
);

CREATE TABLE IF NOT EXISTS "support_notifications" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT,
  "conversationId" TEXT,
  "title" TEXT,
  "message" TEXT,
  "isRead" BOOLEAN DEFAULT false,
  "createdAt" TEXT
);

CREATE TABLE IF NOT EXISTS "join_request_notifications" (
  "id" TEXT PRIMARY KEY,
  "playerId" TEXT,
  "playerName" TEXT,
  "organizerId" TEXT,
  "organizerType" TEXT,
  "organizationName" TEXT,
  "status" TEXT DEFAULT 'pending',
  "isRead" BOOLEAN DEFAULT false,
  "createdAt" TEXT,
  "updatedAt" TEXT
);

CREATE TABLE IF NOT EXISTS "player_notifications" (
  "id" TEXT PRIMARY KEY,
  "playerId" TEXT,
  "type" TEXT,
  "title" TEXT,
  "message" TEXT,
  "isRead" BOOLEAN DEFAULT false,
  "actionUrl" TEXT,
  "data" JSONB,
  "createdAt" TEXT
);

-- ============================================================
-- SECTION 5: OPPORTUNITIES
-- ============================================================

CREATE TABLE IF NOT EXISTS "opportunities" (
  "id" TEXT PRIMARY KEY,
  "organizerId" TEXT,
  "organizerName" TEXT,
  "organizerType" TEXT,
  "organizerAvatar" TEXT,
  "title" TEXT,
  "description" TEXT,
  "opportunityType" TEXT,
  "country" TEXT,
  "city" TEXT,
  "salary" TEXT,
  "contractDuration" TEXT,
  "requirements" JSONB,
  "positions" JSONB,
  "ageRange" JSONB,
  "deadline" TEXT,
  "status" TEXT DEFAULT 'active',
  "isActive" BOOLEAN DEFAULT true,
  "isFeatured" BOOLEAN DEFAULT false,
  "viewCount" INTEGER DEFAULT 0,
  "currentApplicants" INTEGER DEFAULT 0,
  "maxApplicants" INTEGER,
  "tags" JSONB,
  "metadata" JSONB,
  "createdAt" TEXT,
  "updatedAt" TEXT
);

CREATE TABLE IF NOT EXISTS "opportunity_applications" (
  "id" TEXT PRIMARY KEY,
  "opportunityId" TEXT,
  "playerId" TEXT,
  "playerName" TEXT,
  "playerPhone" TEXT,
  "playerPosition" TEXT,
  "playerCountry" TEXT,
  "playerNationality" TEXT,
  "playerAge" INTEGER,
  "playerHeight" NUMERIC,
  "playerWeight" NUMERIC,
  "playerFoot" TEXT,
  "playerCurrentClub" TEXT,
  "playerContractStatus" TEXT,
  "playerAvatarUrl" TEXT,
  "playerStats" JSONB,
  "opportunityTitle" TEXT,
  "organizerName" TEXT,
  "organizerType" TEXT,
  "opportunityDeadline" TEXT,
  "customAnswers" JSONB,
  "message" TEXT,
  "status" TEXT DEFAULT 'pending',
  "reviewedBy" TEXT,
  "reviewNote" TEXT,
  "rating" INTEGER,
  "ratingComment" TEXT,
  "ratedAt" TEXT,
  "appliedAt" TEXT,
  "updatedAt" TEXT
);

-- ============================================================
-- SECTION 6: CONTENT & MEDIA
-- ============================================================

CREATE TABLE IF NOT EXISTS "videos" (
  "id" TEXT PRIMARY KEY,
  "playerId" TEXT,
  "title" TEXT,
  "description" TEXT,
  "url" TEXT,
  "thumbnailUrl" TEXT,
  "duration" INTEGER,
  "status" TEXT DEFAULT 'pending',
  "views" INTEGER DEFAULT 0,
  "likes" INTEGER DEFAULT 0,
  "category" TEXT,
  "tags" JSONB,
  "isPublic" BOOLEAN DEFAULT true,
  "metadata" JSONB,
  "createdAt" TEXT,
  "updatedAt" TEXT
);

CREATE TABLE IF NOT EXISTS "ads" (
  "id" TEXT PRIMARY KEY,
  "title" TEXT,
  "description" TEXT,
  "imageUrl" TEXT,
  "targetUrl" TEXT,
  "isActive" BOOLEAN DEFAULT true,
  "views" INTEGER DEFAULT 0,
  "clicks" INTEGER DEFAULT 0,
  "position" TEXT,
  "targetAudience" JSONB,
  "startDate" TEXT,
  "endDate" TEXT,
  "budget" NUMERIC,
  "createdAt" TEXT,
  "updatedAt" TEXT
);

CREATE TABLE IF NOT EXISTS "dream_academy_categories" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT,
  "nameAr" TEXT,
  "description" TEXT,
  "icon" TEXT,
  "order" INTEGER,
  "isActive" BOOLEAN DEFAULT true,
  "createdAt" TEXT,
  "updatedAt" TEXT
);

CREATE TABLE IF NOT EXISTS "dream_academy_sources" (
  "id" TEXT PRIMARY KEY,
  "title" TEXT,
  "titleAr" TEXT,
  "description" TEXT,
  "url" TEXT,
  "type" TEXT,
  "categoryId" TEXT,
  "thumbnail" TEXT,
  "duration" TEXT,
  "isActive" BOOLEAN DEFAULT true,
  "views" INTEGER DEFAULT 0,
  "order" INTEGER,
  "createdAt" TEXT,
  "updatedAt" TEXT
);

CREATE TABLE IF NOT EXISTS "dream_academy_stats" (
  "id" TEXT PRIMARY KEY,
  "totalVideos" INTEGER DEFAULT 0,
  "totalViews" INTEGER DEFAULT 0,
  "totalStudents" INTEGER DEFAULT 0,
  "updatedAt" TEXT
);

-- ============================================================
-- SECTION 7: TOURNAMENTS
-- ============================================================

CREATE TABLE IF NOT EXISTS "tournaments" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT,
  "nameAr" TEXT,
  "description" TEXT,
  "type" TEXT,
  "status" TEXT DEFAULT 'upcoming',
  "country" TEXT,
  "city" TEXT,
  "venue" TEXT,
  "startDate" TEXT,
  "endDate" TEXT,
  "registrationDeadline" TEXT,
  "maxTeams" INTEGER,
  "currentTeams" INTEGER DEFAULT 0,
  "prizePool" TEXT,
  "entryFee" NUMERIC,
  "currency" TEXT DEFAULT 'EGP',
  "ageGroup" TEXT,
  "gender" TEXT,
  "rules" JSONB,
  "sponsors" JSONB,
  "banner" TEXT,
  "logo" TEXT,
  "organizerId" TEXT,
  "isActive" BOOLEAN DEFAULT true,
  "isFeatured" BOOLEAN DEFAULT false,
  "metadata" JSONB,
  "createdAt" TEXT,
  "updatedAt" TEXT
);

CREATE TABLE IF NOT EXISTS "tournament_registrations" (
  "id" TEXT PRIMARY KEY,
  "tournamentId" TEXT,
  "teamId" TEXT,
  "teamName" TEXT,
  "organizerId" TEXT,
  "organizerType" TEXT,
  "players" JSONB,
  "status" TEXT DEFAULT 'pending',
  "paymentStatus" TEXT DEFAULT 'pending',
  "paymentId" TEXT,
  "amount" NUMERIC,
  "currency" TEXT DEFAULT 'EGP',
  "registeredAt" TEXT,
  "updatedAt" TEXT
);

CREATE TABLE IF NOT EXISTS "tournamentRegistrations" (
  "id" TEXT PRIMARY KEY,
  "tournamentId" TEXT,
  "teamName" TEXT,
  "organizerId" TEXT,
  "players" JSONB,
  "status" TEXT DEFAULT 'pending',
  "paymentStatus" TEXT DEFAULT 'pending',
  "amount" NUMERIC,
  "registeredAt" TEXT,
  "updatedAt" TEXT
);

CREATE TABLE IF NOT EXISTS "tournament_payments" (
  "id" TEXT PRIMARY KEY,
  "tournamentId" TEXT,
  "registrationId" TEXT,
  "userId" TEXT,
  "amount" NUMERIC,
  "currency" TEXT DEFAULT 'EGP',
  "status" TEXT DEFAULT 'pending',
  "paymentMethod" TEXT,
  "receiptUrl" TEXT,
  "transactionId" TEXT,
  "createdAt" TEXT,
  "updatedAt" TEXT
);

-- ============================================================
-- SECTION 8: REFERRALS & REWARDS
-- ============================================================

CREATE TABLE IF NOT EXISTS "referrals" (
  "id" TEXT PRIMARY KEY,
  "referrerId" TEXT,
  "referredId" TEXT,
  "referralCode" TEXT,
  "status" TEXT DEFAULT 'pending',
  "rewards" JSONB,
  "completedAt" TEXT,
  "createdAt" TEXT
);

CREATE TABLE IF NOT EXISTS "organization_referrals" (
  "id" TEXT PRIMARY KEY,
  "referrerId" TEXT,
  "referrerType" TEXT,
  "referralCode" TEXT,
  "referredId" TEXT,
  "status" TEXT DEFAULT 'pending',
  "commission" NUMERIC,
  "createdAt" TEXT
);

CREATE TABLE IF NOT EXISTS "player_rewards" (
  "id" TEXT PRIMARY KEY,
  "playerId" TEXT,
  "totalPoints" INTEGER DEFAULT 0,
  "availablePoints" INTEGER DEFAULT 0,
  "totalEarnings" NUMERIC DEFAULT 0,
  "referralCount" INTEGER DEFAULT 0,
  "badges" JSONB DEFAULT '[]',
  "lastUpdated" TEXT,
  "createdAt" TEXT
);

CREATE TABLE IF NOT EXISTS "point_transactions" (
  "id" TEXT PRIMARY KEY,
  "playerId" TEXT,
  "points" INTEGER,
  "reason" TEXT,
  "type" TEXT DEFAULT 'earned',
  "timestamp" TEXT,
  "createdAt" TEXT
);

-- ============================================================
-- SECTION 9: AUTH & SECURITY
-- ============================================================

CREATE TABLE IF NOT EXISTS "password_reset_tokens" (
  "token" TEXT PRIMARY KEY,
  "email" TEXT NOT NULL,
  "uid" TEXT,
  "expiresAt" TEXT NOT NULL,
  "used" BOOLEAN DEFAULT false,
  "usedAt" TEXT,
  "createdAt" TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS "otp_codes" (
  "id" TEXT PRIMARY KEY,
  "phone" TEXT,
  "email" TEXT,
  "code" TEXT,
  "type" TEXT,
  "expiresAt" TEXT,
  "verified" BOOLEAN DEFAULT false,
  "attempts" INTEGER DEFAULT 0,
  "createdAt" TEXT
);

CREATE TABLE IF NOT EXISTS "otp_verifications" (
  "id" TEXT PRIMARY KEY,
  "identifier" TEXT,
  "code" TEXT,
  "type" TEXT DEFAULT 'phone',
  "expiresAt" TEXT,
  "verified" BOOLEAN DEFAULT false,
  "createdAt" TEXT
);

CREATE TABLE IF NOT EXISTS "backup_otps" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT,
  "code" TEXT,
  "expiresAt" TEXT,
  "used" BOOLEAN DEFAULT false,
  "createdAt" TEXT
);

CREATE TABLE IF NOT EXISTS "security_logs" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT,
  "action" TEXT,
  "ip" TEXT,
  "userAgent" TEXT,
  "metadata" JSONB,
  "createdAt" TEXT
);

CREATE TABLE IF NOT EXISTS "adminLogs" (
  "id" TEXT PRIMARY KEY,
  "adminId" TEXT,
  "action" TEXT,
  "targetId" TEXT,
  "targetType" TEXT,
  "details" JSONB,
  "ip" TEXT,
  "createdAt" TEXT
);

-- ============================================================
-- SECTION 10: CAREERS & APPLICATIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS "career_applications" (
  "id" TEXT PRIMARY KEY,
  "fullName" TEXT,
  "email" TEXT,
  "phone" TEXT,
  "country" TEXT,
  "governorate" TEXT,
  "experience" TEXT,
  "linkedin" TEXT,
  "facebook" TEXT,
  "notes" TEXT,
  "roles" JSONB,
  "role" TEXT,
  "status" TEXT DEFAULT 'pending',
  "createdAt" TEXT,
  "updatedAt" TEXT
);

CREATE TABLE IF NOT EXISTS "careerApplications" (
  "id" TEXT PRIMARY KEY,
  "fullName" TEXT,
  "email" TEXT,
  "phone" TEXT,
  "country" TEXT,
  "roles" JSONB,
  "status" TEXT DEFAULT 'pending',
  "createdAt" TEXT
);

CREATE TABLE IF NOT EXISTS "careers_applications" (
  "id" TEXT PRIMARY KEY,
  "fullName" TEXT,
  "email" TEXT,
  "phone" TEXT,
  "country" TEXT,
  "roles" JSONB,
  "status" TEXT DEFAULT 'pending',
  "createdAt" TEXT
);

-- ============================================================
-- SECTION 11: ANALYTICS & LOGS
-- ============================================================

CREATE TABLE IF NOT EXISTS "analytics" (
  "id" TEXT PRIMARY KEY,
  "event" TEXT,
  "userId" TEXT,
  "sessionId" TEXT,
  "page" TEXT,
  "data" JSONB,
  "ip" TEXT,
  "userAgent" TEXT,
  "createdAt" TEXT
);

CREATE TABLE IF NOT EXISTS "analytics_visits" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT,
  "page" TEXT,
  "duration" INTEGER,
  "referrer" TEXT,
  "createdAt" TEXT
);

CREATE TABLE IF NOT EXISTS "video_action_logs" (
  "id" TEXT PRIMARY KEY,
  "action" TEXT,
  "videoId" TEXT,
  "playerId" TEXT,
  "actionBy" TEXT,
  "actionByType" TEXT,
  "details" JSONB,
  "timestamp" TEXT,
  "metadata" JSONB,
  "createdAt" TEXT
);

CREATE TABLE IF NOT EXISTS "player_action_logs" (
  "id" TEXT PRIMARY KEY,
  "playerId" TEXT,
  "action" TEXT,
  "performedBy" TEXT,
  "details" JSONB,
  "createdAt" TEXT
);

CREATE TABLE IF NOT EXISTS "employee_activities" (
  "id" TEXT PRIMARY KEY,
  "employeeId" TEXT,
  "action" TEXT,
  "details" JSONB,
  "createdAt" TEXT
);

CREATE TABLE IF NOT EXISTS "email_logs" (
  "id" TEXT PRIMARY KEY,
  "to" TEXT,
  "subject" TEXT,
  "template" TEXT,
  "status" TEXT,
  "error" TEXT,
  "createdAt" TEXT
);

-- ============================================================
-- SECTION 12: MISC TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS "player_join_requests" (
  "id" TEXT PRIMARY KEY,
  "playerId" TEXT,
  "organizerId" TEXT,
  "organizerType" TEXT,
  "status" TEXT DEFAULT 'pending',
  "message" TEXT,
  "createdAt" TEXT,
  "updatedAt" TEXT
);

CREATE TABLE IF NOT EXISTS "private_sessions_requests" (
  "id" TEXT PRIMARY KEY,
  "playerId" TEXT,
  "trainerId" TEXT,
  "status" TEXT DEFAULT 'pending',
  "sessionType" TEXT,
  "preferredDate" TEXT,
  "message" TEXT,
  "createdAt" TEXT,
  "updatedAt" TEXT
);

CREATE TABLE IF NOT EXISTS "player_stats" (
  "id" TEXT PRIMARY KEY,
  "playerId" TEXT,
  "pace" INTEGER,
  "shooting" INTEGER,
  "passing" INTEGER,
  "dribbling" INTEGER,
  "defending" INTEGER,
  "physical" INTEGER,
  "overall" INTEGER,
  "season" TEXT,
  "updatedAt" TEXT
);

CREATE TABLE IF NOT EXISTS "countries" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT,
  "nameAr" TEXT,
  "code" TEXT,
  "dialCode" TEXT,
  "currency" TEXT,
  "flag" TEXT
);

CREATE TABLE IF NOT EXISTS "cities" (
  "id" TEXT PRIMARY KEY,
  "countryId" TEXT,
  "name" TEXT,
  "nameAr" TEXT
);

CREATE TABLE IF NOT EXISTS "admins" (
  "id" TEXT PRIMARY KEY,
  "email" TEXT,
  "name" TEXT,
  "role" TEXT DEFAULT 'admin',
  "permissions" JSONB,
  "isActive" BOOLEAN DEFAULT true,
  "createdAt" TEXT
);

CREATE TABLE IF NOT EXISTS "roles" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT,
  "permissions" JSONB,
  "createdAt" TEXT
);

-- ============================================================
-- SECTION 12b: ADD MISSING COLUMNS (للجداول الموجودة مسبقاً)
-- ============================================================

-- Core tables that may already exist without some columns
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS "uid" TEXT;
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS "full_name" TEXT;
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS "club_name" TEXT;
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS "logo" TEXT;
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS "coverImage" TEXT;
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS "founded" TEXT;
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS "league" TEXT;
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS "stadium" TEXT;
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS "website" TEXT;
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS "organizationCode" TEXT;
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS "isVerified" BOOLEAN DEFAULT false;
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS "followersCount" INTEGER DEFAULT 0;
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS "socialMedia" JSONB;
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS "gallery" JSONB;
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS "stats" JSONB;
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN DEFAULT true;
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS "isDeleted" BOOLEAN DEFAULT false;
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS "deletedAt" TEXT;
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS "created_at" TEXT;
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS "updated_at" TEXT;
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS "subscriptionStatus" TEXT DEFAULT 'inactive';

ALTER TABLE academies ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE academies ADD COLUMN IF NOT EXISTS "uid" TEXT;
ALTER TABLE academies ADD COLUMN IF NOT EXISTS "full_name" TEXT;
ALTER TABLE academies ADD COLUMN IF NOT EXISTS "academy_name" TEXT;
ALTER TABLE academies ADD COLUMN IF NOT EXISTS "logo" TEXT;
ALTER TABLE academies ADD COLUMN IF NOT EXISTS "organizationCode" TEXT;
ALTER TABLE academies ADD COLUMN IF NOT EXISTS "isVerified" BOOLEAN DEFAULT false;
ALTER TABLE academies ADD COLUMN IF NOT EXISTS "programs" JSONB;
ALTER TABLE academies ADD COLUMN IF NOT EXISTS "socialMedia" JSONB;
ALTER TABLE academies ADD COLUMN IF NOT EXISTS "stats" JSONB;
ALTER TABLE academies ADD COLUMN IF NOT EXISTS "email" TEXT;
ALTER TABLE academies ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN DEFAULT true;
ALTER TABLE academies ADD COLUMN IF NOT EXISTS "isDeleted" BOOLEAN DEFAULT false;
ALTER TABLE academies ADD COLUMN IF NOT EXISTS "deletedAt" TEXT;
ALTER TABLE academies ADD COLUMN IF NOT EXISTS "created_at" TEXT;
ALTER TABLE academies ADD COLUMN IF NOT EXISTS "updated_at" TEXT;
ALTER TABLE academies ADD COLUMN IF NOT EXISTS "subscriptionStatus" TEXT DEFAULT 'inactive';

ALTER TABLE agents ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS "uid" TEXT;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS "full_name" TEXT;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS "licenseNumber" TEXT;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS "socialMedia" JSONB;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS "stats" JSONB;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS "email" TEXT;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN DEFAULT true;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS "isDeleted" BOOLEAN DEFAULT false;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS "deletedAt" TEXT;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS "subscriptionStatus" TEXT DEFAULT 'inactive';

ALTER TABLE trainers ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE trainers ADD COLUMN IF NOT EXISTS "uid" TEXT;
ALTER TABLE trainers ADD COLUMN IF NOT EXISTS "full_name" TEXT;
ALTER TABLE trainers ADD COLUMN IF NOT EXISTS "specialization" TEXT;
ALTER TABLE trainers ADD COLUMN IF NOT EXISTS "licenseNumber" TEXT;
ALTER TABLE trainers ADD COLUMN IF NOT EXISTS "socialMedia" JSONB;
ALTER TABLE trainers ADD COLUMN IF NOT EXISTS "stats" JSONB;
ALTER TABLE trainers ADD COLUMN IF NOT EXISTS "email" TEXT;
ALTER TABLE trainers ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN DEFAULT true;
ALTER TABLE trainers ADD COLUMN IF NOT EXISTS "isDeleted" BOOLEAN DEFAULT false;
ALTER TABLE trainers ADD COLUMN IF NOT EXISTS "deletedAt" TEXT;
ALTER TABLE trainers ADD COLUMN IF NOT EXISTS "subscriptionStatus" TEXT DEFAULT 'inactive';

ALTER TABLE users ADD COLUMN IF NOT EXISTS "uid" TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "email" TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "accountType" TEXT DEFAULT 'player';
ALTER TABLE users ADD COLUMN IF NOT EXISTS "subscriptionStatus" TEXT DEFAULT 'inactive';
ALTER TABLE users ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "isDeleted" BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "firebaseEmail" TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "full_name" TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "profile_image_url" TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "countryCode" TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "currency" TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "currencySymbol" TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "subscriptionEndDate" TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "lastPaymentDate" TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "lastPaymentMethod" TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "lastPaymentAmount" TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "usedReferralCode" TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "statusChangedAt" TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "statusChangedBy" TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "lastLoginIP" TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "last_login" TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "created_at" TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "updated_at" TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "likedVideos" JSONB;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "savedVideos" JSONB;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "following" JSONB;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "followers" JSONB;

ALTER TABLE players ADD COLUMN IF NOT EXISTS "uid" TEXT;
ALTER TABLE players ADD COLUMN IF NOT EXISTS "email" TEXT;
ALTER TABLE players ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE players ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN DEFAULT true;
ALTER TABLE players ADD COLUMN IF NOT EXISTS "isDeleted" BOOLEAN DEFAULT false;
ALTER TABLE players ADD COLUMN IF NOT EXISTS "subscriptionStatus" TEXT DEFAULT 'inactive';
ALTER TABLE players ADD COLUMN IF NOT EXISTS "country" TEXT;
ALTER TABLE players ADD COLUMN IF NOT EXISTS "primary_position" TEXT;
ALTER TABLE players ADD COLUMN IF NOT EXISTS "gender" TEXT;
ALTER TABLE players ADD COLUMN IF NOT EXISTS "club_id" TEXT;
ALTER TABLE players ADD COLUMN IF NOT EXISTS "academy_id" TEXT;
ALTER TABLE players ADD COLUMN IF NOT EXISTS "phoneNumber" TEXT;
ALTER TABLE players ADD COLUMN IF NOT EXISTS "profile_image_url" TEXT;
ALTER TABLE players ADD COLUMN IF NOT EXISTS "birthDate" TEXT;
ALTER TABLE players ADD COLUMN IF NOT EXISTS "clubId" TEXT;
ALTER TABLE players ADD COLUMN IF NOT EXISTS "academyId" TEXT;
ALTER TABLE players ADD COLUMN IF NOT EXISTS "trainerId" TEXT;
ALTER TABLE players ADD COLUMN IF NOT EXISTS "agentId" TEXT;
ALTER TABLE players ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
ALTER TABLE players ADD COLUMN IF NOT EXISTS "gallery" JSONB;
ALTER TABLE players ADD COLUMN IF NOT EXISTS "achievements" JSONB;
ALTER TABLE players ADD COLUMN IF NOT EXISTS "medical" JSONB;
ALTER TABLE players ADD COLUMN IF NOT EXISTS "viewCount" INTEGER DEFAULT 0;
ALTER TABLE players ADD COLUMN IF NOT EXISTS "convertedToAccount" BOOLEAN DEFAULT false;
ALTER TABLE players ADD COLUMN IF NOT EXISTS "deletedBy" TEXT;
ALTER TABLE players ADD COLUMN IF NOT EXISTS "created_at" TEXT;
ALTER TABLE players ADD COLUMN IF NOT EXISTS "updated_at" TEXT;

ALTER TABLE interaction_notifications ADD COLUMN IF NOT EXISTS "dedupeKey" TEXT;
ALTER TABLE interaction_notifications ADD COLUMN IF NOT EXISTS "expiresAt" TEXT;
ALTER TABLE interaction_notifications ADD COLUMN IF NOT EXISTS "priority" TEXT DEFAULT 'normal';
ALTER TABLE interaction_notifications ADD COLUMN IF NOT EXISTS "updatedAt" TEXT;

ALTER TABLE smart_notifications ADD COLUMN IF NOT EXISTS "dedupeKey" TEXT;
ALTER TABLE smart_notifications ADD COLUMN IF NOT EXISTS "expiresAt" TEXT;
ALTER TABLE smart_notifications ADD COLUMN IF NOT EXISTS "viewCount" INTEGER DEFAULT 0;
ALTER TABLE smart_notifications ADD COLUMN IF NOT EXISTS "accountType" TEXT;
ALTER TABLE smart_notifications ADD COLUMN IF NOT EXISTS "senderAccountType" TEXT;

ALTER TABLE notifications ADD COLUMN IF NOT EXISTS "accountType" TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS "expiresAt" TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS "adminId" TEXT;

ALTER TABLE users ADD COLUMN IF NOT EXISTS "notificationSettings" JSONB;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "convertedFromDependent" BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "unifiedPassword" BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "needsPasswordChange" BOOLEAN DEFAULT false;

ALTER TABLE players ADD COLUMN IF NOT EXISTS "migratedFromUsers" BOOLEAN DEFAULT false;
ALTER TABLE players ADD COLUMN IF NOT EXISTS "migrationDate" TEXT;
ALTER TABLE players ADD COLUMN IF NOT EXISTS "loginAccountCreated" BOOLEAN DEFAULT false;
ALTER TABLE players ADD COLUMN IF NOT EXISTS "organizationCode" TEXT;

-- createdAt / userId for tables that may exist without them
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS "userId" TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS "isRead" BOOLEAN DEFAULT false;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS "createdAt" TEXT;
ALTER TABLE interaction_notifications ADD COLUMN IF NOT EXISTS "profileOwnerId" TEXT;
ALTER TABLE interaction_notifications ADD COLUMN IF NOT EXISTS "isRead" BOOLEAN DEFAULT false;
ALTER TABLE interaction_notifications ADD COLUMN IF NOT EXISTS "createdAt" TEXT;
ALTER TABLE smart_notifications ADD COLUMN IF NOT EXISTS "userId" TEXT;
ALTER TABLE smart_notifications ADD COLUMN IF NOT EXISTS "isRead" BOOLEAN DEFAULT false;
ALTER TABLE admin_notifications ADD COLUMN IF NOT EXISTS "createdAt" TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS "conversationId" TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS "senderId" TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS "timestamp" TEXT;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS "lastMessageTime" TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS "userId" TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS "createdAt" TEXT;
ALTER TABLE geidea_payments ADD COLUMN IF NOT EXISTS "merchantReferenceId" TEXT;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS "userId" TEXT;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS "expires_at" TEXT;
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS "organizerId" TEXT;
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN DEFAULT true;
ALTER TABLE opportunity_applications ADD COLUMN IF NOT EXISTS "opportunityId" TEXT;
ALTER TABLE opportunity_applications ADD COLUMN IF NOT EXISTS "playerId" TEXT;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS "referralCode" TEXT;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS "referrerId" TEXT;
ALTER TABLE support_conversations ADD COLUMN IF NOT EXISTS "userId" TEXT;
ALTER TABLE support_messages ADD COLUMN IF NOT EXISTS "conversationId" TEXT;
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN DEFAULT true;
ALTER TABLE tournament_registrations ADD COLUMN IF NOT EXISTS "tournamentId" TEXT;
ALTER TABLE career_applications ADD COLUMN IF NOT EXISTS "email" TEXT;
ALTER TABLE career_applications ADD COLUMN IF NOT EXISTS "createdAt" TEXT;
ALTER TABLE analytics ADD COLUMN IF NOT EXISTS "event" TEXT;
ALTER TABLE analytics ADD COLUMN IF NOT EXISTS "userId" TEXT;
ALTER TABLE analytics ADD COLUMN IF NOT EXISTS "createdAt" TEXT;
ALTER TABLE password_reset_tokens ADD COLUMN IF NOT EXISTS "expiresAt" TEXT;

-- status columns for tables that may exist without it
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'pending';
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'inactive';
ALTER TABLE geidea_payments ADD COLUMN IF NOT EXISTS "status" TEXT;
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'active';
ALTER TABLE opportunity_applications ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'pending';
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'pending';
ALTER TABLE support_conversations ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'open';
ALTER TABLE tournament_registrations ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'pending';
ALTER TABLE career_applications ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'pending';
ALTER TABLE payments ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'pending';
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'upcoming';

-- otp_codes columns
ALTER TABLE otp_codes ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE otp_codes ADD COLUMN IF NOT EXISTS "email" TEXT;
ALTER TABLE otp_codes ADD COLUMN IF NOT EXISTS "code" TEXT;
ALTER TABLE otp_codes ADD COLUMN IF NOT EXISTS "type" TEXT;
ALTER TABLE otp_codes ADD COLUMN IF NOT EXISTS "expiresAt" TEXT;
ALTER TABLE otp_codes ADD COLUMN IF NOT EXISTS "verified" BOOLEAN DEFAULT false;
ALTER TABLE otp_codes ADD COLUMN IF NOT EXISTS "attempts" INTEGER DEFAULT 0;

-- otp_verifications columns
ALTER TABLE otp_verifications ADD COLUMN IF NOT EXISTS "phoneNumber" TEXT;
ALTER TABLE otp_verifications ADD COLUMN IF NOT EXISTS "otpHash" TEXT;
ALTER TABLE otp_verifications ADD COLUMN IF NOT EXISTS "attempts" INTEGER DEFAULT 0;
ALTER TABLE otp_verifications ADD COLUMN IF NOT EXISTS "purpose" TEXT DEFAULT 'registration';
ALTER TABLE otp_verifications ADD COLUMN IF NOT EXISTS "verifiedAt" TEXT;

-- Create campaign_logs if not exists (must be before ALTER)
CREATE TABLE IF NOT EXISTS "campaign_logs" (
  "id" TEXT PRIMARY KEY,
  "templateName" TEXT,
  "templateBody" TEXT,
  "segment" TEXT,
  "countries" JSONB,
  "total" INTEGER DEFAULT 0,
  "success" INTEGER DEFAULT 0,
  "failed" INTEGER DEFAULT 0,
  "failedEntries" JSONB DEFAULT '[]',
  "status" TEXT DEFAULT 'completed',
  "startedAt" TEXT,
  "finishedAt" TEXT,
  "createdAt" TEXT
);

ALTER TABLE campaign_logs ADD COLUMN IF NOT EXISTS "templateName" TEXT;
ALTER TABLE campaign_logs ADD COLUMN IF NOT EXISTS "templateBody" TEXT;
ALTER TABLE campaign_logs ADD COLUMN IF NOT EXISTS "segment" TEXT;
ALTER TABLE campaign_logs ADD COLUMN IF NOT EXISTS "countries" JSONB;
ALTER TABLE campaign_logs ADD COLUMN IF NOT EXISTS "total" INTEGER DEFAULT 0;
ALTER TABLE campaign_logs ADD COLUMN IF NOT EXISTS "success" INTEGER DEFAULT 0;
ALTER TABLE campaign_logs ADD COLUMN IF NOT EXISTS "failed" INTEGER DEFAULT 0;
ALTER TABLE campaign_logs ADD COLUMN IF NOT EXISTS "failedEntries" JSONB DEFAULT '[]';
ALTER TABLE campaign_logs ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'completed';
ALTER TABLE campaign_logs ADD COLUMN IF NOT EXISTS "startedAt" TEXT;
ALTER TABLE campaign_logs ADD COLUMN IF NOT EXISTS "finishedAt" TEXT;

-- Create invite_codes if not exists
CREATE TABLE IF NOT EXISTS "invite_codes" (
  "id" TEXT PRIMARY KEY,
  "code" TEXT,
  "playerId" TEXT,
  "playerName" TEXT,
  "createdBy" TEXT,
  "isUsed" BOOLEAN DEFAULT false,
  "usedBy" TEXT,
  "usedAt" TEXT,
  "expiresAt" TEXT,
  "createdAt" TEXT
);

-- Create whatsappNumbers if not exists
CREATE TABLE IF NOT EXISTS "whatsappNumbers" (
  "id" TEXT PRIMARY KEY,
  "number" TEXT,
  "label" TEXT,
  "isActive" BOOLEAN DEFAULT true,
  "createdAt" TEXT,
  "updatedAt" TEXT
);

-- Create whatsappMessages if not exists
CREATE TABLE IF NOT EXISTS "whatsappMessages" (
  "id" TEXT PRIMARY KEY,
  "content" TEXT,
  "type" TEXT,
  "isActive" BOOLEAN DEFAULT true,
  "createdAt" TEXT,
  "updatedAt" TEXT
);

-- ============================================================
-- SECTION 13: INDEXES (الفهارس للأداء)
-- ============================================================

-- Users
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_uid ON users(uid);
CREATE INDEX IF NOT EXISTS idx_users_account_type ON users("accountType");
CREATE INDEX IF NOT EXISTS idx_users_sub_status ON users("subscriptionStatus");

-- Players
CREATE INDEX IF NOT EXISTS idx_players_email ON players(email);
CREATE INDEX IF NOT EXISTS idx_players_phone ON players(phone);
CREATE INDEX IF NOT EXISTS idx_players_uid ON players(uid);
CREATE INDEX IF NOT EXISTS idx_players_club_id ON players(club_id);
CREATE INDEX IF NOT EXISTS idx_players_academy_id ON players(academy_id);
CREATE INDEX IF NOT EXISTS idx_players_active ON players("isActive");
CREATE INDEX IF NOT EXISTS idx_players_deleted ON players("isDeleted");
CREATE INDEX IF NOT EXISTS idx_players_sub_status ON players("subscriptionStatus");
CREATE INDEX IF NOT EXISTS idx_players_country ON players(country);
CREATE INDEX IF NOT EXISTS idx_players_position ON players(primary_position);
CREATE INDEX IF NOT EXISTS idx_players_gender ON players(gender);

-- Clubs / Academies / Agents / Trainers
CREATE INDEX IF NOT EXISTS idx_clubs_email ON clubs(email);
CREATE INDEX IF NOT EXISTS idx_clubs_phone ON clubs(phone);
CREATE INDEX IF NOT EXISTS idx_clubs_active ON clubs("isActive");
CREATE INDEX IF NOT EXISTS idx_academies_email ON academies(email);
CREATE INDEX IF NOT EXISTS idx_academies_phone ON academies(phone);
CREATE INDEX IF NOT EXISTS idx_agents_email ON agents(email);
CREATE INDEX IF NOT EXISTS idx_trainers_email ON trainers(email);

-- Notifications
CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications("userId");
CREATE INDEX IF NOT EXISTS idx_notif_read ON notifications("isRead");
CREATE INDEX IF NOT EXISTS idx_notif_created ON notifications("createdAt");
CREATE INDEX IF NOT EXISTS idx_interaction_notif_owner ON interaction_notifications("profileOwnerId");
CREATE INDEX IF NOT EXISTS idx_interaction_notif_read ON interaction_notifications("isRead");
CREATE INDEX IF NOT EXISTS idx_interaction_notif_created ON interaction_notifications("createdAt");
CREATE INDEX IF NOT EXISTS idx_interaction_notif_dedupe ON interaction_notifications("dedupeKey");
CREATE INDEX IF NOT EXISTS idx_smart_notif_user ON smart_notifications("userId");
CREATE INDEX IF NOT EXISTS idx_smart_notif_read ON smart_notifications("isRead");
CREATE INDEX IF NOT EXISTS idx_admin_notif_created ON admin_notifications("createdAt");

-- Messages
CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages("conversationId");
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages("senderId");
CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp);
CREATE INDEX IF NOT EXISTS idx_conversations_last_msg ON conversations("lastMessageTime");

-- Payments
CREATE INDEX IF NOT EXISTS idx_invoices_user ON invoices("userId");
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_created ON invoices("createdAt");
CREATE INDEX IF NOT EXISTS idx_geidea_merchant_ref ON geidea_payments("merchantReferenceId");
CREATE INDEX IF NOT EXISTS idx_geidea_status ON geidea_payments(status);
CREATE INDEX IF NOT EXISTS idx_subs_user ON subscriptions("userId");
CREATE INDEX IF NOT EXISTS idx_subs_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subs_expires ON subscriptions("expires_at");

-- Opportunities
CREATE INDEX IF NOT EXISTS idx_opp_organizer ON opportunities("organizerId");
CREATE INDEX IF NOT EXISTS idx_opp_status ON opportunities(status);
CREATE INDEX IF NOT EXISTS idx_opp_active ON opportunities("isActive");
CREATE INDEX IF NOT EXISTS idx_opp_app_opp ON opportunity_applications("opportunityId");
CREATE INDEX IF NOT EXISTS idx_opp_app_player ON opportunity_applications("playerId");
CREATE INDEX IF NOT EXISTS idx_opp_app_status ON opportunity_applications(status);

-- Auth
CREATE INDEX IF NOT EXISTS idx_pwd_reset_email ON password_reset_tokens(email);
CREATE INDEX IF NOT EXISTS idx_pwd_reset_expires ON password_reset_tokens("expiresAt");
CREATE INDEX IF NOT EXISTS idx_otp_phone ON otp_codes(phone);
CREATE INDEX IF NOT EXISTS idx_otp_expires ON otp_codes("expiresAt");

-- Referrals
CREATE INDEX IF NOT EXISTS idx_referrals_code ON referrals("referralCode");
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals("referrerId");
CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals(status);

-- Support
CREATE INDEX IF NOT EXISTS idx_support_conv_user ON support_conversations("userId");
CREATE INDEX IF NOT EXISTS idx_support_conv_status ON support_conversations(status);
CREATE INDEX IF NOT EXISTS idx_support_msg_conv ON support_messages("conversationId");

-- Tournaments
CREATE INDEX IF NOT EXISTS idx_tournaments_status ON tournaments(status);
CREATE INDEX IF NOT EXISTS idx_tournaments_active ON tournaments("isActive");
CREATE INDEX IF NOT EXISTS idx_tournament_reg_tournament ON tournament_registrations("tournamentId");
CREATE INDEX IF NOT EXISTS idx_tournament_reg_status ON tournament_registrations(status);

-- Career Applications
CREATE INDEX IF NOT EXISTS idx_career_apps_email ON career_applications(email);
CREATE INDEX IF NOT EXISTS idx_career_apps_status ON career_applications(status);
CREATE INDEX IF NOT EXISTS idx_career_apps_created ON career_applications("createdAt");

-- Analytics
CREATE INDEX IF NOT EXISTS idx_analytics_event ON analytics(event);
CREATE INDEX IF NOT EXISTS idx_analytics_user ON analytics("userId");
CREATE INDEX IF NOT EXISTS idx_analytics_created ON analytics("createdAt");

-- ============================================================
-- SECTION 14: ROW LEVEL SECURITY (RLS)
-- ============================================================

-- تفعيل RLS على الجداول الحساسة
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE interaction_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE smart_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE otp_codes ENABLE ROW LEVEL SECURITY;

-- سياسة: كل مستخدم يرى بياناته فقط (للوصول من الـ client)
-- ملاحظة: الـ service_role (getSupabaseAdmin) يتجاوز RLS دائماً

DROP POLICY IF EXISTS "users_select_own" ON users;
CREATE POLICY "users_select_own" ON users
  FOR SELECT USING (auth.uid()::text = id OR auth.uid()::text = uid);

DROP POLICY IF EXISTS "users_update_own" ON users;
CREATE POLICY "users_update_own" ON users
  FOR UPDATE USING (auth.uid()::text = id OR auth.uid()::text = uid);

DROP POLICY IF EXISTS "players_select_own" ON players;
CREATE POLICY "players_select_own" ON players
  FOR SELECT USING (auth.uid()::text = id OR auth.uid()::text = uid);

DROP POLICY IF EXISTS "players_update_own" ON players;
CREATE POLICY "players_update_own" ON players
  FOR UPDATE USING (auth.uid()::text = id OR auth.uid()::text = uid);

DROP POLICY IF EXISTS "notifications_select_own" ON notifications;
CREATE POLICY "notifications_select_own" ON notifications
  FOR SELECT USING (auth.uid()::text = "userId");

DROP POLICY IF EXISTS "notifications_update_own" ON notifications;
CREATE POLICY "notifications_update_own" ON notifications
  FOR UPDATE USING (auth.uid()::text = "userId");

DROP POLICY IF EXISTS "interaction_notif_select_own" ON interaction_notifications;
CREATE POLICY "interaction_notif_select_own" ON interaction_notifications
  FOR SELECT USING (auth.uid()::text = "profileOwnerId");

DROP POLICY IF EXISTS "smart_notif_select_own" ON smart_notifications;
CREATE POLICY "smart_notif_select_own" ON smart_notifications
  FOR SELECT USING (auth.uid()::text = "userId");

DROP POLICY IF EXISTS "messages_select_participant" ON messages;
CREATE POLICY "messages_select_participant" ON messages
  FOR SELECT USING (auth.uid()::text = "senderId" OR auth.uid()::text = "receiverId");

DROP POLICY IF EXISTS "invoices_select_own" ON invoices;
CREATE POLICY "invoices_select_own" ON invoices
  FOR SELECT USING (auth.uid()::text = "userId");

DROP POLICY IF EXISTS "subscriptions_select_own" ON subscriptions;
CREATE POLICY "subscriptions_select_own" ON subscriptions
  FOR SELECT USING (auth.uid()::text = "userId" OR auth.uid()::text = id);

-- password_reset_tokens: فقط عبر service_role
DROP POLICY IF EXISTS "pwd_reset_deny_client" ON password_reset_tokens;
CREATE POLICY "pwd_reset_deny_client" ON password_reset_tokens
  FOR ALL USING (false);

-- otp_codes: فقط عبر service_role
DROP POLICY IF EXISTS "otp_deny_client" ON otp_codes;
CREATE POLICY "otp_deny_client" ON otp_codes
  FOR ALL USING (false);

-- ============================================================
-- SECTION 15: REALTIME SUBSCRIPTIONS
-- ============================================================

-- تفعيل Realtime للجداول المهمة (آمن للتكرار)
DO $$
DECLARE
  tables TEXT[] := ARRAY['notifications','interaction_notifications','smart_notifications',
                         'messages','conversations','broadcasts','players','opportunities'];
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND tablename = tbl
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %I', tbl);
    END IF;
  END LOOP;
END $$;

-- ============================================================
-- DONE! ✅
-- ============================================================
-- بعد تشغيل هذا الملف:
-- 1. تأكد من وجود الجداول في Supabase Dashboard > Table Editor
-- 2. أضف DATABASE_URL في .env.local من: Settings > Database > Connection string
-- 3. شغّل: npx prisma generate (إذا كنت تستخدم Prisma)
-- ============================================================
