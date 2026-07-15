'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Copy, MessageCircle, Mail, Printer, Eye, EyeOff, CheckCircle, Phone, Send, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from '@/lib/i18n';

interface PlayerLoginCredentialsProps {
  playerData: {
    full_name?: string;
    name?: string;
    email: string;
    phone?: string;
    whatsapp?: string;
  };
  password: string;
  accountOwner?: {
    name?: string;
    organizationName?: string;
    phone?: string;
    whatsapp?: string;
    accountType?: string;
  };
  onClose?: () => void;
}

export default function PlayerLoginCredentials({ 
  playerData, 
  password, 
  accountOwner,
  onClose 
}: PlayerLoginCredentialsProps) {
  const { t, locale, isRTL } = useTranslation();
  const tr = (key: string, values: Record<string, string> = {}) =>
    Object.entries(values).reduce(
      (text, [name, value]) => text.replaceAll(`{{${name}}}`, value),
      t(`sharedComponents.playerCredentials.${key}`)
    );
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [showWhatsAppConfirm, setShowWhatsAppConfirm] = useState(false);
  const [confirmedWhatsApp, setConfirmedWhatsApp] = useState(playerData.whatsapp || playerData.phone || '');
  const [sendingOfficial, setSendingOfficial] = useState(false);

  const playerName = playerData.full_name || playerData.name || t('sharedComponents.playerCredentials.player');
  
  // بيانات صاحب الحساب
  const senderPhone = accountOwner?.whatsapp || accountOwner?.phone || '+97472053188';
  const organizationName = accountOwner?.organizationName || t('sharedComponents.playerCredentials.organization');
  const accountType = accountOwner?.accountType || 'club';
  
  const getOrganizationType = () => {
    switch(accountType) {
      case 'club': return t('sharedComponents.playerCredentials.orgTypes.club');
      case 'academy': return t('sharedComponents.playerCredentials.orgTypes.academy');
      case 'trainer': return t('sharedComponents.playerCredentials.orgTypes.trainer');
      case 'agent': return t('sharedComponents.playerCredentials.orgTypes.agent');
      default: return t('sharedComponents.playerCredentials.orgTypes.organization');
    }
  };
  
  const organizationType = getOrganizationType();

  // رسالة تسجيل الدخول
  const loginMessage = tr('loginMessage', {
    playerName,
    email: playerData.email,
    password
  });

  // رسالة رسمية مخصصة حسب نوع المنظمة
  const officialMessage = tr('officialMessage', {
    playerName,
    organizationName,
    orgEmoji: getOrgEmoji(),
    email: playerData.email,
    password,
    senderPhone
  });

  // إيموجي حسب نوع المنظمة
  function getOrgEmoji() {
    switch(accountType) {
      case 'club': return '🏆';
      case 'academy': return '⭐';
      case 'trainer': return '👨‍🏫';
      case 'agent': return '🤝';
      default: return '🏢';
    }
  }

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      toast.success(t('sharedComponents.playerCredentials.copied'));
      setTimeout(() => setCopied(null), 2000);
    } catch (error) {
      toast.error(t('sharedComponents.playerCredentials.copyFailed'));
    }
  };

  const sendWhatsApp = () => {
    if (!playerData.whatsapp && !playerData.phone) {
      toast.error(t('sharedComponents.playerCredentials.noWhatsappOrPhone'));
      return;
    }
    
    const phoneNumber = playerData.whatsapp || playerData.phone;
    const cleanPhone = phoneNumber?.replace(/[^\d]/g, '');
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(loginMessage)}`;
    window.open(whatsappUrl, '_blank');
  };

  const sendSMS = () => {
    if (!playerData.phone) {
      toast.error(t('sharedComponents.playerCredentials.noPhone'));
      return;
    }
    
    const smsUrl = `sms:${playerData.phone}?body=${encodeURIComponent(loginMessage)}`;
    window.open(smsUrl);
  };

  const sendEmail = () => {
    const subject = tr('emailSubject', { playerName });
    const emailUrl = `mailto:${playerData.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(loginMessage)}`;
    window.open(emailUrl);
  };

  const sendOfficialWhatsApp = async () => {
    if (!confirmedWhatsApp) {
      toast.error(t('sharedComponents.playerCredentials.confirmWhatsapp'));
      return;
    }

    setSendingOfficial(true);
    
    try {
      // إرسال الرسالة عبر API endpoint
      const response = await fetch('/api/whatsapp/send-official', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: confirmedWhatsApp,
          message: officialMessage,
          playerName: playerName,
          senderPhone: senderPhone,
          organizationName: organizationName,
          accountType: accountType
        })
      });

      const result = await response.json();
      
      if (result.success) {
        toast.success(tr('officialSent', { playerName }));
        setShowWhatsAppConfirm(false);
        
        // تسجيل في الكونسول
        console.log(`✅ تم إرسال رسالة رسمية لـ ${playerName} على الرقم ${confirmedWhatsApp}`);
        console.log(`📊 معرف الرسالة: ${result.messageId} | الخدمة: ${result.service}`);
        
        if (result.note) {
          console.log(`ℹ️ ملاحظة: ${result.note}`);
        }
      } else {
        throw new Error(result.error || t('sharedComponents.playerCredentials.sendFailed'));
      }
      
    } catch (error) {
      console.error('❌ خطأ في إرسال الرسالة:', error);
      toast.error(tr('officialSendFailed', {
        error: error instanceof Error ? error.message : t('sharedComponents.playerCredentials.unknownError')
      }));
    } finally {
      setSendingOfficial(false);
    }
  };

  const printCredentials = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${tr('emailSubject', { playerName })}</title>
        <style>
          body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            direction: ${isRTL ? 'rtl' : 'ltr'};
            text-align: center;
            padding: 40px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            margin: 0;
          }
          .card {
            background: white;
            border-radius: 20px;
            padding: 40px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            max-width: 500px;
            margin: 0 auto;
          }
          .header {
            color: #4338ca;
            font-size: 28px;
            font-weight: bold;
            margin-bottom: 10px;
          }
          .name {
            color: #6b7280;
            font-size: 20px;
            margin-bottom: 30px;
          }
          .credential {
            background: #f8fafc;
            border: 2px solid #e2e8f0;
            border-radius: 12px;
            padding: 20px;
            margin: 15px 0;
            text-align: ${isRTL ? 'right' : 'left'};
          }
          .label {
            color: #64748b;
            font-size: 14px;
            margin-bottom: 8px;
          }
          .value {
            color: #1e293b;
            font-size: 18px;
            font-weight: bold;
            font-family: 'Courier New', monospace;
            background: white;
            padding: 12px;
            border-radius: 8px;
            border: 1px solid #cbd5e1;
          }
          .instructions {
            background: #dbeafe;
            border-radius: 12px;
            padding: 20px;
            margin-top: 30px;
            text-align: ${isRTL ? 'right' : 'left'};
          }
          .instructions h3 {
            color: #1d4ed8;
            margin-bottom: 15px;
          }
          .instructions ol {
            color: #1e40af;
            text-align: ${isRTL ? 'right' : 'left'};
          }
          .instructions li {
            margin: 8px 0;
          }
          .footer {
            color: #6b7280;
            font-size: 12px;
            margin-top: 30px;
            border-top: 1px solid #e2e8f0;
            padding-top: 20px;
          }
          @media print {
            body { background: white !important; }
          }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="header">🔐 ${t('sharedComponents.playerCredentials.loginCredentials')}</div>
          <div class="name">${playerName}</div>
          
          <div class="credential">
            <div class="label">📧 ${t('sharedComponents.playerCredentials.email')}:</div>
            <div class="value">${playerData.email}</div>
          </div>
          
          <div class="credential">
            <div class="label">🔑 ${t('sharedComponents.playerCredentials.password')}:</div>
            <div class="value">${password}</div>
          </div>

          <div class="instructions">
            <h3>📋 ${t('sharedComponents.playerCredentials.loginSteps')}:</h3>
            <ol>
              <li>${t('sharedComponents.playerCredentials.stepOpenLogin')}</li>
              <li>${t('sharedComponents.playerCredentials.stepEnterEmail')}</li>
              <li>${t('sharedComponents.playerCredentials.stepEnterPassword')}</li>
              <li>${t('sharedComponents.playerCredentials.stepChangePassword')}</li>
              <li>${t('sharedComponents.playerCredentials.stepWelcome')} 🎯</li>
            </ol>
          </div>

          <div class="footer">
            ${t('sharedComponents.playerCredentials.createdAt')}: ${new Date().toLocaleDateString(locale)} - ${new Date().toLocaleTimeString(locale)}<br/>
            ${t('sharedComponents.playerCredentials.management')} ${organizationName}: ${senderPhone}
          </div>
        </div>
      </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <Card className="border-green-200 bg-green-50" dir={isRTL ? 'rtl' : 'ltr'}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-green-800">
          <CheckCircle className="w-5 h-5" />
          {t('sharedComponents.playerCredentials.accountCreated')}
        </CardTitle>
        <CardDescription className="text-green-700">
          {tr('accountCreatedFor', { playerName })}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        
        {/* بيانات الاعتماد */}
        <div className="bg-white border border-green-200 rounded-lg p-4">
          <h3 className="font-semibold text-gray-800 mb-4 text-center">
            🔐 {t('sharedComponents.playerCredentials.loginCredentials')}
          </h3>
          
          <div className="space-y-4">
            {/* الإيميل */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600 flex items-center gap-1">
                  <Mail className="w-4 h-4" />
                  {t('sharedComponents.playerCredentials.email')}:
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(playerData.email, 'email')}
                  className="p-1"
                >
                  {copied === 'email' ? (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <div className="bg-gray-50 border rounded-lg p-3 font-mono text-center">
                {playerData.email}
              </div>
            </div>

            {/* كلمة المرور */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">🔑 {t('sharedComponents.playerCredentials.password')}:</span>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPassword(!showPassword)}
                    className="p-1"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(password, 'password')}
                    className="p-1"
                  >
                    {copied === 'password' ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
              <div className="bg-gray-50 border rounded-lg p-3 font-mono text-center text-lg">
                {showPassword ? password : '●●●●●●●●●'}
              </div>
            </div>
          </div>
        </div>

        {/* معلومات الاتصال */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-800 mb-3">📱 {t('sharedComponents.playerCredentials.contactInformation')}:</h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            {playerData.phone && (
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-blue-600" />
                <span>{playerData.phone}</span>
              </div>
            )}
            {playerData.whatsapp && (
              <div className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-green-600" />
                <span>{playerData.whatsapp}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-purple-600" />
              <span>{playerData.email}</span>
            </div>
          </div>
        </div>

        {/* خيارات المشاركة */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-800 text-center">
            📤 {t('sharedComponents.playerCredentials.shareWithPlayer')}:
          </h4>
          
          <div className="grid grid-cols-2 gap-3">
            {/* إرسال رسمي عبر الواتساب */}
            <Dialog open={showWhatsAppConfirm} onOpenChange={setShowWhatsAppConfirm}>
              <DialogTrigger asChild>
                <Button
                  disabled={!playerData.whatsapp && !playerData.phone}
                  className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2 col-span-2"
                >
                  <Send className="w-4 h-4" />
                  {t('sharedComponents.playerCredentials.officialWhatsapp')}
                  <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 text-xs">
                    {t('sharedComponents.playerCredentials.featured')}
                  </Badge>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md" dir={isRTL ? 'rtl' : 'ltr'}>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <MessageCircle className="w-5 h-5 text-green-600" />
                    {t('sharedComponents.playerCredentials.officialWhatsapp')}
                  </DialogTitle>
                  <DialogDescription>
                    {tr('sentFrom', { organizationType, organizationName, senderPhone })}
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="whatsapp-confirm">{t('sharedComponents.playerCredentials.confirmPlayerWhatsapp')}:</Label>
                    <Input
                      id="whatsapp-confirm"
                      type="tel"
                      value={confirmedWhatsApp}
                      onChange={(e) => setConfirmedWhatsApp(e.target.value)}
                      placeholder="+974XXXXXXXX"
                      className="mt-1 text-center font-mono"
                      dir="ltr"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {t('sharedComponents.playerCredentials.verifyCountryCode')}
                    </p>
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="w-4 h-4 text-yellow-600" />
                      <span className="text-sm font-medium text-yellow-800">{t('sharedComponents.playerCredentials.messagePreview')}:</span>
                    </div>
                    <div className="text-xs text-gray-600 bg-white p-2 rounded border max-h-32 overflow-y-auto">
                      {officialMessage}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={sendOfficialWhatsApp}
                      disabled={!confirmedWhatsApp || sendingOfficial}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      {sendingOfficial ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          {t('sharedComponents.playerCredentials.sending')}
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4 mr-2" />
                          {t('sharedComponents.playerCredentials.sendNow')}
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowWhatsAppConfirm(false)}
                    >
                      {t('sharedComponents.playerCredentials.cancel')}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* واتساب عادي */}
            <Button
              onClick={sendWhatsApp}
              disabled={!playerData.whatsapp && !playerData.phone}
              variant="outline"
              className="border-green-300 text-green-600 hover:bg-green-50 flex items-center gap-2"
            >
              <MessageCircle className="w-4 h-4" />
              {t('sharedComponents.playerCredentials.regularWhatsapp')}
            </Button>

            {/* SMS */}
            <Button
              onClick={sendSMS}
              disabled={!playerData.phone}
              variant="outline"
              className="border-blue-300 text-blue-600 hover:bg-blue-50 flex items-center gap-2"
            >
              <Phone className="w-4 h-4" />
              {t('sharedComponents.playerCredentials.sms')}
            </Button>

            {/* إيميل */}
            <Button
              onClick={sendEmail}
              variant="outline"
              className="border-purple-300 text-purple-600 hover:bg-purple-50 flex items-center gap-2"
            >
              <Mail className="w-4 h-4" />
              {t('sharedComponents.playerCredentials.email')}
            </Button>

            {/* طباعة */}
            <Button
              onClick={printCredentials}
              variant="outline"
              className="border-gray-300 text-gray-600 hover:bg-gray-50 flex items-center gap-2"
            >
              <Printer className="w-4 h-4" />
              {t('sharedComponents.playerCredentials.print')}
            </Button>
          </div>

          {/* نسخ الرسالة كاملة */}
          <Button
            onClick={() => copyToClipboard(loginMessage, 'message')}
            variant="outline"
            className="w-full border-orange-300 text-orange-600 hover:bg-orange-50"
          >
            {copied === 'message' ? (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                {t('sharedComponents.playerCredentials.copiedShort')}
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 mr-2" />
                {t('sharedComponents.playerCredentials.copyFullMessage')}
              </>
            )}
          </Button>
        </div>

        {/* تعليمات للمدير */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h4 className="font-medium text-yellow-800 mb-2">💡 {t('sharedComponents.playerCredentials.instructions')}:</h4>
          <ul className="text-sm text-yellow-700 space-y-1">
            <li>• <strong>{t('sharedComponents.playerCredentials.officialSending')}</strong> {tr('fromOrganization', { organizationType, organizationName })}</li>
            <li>• {t('sharedComponents.playerCredentials.checkWhatsapp')}</li>
            <li>• {t('sharedComponents.playerCredentials.canChangePassword')}</li>
            <li>• {tr('organizationNumber', { organizationType, senderPhone })}</li>
          </ul>
        </div>

        {/* زر الإغلاق */}
        {onClose && (
          <Button 
            onClick={onClose} 
            variant="outline" 
            className="w-full"
          >
            {t('sharedComponents.playerCredentials.close')}
          </Button>
        )}
      </CardContent>
    </Card>
  );
} 
