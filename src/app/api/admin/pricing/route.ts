import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { authorizeAdmin } from '@/lib/api/admin-auth';

export const dynamic = 'force-dynamic';

const ALLOWED_COLUMNS = [
  'id',
  'title',
  'subtitle',
  'period',
  'base_currency',
  'base_original_price',
  'base_price',
  'features',
  'bonusFeatures',
  'popular',
  'icon',
  'color',
  'overrides',
  'isActive',
  'order',
];

export async function GET() {
  try {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from('subscription_plans')
      .select('*')
      .order('order', { ascending: true });

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    const unpacked = (data || []).map((p: any) => ({
      ...p,
      accountTypeOverrides: p.accountTypeOverrides || p.overrides?.accountTypeOverrides || {},
      badges: p.badges || p.overrides?.badges || [],
      highlights: p.highlights || p.overrides?.highlights || [],
      recommendedFor: p.recommendedFor || p.overrides?.recommendedFor || '',
      description: p.description || p.overrides?.description || p.subtitle || '',
    }));

    return NextResponse.json({ success: true, data: unpacked });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authorization = await authorizeAdmin(request);
  if (!authorization.ok) return authorization.response;

  try {
    const body = await request.json();
    if (!body || !body.id) {
      return NextResponse.json(
        { success: false, error: 'معرف الخطة (id) مطلوب' },
        { status: 400 }
      );
    }

    // تصفية الحقول لتطابق تماماً أعمدة جدول subscription_plans
    const cleanPlan: Record<string, any> = {};
    for (const col of ALLOWED_COLUMNS) {
      if (body[col] !== undefined) {
        cleanPlan[col] = body[col];
      }
    }

    // ضمان وجود overrides كـ object صالح مع دمج أسعار الحسابات والإرشادات داخله
    const overrides = typeof cleanPlan.overrides === 'object' && cleanPlan.overrides !== null
      ? { ...cleanPlan.overrides }
      : {};

    if (body.accountTypeOverrides !== undefined) {
      overrides.accountTypeOverrides = body.accountTypeOverrides;
    }
    if (body.badges !== undefined) {
      overrides.badges = body.badges;
    }
    if (body.highlights !== undefined) {
      overrides.highlights = body.highlights;
    }
    if (body.recommendedFor !== undefined) {
      overrides.recommendedFor = body.recommendedFor;
    }
    if (body.description !== undefined) {
      overrides.description = body.description;
    }

    cleanPlan.overrides = overrides;

    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from('subscription_plans')
      .upsert(cleanPlan)
      .select();

    if (error) {
      console.error('[Admin Pricing API] Upsert error:', error);
      return NextResponse.json(
        { success: false, error: error.message || 'فشل حفظ باقة الاشتراك' },
        { status: 400 }
      );
    }

    const savedRecord = data?.[0] || cleanPlan;
    const responseData = {
      ...savedRecord,
      accountTypeOverrides: savedRecord.accountTypeOverrides || savedRecord.overrides?.accountTypeOverrides || {},
      badges: savedRecord.badges || savedRecord.overrides?.badges || [],
      highlights: savedRecord.highlights || savedRecord.overrides?.highlights || [],
      recommendedFor: savedRecord.recommendedFor || savedRecord.overrides?.recommendedFor || '',
      description: savedRecord.description || savedRecord.overrides?.description || savedRecord.subtitle || '',
    };

    return NextResponse.json({
      success: true,
      message: 'تم حفظ باقة الاشتراك والتسعير الدولي بنجاح',
      data: responseData,
    });
  } catch (err: any) {
    console.error('[Admin Pricing API] Unexpected error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'حدث خطأ غير متوقع' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const authorization = await authorizeAdmin(request);
  if (!authorization.ok) return authorization.response;

  try {
    let planId = request.nextUrl.searchParams.get('id');
    if (!planId) {
      const body = await request.json().catch(() => ({}));
      planId = body.id;
    }

    if (!planId) {
      return NextResponse.json(
        { success: false, error: 'معرف الخطة (id) مطلوب للحذف' },
        { status: 400 }
      );
    }

    const admin = getSupabaseAdmin();
    const { error } = await admin
      .from('subscription_plans')
      .delete()
      .eq('id', planId);

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'تم حذف الباقة بنجاح',
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
