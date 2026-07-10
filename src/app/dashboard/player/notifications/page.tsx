'use client';

import React from 'react';
import NotificationsManager from '@/components/notifications/NotificationsManager';
import { useTranslation } from '@/lib/i18n';

export default function PlayerNotificationsPage() {
  const { t } = useTranslation();

  return (
    <NotificationsManager
      title={t('notifications.title')}
      description={t('notifications.desc')}
      showSenderInfo={true}
      showStats={true}
      showFilters={true}
      showTestButtons={true}
      accountType="player"
    />
  );
} 
