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
import { useTranslation } from '@/lib/i18n';

const MAX_FILE_SIZE = 500 * 1024 * 1024;
const CATEGORY_VALUES: VideoCategory[] = ['skills', 'match', 'training', 'attack', 'midfield', 'defense', 'goalkeeper', 'other'];

const interpolateUploadCopy = (template: string, values: Record<string, string | number>) =>
  template.replace(/\{\{(\w+)\}\}/g, (_, key) => `${values[key] ?? ''}`);

interface PlayerRewards {
  totalPoints: number;
  availablePoints: number;
}

export default function VideoUploadPage() {
  const { user } = useAuth();
  const { t, isRTL } = useTranslation();
  const copy = {
    categories: {
      skills: t('playerVideoUpload.categories.skills'),
      match: t('playerVideoUpload.categories.match'),
      training: t('playerVideoUpload.categories.training'),
      attack: t('playerVideoUpload.categories.attack'),
      midfield: t('playerVideoUpload.categories.midfield'),
      defense: t('playerVideoUpload.categories.defense'),
      goalkeeper: t('playerVideoUpload.categories.goalkeeper'),
      other: t('playerVideoUpload.categories.other'),
    },
    status: {
      approved: t('playerVideoUpload.status.approved'),
      rejected: t('playerVideoUpload.status.rejected'),
      pending: t('playerVideoUpload.status.pending'),
    },
    toast: {
      invalidFile: t('playerVideoUpload.toast.invalidFile'),
      sizeError: t('playerVideoUpload.toast.sizeError'),
      uploadSuccess: t('playerVideoUpload.toast.uploadSuccess'),
      uploadError: t('playerVideoUpload.toast.uploadError'),
    },
    loading: t('playerVideoUpload.loading'),
    title: t('playerVideoUpload.title'),
    earnPoints: t('playerVideoUpload.earnPoints'),
    availablePoints: t('playerVideoUpload.availablePoints'),
    howToEarn: t('playerVideoUpload.howToEarn'),
    steps: [
      { step: '1', title: t('playerVideoUpload.steps.upload.title'), desc: t('playerVideoUpload.steps.upload.description') },
      { step: '2', title: t('playerVideoUpload.steps.review.title'), desc: t('playerVideoUpload.steps.review.description') },
      { step: '3', title: t('playerVideoUpload.steps.reward.title'), desc: t('playerVideoUpload.steps.reward.description') },
    ],
    uploadNew: t('playerVideoUpload.uploadNew'),
    reward: t('playerVideoUpload.reward'),
    uploadedVideos: t('playerVideoUpload.uploadedVideos'),
    noVideos: t('playerVideoUpload.noVideos'),
    uploadFirst: t('playerVideoUpload.uploadFirst'),
    analyzed: t('playerVideoUpload.analyzed'),
    analysisQueued: t('playerVideoUpload.analysisQueued'),
    point: t('playerVideoUpload.point'),
    modalTitle: t('playerVideoUpload.modalTitle'),
    chooseFile: t('playerVideoUpload.chooseFile'),
    clickToChoose: t('playerVideoUpload.clickToChoose'),
    supportedFormats: t('playerVideoUpload.supportedFormats'),
    videoTitle: t('playerVideoUpload.videoTitle'),
    videoTitlePlaceholder: t('playerVideoUpload.videoTitlePlaceholder'),
    videoCategory: t('playerVideoUpload.videoCategory'),
    videoDescription: t('playerVideoUpload.videoDescription'),
    videoDescriptionPlaceholder: t('playerVideoUpload.videoDescriptionPlaceholder'),
    uploading: t('playerVideoUpload.uploading'),
    tipsTitle: t('playerVideoUpload.tipsTitle'),
    tips: [
      t('playerVideoUpload.tips.quality'),
      t('playerVideoUpload.tips.skills'),
      t('playerVideoUpload.tips.category'),
      t('playerVideoUpload.tips.safeContent'),
    ],
    uploadVideo: t('playerVideoUpload.uploadVideo'),
    cancel: t('playerVideoUpload.cancel'),
  };

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
