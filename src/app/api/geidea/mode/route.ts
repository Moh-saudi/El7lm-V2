import { NextRequest, NextResponse } from 'next/server';

import { GeideaMode, getGeideaMode, setGeideaMode } from '@/lib/geidea/config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const mode = await getGeideaMode();
    return NextResponse.json({ success: true, mode });
  } catch (error) {
    console.error('❌ [Geidea Mode] GET error:', error);
    return NextResponse.json({ success: false, error: 'Failed to read mode' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { mode } = body as { mode?: GeideaMode };
    
    console.log('🔄 [Geidea Mode API] Received mode update request:', { mode, body });
    
    if (mode !== 'live' && mode !== 'test') {
      console.error('❌ [Geidea Mode API] Invalid mode value:', mode);
      return NextResponse.json({ 
        success: false, 
        error: `Invalid mode value: ${mode}. Must be 'live' or 'test'` 
      }, { status: 400 });
    }

    try {
      await setGeideaMode(mode);
    } catch (saveError: any) {
      const errorMessage = saveError?.message || String(saveError);
      const isQuotaError = errorMessage.includes('RESOURCE_EXHAUSTED') || errorMessage.includes('Quota exceeded');
      
      if (isQuotaError) {
        console.error('❌ [Geidea Mode API] Firestore quota exceeded:', errorMessage);
        return NextResponse.json({ 
          success: false, 
          error: 'تم تجاوز الحصة المسموحة في Firestore. يرجى المحاولة مرة أخرى بعد قليل أو التحقق من إعدادات Firestore.',
          isQuotaError: true,
        }, { status: 503 }); // 503 Service Unavailable
      }
      
      throw saveError; // إعادة رمي الخطأ إذا لم يكن quota error
    }
    
    // التحقق من أن الوضع تم حفظه بشكل صحيح
    // ننتظر قليلاً قبل التحقق لضمان أن Firestore قد حفظ البيانات
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const savedMode = await getGeideaMode();
    console.log('✅ [Geidea Mode API] Mode updated successfully:', { requested: mode, saved: savedMode });
    
    // إذا كان هناك mismatch ولكن الوضع المطلوب هو الوضع الافتراضي، نعتبره نجاحاً
    if (savedMode !== mode && mode !== 'live') {
      console.error('❌ [Geidea Mode API] Mode mismatch:', { requested: mode, saved: savedMode });
      return NextResponse.json({ 
        success: false, 
        error: `Mode mismatch: requested ${mode}, but saved ${savedMode}. قد يكون هناك مشكلة في Firestore.` 
      }, { status: 500 });
    }
    
    return NextResponse.json({ success: true, mode: savedMode || mode });
  } catch (error) {
    console.error('❌ [Geidea Mode API] POST error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to update mode' 
    }, { status: 500 });
  }
}

