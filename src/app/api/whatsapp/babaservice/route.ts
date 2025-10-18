import { formatPhoneNumber, validatePhoneNumber } from '@/lib/whatsapp/babaservice-config';
import BabaserviceWhatsAppService from '@/lib/whatsapp/babaservice-whatsapp-service';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { action, ...params } = await request.json();

    console.log('💬 [API /whatsapp/babaservice] طلب جديد:', { action, params });

    const whatsappService = new BabaserviceWhatsAppService();

    switch (action) {
      case 'create_instance':
        const createResult = await whatsappService.createInstance();
        return NextResponse.json(createResult);

      case 'get_qr_code':
        const { instance_id } = params;
        if (!instance_id) {
          return NextResponse.json({
            success: false,
            error: 'Instance ID مطلوب'
          }, { status: 400 });
        }
        const qrResult = await whatsappService.getQRCode(instance_id);
        return NextResponse.json(qrResult);

      case 'send_text':
        const { phoneNumber, message, instance_id: textInstanceId } = params;

        if (!phoneNumber || !message) {
          return NextResponse.json({
            success: false,
            error: 'رقم الهاتف والرسالة مطلوبان'
          }, { status: 400 });
        }

        if (!validatePhoneNumber(phoneNumber)) {
          return NextResponse.json({
            success: false,
            error: 'رقم الهاتف غير صحيح'
          }, { status: 400 });
        }

        const formattedPhone = formatPhoneNumber(phoneNumber);
        const textResult = await whatsappService.sendTextMessage(formattedPhone, message, textInstanceId);
        return NextResponse.json(textResult);

      case 'send_media':
        const {
          phoneNumber: mediaPhone,
          message: mediaMessage,
          media_url,
          filename,
          instance_id: mediaInstanceId
        } = params;

        if (!mediaPhone || !mediaMessage || !media_url) {
          return NextResponse.json({
            success: false,
            error: 'رقم الهاتف والرسالة و رابط الميديا مطلوبة'
          }, { status: 400 });
        }

        if (!validatePhoneNumber(mediaPhone)) {
          return NextResponse.json({
            success: false,
            error: 'رقم الهاتف غير صحيح'
          }, { status: 400 });
        }

        const formattedMediaPhone = formatPhoneNumber(mediaPhone);
        const mediaResult = await whatsappService.sendMediaMessage(
          formattedMediaPhone,
          mediaMessage,
          media_url,
          filename,
          mediaInstanceId
        );
        return NextResponse.json(mediaResult);

      case 'send_group_text':
        const { group_id, message: groupMessage, instance_id: groupInstanceId } = params;

        if (!group_id || !groupMessage) {
          return NextResponse.json({
            success: false,
            error: 'معرف المجموعة والرسالة مطلوبان'
          }, { status: 400 });
        }

        const groupTextResult = await whatsappService.sendGroupTextMessage(
          group_id,
          groupMessage,
          groupInstanceId
        );
        return NextResponse.json(groupTextResult);

      case 'send_group_media':
        const {
          group_id: mediaGroupId,
          message: mediaGroupMessage,
          media_url: groupMediaUrl,
          filename: groupFilename,
          instance_id: groupMediaInstanceId
        } = params;

        if (!mediaGroupId || !mediaGroupMessage || !groupMediaUrl) {
          return NextResponse.json({
            success: false,
            error: 'معرف المجموعة والرسالة ورابط الميديا مطلوبة'
          }, { status: 400 });
        }

        const groupMediaResult = await whatsappService.sendGroupMediaMessage(
          mediaGroupId,
          mediaGroupMessage,
          groupMediaUrl,
          groupFilename,
          groupMediaInstanceId
        );
        return NextResponse.json(groupMediaResult);

      case 'get_groups':
        const { instance_id: groupsInstanceId } = params;
        const groupsResult = await whatsappService.getGroups(groupsInstanceId);
        return NextResponse.json(groupsResult);

      case 'set_webhook':
        const { webhook_url, enable, instance_id: webhookInstanceId } = params;

        if (!webhook_url) {
          return NextResponse.json({
            success: false,
            error: 'رابط Webhook مطلوب'
          }, { status: 400 });
        }

        const webhookResult = await whatsappService.setWebhook(
          webhook_url,
          enable !== false,
          webhookInstanceId
        );
        return NextResponse.json(webhookResult);

      case 'reboot':
        const { instance_id: rebootInstanceId } = params;
        const rebootResult = await whatsappService.rebootInstance(rebootInstanceId);
        return NextResponse.json(rebootResult);

      case 'reset':
        const { instance_id: resetInstanceId } = params;
        const resetResult = await whatsappService.resetInstance(resetInstanceId);
        return NextResponse.json(resetResult);

      case 'reconnect':
        const { instance_id: reconnectInstanceId } = params;
        const reconnectResult = await whatsappService.reconnect(reconnectInstanceId);
        return NextResponse.json(reconnectResult);

      case 'send_pedido':
        const { instance_id: pedidoInstanceId } = params;
        const pedidoResult = await whatsappService.sendPedidoNotification(pedidoInstanceId);
        return NextResponse.json(pedidoResult);

      case 'send_button':
        const {
          chat_id,
          template,
          type,
          instance_id: buttonInstanceId
        } = params;

        if (!chat_id || !template) {
          return NextResponse.json({
            success: false,
            error: 'معرف المحادثة والقالب مطلوبان'
          }, { status: 400 });
        }

        const buttonResult = await whatsappService.sendButtonMessage(
          chat_id,
          template,
          type || '2',
          buttonInstanceId
        );
        return NextResponse.json(buttonResult);

      default:
        return NextResponse.json({
          success: false,
          error: 'إجراء غير مدعوم',
          supported_actions: [
            'create_instance',
            'get_qr_code',
            'send_text',
            'send_media',
            'send_group_text',
            'send_group_media',
            'get_groups',
            'set_webhook',
            'reboot',
            'reset',
            'reconnect',
            'send_pedido',
            'send_button'
          ]
        }, { status: 400 });
    }

  } catch (error: any) {
    console.error('❌ [API /whatsapp/babaservice] خطأ:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'حدث خطأ في الخادم'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    console.log('💬 [API /whatsapp/babaservice] GET request:', { action });

    const whatsappService = new BabaserviceWhatsAppService();

    switch (action) {
      case 'config':
        const config = whatsappService.getConfig();
        return NextResponse.json({
          success: true,
          data: {
            baseUrl: config.baseUrl,
            hasAccessToken: !!config.accessToken,
            hasInstanceId: !!config.instanceId,
            hasWebhookUrl: !!config.webhookUrl
          }
        });

      case 'status':
        return NextResponse.json({
          success: true,
          message: 'خدمة WhatsApp Babaservice تعمل بشكل طبيعي',
          timestamp: new Date().toISOString(),
          version: '1.0.0'
        });

      default:
        return NextResponse.json({
          success: true,
          message: 'WhatsApp Babaservice API',
          endpoints: {
            POST: [
              'create_instance',
              'get_qr_code',
              'send_text',
              'send_media',
              'send_group_text',
              'send_group_media',
              'get_groups',
              'set_webhook',
              'reboot',
              'reset',
              'reconnect',
              'send_pedido',
              'send_button'
            ],
            GET: [
              'config',
              'status'
            ]
          }
        });
    }

  } catch (error: any) {
    console.error('❌ [API /whatsapp/babaservice] خطأ GET:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'حدث خطأ في الخادم'
    }, { status: 500 });
  }
}
