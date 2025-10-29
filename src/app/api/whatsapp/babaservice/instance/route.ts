import { instanceManager } from '@/lib/whatsapp/instance-manager';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { action, instanceId } = await request.json();

    console.log('🔧 [API /whatsapp/babaservice/instance] طلب إدارة Instance:', { action, instanceId });

    switch (action) {
      case 'create':
        const newInstanceId = await instanceManager.createNewInstance();
        return NextResponse.json({
          success: true,
          message: 'تم إنشاء Instance جديد بنجاح',
          data: {
            instanceId: newInstanceId,
            status: 'created'
          }
        });

      case 'check':
        if (!instanceId) {
          return NextResponse.json({
            success: false,
            error: 'Instance ID مطلوب'
          }, { status: 400 });
        }

        const status = await instanceManager.checkInstanceStatus(instanceId);
        return NextResponse.json({
          success: true,
          message: 'تم فحص حالة Instance',
          data: status
        });

      case 'reboot':
        if (!instanceId) {
          return NextResponse.json({
            success: false,
            error: 'Instance ID مطلوب'
          }, { status: 400 });
        }

        const rebootResult = await instanceManager.rebootInstance(instanceId);
        return NextResponse.json({
          success: rebootResult,
          message: rebootResult ? 'تم إعادة تشغيل Instance بنجاح' : 'فشل في إعادة تشغيل Instance',
          data: { instanceId, rebooted: rebootResult }
        });

      case 'reset':
        if (!instanceId) {
          return NextResponse.json({
            success: false,
            error: 'Instance ID مطلوب'
          }, { status: 400 });
        }

        const resetResult = await instanceManager.resetInstance(instanceId);
        return NextResponse.json({
          success: resetResult,
          message: resetResult ? 'تم إعادة تعيين Instance بنجاح' : 'فشل في إعادة تعيين Instance',
          data: { instanceId, reset: resetResult }
        });

      case 'get_current':
        const currentInstance = instanceManager.getCurrentInstance();
        return NextResponse.json({
          success: true,
          message: 'تم جلب معلومات Instance الحالي',
          data: currentInstance
        });

      default:
        return NextResponse.json({
          success: false,
          error: 'إجراء غير مدعوم',
          supported_actions: ['create', 'check', 'reboot', 'reset', 'get_current']
        }, { status: 400 });
    }

  } catch (error: any) {
    console.error('❌ [API /whatsapp/babaservice/instance] خطأ:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'حدث خطأ في إدارة Instance'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    console.log('🔧 [API /whatsapp/babaservice/instance] GET request:', { action });

    switch (action) {
      case 'status':
        const currentInstance = instanceManager.getCurrentInstance();
        return NextResponse.json({
          success: true,
          message: 'حالة Instance الحالي',
          data: currentInstance
        });

      case 'create_new':
        const newInstanceId = await instanceManager.createNewInstance();
        return NextResponse.json({
          success: true,
          message: 'تم إنشاء Instance جديد',
          data: {
            instanceId: newInstanceId,
            status: 'created'
          }
        });

      default:
        return NextResponse.json({
          success: true,
          message: 'Baba Service Instance Management API',
          endpoints: {
            POST: [
              'create - إنشاء Instance جديد',
              'check - فحص حالة Instance',
              'reboot - إعادة تشغيل Instance',
              'reset - إعادة تعيين Instance',
              'get_current - جلب Instance الحالي'
            ],
            GET: [
              'status - حالة Instance الحالي',
              'create_new - إنشاء Instance جديد'
            ]
          }
        });
    }

  } catch (error: any) {
    console.error('❌ [API /whatsapp/babaservice/instance] خطأ GET:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'حدث خطأ في الخادم'
    }, { status: 500 });
  }
}


