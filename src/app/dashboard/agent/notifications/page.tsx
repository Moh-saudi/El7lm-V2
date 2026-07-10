'use client';

import React from 'react';
import NotificationsManager from '@/components/notifications/NotificationsManager';
import { useTranslation } from '@/lib/i18n';

export default function AgentNotificationsPage() {
  const { t } = useTranslation();

  return (
    <NotificationsManager
      title={t('notifications.agentTitle')}
      description={t('notifications.agentDesc')}
      showSenderInfo={true}
      showStats={true}
      showFilters={true}
      showTestButtons={false}
      accountType="agent"
    />
  );
}
