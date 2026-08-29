'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Building2, LoaderCircle } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Navigate, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/src/contexts/auth-context';
import { useI18n } from '@/src/i18n/i18n-context';

export function LoginPage() {
  const { configured, session, signIn, resetPassword } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [resetMode, setResetMode] = useState(false);
  const schema = useMemo(() => z.object({ email: z.email(t('common.invalidEmail')), password: resetMode ? z.string().optional() : z.string().min(8, t('common.required')) }), [resetMode, t]);
  type Values = z.infer<typeof schema>;
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { email: '', password: '' } });

  if (!configured) return <Navigate to="/" replace />;
  if (session) return <Navigate to="/" replace />;

  const submit = handleSubmit(async (values) => {
    try {
      if (resetMode) {
        await resetPassword(values.email);
        await Swal.fire({ icon: 'success', title: t('auth.linkSent'), confirmButtonColor: '#2563eb' });
        setResetMode(false);
      } else {
        await signIn(values.email, values.password ?? '');
        await navigate('/', { replace: true });
      }
    } catch {
      await Swal.fire({ icon: 'error', title: t('auth.invalid'), confirmButtonColor: '#2563eb' });
    }
  });

  return <main className="grid min-h-screen place-items-center bg-slate-950 p-4"><Card className="w-full max-w-md border-0 bg-white py-6 shadow-2xl ring-0"><CardHeader className="text-center"><div className="mx-auto mb-3 grid size-12 place-items-center rounded-xl bg-blue-600 text-white"><Building2 /></div><CardTitle className="text-2xl font-bold">{resetMode ? t('auth.resetTitle') : t('auth.welcome')}</CardTitle><p className="text-sm text-slate-500">{resetMode ? t('auth.resetHelp') : t('auth.subtitle')}</p></CardHeader><CardContent><form className="space-y-4" onSubmit={submit}><div className="space-y-2"><Label htmlFor="email">{t('auth.email')}</Label><Input id="email" type="email" autoComplete="email" className="h-11" {...register('email')} />{errors.email && <p className="text-xs text-red-600">{errors.email.message}</p>}</div>{!resetMode && <div className="space-y-2"><Label htmlFor="password">{t('auth.password')}</Label><Input id="password" type="password" autoComplete="current-password" className="h-11" {...register('password')} />{errors.password && <p className="text-xs text-red-600">{errors.password.message}</p>}</div>}<Button type="submit" className="h-11 w-full" disabled={isSubmitting}>{isSubmitting && <LoaderCircle className="animate-spin" />}{resetMode ? t('auth.sendLink') : isSubmitting ? t('auth.signingIn') : t('auth.signIn')}</Button><button type="button" onClick={() => setResetMode((value) => !value)} className="w-full text-sm font-medium text-blue-700 hover:underline">{resetMode ? t('auth.signIn') : t('auth.forgot')}</button></form></CardContent></Card></main>;
}
