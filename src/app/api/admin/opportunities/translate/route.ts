import { NextRequest, NextResponse } from 'next/server';
import { authorizeAdmin } from '@/lib/api/admin-auth';
import { translateOpportunityFields } from '@/lib/services/translation-service';

export async function POST(req: NextRequest) {
  const authorization = await authorizeAdmin(req);
  if (!authorization.ok) return authorization.response;

  try {
    const { title, description, requirements } = await req.json();

    if (!title || typeof title !== 'string' || !title.trim()) {
      return NextResponse.json({ error: 'العنوان مطلوب للترجمة' }, { status: 400 });
    }

    const translations = await translateOpportunityFields(
      title.trim(),
      description || '',
      requirements || ''
    );

    return NextResponse.json({ success: true, translations });
  } catch (err: any) {
    console.error('❌ Admin Translate API error:', err);
    return NextResponse.json({ error: err.message || 'فشلت الترجمة التلقائية' }, { status: 500 });
  }
}
