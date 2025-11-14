'use client';

import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, doc, deleteDoc, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useAuth } from '@/lib/firebase/auth-provider';
import { AccountTypeProtection } from '@/hooks/useAccountTypeAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  MessageSquare, 
  Plus, 
  Edit, 
  Trash2, 
  Send, 
  Phone, 
  Globe,
  CheckCircle,
  XCircle,
  Copy,
  ExternalLink
} from 'lucide-react';
import { getWhatsAppLink } from '@/lib/support-contact';

interface WhatsAppNumber {
  id?: string;
  name: string;
  phone: string;
  country: string;
  countryCode: string;
  isActive: boolean;
  description?: string;
  createdAt?: any;
  updatedAt?: any;
}

interface WhatsAppMessage {
  id?: string;
  templateName: string;
  message: string;
  isActive: boolean;
  createdAt?: any;
  updatedAt?: any;
}

export default function WhatsAppManagementPage() {
  const { user, userData } = useAuth();
  const [whatsappNumbers, setWhatsappNumbers] = useState<WhatsAppNumber[]>([]);
  const [whatsappMessages, setWhatsappMessages] = useState<WhatsAppMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNumberDialog, setShowNumberDialog] = useState(false);
  const [showMessageDialog, setShowMessageDialog] = useState(false);
  const [editingNumber, setEditingNumber] = useState<WhatsAppNumber | null>(null);
  const [editingMessage, setEditingMessage] = useState<WhatsAppMessage | null>(null);
  const [selectedNumber, setSelectedNumber] = useState<WhatsAppNumber | null>(null);
  const [customMessage, setCustomMessage] = useState('');
  const [showSendDialog, setShowSendDialog] = useState(false);

  const [numberFormData, setNumberFormData] = useState<WhatsAppNumber>({
    name: '',
    phone: '',
    country: 'Qatar',
    countryCode: '+974',
    isActive: true,
    description: ''
  });

  const [messageFormData, setMessageFormData] = useState<WhatsAppMessage>({
    templateName: '',
    message: '',
    isActive: true
  });

  useEffect(() => {
    fetchWhatsAppNumbers();
    fetchWhatsAppMessages();
  }, []);

  const fetchWhatsAppNumbers = async () => {
    try {
      const q = query(collection(db, 'whatsappNumbers'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const numbers = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as WhatsAppNumber[];
      setWhatsappNumbers(numbers);
    } catch (error) {
      console.error('Error fetching WhatsApp numbers:', error);
      toast.error('فشل في جلب أرقام الواتساب');
    } finally {
      setLoading(false);
    }
  };

  const fetchWhatsAppMessages = async () => {
    try {
      const q = query(collection(db, 'whatsappMessages'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const messages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as WhatsAppMessage[];
      setWhatsappMessages(messages);
    } catch (error) {
      console.error('Error fetching WhatsApp messages:', error);
      toast.error('فشل في جلب قوالب الرسائل');
    }
  };

  const handleSaveNumber = async () => {
    if (!numberFormData.name || !numberFormData.phone) {
      toast.error('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    try {
      const numberData = {
        ...numberFormData,
        phone: numberFormData.phone.replace(/\D/g, ''), // Remove non-digits
        updatedAt: new Date(),
        ...(editingNumber ? {} : { createdAt: new Date() })
      };

      if (editingNumber?.id) {
        await updateDoc(doc(db, 'whatsappNumbers', editingNumber.id), numberData);
        toast.success('تم تحديث رقم الواتساب بنجاح');
      } else {
        await addDoc(collection(db, 'whatsappNumbers'), numberData);
        toast.success('تم إضافة رقم الواتساب بنجاح');
      }

      setShowNumberDialog(false);
      resetNumberForm();
      fetchWhatsAppNumbers();
    } catch (error) {
      console.error('Error saving WhatsApp number:', error);
      toast.error('فشل في حفظ رقم الواتساب');
    }
  };

  const handleSaveMessage = async () => {
    if (!messageFormData.templateName || !messageFormData.message) {
      toast.error('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    try {
      const messageData = {
        ...messageFormData,
        updatedAt: new Date(),
        ...(editingMessage ? {} : { createdAt: new Date() })
      };

      if (editingMessage?.id) {
        await updateDoc(doc(db, 'whatsappMessages', editingMessage.id), messageData);
        toast.success('تم تحديث قالب الرسالة بنجاح');
      } else {
        await addDoc(collection(db, 'whatsappMessages'), messageData);
        toast.success('تم إضافة قالب الرسالة بنجاح');
      }

      setShowMessageDialog(false);
      resetMessageForm();
      fetchWhatsAppMessages();
    } catch (error) {
      console.error('Error saving WhatsApp message:', error);
      toast.error('فشل في حفظ قالب الرسالة');
    }
  };

  const handleDeleteNumber = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الرقم؟')) return;

    try {
      await deleteDoc(doc(db, 'whatsappNumbers', id));
      toast.success('تم حذف رقم الواتساب بنجاح');
      fetchWhatsAppNumbers();
    } catch (error) {
      console.error('Error deleting WhatsApp number:', error);
      toast.error('فشل في حذف رقم الواتساب');
    }
  };

  const handleDeleteMessage = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا القالب؟')) return;

    try {
      await deleteDoc(doc(db, 'whatsappMessages', id));
      toast.success('تم حذف قالب الرسالة بنجاح');
      fetchWhatsAppMessages();
    } catch (error) {
      console.error('Error deleting WhatsApp message:', error);
      toast.error('فشل في حذف قالب الرسالة');
    }
  };

  const handleEditNumber = (number: WhatsAppNumber) => {
    setEditingNumber(number);
    setNumberFormData(number);
    setShowNumberDialog(true);
  };

  const handleEditMessage = (message: WhatsAppMessage) => {
    setEditingMessage(message);
    setMessageFormData(message);
    setShowMessageDialog(true);
  };

  const resetNumberForm = () => {
    setNumberFormData({
      name: '',
      phone: '',
      country: 'Qatar',
      countryCode: '+974',
      isActive: true,
      description: ''
    });
    setEditingNumber(null);
  };

  const resetMessageForm = () => {
    setMessageFormData({
      templateName: '',
      message: '',
      isActive: true
    });
    setEditingMessage(null);
  };

  const handleSendWhatsApp = (number: WhatsAppNumber, message: string) => {
    const fullPhone = `${number.countryCode}${number.phone}`;
    const whatsappUrl = getWhatsAppLink(fullPhone, message);
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    toast.success('تم فتح الواتساب');
  };

  const handleOpenSendDialog = (number: WhatsAppNumber) => {
    setSelectedNumber(number);
    setCustomMessage('');
    setShowSendDialog(true);
  };

  const handleSendCustomMessage = () => {
    if (!selectedNumber || !customMessage.trim()) {
      toast.error('يرجى إدخال رسالة');
      return;
    }

    handleSendWhatsApp(selectedNumber, customMessage);
    setShowSendDialog(false);
    setCustomMessage('');
  };

  const copyPhoneNumber = (phone: string, countryCode: string) => {
    const fullNumber = `${countryCode}${phone}`;
    navigator.clipboard.writeText(fullNumber);
    toast.success('تم نسخ الرقم');
  };

  const countries = [
    { name: 'Qatar', code: '+974', flag: '🇶🇦' },
    { name: 'Egypt', code: '+20', flag: '🇪🇬' },
    { name: 'Saudi Arabia', code: '+966', flag: '🇸🇦' },
    { name: 'UAE', code: '+971', flag: '🇦🇪' },
    { name: 'Kuwait', code: '+965', flag: '🇰🇼' },
    { name: 'Bahrain', code: '+973', flag: '🇧🇭' },
    { name: 'Oman', code: '+968', flag: '🇴🇲' }
  ];

  return (
    <AccountTypeProtection allowedTypes={['admin']}>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                  <MessageSquare className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-white mb-2">إدارة الواتساب</h1>
                  <p className="text-green-100">إدارة أرقام الواتساب ورسائل خدمة العملاء</p>
                </div>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">إجمالي الأرقام</p>
                    <p className="text-3xl font-bold text-green-600">{whatsappNumbers.length}</p>
                  </div>
                  <Phone className="h-12 w-12 text-green-500 opacity-20" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">الأرقام النشطة</p>
                    <p className="text-3xl font-bold text-emerald-600">
                      {whatsappNumbers.filter(n => n.isActive).length}
                    </p>
                  </div>
                  <CheckCircle className="h-12 w-12 text-emerald-500 opacity-20" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">قوالب الرسائل</p>
                    <p className="text-3xl font-bold text-blue-600">{whatsappMessages.length}</p>
                  </div>
                  <MessageSquare className="h-12 w-12 text-blue-500 opacity-20" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* WhatsApp Numbers Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Phone className="h-5 w-5" />
                    أرقام الواتساب
                  </CardTitle>
                  <CardDescription>إدارة أرقام الواتساب لخدمة العملاء</CardDescription>
                </div>
                <Button onClick={() => { resetNumberForm(); setShowNumberDialog(true); }}>
                  <Plus className="h-4 w-4 ml-2" />
                  إضافة رقم
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">جاري التحميل...</div>
              ) : whatsappNumbers.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  لا توجد أرقام واتساب مسجلة
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {whatsappNumbers.map((number) => (
                    <Card key={number.id} className="hover:shadow-lg transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg mb-1">{number.name}</h3>
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant={number.isActive ? "default" : "secondary"}>
                                {number.isActive ? 'نشط' : 'غير نشط'}
                              </Badge>
                              <span className="text-sm text-gray-600">{number.country}</span>
                            </div>
                            <p className="text-2xl font-bold text-green-600 mb-1">
                              {number.countryCode} {number.phone}
                            </p>
                            {number.description && (
                              <p className="text-sm text-gray-500 mt-2">{number.description}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2 mt-4">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenSendDialog(number)}
                            className="flex-1"
                          >
                            <Send className="h-4 w-4 ml-1" />
                            إرسال
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copyPhoneNumber(number.phone, number.countryCode)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditNumber(number)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => number.id && handleDeleteNumber(number.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* WhatsApp Messages Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    قوالب الرسائل
                  </CardTitle>
                  <CardDescription>إدارة قوالب الرسائل الجاهزة للواتساب</CardDescription>
                </div>
                <Button onClick={() => { resetMessageForm(); setShowMessageDialog(true); }}>
                  <Plus className="h-4 w-4 ml-2" />
                  إضافة قالب
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {whatsappMessages.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  لا توجد قوالب رسائل مسجلة
                </div>
              ) : (
                <div className="space-y-3">
                  {whatsappMessages.map((message) => (
                    <Card key={message.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold">{message.templateName}</h3>
                              <Badge variant={message.isActive ? "default" : "secondary"}>
                                {message.isActive ? 'نشط' : 'غير نشط'}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600 whitespace-pre-wrap">{message.message}</p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditMessage(message)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => message.id && handleDeleteMessage(message.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        {selectedNumber && (
                          <Button
                            size="sm"
                            className="mt-3 w-full bg-green-600 hover:bg-green-700"
                            onClick={() => handleSendWhatsApp(selectedNumber, message.message)}
                          >
                            <Send className="h-4 w-4 ml-2" />
                            إرسال إلى {selectedNumber.name}
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Add/Edit Number Dialog */}
          <Dialog open={showNumberDialog} onOpenChange={setShowNumberDialog}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingNumber ? 'تعديل رقم الواتساب' : 'إضافة رقم واتساب جديد'}
                </DialogTitle>
                <DialogDescription>
                  أدخل معلومات رقم الواتساب لخدمة العملاء
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">اسم الرقم *</Label>
                  <Input
                    id="name"
                    value={numberFormData.name}
                    onChange={(e) => setNumberFormData({ ...numberFormData, name: e.target.value })}
                    placeholder="مثال: خدمة العملاء - قطر"
                  />
                </div>
                <div>
                  <Label htmlFor="country">الدولة *</Label>
                  <select
                    id="country"
                    value={numberFormData.country}
                    onChange={(e) => {
                      const country = countries.find(c => c.name === e.target.value);
                      setNumberFormData({
                        ...numberFormData,
                        country: e.target.value,
                        countryCode: country?.code || '+974'
                      });
                    }}
                    className="w-full h-10 px-3 border border-gray-300 rounded-md"
                  >
                    {countries.map((country) => (
                      <option key={country.name} value={country.name}>
                        {country.flag} {country.name} ({country.code})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="phone">رقم الهاتف *</Label>
                  <div className="flex gap-2">
                    <Input
                      value={numberFormData.countryCode}
                      readOnly
                      className="w-24"
                    />
                    <Input
                      id="phone"
                      value={numberFormData.phone}
                      onChange={(e) => setNumberFormData({ ...numberFormData, phone: e.target.value.replace(/\D/g, '') })}
                      placeholder="72053188"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="description">الوصف (اختياري)</Label>
                  <Textarea
                    id="description"
                    value={numberFormData.description}
                    onChange={(e) => setNumberFormData({ ...numberFormData, description: e.target.value })}
                    placeholder="وصف مختصر للرقم"
                    rows={3}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={numberFormData.isActive}
                    onChange={(e) => setNumberFormData({ ...numberFormData, isActive: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <Label htmlFor="isActive">نشط</Label>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSaveNumber} className="flex-1">
                    حفظ
                  </Button>
                  <Button variant="outline" onClick={() => { setShowNumberDialog(false); resetNumberForm(); }}>
                    إلغاء
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Add/Edit Message Dialog */}
          <Dialog open={showMessageDialog} onOpenChange={setShowMessageDialog}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingMessage ? 'تعديل قالب الرسالة' : 'إضافة قالب رسالة جديد'}
                </DialogTitle>
                <DialogDescription>
                  أنشئ قالب رسالة جاهز للاستخدام في الواتساب
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="templateName">اسم القالب *</Label>
                  <Input
                    id="templateName"
                    value={messageFormData.templateName}
                    onChange={(e) => setMessageFormData({ ...messageFormData, templateName: e.target.value })}
                    placeholder="مثال: ترحيب بالعميل"
                  />
                </div>
                <div>
                  <Label htmlFor="message">نص الرسالة *</Label>
                  <Textarea
                    id="message"
                    value={messageFormData.message}
                    onChange={(e) => setMessageFormData({ ...messageFormData, message: e.target.value })}
                    placeholder="اكتب نص الرسالة هنا..."
                    rows={6}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="messageIsActive"
                    checked={messageFormData.isActive}
                    onChange={(e) => setMessageFormData({ ...messageFormData, isActive: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <Label htmlFor="messageIsActive">نشط</Label>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSaveMessage} className="flex-1">
                    حفظ
                  </Button>
                  <Button variant="outline" onClick={() => { setShowMessageDialog(false); resetMessageForm(); }}>
                    إلغاء
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Send Message Dialog */}
          <Dialog open={showSendDialog} onOpenChange={setShowSendDialog}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>إرسال رسالة واتساب</DialogTitle>
                <DialogDescription>
                  إرسال رسالة إلى {selectedNumber?.name}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>الرقم</Label>
                  <p className="text-lg font-semibold text-green-600">
                    {selectedNumber?.countryCode} {selectedNumber?.phone}
                  </p>
                </div>
                <div>
                  <Label htmlFor="customMessage">الرسالة *</Label>
                  <Textarea
                    id="customMessage"
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    placeholder="اكتب رسالتك هنا..."
                    rows={6}
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSendCustomMessage} className="flex-1 bg-green-600 hover:bg-green-700">
                    <Send className="h-4 w-4 ml-2" />
                    إرسال عبر الواتساب
                  </Button>
                  <Button variant="outline" onClick={() => setShowSendDialog(false)}>
                    إلغاء
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </AccountTypeProtection>
  );
}

