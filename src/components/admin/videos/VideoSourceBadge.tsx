import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Youtube, Database, ExternalLink, Cloud, Video as VideoIcon } from 'lucide-react';

export type VideoSourceType = 'youtube' | 'supabase' | 'external' | 'firebase' | '';

interface VideoSourceBadgeProps {
  sourceType: VideoSourceType;
  className?: string;
}

const sourceToIcon: Record<VideoSourceType, React.ReactNode> = {
  youtube: <Youtube className="w-4 h-4 text-red-600" />,
  supabase: <Database className="w-4 h-4 text-green-600" />,
  firebase: <Cloud className="w-4 h-4 text-orange-600" />,
  external: <ExternalLink className="w-4 h-4 text-blue-600" />,
  '': <VideoIcon className="w-4 h-4 text-gray-600" />,
};

const sourceToLabel = (sourceType: VideoSourceType) => {
  switch (sourceType) {
    case 'youtube':
      return 'YouTube';
    case 'supabase':
      return 'Supabase';
    case 'firebase':
      return 'Firebase';
    case 'external':
      return 'رابط خارجي';
    default:
      return 'غير محدد';
  }
};

export default function VideoSourceBadge({ sourceType, className }: VideoSourceBadgeProps) {
  return (
    <div className={`flex items-center gap-2 ${className ?? ''}`.trim()}>
      {sourceToIcon[sourceType]}
      <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded-full">
        {sourceToLabel(sourceType)}
      </span>
    </div>
  );
}



