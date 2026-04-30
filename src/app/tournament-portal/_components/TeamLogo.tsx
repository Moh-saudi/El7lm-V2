'use client';

import { useState } from 'react';
import { resolveImg, detectTypeFromUrl } from '../_utils/img';

interface Props {
  name: string;
  logo?: string | null;
  size?: number;
  accountType?: 'player'|'club'|'academy'|'trainer'|'agent'|'team';
}

export function TeamLogo({ name, logo, size = 32, accountType }: Props) {
  const type    = accountType || detectTypeFromUrl(logo);
  const url     = resolveImg(logo, type);
  const [err, setErr] = useState(false);

  const r = Math.round(size * 0.27);
  const f = Math.round(size * 0.38);

  if (!url || err) {
    return (
      <div style={{
        width: size, height: size, borderRadius: r, flexShrink: 0,
        background: 'linear-gradient(135deg,#1e3a5f,#1d4ed8)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#fff', fontWeight: 800, fontSize: f,
      }}>
        {name?.charAt(0)?.toUpperCase() || '?'}
      </div>
    );
  }

  return (
    <img src={url} alt={name} width={size} height={size}
      style={{ width: size, height: size, borderRadius: r, objectFit: 'cover', flexShrink: 0 }}
      onError={() => setErr(true)}
    />
  );
}
