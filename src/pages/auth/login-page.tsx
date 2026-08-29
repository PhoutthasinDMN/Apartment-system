'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Building2, LoaderCircle, Moon, Sun } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Navigate, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useAuth } from '@/src/contexts/auth-context';
import { useTheme } from '@/src/contexts/theme-context';
import { useI18n } from '@/src/i18n/i18n-context';

export function LoginPage() {
  const { configured, session, signIn, resetPassword } = useAuth();
  const { language, setLanguage, t } = useI18n();
  const { dark, toggleTheme } = useTheme();
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
        await Swal.fire({ icon: 'success', title: t('auth.linkSent'), confirmButtonColor: '#4318FF', background: dark ? '#111C44' : '#fff', color: dark ? '#fff' : '#2B3674' });
        setResetMode(false);
      } else {
        await signIn(values.email, values.password ?? '');
        await navigate('/', { replace: true });
      }
    } catch {
      await Swal.fire({ icon: 'error', title: t('auth.invalid'), confirmButtonColor: '#4318FF', background: dark ? '#111C44' : '#fff', color: dark ? '#fff' : '#2B3674' });
    }
  });

  return <main className="relative grid min-h-screen bg-background p-4 transition-colors lg:grid-cols-[1.05fr_0.95fr] lg:p-5">
    <div className="absolute right-5 top-5 z-10 flex items-center gap-2 rounded-2xl bg-white/85 p-1.5 shadow-[0_12px_30px_rgba(112,144,176,0.15)] backdrop-blur dark:bg-[#111C44]/90">
      <div className="flex rounded-xl bg-[#F4F7FE] p-1 text-xs font-bold dark:bg-white/5"><button onClick={() => setLanguage('lo')} className={cn('rounded-lg px-2.5 py-1.5', language === 'lo' ? 'bg-white text-primary shadow-sm dark:bg-white/10 dark:text-violet-300' : 'text-[#A3AED0]')}>{t('common.lao')}</button><button onClick={() => setLanguage('en')} className={cn('rounded-lg px-2.5 py-1.5', language === 'en' ? 'bg-white text-primary shadow-sm dark:bg-white/10 dark:text-violet-300' : 'text-[#A3AED0]')}>{t('common.english')}</button></div>
      <Button variant="ghost" size="icon" onClick={toggleTheme} className="rounded-xl text-[#A3AED0] hover:text-primary" aria-label={dark ? t('common.lightMode') : t('common.darkMode')}>{dark ? <Sun /> : <Moon />}</Button>
    </div>
    <section className="relative hidden overflow-hidden rounded-[28px] bg-[#4318FF] p-12 text-white lg:flex lg:flex-col lg:justify-between">
      <div className="absolute -left-24 -top-24 size-80 rounded-full border-[64px] border-white/8"/><div className="absolute -bottom-32 -right-20 size-[430px] rounded-full border-[90px] border-white/8"/>
      <div className="relative flex items-center gap-3"><div className="grid size-12 place-items-center rounded-2xl bg-white/15 backdrop-blur"><Building2 /></div><div><p className="text-lg font-bold">{t('app.name')}</p><p className="text-sm text-white/65">{t('app.tagline')}</p></div></div>
      <div className="relative max-w-xl"><p className="text-5xl font-bold leading-[1.25] tracking-tight">{t('auth.welcome')}</p><p className="mt-5 max-w-md text-lg leading-8 text-white/70">{t('auth.subtitle')}</p></div>
      <p className="relative text-sm font-medium text-white/50">{t('dashboard.subtitle')}</p>
    </section>
    <section className="flex items-center justify-center px-2 py-20 sm:px-10 lg:py-0"><div className="w-full max-w-md">
      <div className="mb-8 lg:hidden"><div className="mb-4 grid size-12 place-items-center rounded-2xl bg-primary text-white shadow-lg"><Building2 /></div><p className="text-lg font-bold text-[#2B3674] dark:text-white">{t('app.name')}</p></div>
      <h1 className="text-3xl font-bold tracking-tight text-[#2B3674] dark:text-white">{resetMode ? t('auth.resetTitle') : t('auth.welcome')}</h1><p className="mt-2 text-sm font-medium text-[#A3AED0]">{resetMode ? t('auth.resetHelp') : t('auth.subtitle')}</p>
      <form className="mt-8 space-y-5" onSubmit={submit}><div className="space-y-2"><Label htmlFor="email" className="font-bold text-[#2B3674] dark:text-white">{t('auth.email')}</Label><Input id="email" type="email" autoComplete="email" className="h-12 rounded-2xl border-slate-200 bg-white px-4 dark:border-white/10 dark:bg-[#111C44]" {...register('email')} />{errors.email && <p className="text-xs font-medium text-red-500">{errors.email.message}</p>}</div>{!resetMode && <div className="space-y-2"><Label htmlFor="password" className="font-bold text-[#2B3674] dark:text-white">{t('auth.password')}</Label><Input id="password" type="password" autoComplete="current-password" className="h-12 rounded-2xl border-slate-200 bg-white px-4 dark:border-white/10 dark:bg-[#111C44]" {...register('password')} />{errors.password && <p className="text-xs font-medium text-red-500">{errors.password.message}</p>}</div>}<Button type="submit" className="h-12 w-full rounded-2xl text-sm font-bold shadow-[0_12px_24px_rgba(67,24,255,0.25)]" disabled={isSubmitting}>{isSubmitting && <LoaderCircle className="animate-spin" />}{resetMode ? t('auth.sendLink') : isSubmitting ? t('auth.signingIn') : t('auth.signIn')}</Button><button type="button" onClick={() => setResetMode((value) => !value)} className="w-full text-sm font-bold text-primary hover:underline">{resetMode ? t('auth.signIn') : t('auth.forgot')}</button></form>
    </div></section>
  </main>;
}
