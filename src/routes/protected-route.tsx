'use client';

import { Navigate } from 'react-router-dom';
import { LoaderCircle } from 'lucide-react';
import { useAuth } from '@/src/contexts/auth-context';
import { useI18n } from '@/src/i18n/i18n-context';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { configured, loading, session } = useAuth();
  const { t } = useI18n();
  if (loading) return <div className="grid min-h-screen place-items-center bg-slate-50"><div className="flex items-center gap-2 text-slate-600"><LoaderCircle className="size-5 animate-spin" />{t('common.loading')}</div></div>;
  if (configured && !session) return <Navigate to="/login" replace />;
  return children;
}
