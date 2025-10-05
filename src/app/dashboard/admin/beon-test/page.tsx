'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

export default function BeOnTestPage() {
  const [token, setToken] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('رسالة اختبار من صفحة التحقق');
  const [method, setMethod] = useState<'sms' | 'whatsapp'>('sms');
  const [loading, setLoading] = useState(false);
  const [accountResult, setAccountResult] = useState<any>(null);

  const checkAccount = async () => {
    try {
      setLoading(true);
      setAccountResult(null);
      const url = token ? `/api/beon/account?token=${encodeURIComponent(token)}` : '/api/beon/account';
      const res = await fetch(url, { cache: 'no-store' });
      const json = await res.json();
      setAccountResult(json);
      if (json.success) toast.success('تم التحقق من الحساب بنجاح');
      else toast.error('فشل التحقق من الحساب');
    } catch (e) {
      toast.error('فشل التحقق من الحساب');
    } finally {
      setLoading(false);
    }
  };

  const sendTest = async () => {
    if (!phone.trim()) { toast.error('أدخل رقم الهاتف'); return; }
    if (!message.trim()) { toast.error('أدخل الرسالة'); return; }
    try {
      setLoading(true);
      const res = await fetch('/api/beon/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify({ singlePhone: phone, message, preferredMethod: method })
      });
      const json = await res.json();
      if (res.ok) {
        toast.success(`تم الإرسال بنجاح (Actual: ${json?.data?.actualMethod || method})`);
      } else {
        toast.error(json?.error || 'فشل الإرسال');
      }
    } catch (e) {
      toast.error('فشل الإرسال');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6" dir="rtl">
      <Card className="max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle>🧪 صفحة اختبار BeOn (SMS/WhatsApp)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>التوكن (اختياري)</Label>
              <Input value={token} onChange={(e) => setToken(e.target.value)} placeholder="ضع التوكن هنا للاختبار الفوري" />
            </div>
            <div className="flex items-end">
              <Button onClick={checkAccount} disabled={loading} className="w-full">تحقق من الحساب</Button>
            </div>
          </div>

          {accountResult && (
            <pre className="bg-gray-50 p-3 rounded border overflow-auto max-h-64 text-xs">{JSON.stringify(accountResult, null, 2)}</pre>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>رقم الهاتف</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="مثال: +2010xxxxxxxx" />
            </div>
            <div>
              <Label>طريقة الإرسال</Label>
              <Select value={method} onValueChange={(v) => setMethod(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sms">SMS</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp (سيُرسل كـ SMS)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={sendTest} disabled={loading} className="w-full">إرسال اختبار</Button>
            </div>
          </div>

          <div>
            <Label>الرسالة</Label>
            <Input value={message} onChange={(e) => setMessage(e.target.value)} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}



