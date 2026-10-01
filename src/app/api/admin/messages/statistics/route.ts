import { NextRequest, NextResponse } from 'next/server';
import { authorizeAdmin, withPrivateResponseHeaders } from '@/lib/api/admin-auth';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

interface MessageRow {
  senderId?: string | null;
  receiverId?: string | null;
  messageType?: string | null;
  timestamp?: string | null;
}

export async function GET(request: NextRequest) {
  const authorization = await authorizeAdmin(request, 'read:reports');
  if (!authorization.ok) return authorization.response;

  try {
    const rawOffset = Number(request.nextUrl.searchParams.get('timezoneOffsetMinutes') ?? '0');
    const timezoneOffsetMinutes = Number.isFinite(rawOffset)
      ? Math.max(-840, Math.min(840, Math.trunc(rawOffset)))
      : 0;
    const timezoneOffsetMs = timezoneOffsetMinutes * 60 * 1000;
    const toLocalTime = (date: Date) => new Date(date.getTime() - timezoneOffsetMs);

    const db = getSupabaseAdmin();

    const [{ data: messagesData, error: messagesError }, { count: conversationsCount, error: conversationsError }] =
      await Promise.all([
        db.from('messages').select('senderId, receiverId, messageType, timestamp'),
        db.from('conversations').select('id', { count: 'exact', head: true }),
      ]);

    if (messagesError) throw messagesError;
    if (conversationsError) throw conversationsError;

    const messages = (messagesData ?? []) as MessageRow[];
    const uniqueUsers = new Set<string>();
    let textMessages = 0;
    let voiceMessages = 0;
    let imageMessages = 0;

    for (const message of messages) {
      if (message.senderId) uniqueUsers.add(String(message.senderId));
      if (message.receiverId) uniqueUsers.add(String(message.receiverId));

      const type = message.messageType || 'text';
      if (type === 'voice') voiceMessages += 1;
      else if (type === 'image') imageMessages += 1;
      else textMessages += 1;
    }

    const nowLocal = toLocalTime(new Date());
    const todayStartLocal = Date.UTC(
      nowLocal.getUTCFullYear(),
      nowLocal.getUTCMonth(),
      nowLocal.getUTCDate()
    );

    const todayMessages = messages.reduce((count, message) => {
      if (!message.timestamp) return count;
      const timestamp = new Date(message.timestamp);
      if (Number.isNaN(timestamp.getTime())) return count;
      return toLocalTime(timestamp).getTime() >= todayStartLocal ? count + 1 : count;
    }, 0);

    const dayNames = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    const dailyMessages = [];

    for (let i = 6; i >= 0; i -= 1) {
      const dayStartLocal = new Date(todayStartLocal);
      dayStartLocal.setUTCDate(dayStartLocal.getUTCDate() - i);
      const nextDayStartLocal = new Date(dayStartLocal);
      nextDayStartLocal.setUTCDate(nextDayStartLocal.getUTCDate() + 1);

      const count = messages.reduce((total, message) => {
        if (!message.timestamp) return total;
        const timestamp = new Date(message.timestamp);
        if (Number.isNaN(timestamp.getTime())) return total;
        const localTimestamp = toLocalTime(timestamp).getTime();
        return localTimestamp >= dayStartLocal.getTime() && localTimestamp < nextDayStartLocal.getTime()
          ? total + 1
          : total;
      }, 0);

      dailyMessages.push({
        day: i === 0 ? 'اليوم' : i === 1 ? 'أمس' : dayNames[dayStartLocal.getUTCDay()],
        messages: count,
      });
    }

    return withPrivateResponseHeaders(
      NextResponse.json({
        success: true,
        data: {
          stats: {
            totalMessages: messages.length,
            todayMessages,
            activeConversations: conversationsCount ?? 0,
            totalUsers: uniqueUsers.size,
            textMessages,
            voiceMessages,
            imageMessages,
          },
          dailyMessages,
          messageTypes: [
            { name: 'نصية', value: textMessages, fill: 'var(--color-text)' },
            { name: 'صوتية', value: voiceMessages, fill: 'var(--color-voice)' },
            { name: 'صور', value: imageMessages, fill: 'var(--color-image)' },
          ],
        },
      })
    );
  } catch (error) {
    console.error('[admin/messages/statistics] Failed:', error);
    return withPrivateResponseHeaders(
      NextResponse.json(
        { success: false, error: 'Failed to load message statistics' },
        { status: 500 }
      )
    );
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
