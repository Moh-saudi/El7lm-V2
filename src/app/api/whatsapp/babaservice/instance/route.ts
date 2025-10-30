import BabaserviceWhatsAppService from '@/lib/whatsapp/babaservice-whatsapp-service';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    console.log('🔧 [API /whatsapp/babaservice/instance] Action:', action);

    const whatsappService = new BabaserviceWhatsAppService();

    switch (action) {
      case 'create':
        const createResult = await whatsappService.createInstance();
        return NextResponse.json(createResult);

      case 'status':
      case 'qr_code':
        const instanceId = body.instance_id || '68F243B3A8D8D';
        const qrResult = await whatsappService.getQRCode(instanceId);

        // تحويل النتيجة لتطابق InstanceStatus interface
        const statusResult = {
          instanceId: instanceId,
          status: qrResult.success ?
            (qrResult.qr_code ? 'disconnected' : 'connected') :
            'invalidated',
          qrCode: qrResult.qr_code,
          lastChecked: new Date(),
          error: qrResult.error
        };

        return NextResponse.json(statusResult);

      case 'reboot':
        const rebootInstanceId = body.instance_id || '68F243B3A8D8D';
        const rebootResult = await whatsappService.rebootInstance(rebootInstanceId);
        return NextResponse.json(rebootResult);

      case 'reset':
        const resetInstanceId = body.instance_id || '68F243B3A8D8D';
        const resetResult = await whatsappService.resetInstance(resetInstanceId);
        return NextResponse.json(resetResult);

      case 'reconnect':
        const reconnectInstanceId = body.instance_id || '68F243B3A8D8D';
        const reconnectResult = await whatsappService.reconnect(reconnectInstanceId);
        return NextResponse.json(reconnectResult);

      default:
        return NextResponse.json({
          success: false,
          error: 'Action غير مدعوم'
        }, { status: 400 });
    }
  } catch (error: any) {
    console.error('❌ [API /whatsapp/babaservice/instance] خطأ:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'حدث خطأ في معالجة الطلب'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const instanceId = searchParams.get('instance_id') || '68F243B3A8D8D';

    console.log('🔧 [API /whatsapp/babaservice/instance] GET Action:', action);

    const whatsappService = new BabaserviceWhatsAppService();

    switch (action) {
      case 'status':
      case 'qr_code':
        const qrResult = await whatsappService.getQRCode(instanceId);

        // تحويل النتيجة لتطابق InstanceStatus interface
        const statusResult = {
          instanceId: instanceId,
          status: qrResult.success ?
            (qrResult.qr_code ? 'disconnected' : 'connected') :
            'invalidated',
          qrCode: qrResult.qr_code,
          lastChecked: new Date(),
          error: qrResult.error
        };

        return NextResponse.json(statusResult);

      case 'config':
        const config = whatsappService.getConfig();
        return NextResponse.json({
          success: true,
          config: {
            baseUrl: config.baseUrl,
            instanceId: config.instanceId,
            hasAccessToken: !!config.accessToken
          }
        });

      default:
        return NextResponse.json({
          success: true,
          message: 'Babaservice Instance API',
          endpoints: {
            POST: {
              create: 'إنشاء instance جديد',
              status: 'فحص حالة instance',
              qr_code: 'الحصول على QR Code',
              reboot: 'إعادة تشغيل instance',
              reset: 'إعادة تعيين instance',
              reconnect: 'إعادة الاتصال'
            },
            GET: {
              status: 'فحص حالة instance',
              qr_code: 'الحصول على QR Code',
              config: 'عرض التكوين'
            }
          },
          currentInstanceId: '68F243B3A8D8D'
        });
    }
  } catch (error: any) {
    console.error('❌ [API /whatsapp/babaservice/instance] خطأ GET:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'حدث خطأ في معالجة الطلب'
    }, { status: 500 });
  }
}
