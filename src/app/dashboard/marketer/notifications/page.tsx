'use client';

import React from 'react';
import NotificationsManager from '@/components/notifications/NotificationsManager';
import { useTranslation } from '@/lib/i18n';

export default function MarketerNotificationsPage() {
  const { t } = useTranslation();

  return (
    <NotificationsManager
      title={t('notifications.marketerTitle')}
      description={t('notifications.marketerDesc')}
      showSenderInfo={true}
      showStats={true}
      showFilters={true}
      showTestButtons={false}
      accountType="marketer"
    />
  );
}
