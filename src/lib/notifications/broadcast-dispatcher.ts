/**
 * Client-side helper — triggers a smart WhatsApp broadcast.
 *
 * Strategy:
 *  - In-app bell (broadcasts collection) → ONE doc → all users see it FREE
 *  - WhatsApp (opp_pick_up_3) → ONLY players matching opportunity criteria
 *    (position, age, country, gender) → minimizes cost dramatically
 *
 * Fire-and-forget — never throws.
 */

export interface BroadcastOpportunityParams {
  opportunityId: string;
  opportunityTitle: string;
  opportunityType: string;
  organizerName: string;
  organizerType: string;
  // Targeting criteria (from opportunity form)
  targetPositions?: string[];
  ageMin?: number | '';
  ageMax?: number | '';
  country?: string;
  gender?: 'male' | 'female' | 'both';
}

export interface BroadcastClubParams {
  clubId: string;
  clubName: string;
  country?: string;
}

export async function broadcastOpportunityWhatsApp(p: BroadcastOpportunityParams): Promise<void> {
  try {
    const targeting: Record<string, any> = {};
    if (p.targetPositions && p.targetPositions.length > 0) targeting.positions = p.targetPositions;
    if (p.ageMin !== '' && p.ageMin !== undefined) targeting.ageMin = Number(p.ageMin);
    if (p.ageMax !== '' && p.ageMax !== undefined) targeting.ageMax = Number(p.ageMax);
    if (p.country) targeting.country = p.country;
    if (p.gender && p.gender !== 'both') targeting.gender = p.gender;

    const res = await fetch('/api/notifications/broadcast-whatsapp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventType: 'new_opportunity',
        templateName: 'opp_pick_up_3',
        // {{1}} = عنوان الفرصة (رقم الطلب), {{2}} = نوع الفرصة
        params: [p.opportunityTitle, p.opportunityType],
        targeting: Object.keys(targeting).length > 0 ? targeting : undefined,
        broadcastData: {
          title: 'فرصة جديدة 🎯',
          message: `${p.organizerName} نشر: ${p.opportunityTitle}`,
          organizerName: p.organizerName,
          organizerType: p.organizerType,
          opportunityId: p.opportunityId,
          opportunityTitle: p.opportunityTitle,
          opportunityType: p.opportunityType,
          actionUrl: '/dashboard/opportunities',
        },
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (process.env.NODE_ENV === 'development') {
      if (data.success) {
        console.log(
          `[broadcast] ✅ "${p.opportunityTitle}" — matched: ${data.matched}/${data.totalPlayers} players, sent: ${data.sent}, failed: ${data.failed}`
        );
      } else {
        console.warn('[broadcast] ⚠️ WhatsApp broadcast failed:', data.error);
      }
    }
  } catch (e) {
    if (process.env.NODE_ENV === 'development') console.error('[broadcast] fetch error:', e);
  }
}

export async function broadcastClubWhatsApp(p: BroadcastClubParams): Promise<void> {
  try {
    const res = await fetch('/api/notifications/broadcast-whatsapp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventType: 'new_club',
        templateName: 'opp_pick_up_3',
        // {{1}} = club name, {{2}} = country or "نادي"
        params: [p.clubName, p.country || 'نادي'],
        // No targeting for clubs — send to all players
        targeting: undefined,
        broadcastData: {
          title: 'نادي جديد انضم للمنصة 🏟️',
          message: `نادي "${p.clubName}" انضم للمنصة${p.country ? ` من ${p.country}` : ''}`,
          organizerName: p.clubName,
          clubId: p.clubId,
          actionUrl: '/dashboard/opportunities',
        },
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (process.env.NODE_ENV === 'development') {
      if (data.success) {
        console.log(`[broadcast] ✅ club "${p.clubName}" — sent: ${data.sent}/${data.matched}`);
      } else {
        console.warn('[broadcast] ⚠️ club broadcast failed:', data.error);
      }
    }
  } catch (e) {
    if (process.env.NODE_ENV === 'development') console.error('[broadcast] fetch error:', e);
  }
}
