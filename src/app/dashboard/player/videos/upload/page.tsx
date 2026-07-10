'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/lib/firebase/auth-provider';
import { videoService } from '@/lib/video/video-service';
import { referralService } from '@/lib/referral/referral-service';
import { POINTS_CONVERSION } from '@/types/referral';
import type { PlayerVideo, VideoCategory } from '@/lib/video/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Video, Upload, Play, Clock, Eye, DollarSign, Award, CheckCircle, XCircle, FileVideo } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Locale, useTranslation } from '@/lib/i18n';

const MAX_FILE_SIZE = 500 * 1024 * 1024;
const CATEGORY_VALUES: VideoCategory[] = ['skills', 'match', 'training', 'attack', 'midfield', 'defense', 'goalkeeper', 'other'];

const PLAYER_VIDEO_UPLOAD_COPY: Record<Locale, any> = {
  ar: {
    categories: { skills: 'مهارات', match: 'مباراة', training: 'تدريب', attack: 'هجوم', midfield: 'وسط', defense: 'دفاع', goalkeeper: 'حراسة مرمى', other: 'أخرى' },
    status: { approved: 'تمت الموافقة', rejected: 'مرفوض', pending: 'قيد المراجعة' },
    toast: { invalidFile: 'يرجى اختيار ملف فيديو صحيح', sizeError: 'حجم الملف ({{size}} MB) يتجاوز الحد الأقصى 500 MB', uploadSuccess: 'تم رفع الفيديو بنجاح! سيتم مراجعته قريبًا', uploadError: 'حدث خطأ أثناء رفع الفيديو' },
    loading: 'جاري التحميل...', title: 'رفع الفيديوهات', earnPoints: 'كسب النقاط', availablePoints: 'النقاط المتوفرة',
    howToEarn: 'كيف تكسب النقاط من الفيديوهات؟',
    steps: [{ step: '1', title: 'ارفع فيديو', desc: 'ارفع فيديو يظهر مهاراتك في كرة القدم (حتى 500 MB)' }, { step: '2', title: 'انتظر المراجعة', desc: 'سيقوم فريقنا بمراجعة الفيديو خلال 24 ساعة' }, { step: '3', title: 'احصل على النقاط', desc: '1,000 نقطة لكل فيديو تمت الموافقة عليه' }],
    uploadNew: 'رفع فيديو جديد', reward: 'احصل على 1,000 نقطة لكل فيديو تمت الموافقة عليه', uploadedVideos: 'الفيديوهات المرفوعة ({{count}})', noVideos: 'لم تقم برفع أي فيديوهات بعد', uploadFirst: 'رفع أول فيديو',
    analyzed: 'تم التحليل', analysisQueued: 'في طابور التحليل', point: 'نقطة', modalTitle: 'رفع فيديو جديد', chooseFile: 'اختر ملف الفيديو', clickToChoose: 'انقر لاختيار ملف فيديو', supportedFormats: 'MP4, WebM, MOV — حتى 500 MB',
    videoTitle: 'عنوان الفيديو *', videoTitlePlaceholder: 'أدخل عنوان الفيديو', videoCategory: 'تصنيف الفيديو', videoDescription: 'وصف الفيديو', videoDescriptionPlaceholder: 'وصف مختصر للفيديو...', uploading: 'جاري الرفع...',
    tipsTitle: 'نصائح للحصول على الموافقة:', tips: ['تأكد من جودة الفيديو والإضاءة الجيدة', 'اظهر مهاراتك بوضوح في الفيديو', 'اختر التصنيف المناسب ليسهّل التحليل الذكي', 'تجنب المحتوى المسيء'], uploadVideo: 'رفع الفيديو', cancel: 'إلغاء',
  },
  en: {
    categories: { skills: 'Skills', match: 'Match', training: 'Training', attack: 'Attack', midfield: 'Midfield', defense: 'Defense', goalkeeper: 'Goalkeeper', other: 'Other' },
    status: { approved: 'Approved', rejected: 'Rejected', pending: 'Under review' },
    toast: { invalidFile: 'Please choose a valid video file', sizeError: 'File size ({{size}} MB) exceeds the 500 MB limit', uploadSuccess: 'Video uploaded successfully! It will be reviewed soon', uploadError: 'An error occurred while uploading the video' },
    loading: 'Loading...', title: 'Upload videos', earnPoints: 'Earn points', availablePoints: 'Available points',
    howToEarn: 'How do you earn points from videos?',
    steps: [{ step: '1', title: 'Upload a video', desc: 'Upload a video showing your football skills (up to 500 MB)' }, { step: '2', title: 'Wait for review', desc: 'Our team will review the video within 24 hours' }, { step: '3', title: 'Earn points', desc: '1,000 points for every approved video' }],
    uploadNew: 'Upload new video', reward: 'Earn 1,000 points for every approved video', uploadedVideos: 'Uploaded videos ({{count}})', noVideos: 'You have not uploaded any videos yet', uploadFirst: 'Upload first video',
    analyzed: 'Analyzed', analysisQueued: 'Queued for analysis', point: 'point', modalTitle: 'Upload new video', chooseFile: 'Choose video file', clickToChoose: 'Click to choose a video file', supportedFormats: 'MP4, WebM, MOV — up to 500 MB',
    videoTitle: 'Video title *', videoTitlePlaceholder: 'Enter video title', videoCategory: 'Video category', videoDescription: 'Video description', videoDescriptionPlaceholder: 'Short video description...', uploading: 'Uploading...',
    tipsTitle: 'Tips to get approved:', tips: ['Make sure the video quality and lighting are good', 'Show your skills clearly in the video', 'Choose the right category to help smart analysis', 'Avoid offensive content'], uploadVideo: 'Upload video', cancel: 'Cancel',
  },
  es: {
    categories: { skills: 'Habilidades', match: 'Partido', training: 'Entrenamiento', attack: 'Ataque', midfield: 'Mediocampo', defense: 'Defensa', goalkeeper: 'Portero', other: 'Otro' },
    status: { approved: 'Aprobado', rejected: 'Rechazado', pending: 'En revisión' },
    toast: { invalidFile: 'Elige un archivo de video válido', sizeError: 'El tamaño del archivo ({{size}} MB) supera el límite de 500 MB', uploadSuccess: '¡Video subido con éxito! Será revisado pronto', uploadError: 'Ocurrió un error al subir el video' },
    loading: 'Cargando...', title: 'Subir videos', earnPoints: 'Ganar puntos', availablePoints: 'Puntos disponibles',
    howToEarn: '¿Cómo ganar puntos con videos?',
    steps: [{ step: '1', title: 'Sube un video', desc: 'Sube un video que muestre tus habilidades de fútbol (hasta 500 MB)' }, { step: '2', title: 'Espera la revisión', desc: 'Nuestro equipo revisará el video en 24 horas' }, { step: '3', title: 'Gana puntos', desc: '1.000 puntos por cada video aprobado' }],
    uploadNew: 'Subir nuevo video', reward: 'Gana 1.000 puntos por cada video aprobado', uploadedVideos: 'Videos subidos ({{count}})', noVideos: 'Aún no has subido videos', uploadFirst: 'Subir primer video',
    analyzed: 'Analizado', analysisQueued: 'En cola de análisis', point: 'punto', modalTitle: 'Subir nuevo video', chooseFile: 'Elegir archivo de video', clickToChoose: 'Haz clic para elegir un video', supportedFormats: 'MP4, WebM, MOV — hasta 500 MB',
    videoTitle: 'Título del video *', videoTitlePlaceholder: 'Introduce el título del video', videoCategory: 'Categoría del video', videoDescription: 'Descripción del video', videoDescriptionPlaceholder: 'Breve descripción del video...', uploading: 'Subiendo...',
    tipsTitle: 'Consejos para obtener aprobación:', tips: ['Asegúrate de que la calidad y la iluminación sean buenas', 'Muestra tus habilidades claramente', 'Elige la categoría adecuada para facilitar el análisis', 'Evita contenido ofensivo'], uploadVideo: 'Subir video', cancel: 'Cancelar',
  },
  pt: {
    categories: { skills: 'Habilidades', match: 'Jogo', training: 'Treino', attack: 'Ataque', midfield: 'Meio-campo', defense: 'Defesa', goalkeeper: 'Goleiro', other: 'Outro' },
    status: { approved: 'Aprovado', rejected: 'Rejeitado', pending: 'Em análise' },
    toast: { invalidFile: 'Escolha um arquivo de vídeo válido', sizeError: 'O tamanho do arquivo ({{size}} MB) excede o limite de 500 MB', uploadSuccess: 'Vídeo enviado com sucesso! Será revisado em breve', uploadError: 'Ocorreu um erro ao enviar o vídeo' },
    loading: 'Carregando...', title: 'Enviar vídeos', earnPoints: 'Ganhar pontos', availablePoints: 'Pontos disponíveis',
    howToEarn: 'Como ganhar pontos com vídeos?',
    steps: [{ step: '1', title: 'Envie um vídeo', desc: 'Envie um vídeo mostrando suas habilidades no futebol (até 500 MB)' }, { step: '2', title: 'Aguarde a análise', desc: 'Nossa equipe analisará o vídeo em até 24 horas' }, { step: '3', title: 'Ganhe pontos', desc: '1.000 pontos por cada vídeo aprovado' }],
    uploadNew: 'Enviar novo vídeo', reward: 'Ganhe 1.000 pontos por cada vídeo aprovado', uploadedVideos: 'Vídeos enviados ({{count}})', noVideos: 'Você ainda não enviou vídeos', uploadFirst: 'Enviar primeiro vídeo',
    analyzed: 'Analisado', analysisQueued: 'Na fila de análise', point: 'ponto', modalTitle: 'Enviar novo vídeo', chooseFile: 'Escolher arquivo de vídeo', clickToChoose: 'Clique para escolher um vídeo', supportedFormats: 'MP4, WebM, MOV — até 500 MB',
    videoTitle: 'Título do vídeo *', videoTitlePlaceholder: 'Digite o título do vídeo', videoCategory: 'Categoria do vídeo', videoDescription: 'Descrição do vídeo', videoDescriptionPlaceholder: 'Breve descrição do vídeo...', uploading: 'Enviando...',
    tipsTitle: 'Dicas para aprovação:', tips: ['Garanta boa qualidade e iluminação', 'Mostre suas habilidades claramente', 'Escolha a categoria correta para facilitar a análise', 'Evite conteúdo ofensivo'], uploadVideo: 'Enviar vídeo', cancel: 'Cancelar',
  },
};

const interpolateUploadCopy = (template: string, values: Record<string, string | number>) =>
  template.replace(/\{\{(\w+)\}\}/g, (_, key) => `${values[key] ?? ''}`);

interface PlayerRewards {
  totalPoints: number;
  availablePoints: number;
}

export default function VideoUploadPage() {
  const { user } = useAuth();
  const { locale, isRTL } = useTranslation();
  const copy = PLAYER_VIDEO_UPLOAD_COPY[locale] || PLAYER_VIDEO_UPLOAD_COPY.en;

  const [loading, setLoading] = useState(true);
  const [playerRewards, setPlayerRewards] = useState<PlayerRewards | null>(null);
  const [uploadedVideos, setUploadedVideos] = useState<PlayerVideo[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [videoTitle, setVideoTitle] = useState('');
  const [videoDescription, setVideoDescription] = useState('');
  const [videoCategory, setVideoCategory] = useState<VideoCategory>('other');
  const [showUploadModal, setShowUploadModal] = useState(false);

  useEffect(() => {
    if (user?.id) loadData();
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [rewards, videos] = await Promise.all([
        referralService.createOrUpdatePlayerRewards(user!.id).catch(() => null),
        videoService.getByPlayer(user!.id).catch(() => []),
      ]);
      if (rewards) setPlayerRewards(rewards);
      setUploadedVideos(videos);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      toast.error(copy.toast.invalidFile);
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      const mb = (file.size / (1024 * 1024)).toFixed(0);
      toast.error(interpolateUploadCopy(copy.toast.sizeError, { size: mb }));
      return;
    }

    setSelectedFile(file);
    setVideoTitle(file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' '));
  };

  const handleUpload = async () => {
    if (!selectedFile || !videoTitle.trim() || !user?.id) return;
    setUploading(true);
    setUploadProgress(0);
    const progressInterval = setInterval(() => setUploadProgress(prev => Math.min(prev + 3, 90)), 300);

    try {
      const { video } = await videoService.upload({
        file: selectedFile,
        playerId: user.id,
        title: videoTitle,
        description: videoDescription,
        category: videoCategory,
        accountType: 'independent',
        autoQueueAnalysis: false,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);
      setUploadedVideos(prev => [video, ...prev]);
      toast.success(copy.toast.uploadSuccess);
      setShowUploadModal(false);
      setSelectedFile(null);
      setVideoTitle('');
      setVideoDescription('');
      setVideoCategory('other');
    } catch (error) {
      clearInterval(progressInterval);
      console.error('Error uploading video:', error);
      toast.error(error instanceof Error ? error.message : copy.toast.uploadError);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const getStatusColor = (status: string) => {
    if (status === 'approved') return 'bg-green-500';
    if (status === 'rejected') return 'bg-red-500';
    return 'bg-yellow-500';
  };

  const getStatusText = (status: string) => {
    if (status === 'approved') return copy.status.approved;
    if (status === 'rejected') return copy.status.rejected;
    return copy.status.pending;
  };

  const getStatusIcon = (status: string) => {
    if (status === 'approved') return <CheckCircle className="w-4 h-4" />;
    if (status === 'rejected') return <XCircle className="w-4 h-4" />;
    return <Clock className="w-4 h-4" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl">{copy.loading}</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">{copy.title}</h1>
        <div className="flex items-center gap-2">
          <Video className="w-6 h-6 text-blue-500" />
          <span className="text-lg font-semibold">{copy.earnPoints}</span>
        </div>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100">{copy.availablePoints}</p>
                <p className="text-3xl font-bold">{playerRewards?.availablePoints.toLocaleString() ?? '—'}</p>
                <p className="text-sm text-blue-100">≈ ${((playerRewards?.availablePoints ?? 0) / POINTS_CONVERSION.POINTS_PER_DOLLAR).toFixed(2)}</p>
              </div>
              <DollarSign className="w-12 h-12" />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5 text-yellow-500" />
              {copy.howToEarn}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { icon: <Upload className="w-8 h-8 text-blue-600" />, bg: 'bg-blue-100', ...copy.steps[0] },
                { icon: <CheckCircle className="w-8 h-8 text-yellow-600" />, bg: 'bg-yellow-100', ...copy.steps[1] },
                { icon: <DollarSign className="w-8 h-8 text-green-600" />, bg: 'bg-green-100', ...copy.steps[2] },
              ].map(({ icon, step, title, desc, bg }: any) => (
                <div key={step} className="text-center">
                  <div className={`w-16 h-16 ${bg} rounded-full flex items-center justify-center mx-auto mb-4`}>{icon}</div>
                  <h3 className="font-semibold mb-2">{step}. {title}</h3>
                  <p className="text-sm text-gray-600">{desc}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Card>
          <CardContent className="p-6 text-center">
            <Button onClick={() => setShowUploadModal(true)} size="lg" className="bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700">
              <Upload className="w-5 h-5 mx-2" />
              {copy.uploadNew}
            </Button>
            <p className="text-sm text-gray-500 mt-2">{copy.reward}</p>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Video className="w-5 h-5" />
              {interpolateUploadCopy(copy.uploadedVideos, { count: uploadedVideos.length })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {uploadedVideos.length === 0 ? (
              <div className="text-center py-8">
                <Video className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">{copy.noVideos}</p>
                <Button onClick={() => setShowUploadModal(true)} variant="outline" className="mt-4">{copy.uploadFirst}</Button>
              </div>
            ) : (
              <div className="space-y-4">
                {uploadedVideos.map((video) => (
                  <div key={video.id} className="flex items-center gap-4 p-4 border rounded-lg">
                    <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Play className="w-8 h-8 text-gray-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">{video.title}</h3>
                      <p className="text-sm text-gray-600 line-clamp-1">{video.description}</p>
                      <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-gray-500">
                        <span>{new Date(video.createdAt).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US')}</span>
                        {video.fileSize && <span>{formatFileSize(video.fileSize)}</span>}
                        {video.duration > 0 && <span>{Math.floor(video.duration / 60)}:{(video.duration % 60).toString().padStart(2, '0')}</span>}
                        {video.category && video.category !== 'other' && (
                          <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{copy.categories[video.category] || copy.categories.other}</span>
                        )}
                        {video.analysisStatus === 'completed' && (
                          <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Eye className="w-3 h-3" /> {copy.analyzed}
                            {video.analysisResult?.overallScore != null && <span className="font-bold">{video.analysisResult.overallScore}/100</span>}
                          </span>
                        )}
                        {video.analysisStatus === 'queued' && <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">{copy.analysisQueued}</span>}
                      </div>
                    </div>
                    <div className="text-end flex-shrink-0">
                      <Badge className={`${getStatusColor(video.status)} text-white`}>
                        <div className="flex items-center gap-1">{getStatusIcon(video.status)}{getStatusText(video.status)}</div>
                      </Badge>
                      {video.status === 'approved' && video.pointsEarned > 0 && (
                        <div className="text-sm text-green-600 mt-1 font-semibold">+{video.pointsEarned.toLocaleString()} {copy.point}</div>
                      )}
                      {video.status === 'rejected' && video.adminNotes && <div className="text-xs text-red-600 mt-1 max-w-32 text-end">{video.adminNotes}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">{copy.modalTitle}</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowUploadModal(false)}><XCircle className="w-4 h-4" /></Button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">{copy.chooseFile}</label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <input type="file" accept="video/mp4,video/webm,video/ogg,video/avi,video/mov,video/quicktime" onChange={handleFileSelect} className="hidden" id="video-upload" />
                  <label htmlFor="video-upload" className="cursor-pointer">
                    <FileVideo className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                    {selectedFile ? (
                      <div>
                        <p className="text-sm font-medium text-gray-800 truncate">{selectedFile.name}</p>
                        <p className="text-xs text-gray-500">{formatFileSize(selectedFile.size)}</p>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm text-gray-600">{copy.clickToChoose}</p>
                        <p className="text-xs text-gray-400 mt-1">{copy.supportedFormats}</p>
                      </>
                    )}
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">{copy.videoTitle}</label>
                <Input value={videoTitle} onChange={(e) => setVideoTitle(e.target.value)} placeholder={copy.videoTitlePlaceholder} maxLength={100} />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">{copy.videoCategory}</label>
                <select value={videoCategory} onChange={(e) => setVideoCategory(e.target.value as VideoCategory)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {CATEGORY_VALUES.map(value => <option key={value} value={value}>{copy.categories[value]}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">{copy.videoDescription}</label>
                <Textarea value={videoDescription} onChange={(e) => setVideoDescription(e.target.value)} placeholder={copy.videoDescriptionPlaceholder} rows={3} maxLength={500} />
              </div>

              {uploading && (
                <div>
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>{copy.uploading}</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-500 h-2 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                  </div>
                </div>
              )}

              <div className="bg-blue-50 p-3 rounded-lg text-xs text-blue-700 space-y-1">
                <p className="font-semibold">{copy.tipsTitle}</p>
                {copy.tips.map((tip: string) => <p key={tip}>• {tip}</p>)}
              </div>

              <div className="flex gap-2">
                <Button onClick={handleUpload} disabled={!selectedFile || !videoTitle.trim() || uploading} className="flex-1">
                  {uploading ? `${copy.uploading} ${uploadProgress}%` : copy.uploadVideo}
                </Button>
                <Button variant="outline" onClick={() => { setShowUploadModal(false); setSelectedFile(null); }} disabled={uploading} className="flex-1">
                  {copy.cancel}
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
