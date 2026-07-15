'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Share2, MessageCircle, Facebook, Linkedin, Twitter, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from '@/lib/i18n';

interface ShareModalProps {
  playerId: string;
  playerName: string;
  trigger?: React.ReactNode;
}

export default function ShareModal({ playerId, playerName, trigger }: ShareModalProps) {
  const { t, isRTL } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const shareUrl = `${window.location.origin}/dashboard/shared/player-profile/${playerId}`;
  const shareMessage = t('sharedComponents.shareModal.shareMessage').replace('{{playerName}}', playerName);

  const handleShare = (platform: string) => {
    let shareLink = '';

    switch (platform) {
      case 'whatsapp':
        shareLink = `https://wa.me/?text=${encodeURIComponent(shareMessage + '\n' + shareUrl)}`;
        break;
      case 'facebook':
        shareLink = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareMessage)}`;
        break;
      case 'linkedin':
        shareLink = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(shareMessage)}`;
        break;
      case 'twitter':
        shareLink = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareMessage)}&url=${encodeURIComponent(shareUrl)}`;
        break;
      case 'telegram':
        shareLink = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareMessage)}`;
        break;
      case 'copy':
        navigator.clipboard.writeText(shareUrl).then(() => {
          setCopied(true);
          toast.success(t('sharedComponents.shareModal.copied'));
          setTimeout(() => setCopied(false), 2000);
        });
        return;
      default:
        return;
    }

    window.open(shareLink, '_blank', 'width=600,height=400');
  };

  const shareOptions = [
    { name: t('sharedComponents.shareModal.whatsapp'), icon: MessageCircle, color: 'bg-green-500 hover:bg-green-600', platform: 'whatsapp' },
    { name: t('sharedComponents.shareModal.facebook'), icon: Facebook, color: 'bg-blue-600 hover:bg-blue-700', platform: 'facebook' },
    { name: t('sharedComponents.shareModal.linkedin'), icon: Linkedin, color: 'bg-blue-700 hover:bg-blue-800', platform: 'linkedin' },
    { name: t('sharedComponents.shareModal.twitter'), icon: Twitter, color: 'bg-blue-400 hover:bg-blue-500', platform: 'twitter' },
    { name: t('sharedComponents.shareModal.copyLink'), icon: copied ? Check : Copy, color: copied ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-600 hover:bg-gray-700', platform: 'copy' },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="flex gap-2 items-center">
            <Share2 className="w-4 h-4" />
            {t('sharedComponents.shareModal.share')}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md" dir={isRTL ? 'rtl' : 'ltr'}>
        <DialogHeader>
          <DialogTitle className="text-center">
            {t('sharedComponents.shareModal.title').replace('{{playerName}}', playerName)}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-gray-600 text-center">{t('sharedComponents.shareModal.choosePlatform')}</p>
          <div className="grid grid-cols-2 gap-3">
            {shareOptions.map((option) => (
              <Button
                key={option.platform}
                onClick={() => handleShare(option.platform)}
                className={`${option.color} text-white flex flex-col items-center gap-2 py-4 h-auto`}
              >
                <option.icon className="w-6 h-6" />
                <span className="text-sm">{option.name}</span>
              </Button>
            ))}
          </div>
          <div className="text-xs text-gray-500 text-center mt-4">{t('sharedComponents.shareModal.fullReportHint')}</div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
