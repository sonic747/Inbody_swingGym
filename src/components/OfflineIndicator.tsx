import React from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-20 sm:bottom-6 left-4 z-50 flex items-center gap-2 rounded-xl bg-amber-500/90 backdrop-blur-md px-3.5 py-2 text-xs font-semibold text-white shadow-xl border border-amber-400/30 animate-in fade-in slide-in-from-bottom-2">
      <span className="h-2 w-2 rounded-full bg-white animate-ping" />
      <span>오프라인 모드 — 저장된 로컬 캐시 데이터로 안전하게 표시 중입니다.</span>
    </div>
  );
};
