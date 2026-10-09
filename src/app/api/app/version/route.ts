import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    latestVersion: '1.0.7',
    latestBuildNumber: 23,
    minRequiredBuildNumber: 16,
    releaseNotes:
      'تحديث جديد يتضمن سينما اللاعبين، إمكانية تسمية الفيديوهات المرفوعة، وحجب الروابط السحابية، مع تحسينات فائقة في سرعة التمرير والأداء.',
    playStoreUrl: 'https://play.google.com/store/apps/details?id=com.el7lm.el7lm_mobile',
    forceUpdate: false,
  });
}
