'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  MessageCircle, 
  Phone, 
  Mail, 
  Clock, 
  CheckCircle, 
  HelpCircle,
  FileText,
  Video,
  Users
} from 'lucide-react';
import { PublicResponsiveLayoutWrapper } from '@/components/layout/PublicResponsiveLayout';
import { useTranslation } from '@/lib/i18n';

export default function SupportPage() {
  const { t, isRTL } = useTranslation();
  const [activeTab, setActiveTab] = useState('contact');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
    priority: 'medium'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Support request sent:', formData);
    alert(t('support.alertSuccess'));
  };

  const supportChannels = [
    {
      icon: <MessageCircle className="w-6 h-6" />,
      title: t('support.channelChat'),
      description: t('support.channelChatDesc'),
      status: t('support.channelChatStatus'),
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      action: () => window.open('https://wa.me/201234567890', '_blank')
    },
    {
      icon: <Phone className="w-6 h-6" />,
      title: t('support.channelPhone'),
      description: t('support.channelPhoneDesc'),
      status: t('support.channelPhoneStatus'),
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      action: () => window.open('tel:+201234567890', '_blank')
    },
    {
      icon: <Mail className="w-6 h-6" />,
      title: t('support.channelEmail'),
      description: t('support.channelEmailDesc'),
      status: t('support.channelEmailStatus'),
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      action: () => window.open('mailto:support@academy.com', '_blank')
    }
  ];

  const faqItems = [
    {
      question: t('support.faqQ1'),
      answer: t('support.faqA1')
    },
    {
      question: t('support.faqQ2'),
      answer: t('support.faqA2')
    },
    {
      question: t('support.faqQ3'),
      answer: t('support.faqA3')
    },
    {
      question: t('support.faqQ4'),
      answer: t('support.faqA4')
    }
  ];

  return (
    <PublicResponsiveLayoutWrapper>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-4" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="max-w-6xl mx-auto">
        {/* العنوان الرئيسي */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">{t('support.title')}</h1>
          <p className="text-lg text-gray-600">{t('support.subtitle')}</p>
        </div>

        {/* قائمة التبويبات */}
        <div className="flex justify-center mb-8">
          <div className="flex bg-white rounded-lg p-1 shadow-sm gap-1">
            <Button
              variant={activeTab === 'contact' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('contact')}
              className="rounded-md"
            >
              <MessageCircle className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
              {t('support.tabContact')}
            </Button>
            <Button
              variant={activeTab === 'faq' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('faq')}
              className="rounded-md"
            >
              <HelpCircle className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
              {t('support.tabFaq')}
            </Button>
            <Button
              variant={activeTab === 'resources' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('resources')}
              className="rounded-md"
            >
              <FileText className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
              {t('support.tabResources')}
            </Button>
          </div>
        </div>

        {/* محتوى التبويب النشط */}
        {activeTab === 'contact' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* قنوات التواصل */}
            <div className="space-y-4">
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">{t('support.contactChannels')}</h2>
              {supportChannels.map((channel, index) => (
                <Card key={index} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-lg ${channel.bgColor}`}>
                          <div className={channel.color}>{channel.icon}</div>
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{channel.title}</h3>
                          <p className="text-sm text-gray-600">{channel.description}</p>
                          <Badge variant="outline" className="mt-1">
                            {channel.status}
                          </Badge>
                        </div>
                      </div>
                      <Button variant="outline" onClick={channel.action}>
                        {t('support.contactNow')}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* نموذج التواصل */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="w-5 h-5" />
                  {t('support.sendAMessage')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('support.fullName')}
                      </label>
                      <Input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        required
                        placeholder={t('support.fullNamePlaceholder')}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('support.email')}
                      </label>
                      <Input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        required
                        placeholder={t('support.emailPlaceholder')}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('support.subject')}
                    </label>
                    <Input
                      type="text"
                      value={formData.subject}
                      onChange={(e) => setFormData({...formData, subject: e.target.value})}
                      required
                      placeholder={t('support.subjectPlaceholder')}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('support.priority')}
                    </label>
                    <select
                      value={formData.priority}
                      onChange={(e) => setFormData({...formData, priority: e.target.value})}
                      className="w-full p-2 border border-gray-300 rounded-md outline-none"
                      aria-label={t('support.priority')}
                    >
                      <option value="low">{t('support.priorityLow')}</option>
                      <option value="medium">{t('support.priorityMedium')}</option>
                      <option value="high">{t('support.priorityHigh')}</option>
                      <option value="urgent">{t('support.priorityUrgent')}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('support.message')}
                    </label>
                    <Textarea
                      value={formData.message}
                      onChange={(e) => setFormData({...formData, message: e.target.value})}
                      required
                      placeholder={t('support.messagePlaceholder')}
                      rows={5}
                    />
                  </div>

                  <Button type="submit" className="w-full">
                    <CheckCircle className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                    {t('support.sendRequest')}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'faq' && (
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6 text-center">{t('support.faqTitle')}</h2>
            <div className="space-y-4">
              {faqItems.map((item, index) => (
                <Card key={index}>
                  <CardContent className="p-6">
                    <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                      <HelpCircle className="w-5 h-5 text-blue-600" />
                      {item.question}
                    </h3>
                    <p className="text-gray-600">{item.answer}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'resources' && (
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6 text-center">{t('support.tabResources')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="p-6 text-center">
                  <FileText className="w-12 h-12 mx-auto text-blue-600 mb-4" />
                  <h3 className="font-semibold text-gray-900 mb-2">{t('support.userGuide')}</h3>
                  <p className="text-gray-600 mb-4">{t('support.userGuideDesc')}</p>
                  <Button variant="outline">{t('support.downloadGuide')}</Button>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="p-6 text-center">
                  <Video className="w-12 h-12 mx-auto text-green-600 mb-4" />
                  <h3 className="font-semibold text-gray-900 mb-2">{t('support.videoTutorials')}</h3>
                  <p className="text-gray-600 mb-4">{t('support.videoTutorialsDesc')}</p>
                  <Button variant="outline">{t('support.watchVideos')}</Button>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="p-6 text-center">
                  <Users className="w-12 h-12 mx-auto text-purple-600 mb-4" />
                  <h3 className="font-semibold text-gray-900 mb-2">{t('support.userCommunity')}</h3>
                  <p className="text-gray-600 mb-4">{t('support.userCommunityDesc')}</p>
                  <Button variant="outline">{t('support.joinCommunity')}</Button>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* معلومات إضافية */}
        <div className="mt-12 text-center">
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-center gap-2 mb-4">
                <Clock className="w-5 h-5 text-blue-600" />
                <h3 className="font-semibold text-gray-900">{t('support.workingHours')}</h3>
              </div>
              <p className="text-gray-600">
                {t('support.workingHoursDesc')}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
    </PublicResponsiveLayoutWrapper>
  );
}
