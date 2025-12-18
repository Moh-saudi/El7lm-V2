"use client";

import React, { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
  Copy,
  Send,
  Trash2,
  Calendar,
  Shield,
  Smartphone,
  Info,
  Maximize2,
  Download,
  RotateCw
} from "lucide-react";
import StatusBadge from "@/components/admin/videos/StatusBadge";
import {
  performanceAnalysisCategories,
  searchPerformanceTemplates,
  formatMessage,
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
  displayPhoneNumber
}: UnifiedMediaModalProps) {
  const [activeTab, setActiveTab] = useState("info");
  const [templateSearch, setTemplateSearch] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<PerformanceTemplate | null>(null);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [rotation, setRotation] = useState(0);

  // Reset rotation when media changes
  React.useEffect(() => {
    setRotation(0);
  }, [media?.id]);

  const rotateMedia = () => {
    setRotation(prev => (prev + 90) % 360);
  };

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
        month: "short",
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
      <DialogContent className="max-w-[95vw] w-full h-[90vh] p-0 gap-0 bg-white overflow-hidden flex flex-col lg:flex-row shadow-2xl transition-all duration-300 border-none rounded-xl" dir="rtl">
        <DialogHeader className="sr-only">
          <DialogTitle>{media.title}</DialogTitle>
          <DialogDescription>Media Preview</DialogDescription>
        </DialogHeader>

        {/* ================= LEFT PANEL: MEDIA PREVIEW (Dark Theme) ================= */}
        <div className="w-full lg:w-[45%] h-[40vh] lg:h-full bg-zinc-950 relative flex flex-col shrink-0 border-l border-zinc-800">

          {/* Top Bar Overlay */}
          <div className="absolute top-0 left-0 right-0 p-4 z-20 flex justify-between items-start bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
            <div className="flex gap-2 pointer-events-auto">
              <Badge variant="outline" className={`text-white border-white/30 backdrop-blur-md ${mediaType === 'videos' ? 'bg-blue-600/50' : 'bg-purple-600/50'}`}>
                {mediaType === 'videos' ? <Video className="w-3 h-3 mr-1" /> : <ImageIcon className="w-3 h-3 mr-1" />}
                {mediaType === 'videos' ? 'فيديو' : 'صورة'}
              </Badge>
            </div>

            <div className="flex gap-2 pointer-events-auto">
              {/* Rotation Button */}
              <Button
                size="icon"
                variant="secondary"
                className="bg-black/50 text-white hover:bg-white/20 backdrop-blur-md border border-white/10 rounded-full w-8 h-8"
                onClick={rotateMedia}
                title="تدوير 90 درجة"
              >
                <RotateCw className="w-4 h-4" />
              </Button>

              {/* Mobile Close Button */}
              <Button size="icon" variant="ghost" className="lg:hidden text-white hover:bg-white/20 rounded-full w-8 h-8" onClick={onClose}>
                <XCircle className="w-6 h-6" />
              </Button>
            </div>
          </div>

          {/* Media Container */}
          <div className="flex-1 flex items-center justify-center p-4 lg:p-8 overflow-hidden relative group">
            <div
              style={{
                transform: `rotate(${rotation}deg)`,
                transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                maxHeight: rotation % 180 === 0 ? '100%' : '60%',
                maxWidth: rotation % 180 === 0 ? '100%' : '60%',
                aspectRatio: mediaType === 'videos' ? '16/9' : 'auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              className={`relative transition-all duration-300 ${mediaType === 'videos' ? 'w-full' : ''}`}
            >
              {mediaType === "videos" ? (
                <div className="w-full h-full rounded-lg overflow-hidden shadow-2xl ring-1 ring-white/10 bg-black aspect-video">
                  <ReactPlayer
                    url={media.url}
                    width="100%"
                    height="100%"
                    controls={true}
                    config={{
                      youtube: { playerVars: { modestbranding: 1, rel: 0, showinfo: 0 } }
                    }}
                  />
                </div>
              ) : (
                <img
                  src={media.url}
                  alt={media.title}
                  className="max-w-full max-h-full object-contain drop-shadow-2xl rounded-md transition-transform"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "/images/default-avatar.png";
                  }}
                />
              )}
            </div>
          </div>

          {/* Bottom Info Overlay (on Left Panel) */}
          <div className="p-6 bg-gradient-to-t from-black/90 via-black/50 to-transparent z-10 text-white space-y-2">
            <h2 className="text-xl lg:text-2xl font-bold leading-tight line-clamp-2" title={media.title}>
              {media.title}
            </h2>
            <div className="flex items-center gap-4 text-sm text-zinc-300">
              <div className="flex items-center gap-1">
                <User className="w-4 h-4" />
                <span>{media.userName}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                <span>{formatDate(media.uploadDate)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ================= RIGHT PANEL: DETAILS & ACTIONS (Light Theme) ================= */}
        <div className="flex-1 flex flex-col h-full bg-zinc-50/50 backdrop-blur-sm">

          {/* Header */}
          <div className="p-4 border-b border-zinc-200 bg-white/80 sticky top-0 z-10 flex justify-between items-center shadow-sm">
            <div className="flex items-center gap-3">
              <StatusBadge status={media.status} className="px-3 py-1 text-sm shadow-sm" />
              <Badge variant="outline" className="bg-zinc-100 border-zinc-300 text-zinc-700">
                {media.accountType}
              </Badge>
            </div>

            {/* Desktop Close */}
            <Button size="icon" variant="ghost" className="hidden lg:flex text-zinc-500 hover:text-red-500 hover:bg-red-50" onClick={onClose}>
              <XCircle className="w-6 h-6" />
            </Button>
          </div>

          {/* Main Content Areas */}
          <div className="flex-1 overflow-hidden flex flex-col">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
              <div className="px-4 pt-4">
                <TabsList className="grid w-full grid-cols-3 bg-zinc-200/50 p-1 rounded-lg">
                  <TabsTrigger value="info" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md font-bold text-zinc-600 data-[state=active]:text-blue-600 transition-all">
                    <Info className="w-4 h-4 ml-2" /> التفاصيل
                  </TabsTrigger>
                  <TabsTrigger value="actions" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md font-bold text-zinc-600 data-[state=active]:text-green-600 transition-all">
                    <MessageSquare className="w-4 h-4 ml-2" /> المراسلة
                  </TabsTrigger>
                  <TabsTrigger value="logs" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md font-bold text-zinc-600 data-[state=active]:text-purple-600 transition-all">
                    <Shield className="w-4 h-4 ml-2" /> السجل
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-6">

                {/* ============ INFO TAB ============ */}
                <TabsContent value="info" className="mt-0 space-y-6 animate-in fade-in-50 slide-in-from-bottom-2">
                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-3">
                    <Card className="bg-white border-zinc-200 shadow-sm hover:shadow-md transition-shadow">
                      <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                        <Eye className="w-5 h-5 text-blue-500 mb-2" />
                        <span className="text-xl font-bold text-zinc-800">{media.views}</span>
                        <span className="text-xs text-zinc-500">مشاهدة</span>
                      </CardContent>
                    </Card>
                    <Card className="bg-white border-zinc-200 shadow-sm hover:shadow-md transition-shadow">
                      <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                        <Star className="w-5 h-5 text-yellow-500 mb-2" />
                        <span className="text-xl font-bold text-zinc-800">{media.likes}</span>
                        <span className="text-xs text-zinc-500">إعجاب</span>
                      </CardContent>
                    </Card>
                    <Card className="bg-white border-zinc-200 shadow-sm hover:shadow-md transition-shadow">
                      <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                        <MessageSquare className="w-5 h-5 text-purple-500 mb-2" />
                        <span className="text-xl font-bold text-zinc-800">{media.comments}</span>
                        <span className="text-xs text-zinc-500">تعليق</span>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <Label className="text-zinc-500 font-semibold text-xs uppercase tracking-wider">الوصف</Label>
                    <p className="text-sm text-zinc-700 bg-white p-3 rounded-lg border border-zinc-200 leading-relaxed min-h-[4rem]">
                      {media.description || "لا يوجد وصف متاح."}
                    </p>
                  </div>

                  {/* Contact Info */}
                  <div className="bg-blue-50/50 rounded-xl p-4 border border-blue-100 space-y-4">
                    <h3 className="font-bold text-blue-900 flex items-center gap-2">
                      <Smartphone className="w-5 h-5" /> بيانات الاتصال
                    </h3>

                    <div className="grid gap-3">
                      <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-blue-100 shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className="bg-blue-100 p-2 rounded-full text-blue-600">
                            <User className="w-4 h-4" />
                          </div>
                          <div className="space-y-0.5">
                            <span className="text-xs text-zinc-500 block">الاسم</span>
                            <span className="text-sm font-bold text-zinc-800">{media.userName}</span>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => copyToClipboard(media.userName)}>
                          <Copy className="w-3 h-3 text-zinc-400" />
                        </Button>
                      </div>

                      <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-blue-100 shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className="bg-green-100 p-2 rounded-full text-green-600">
                            <Phone className="w-4 h-4" />
                          </div>
                          <div className="space-y-0.5">
                            <span className="text-xs text-zinc-500 block">رقم الهاتف</span>
                            <span className="text-sm font-bold text-zinc-800" dir="ltr">
                              {media.phone ? displayPhoneNumber(media.phone) : 'غير متوفر'}
                            </span>
                          </div>
                        </div>
                        {media.phone && (
                          <Button variant="ghost" size="sm" onClick={() => copyToClipboard(media.phone || "")}>
                            <Copy className="w-3 h-3 text-zinc-400" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* ============ ACTIONS TAB ============ */}
                <TabsContent value="actions" className="mt-0 space-y-6 animate-in fade-in-50 slide-in-from-bottom-2">

                  {/* Templates Section */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <Label className="text-zinc-800 font-bold">قوالب الرد السريع</Label>
                      <Badge variant="secondary" className="text-xs">{performanceAnalysisCategories.length} فئات</Badge>
                    </div>

                    {/* Categories Horizontal Scroll */}
                    <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar no-scrollbar">
                      <Button
                        variant={selectedCategory === "" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedCategory("")}
                        className="whitespace-nowrap"
                      >
                        الكل
                      </Button>
                      {performanceAnalysisCategories.map(cat => (
                        <Button
                          key={cat.id}
                          variant={selectedCategory === cat.id ? "default" : "outline"}
                          size="sm"
                          onClick={() => setSelectedCategory(cat.id)}
                          className={`whitespace-nowrap ${selectedCategory === cat.id ? '' : 'bg-white hover:bg-zinc-50'}`}
                        >
                          <span className="mr-1">{cat.icon}</span> {cat.name}
                        </Button>
                      ))}
                    </div>

                    {/* Templates Grid */}
                    <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto pr-1">
                      {filteredTemplates.map(template => (
                        <div
                          key={template.id}
                          onClick={() => setSelectedTemplate(template)}
                          className={`p-3 rounded-lg border cursor-pointer transition-all ${selectedTemplate?.id === template.id
                            ? 'bg-blue-50 border-blue-500 ring-1 ring-blue-500'
                            : 'bg-white border-zinc-200 hover:border-blue-300 hover:bg-blue-50/50'
                            }`}
                        >
                          <div className="flex justify-between items-start">
                            <h4 className="font-bold text-sm text-zinc-800">{template.title}</h4>
                            {selectedTemplate?.id === template.id && <CheckCircle className="w-4 h-4 text-blue-600" />}
                          </div>
                          <p className="text-xs text-zinc-500 mt-1 line-clamp-1">{template.smsMessage}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Message Customization */}
                  <div className="space-y-3 pt-4 border-t border-zinc-200">
                    <Label className="text-zinc-800 font-bold">تخصيص الرسالة</Label>

                    {selectedTemplate && (
                      <div className="bg-blue-50 p-3 rounded-md text-xs text-blue-800 mb-2 flex items-start gap-2">
                        <Info className="w-4 h-4 shrink-0 mt-0.5" />
                        <p>تم اختيار: <strong>{selectedTemplate.title}</strong>. يمكنك تعديل الرسالة أدناه قبل الإرسال.</p>
                      </div>
                    )}

                    <Textarea
                      value={customMessage}
                      onChange={(e) => setCustomMessage(e.target.value)}
                      placeholder="اكتب رسالة مخصصة أو اختر قالباً..."
                      className="min-h-[100px] bg-white border-zinc-300 focus:border-blue-500 resize-none"
                    />

                    <div className="grid grid-cols-2 gap-3">
                      <Button
                        onClick={() => {
                          if (selectedTemplate) setCustomMessage(formatMessage(selectedTemplate, media.userName, 'whatsapp'));
                          onSendWhatsApp("custom");
                        }}
                        className="bg-green-600 hover:bg-green-700 text-white"
                        disabled={!customMessage && !selectedTemplate}
                      >
                        <Smartphone className="w-4 h-4 ml-2" /> إرسال واتساب
                      </Button>
                      <Button
                        onClick={() => {
                          if (selectedTemplate) setCustomMessage(formatMessage(selectedTemplate, media.userName, 'sms'));
                          onSendMessage("sms");
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                        disabled={!customMessage && !selectedTemplate}
                      >
                        <MessageSquare className="w-4 h-4 ml-2" /> إرسال SMS
                      </Button>
                    </div>
                  </div>

                </TabsContent>

                {/* ============ LOGS TAB ============ */}
                <TabsContent value="logs" className="mt-0 animate-in fade-in-50 slide-in-from-bottom-2">
                  <div className="space-y-4">
                    <h3 className="font-bold text-zinc-900 mb-2">سجل الأنشطة ({logs.length})</h3>
                    {logsLoading ? (
                      <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div></div>
                    ) : logs.length === 0 ? (
                      <div className="text-center py-8 text-zinc-400 bg-zinc-50 rounded-lg border border-dashed border-zinc-200">
                        <Shield className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p>لا توجد سجلات</p>
                      </div>
                    ) : (
                      <div className="relative border-r-2 border-zinc-200 pr-4 space-y-6 mr-2">
                        {logs.map((log, idx) => (
                          <div key={idx} className="relative">
                            <div className="absolute -right-[23px] top-1 w-4 h-4 rounded-full bg-white border-2 border-blue-500 ring-2 ring-blue-50"></div>
                            <div className="bg-white p-3 rounded-lg border border-zinc-200 shadow-sm hover:shadow-md transition-shadow">
                              <div className="flex justify-between items-start mb-1">
                                <span className="font-bold text-sm text-zinc-800">{log.action || "إجراء إداري"}</span>
                                <span className="text-[10px] text-zinc-400 font-mono">{formatDate(log.timestamp)}</span>
                              </div>
                              <p className="text-xs text-zinc-600">{log.details || "تم تحديث الحالة"}</p>
                              <div className="mt-2 flex items-center gap-1">
                                <Badge variant="secondary" className="text-[10px] h-5 px-1 bg-zinc-100 text-zinc-500">
                                  {log.user || "System"}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </TabsContent>

              </div>
            </Tabs>
          </div>

          {/* Footer Actions */}
          <div className="p-4 bg-white border-t border-zinc-200 sticky bottom-0 z-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={() => onStatusUpdate(media.id, "approved")}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-12 text-lg shadow-lg shadow-emerald-200"
              >
                <CheckCircle className="w-5 h-5 ml-2" /> موافقة
              </Button>

              <Button
                onClick={() => onStatusUpdate(media.id, "rejected")}
                variant="destructive"
                className="font-bold h-12 text-lg shadow-lg shadow-red-200"
              >
                <XCircle className="w-5 h-5 ml-2" /> رفض
              </Button>
            </div>

            <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-zinc-100">
              <Button variant="ghost" size="sm" onClick={() => onStatusUpdate(media.id, "flagged")} className="text-amber-600 hover:text-amber-700 hover:bg-amber-50">
                <Flag className="w-4 h-4 ml-1" /> إبلاغ
              </Button>
              <Button variant="ghost" size="sm" onClick={onClose} className="text-zinc-500 hover:bg-zinc-100">
                إغلاق
              </Button>
            </div>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  );
}
