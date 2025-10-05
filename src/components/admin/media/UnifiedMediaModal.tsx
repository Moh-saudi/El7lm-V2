"use client";

import React, { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ReactPlayer from "react-player";
import { 
  Video, 
  ImageIcon, 
  User, 
  Phone, 
  Eye, 
  Star, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Flag, 
  MessageSquare, 
  Bell,
  ExternalLink,
  Copy,
  Send,
  Trash2
} from "lucide-react";
import StatusBadge from "@/components/admin/videos/StatusBadge";
import { 
  performanceAnalysisCategories, 
  searchPerformanceTemplates, 
  formatMessage,
  validateSMSLength,
  PerformanceTemplate
} from "@/lib/messages/performance-analysis-templates";

interface MediaData {
  id: string;
  title: string;
  description: string;
  url: string;
  thumbnailUrl?: string;
  uploadDate: any;
  userId: string;
  userEmail: string;
  userName: string;
  accountType: string;
  status: "pending" | "approved" | "rejected" | "flagged";
  views: number;
  likes: number;
  comments: number;
  phone?: string;
  sourceType?: "youtube" | "supabase" | "external" | "firebase";
}

interface UnifiedMediaModalProps {
  isOpen: boolean;
  onClose: () => void;
  media: MediaData | null;
  mediaType: "videos" | "images";
  onStatusUpdate: (mediaId: string, newStatus: string) => void;
  onSendMessage: (messageType: string) => void;
  onSendWhatsApp: (messageType: string) => void;
  onTestWhatsApp?: () => void;
  onTestUserPhone?: () => void;
  logs: any[];
  logsLoading: boolean;
  customMessage: string;
  setCustomMessage: (message: string) => void;
  displayPhoneNumber: (phone: string | undefined) => string;
  formatPhoneNumber: (phone: string | undefined) => string;
}

export default function UnifiedMediaModal({ 
  isOpen, 
  onClose, 
  media, 
  mediaType,
  onStatusUpdate,
  onSendMessage,
  onSendWhatsApp,
  onTestWhatsApp,
  onTestUserPhone,
  logs,
  logsLoading,
  customMessage,
  setCustomMessage,
  displayPhoneNumber,
  formatPhoneNumber
}: UnifiedMediaModalProps) {
  const [activeTab, setActiveTab] = useState("details");
  const [templateSearch, setTemplateSearch] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<PerformanceTemplate | null>(null);
  const [selectedCategory, setSelectedCategory] = useState("");

  if (!media) return null;

  // Filter templates based on search and category
  const filteredTemplates = templateSearch 
    ? searchPerformanceTemplates(templateSearch)
    : selectedCategory 
      ? performanceAnalysisCategories.find(cat => cat.id === selectedCategory)?.templates || []
      : [];

  const formatDate = (date: any) => {
    if (!date) return "غير محدد";
    try {
      const d = date?.toDate ? date.toDate() : new Date(date);
      return d.toLocaleDateString("ar-EG", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch (error) {
      return "تاريخ غير صحيح";
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[85vw] max-h-[85vh] w-full h-full flex flex-col p-0 overflow-hidden bg-gradient-to-br from-slate-50 to-blue-50" dir="rtl">
        <DialogHeader className="sr-only">
          <DialogTitle>مودال إدارة الوسائط المتطور</DialogTitle>
          <DialogDescription>
            مودال شامل ومتطور لإدارة ومراجعة جميع الوسائط مع أدوات احترافية
          </DialogDescription>
        </DialogHeader>

        {/* ==================== COMPACT HEADER ==================== */}
        <div className="bg-gradient-to-r from-slate-900 via-purple-900 to-slate-900 text-white p-4 md:p-6 flex-shrink-0 sticky top-0 z-20 shadow-xl border-b-2 border-purple-500">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-20"></div>
          
          <div className="relative flex items-center justify-between">
            {/* Left: Media Info */}
            <div className="flex items-center gap-3 md:gap-4">
              {/* Compact Media Thumbnail */}
              <div className="relative group">
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl overflow-hidden bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-600 flex items-center justify-center shadow-xl border-2 border-white/30 transform group-hover:scale-105 transition-all duration-300">
                  {media.thumbnailUrl ? (
                    <img 
                      src={media.thumbnailUrl} 
                      alt={media.title} 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" 
                    />
                  ) : (
                    mediaType === "videos" ? 
                      <Video className="w-8 h-8 md:w-10 md:h-10 text-white drop-shadow-lg" /> :
                      <ImageIcon className="w-8 h-8 md:w-10 md:h-10 text-white drop-shadow-lg" />
                  )}
                </div>
                
                {/* Media Type Badge */}
                <div className="absolute -bottom-2 -right-2 z-10">
                  <Badge className={`${mediaType === "videos" ? "bg-blue-600 border-blue-400" : "bg-purple-600 border-purple-400"} text-white border font-bold text-xs px-2 py-1 shadow-lg transform hover:scale-110 transition-all`}>
                    {mediaType === "videos" ? <Video className="w-3 h-3 ml-1" /> : <ImageIcon className="w-3 h-3 ml-1" />}
                    {mediaType === "videos" ? "فيديو" : "صورة"}
                  </Badge>
                </div>
              </div>
              
              {/* Media Information */}
              <div className="flex-1 space-y-2">
                <h2 className="text-lg md:text-xl lg:text-2xl font-black text-white drop-shadow-lg leading-tight">{media.title}</h2>
                
                <div className="flex items-center gap-2 md:gap-3 flex-wrap">
                  {/* User Info */}
                  <div className="flex items-center gap-1 bg-white/15 rounded-full px-2 md:px-3 py-1 backdrop-blur-sm border border-white/25">
                    <User className="w-3 h-3 md:w-4 md:h-4 text-purple-300" />
                    <span className="font-bold text-white text-sm md:text-base">{media.userName}</span>
                  </div>
                  
                  {/* Phone Number */}
                  {media.phone && (
                    <div className="flex items-center gap-1 bg-white/20 backdrop-blur-sm rounded-full px-2 md:px-3 py-1 border border-white/50 text-white font-bold text-sm md:text-base">
                      <Phone className="w-3 h-3 md:w-4 md:h-4 text-green-300" />
                      <span>{displayPhoneNumber(media.phone)}</span>
                      <Button
                        onClick={() => copyToClipboard(media.phone || "")}
                        size="sm"
                        variant="ghost"
                        className="text-white hover:bg-white/20 p-0.5 h-5 w-5"
                      >
                        <Copy className="w-2.5 h-2.5" />
                      </Button>
                    </div>
                  )}
                  
                  {/* Account Type */}
                  <Badge className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-0 font-bold px-2 md:px-3 py-1 text-xs md:text-sm shadow-lg">
                    {media.accountType}
                  </Badge>
                  
                  {/* Source Type */}
                  <Badge className="bg-gray-800/50 text-gray-200 border border-gray-600 font-bold px-2 py-1 text-xs">
                    {media.sourceType === "firebase" ? "🔥 Firebase" : "⚡ Supabase"}
                  </Badge>
                </div>
              </div>
            </div>
            
            {/* Right: Action Controls */}
            <div className="flex items-center gap-2 md:gap-3">
              {/* Status Badge */}
              <div className="flex flex-col items-center gap-1">
                <StatusBadge status={media.status} className="text-sm md:text-base px-2 md:px-3 py-1 shadow-lg border" />
                <p className="text-xs text-gray-300 font-medium hidden md:block">الحالة</p>
              </div>
              
              {/* Quick Action Buttons */}
              <div className="flex flex-col gap-2">
                <Button
                  size="sm"
                  className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white border-0 font-bold px-3 md:px-4 py-2 shadow-lg transition-all duration-300 rounded-lg text-xs md:text-sm"
                  onClick={() => onStatusUpdate(media.id, "approved")}
                >
                  <CheckCircle className="w-4 h-4 ml-1" />
                  <span className="hidden md:inline">موافقة</span>
                </Button>
                <Button
                  size="sm"
                  className="bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white border-0 font-bold px-3 md:px-4 py-2 shadow-lg transition-all duration-300 rounded-lg text-xs md:text-sm"
                  onClick={() => onStatusUpdate(media.id, "rejected")}
                >
                  <XCircle className="w-4 h-4 ml-1" />
                  <span className="hidden md:inline">رفض</span>
                </Button>
              </div>
              
              {/* Close Button */}
              <Button
                onClick={onClose}
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/20 font-bold text-xl px-2 py-2 rounded-lg shadow-md border border-white/30"
              >
                ✕
              </Button>
            </div>
          </div>
        </div>

        {/* ==================== MAIN CONTENT ==================== */}
        <div className="flex-1 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            {/* Compact Tab Navigation */}
            <div className="bg-gradient-to-r from-gray-100 to-gray-200 border-b border-gray-300 px-3 md:px-4 py-2 md:py-3">
              <TabsList className="grid w-full max-w-xl grid-cols-4 bg-white shadow-md rounded-lg h-10">
                <TabsTrigger 
                  value="details" 
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-purple-600 data-[state=active]:text-white font-bold text-xs md:text-sm transition-all duration-300 rounded-md"
                >
                  <span className="md:hidden">📊</span>
                  <span className="hidden md:inline">📊 التفاصيل</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="preview" 
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-600 data-[state=active]:to-teal-600 data-[state=active]:text-white font-bold text-xs md:text-sm transition-all duration-300 rounded-md"
                >
                  <span className="md:hidden">👁️</span>
                  <span className="hidden md:inline">👁️ المعاينة</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="notifications" 
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-600 data-[state=active]:to-red-600 data-[state=active]:text-white font-bold text-xs md:text-sm transition-all duration-300 rounded-md"
                >
                  <span className="md:hidden">🔔</span>
                  <span className="hidden md:inline">🔔 الإشعارات</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="logs" 
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-gray-600 data-[state=active]:to-slate-600 data-[state=active]:text-white font-bold text-xs md:text-sm transition-all duration-300 rounded-md"
                >
                  <span className="md:hidden">📋</span>
                  <span className="hidden md:inline">📋 السجلات</span>
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-auto">
              {/* Details Tab */}
              <TabsContent value="details" className="h-full p-3 md:p-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 h-full">
                  {/* Media Information Card */}
                  <Card className="border-2 border-blue-200 shadow-xl bg-gradient-to-br from-blue-50 to-indigo-50">
                    <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-lg p-3 md:p-4">
                      <CardTitle className="flex items-center gap-2 text-lg md:text-xl font-bold">
                        <ImageIcon className="w-5 h-5 md:w-6 md:h-6" />
                        معلومات الوسائط
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 md:p-4 space-y-3 md:space-y-4">
                      {/* Phone Number Section */}
                      {media.phone && (
                        <div className="bg-green-100 p-3 rounded-lg border border-green-300 shadow-sm">
                          <div className="flex items-center gap-2">
                            <div className="bg-green-600 p-1.5 rounded-full">
                              <Phone className="w-4 h-4 text-white" />
                            </div>
                            <div className="flex-1">
                              <p className="text-green-900 font-bold text-lg md:text-xl">{displayPhoneNumber(media.phone)}</p>
                              <p className="text-green-700 text-xs md:text-sm">رقم الهاتف</p>
                            </div>
                            <Button
                              onClick={() => copyToClipboard(media.phone || "")}
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 text-white border-0 font-bold px-2 py-1 rounded-md shadow-sm text-xs"
                            >
                              نسخ
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Basic Info */}
                      <div className="space-y-3">
                        <div>
                          <Label className="text-gray-700 font-bold text-sm">العنوان</Label>
                          <p className="text-gray-900 font-medium text-base md:text-lg mt-1">{media.title}</p>
                        </div>
                        
                        <div>
                          <Label className="text-gray-700 font-bold">الوصف</Label>
                          <p className="text-gray-600 mt-1">{media.description || "لا يوجد وصف"}</p>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-gray-700 font-bold">المشاهدات</Label>
                            <div className="flex items-center gap-2 mt-1">
                              <Eye className="w-4 h-4 text-blue-600" />
                              <span className="font-bold text-blue-600">{media.views}</span>
                            </div>
                          </div>
                          <div>
                            <Label className="text-gray-700 font-bold">الإعجابات</Label>
                            <div className="flex items-center gap-2 mt-1">
                              <Star className="w-4 h-4 text-yellow-600" />
                              <span className="font-bold text-yellow-600">{media.likes}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div>
                          <Label className="text-gray-700 font-bold">تاريخ الرفع</Label>
                          <div className="flex items-center gap-2 mt-1">
                            <Clock className="w-4 h-4 text-gray-600" />
                            <span className="text-gray-600 font-medium">{formatDate(media.uploadDate)}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* User Information Card */}
                  <Card className="border-2 border-purple-200 shadow-xl bg-gradient-to-br from-purple-50 to-pink-50">
                    <CardHeader className="bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-t-lg">
                      <CardTitle className="flex items-center gap-3 text-xl font-bold">
                        <User className="w-6 h-6" />
                        معلومات المستخدم
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-4">
                      <div>
                        <Label className="text-gray-700 font-bold">الاسم</Label>
                        <p className="text-gray-900 font-medium text-lg mt-1">{media.userName}</p>
                      </div>
                      
                      <div>
                        <Label className="text-gray-700 font-bold">البريد الإلكتروني</Label>
                        <p className="text-gray-600 mt-1">{media.userEmail || "غير متوفر"}</p>
                      </div>
                      
                      <div>
                        <Label className="text-gray-700 font-bold">نوع الحساب</Label>
                        <Badge className="bg-purple-100 text-purple-800 border border-purple-300 font-bold mt-1">
                          {media.accountType}
                        </Badge>
                      </div>
                      
                      <div>
                        <Label className="text-gray-700 font-bold">معرف المستخدم</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono">{media.userId}</code>
                          <Button
                            onClick={() => copyToClipboard(media.userId)}
                            size="sm"
                            variant="outline"
                            className="p-1 h-6 w-6"
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Preview Tab */}
              <TabsContent value="preview" className="h-full p-6">
                <Card className="h-full border-2 border-green-200 shadow-xl">
                  <CardHeader className="bg-gradient-to-r from-green-600 to-teal-600 text-white">
                    <CardTitle className="flex items-center gap-3 text-xl font-bold">
                      <Eye className="w-6 h-6" />
                      معاينة {mediaType === "videos" ? "الفيديو" : "الصورة"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 h-full">
                    <div className="bg-black rounded-xl overflow-hidden h-full flex items-center justify-center">
                      {mediaType === "videos" ? (
                        <ReactPlayer
                          url={media.url}
                          width="100%"
                          height="100%"
                          controls={true}
                          config={{
                            youtube: {
                              playerVars: {
                                modestbranding: 1,
                                rel: 0,
                                showinfo: 0
                              }
                            }
                          }}
                        />
                      ) : (
                        <img
                          src={media.url}
                          alt={media.title}
                          className="max-w-full max-h-full object-contain"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "/images/default-avatar.png";
                          }}
                        />
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Notifications Tab */}
              <TabsContent value="notifications" className="h-full p-3 md:p-4 overflow-auto">
                <div className="space-y-4 md:space-y-6">
                  {/* Professional Performance Analysis Templates */}
                  <Card className="border border-blue-200 shadow-lg">
                    <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-3 md:p-4">
                      <CardTitle className="flex items-center gap-2 text-lg md:text-xl font-bold">
                        ⚽ رسائل تحليل الأداء
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 md:p-4 space-y-3 md:space-y-4">
                      {/* Search and Category Selection */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <Label className="text-gray-700 font-bold mb-1 block text-sm">🔍 البحث</Label>
                          <input
                            type="text"
                            value={templateSearch}
                            onChange={(e) => setTemplateSearch(e.target.value)}
                            placeholder="ابحث عن قالب..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:border-blue-500 font-medium text-sm"
                          />
                        </div>
                        
                        <div>
                          <Label className="text-gray-700 font-bold mb-1 block text-sm">📂 الفئة</Label>
                          <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:border-blue-500 font-medium text-sm"
                            aria-label="اختيار فئة القوالب"
                          >
                            <option value="">جميع الفئات</option>
                            {performanceAnalysisCategories.map(category => (
                              <option key={category.id} value={category.id}>
                                {category.icon} {category.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Category Quick Access */}
                      {!templateSearch && !selectedCategory && (
                        <div>
                          <h3 className="text-base md:text-lg font-bold text-gray-800 mb-3">🎯 الفئات المتاحة</h3>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-3">
                            {performanceAnalysisCategories.map(category => (
                              <Button
                                key={category.id}
                                onClick={() => setSelectedCategory(category.id)}
                                variant="outline"
                                className={`h-16 md:h-20 flex flex-col items-center gap-1 border hover:scale-105 transition-all text-xs md:text-sm ${
                                  category.color === 'blue' ? 'border-blue-300 hover:bg-blue-50' :
                                  category.color === 'green' ? 'border-green-300 hover:bg-green-50' :
                                  category.color === 'purple' ? 'border-purple-300 hover:bg-purple-50' :
                                  category.color === 'indigo' ? 'border-indigo-300 hover:bg-indigo-50' :
                                  category.color === 'orange' ? 'border-orange-300 hover:bg-orange-50' :
                                  'border-yellow-300 hover:bg-yellow-50'
                                }`}
                              >
                                <span className="text-lg md:text-2xl">{category.icon}</span>
                                <span className="font-bold text-center leading-tight">{category.name}</span>
                                <span className="text-xs text-gray-500">({category.templates.length})</span>
                              </Button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Templates List */}
                      {(templateSearch || selectedCategory) && (
                        <div>
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-gray-800">
                              📝 القوالب المتاحة ({filteredTemplates.length})
                            </h3>
                            {selectedCategory && (
                              <Button
                                onClick={() => {
                                  setSelectedCategory("");
                                  setTemplateSearch("");
                                }}
                                variant="outline"
                                size="sm"
                              >
                                🔄 إعادة تعيين
                              </Button>
                            )}
                          </div>
                          
                          {filteredTemplates.length === 0 ? (
                            <div className="text-center py-8">
                              <p className="text-gray-500 font-medium">لا توجد قوالب مطابقة للبحث</p>
                            </div>
                          ) : (
                            <div className="grid gap-4 max-h-96 overflow-y-auto">
                              {filteredTemplates.map(template => (
                                <Card
                                  key={template.id}
                                  className={`border-2 cursor-pointer transition-all hover:shadow-lg ${
                                    selectedTemplate?.id === template.id 
                                      ? 'border-blue-500 bg-blue-50' 
                                      : 'border-gray-200 hover:border-blue-300'
                                  }`}
                                  onClick={() => setSelectedTemplate(template)}
                                >
                                  <CardContent className="p-4">
                                    <div className="flex items-start justify-between">
                                      <div className="flex-1">
                                        <h4 className="font-bold text-gray-800 mb-2">{template.title}</h4>
                                        <div className="flex flex-wrap gap-2 mb-3">
                                          {template.tags.map(tag => (
                                            <span
                                              key={tag}
                                              className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full font-medium"
                                            >
                                              {tag}
                                            </span>
                                          ))}
                                        </div>
                                        <p className="text-sm text-gray-600 line-clamp-2">
                                          {template.smsMessage}
                                        </p>
                                      </div>
                                      {selectedTemplate?.id === template.id && (
                                        <div className="ml-3">
                                          <CheckCircle className="w-6 h-6 text-blue-600" />
                                        </div>
                                      )}
                                    </div>
                                  </CardContent>
                                </Card>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Selected Template Preview and Actions */}
                      {selectedTemplate && (
                        <Card className="border-2 border-green-200 bg-green-50">
                          <CardHeader className="bg-gradient-to-r from-green-600 to-emerald-600 text-white">
                            <CardTitle className="flex items-center gap-3 text-lg font-bold">
                              ✨ معاينة القالب المحدد
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="p-6 space-y-4">
                            <div>
                              <h4 className="font-bold text-gray-800 mb-2">{selectedTemplate.title}</h4>
                              
                              {/* WhatsApp Preview */}
                              <div className="mb-4">
                                <Label className="text-green-700 font-bold mb-2 block">📱 معاينة رسالة واتساب:</Label>
                                <div className="bg-white p-4 rounded-lg border border-green-200 max-h-48 overflow-y-auto">
                                  <pre className="whitespace-pre-wrap text-sm font-medium text-gray-800">
                                    {formatMessage(selectedTemplate, media.userName, 'whatsapp')}
                                  </pre>
                                </div>
                              </div>

                              {/* SMS Preview */}
                              <div className="mb-4">
                                <Label className="text-blue-700 font-bold mb-2 block">📲 معاينة رسالة SMS:</Label>
                                <div className="bg-white p-4 rounded-lg border border-blue-200">
                                  <p className="text-sm font-medium text-gray-800">
                                    {formatMessage(selectedTemplate, media.userName, 'sms')}
                                  </p>
                                  <div className="mt-2 text-xs text-gray-500">
                                    الطول: {formatMessage(selectedTemplate, media.userName, 'sms').length}/65 حرف
                                  </div>
                                </div>
                              </div>

                              {/* Send Actions */}
                              <div className="flex gap-3">
                                <Button
                                  onClick={() => {
                                    const whatsappMessage = formatMessage(selectedTemplate, media.userName, 'whatsapp');
                                    setCustomMessage(whatsappMessage);
                                    onSendWhatsApp("custom");
                                  }}
                                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3"
                                >
                                  📱 إرسال واتساب
                                </Button>
                                
                                <Button
                                  onClick={() => {
                                    const smsMessage = formatMessage(selectedTemplate, media.userName, 'sms');
                                    setCustomMessage(smsMessage);
                                    onSendMessage("sms");
                                  }}
                                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3"
                                >
                                  📲 إرسال SMS
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </CardContent>
                  </Card>

                  {/* Quick Actions */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Quick Notifications */}
                    <Card className="border-2 border-orange-200 shadow-xl">
                      <CardHeader className="bg-gradient-to-r from-orange-600 to-red-600 text-white">
                        <CardTitle className="flex items-center gap-3 text-xl font-bold">
                          <Bell className="w-6 h-6" />
                          إشعارات سريعة
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-6 space-y-4">
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            onClick={() => onSendWhatsApp("approved")}
                            className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 rounded-lg"
                          >
                            <CheckCircle className="w-4 h-4 ml-1" />
                            واتساب موافقة
                          </Button>
                          <Button
                            onClick={() => onSendMessage("approved")}
                            className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 rounded-lg"
                          >
                            <CheckCircle className="w-4 h-4 ml-1" />
                            SMS موافقة
                          </Button>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            onClick={() => onSendWhatsApp("rejected")}
                            className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 rounded-lg"
                          >
                            <XCircle className="w-4 h-4 ml-1" />
                            واتساب رفض
                          </Button>
                          <Button
                            onClick={() => onSendMessage("rejected")}
                            className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 rounded-lg"
                          >
                            <XCircle className="w-4 h-4 ml-1" />
                            SMS رفض
                          </Button>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            onClick={() => onSendWhatsApp("review")}
                            className="bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2 rounded-lg"
                          >
                            <Flag className="w-4 h-4 ml-1" />
                            واتساب مراجعة
                          </Button>
                          <Button
                            onClick={() => onSendMessage("review")}
                            className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 rounded-lg"
                          >
                            <Flag className="w-4 h-4 ml-1" />
                            SMS مراجعة
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Custom Message */}
                    <Card className="border-2 border-purple-200 shadow-xl">
                      <CardHeader className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
                        <CardTitle className="flex items-center gap-3 text-xl font-bold">
                          <MessageSquare className="w-6 h-6" />
                          رسالة مخصصة
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-6 space-y-4">
                        <div>
                          <Label className="text-gray-700 font-bold">نص الرسالة</Label>
                          <Textarea
                            value={customMessage}
                            onChange={(e) => setCustomMessage(e.target.value)}
                            placeholder="اكتب رسالتك المخصصة هنا..."
                            className="mt-2 min-h-[120px] border-2 border-gray-300 rounded-lg"
                          />
                          <div className="flex justify-between items-center mt-2">
                            <p className="text-sm text-gray-500">
                              {customMessage.length}/500 حرف
                            </p>
                            {customMessage.length > 65 && (
                              <p className="text-xs text-orange-600">
                                ⚠️ أطول من حد SMS (65 حرف)
                              </p>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex gap-3">
                          <Button
                            onClick={() => setCustomMessage("")}
                            variant="outline"
                            className="flex-1"
                          >
                            <Trash2 className="w-4 h-4 ml-2" />
                            مسح
                          </Button>
                          
                          <Button
                            onClick={() => onSendMessage("sms")}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                            disabled={!customMessage.trim()}
                          >
                            <Send className="w-4 h-4 ml-2" />
                            إرسال SMS
                          </Button>
                          
                          <Button
                            onClick={() => onSendWhatsApp("custom")}
                            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                            disabled={!customMessage.trim()}
                          >
                            <Send className="w-4 h-4 ml-2" />
                            واتساب
                          </Button>
                          
                          {onTestWhatsApp && (
                            <Button
                              onClick={onTestWhatsApp}
                              className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3"
                              title="اختبار WhatsApp برقم ثابت"
                            >
                              🧪 اختبار
                            </Button>
                          )}
                          
                          {onTestUserPhone && (
                            <Button
                              onClick={onTestUserPhone}
                              className="bg-orange-600 hover:bg-orange-700 text-white font-bold py-3"
                              title="اختبار WhatsApp برقم المستخدم الحالي"
                            >
                              📱 اختبار رقم المستخدم
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </TabsContent>

              {/* Logs Tab */}
              <TabsContent value="logs" className="h-full p-6">
                <Card className="h-full border-2 border-gray-200 shadow-xl">
                  <CardHeader className="bg-gradient-to-r from-gray-600 to-slate-600 text-white">
                    <CardTitle className="flex items-center gap-3 text-xl font-bold">
                      📋 سجل الأنشطة ({logs.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 h-full overflow-auto">
                    {logsLoading ? (
                      <div className="flex items-center justify-center h-32">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600"></div>
                        <span className="ml-3 text-gray-600 font-medium">جاري تحميل السجلات...</span>
                      </div>
                    ) : logs.length === 0 ? (
                      <div className="text-center py-12">
                        <div className="text-gray-400 mb-4">
                          📋
                        </div>
                        <p className="text-gray-600 font-medium">لا توجد أنشطة مسجلة</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {logs.map((log, index) => (
                          <Card key={index} className="border border-gray-200 hover:shadow-md transition-shadow">
                            <CardContent className="p-4">
                              <div className="flex items-center gap-3">
                                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                                <div className="flex-1">
                                  <p className="font-medium text-gray-900">{log.action}</p>
                                  <p className="text-sm text-gray-600">{log.details}</p>
                                  <p className="text-xs text-gray-500">{formatDate(log.timestamp)}</p>
                                </div>
                                <Badge className="bg-gray-100 text-gray-800 border border-gray-300">
                                  {log.user}
                                </Badge>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
