import React from 'react';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Flag, Clock } from 'lucide-react';

export type VideoStatus = 'pending' | 'approved' | 'rejected' | 'flagged';

interface StatusBadgeProps {
  status: VideoStatus;
  className?: string;
}

const statusToClasses: Record<VideoStatus, string> = {
  approved: 'bg-green-200 text-green-900 border-2 border-green-400 font-bold shadow-md',
  rejected: 'bg-red-200 text-red-900 border-2 border-red-400 font-bold shadow-md',
  flagged: 'bg-orange-200 text-orange-900 border-2 border-orange-400 font-bold shadow-md',
  pending: 'bg-amber-200 text-amber-900 border-2 border-amber-400 font-bold shadow-md',
};

const statusToIcon: Record<VideoStatus, React.ReactNode> = {
  approved: <CheckCircle className="w-4 h-4" />,
  rejected: <XCircle className="w-4 h-4" />,
  flagged: <Flag className="w-4 h-4" />,
  pending: <Clock className="w-4 h-4" />,
};

const statusToLabel: Record<VideoStatus, string> = {
  pending: 'في الانتظار',
  approved: 'مُوافق عليه',
  rejected: 'مرفوض',
  flagged: 'مُعلَّم',
};

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <Badge className={`${statusToClasses[status]} ${className ?? ''} px-3 py-1.5 text-sm`.trim()}>
      {statusToIcon[status]}
      <span className="mr-2 font-bold">{statusToLabel[status]}</span>
    </Badge>
  );
}


