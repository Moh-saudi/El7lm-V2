import type { User } from 'firebase/auth';
import { getSupabaseImageUrl } from '@/lib/supabase/image-utils';

export type SenderContext = {
  senderId?: string | null;
  senderName?: string | null;
  senderAvatar?: string | null;
  senderAccountType?: string | null;
  senderBucket?: string | null;
};

const DEFAULT_BUCKET_BY_ACCOUNT: Record<string, string> = {
  club: 'clubavatar',
  academy: 'academyavatar',
  player: 'playeravatar',
  trainer: 'traineravatar',
  agent: 'agentavatar'
};

export const deduceBucket = (
  senderAccountType?: string | null,
  fallback?: string | null
): string | null => {
  if (fallback) return fallback;
  if (!senderAccountType) return null;
  return DEFAULT_BUCKET_BY_ACCOUNT[senderAccountType] || 'avatars';
};

export const resolveAvatarUrl = (
  avatar?: string | null,
  options?: { bucket?: string | null; senderAccountType?: string | null; metadata?: Record<string, any> }
): string | null => {
  if (!avatar) return null;
  if (avatar.startsWith('http') || avatar.startsWith('data:')) {
    return avatar;
  }

  let bucket =
    options?.bucket ||
    options?.metadata?.senderBucket ||
    options?.metadata?.avatarBucket ||
    options?.metadata?.bucket ||
    deduceBucket(options?.senderAccountType);

  let path = avatar;

  const bucketPrefixMatch = avatar.match(/^(clubavatar|academyavatar|playeravatar|traineravatar|agentavatar|avatars)\//);
  if (bucketPrefixMatch) {
    bucket = bucket || bucketPrefixMatch[1];
    path = avatar.replace(`${bucketPrefixMatch[1]}/`, '');
  } else if (bucket) {
    path = avatar.replace(new RegExp(`^${bucket}/`), '');
  }

  const publicUrl = getSupabaseImageUrl(path, bucket || 'avatars');
  return publicUrl || avatar;
};

export const normalizeNotificationMetadata = (metadata?: Record<string, any>) => {
  if (!metadata) return metadata;

  const senderAccountType =
    metadata.senderAccountType ||
    metadata.viewerAccountType ||
    metadata.accountType ||
    metadata.profileType ||
    metadata.userAccountType;

  const bucket =
    metadata.senderBucket ||
    metadata.avatarBucket ||
    metadata.bucket ||
    deduceBucket(senderAccountType);

  const resolvedAvatar = resolveAvatarUrl(metadata.senderAvatar, {
    bucket,
    senderAccountType,
    metadata
  });

  return {
    ...metadata,
    senderAccountType,
    senderBucket: bucket,
    senderAvatar: resolvedAvatar
  };
};

export const normalizeNotificationPayload = (
  payload: Record<string, any>,
  senderInfo?: SenderContext
) => {
  const metadata = normalizeNotificationMetadata({
    ...payload.metadata,
    ...(senderInfo
      ? {
          senderId: senderInfo.senderId,
          senderName: senderInfo.senderName,
          senderAccountType: senderInfo.senderAccountType,
          senderAvatar: senderInfo.senderAvatar,
          senderBucket: senderInfo.senderBucket
        }
      : {})
  });

  const senderAccountType =
    payload.senderAccountType ||
    senderInfo?.senderAccountType ||
    metadata?.senderAccountType;

  const senderAvatar =
    resolveAvatarUrl(payload.senderAvatar, {
      senderAccountType,
      metadata
    }) ||
    senderInfo?.senderAvatar ||
    metadata?.senderAvatar ||
    null;

  return {
    ...payload,
    senderId: payload.senderId || senderInfo?.senderId || metadata?.senderId || null,
    senderName: payload.senderName || senderInfo?.senderName || metadata?.senderName || null,
    senderAccountType,
    senderAvatar,
    metadata
  };
};

export const buildSenderInfo = ({
  user,
  userData,
  fallbackName = 'الإدارة',
  fallbackAccountType = 'admin',
  overrideBucket
}: {
  user?: User | null;
  userData?: any;
  fallbackName?: string;
  fallbackAccountType?: string;
  overrideBucket?: string | null;
} = {}): SenderContext => {
  const senderId = user?.uid || userData?.uid || userData?.id || null;
  const senderAccountType = userData?.accountType || fallbackAccountType || 'admin';
  const senderName =
    userData?.displayName ||
    userData?.fullName ||
    userData?.name ||
    user?.displayName ||
    user?.email?.split('@')[0] ||
    fallbackName;

  const rawAvatar =
    userData?.logo ||
    userData?.avatar ||
    userData?.photoURL ||
    userData?.profileImage ||
    user?.photoURL ||
    null;

  const bucket = overrideBucket || deduceBucket(senderAccountType);

  const senderAvatar = resolveAvatarUrl(rawAvatar, {
    bucket,
    senderAccountType
  });

  return {
    senderId,
    senderName,
    senderAccountType,
    senderAvatar,
    senderBucket: bucket
  };
};

