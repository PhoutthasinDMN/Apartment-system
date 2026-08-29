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

  return <main className="min-h-screen bg-background transition-colors">
    <header className="flex h-16 items-center justify-between border-b border-border/70 bg-card px-4 sm:px-8">
      <div className="flex items-center gap-3"><div className="grid size-9 place-items-center rounded-lg bg-primary text-white"><Building2 className="size-5" /></div><div><p className="text-sm font-bold leading-tight text-foreground">{t('app.name')}</p><p className="text-xs text-muted-foreground">{t('app.tagline')}</p></div></div>
      <div className="flex items-center gap-1"><div className="flex rounded-lg border border-border bg-background p-0.5 text-xs font-semibold"><button type="button" onClick={() => setLanguage('lo')} className={cn('rounded-md px-2.5 py-1.5 transition-colors', language === 'lo' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>{t('common.lao')}</button><button type="button" onClick={() => setLanguage('en')} className={cn('rounded-md px-2.5 py-1.5 transition-colors', language === 'en' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>{t('common.english')}</button></div><Button variant="ghost" size="icon" onClick={toggleTheme} className="rounded-lg text-muted-foreground" aria-label={dark ? t('common.lightMode') : t('common.darkMode')}>{dark ? <Sun /> : <Moon />}</Button></div>
    </header>
    <section className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-10">
      <div className="w-full max-w-[440px] rounded-2xl border border-border bg-card p-6 shadow-[0_12px_35px_rgba(15,23,42,0.08)] sm:p-10 dark:shadow-[0_16px_45px_rgba(0,0,0,0.28)]">
        <div className="mb-8 text-center"><div className="mx-auto mb-5 grid size-12 place-items-center rounded-xl bg-primary text-white"><Building2 className="size-6" /></div><h1 className="text-2xl font-bold tracking-tight text-foreground">{resetMode ? t('auth.resetTitle') : t('auth.welcome')}</h1><p className="mt-2 text-sm leading-6 text-muted-foreground">{resetMode ? t('auth.resetHelp') : t('auth.subtitle')}</p></div>
        <form className="space-y-5" onSubmit={submit}><div className="space-y-2"><Label htmlFor="email" className="font-semibold text-foreground">{t('auth.email')}</Label><Input id="email" type="email" autoComplete="email" className="h-12 rounded-lg bg-background px-4" {...register('email')} />{errors.email && <p className="text-xs font-medium text-destructive">{errors.email.message}</p>}</div>{!resetMode && <div className="space-y-2"><div className="flex items-center justify-between"><Label htmlFor="password" className="font-semibold text-foreground">{t('auth.password')}</Label><button type="button" onClick={() => setResetMode(true)} className="text-xs font-semibold text-primary hover:underline">{t('auth.forgot')}</button></div><Input id="password" type="password" autoComplete="current-password" className="h-12 rounded-lg bg-background px-4" {...register('password')} />{errors.password && <p className="text-xs font-medium text-destructive">{errors.password.message}</p>}</div>}<Button type="submit" className="h-12 w-full rounded-lg text-sm font-bold shadow-none" disabled={isSubmitting}>{isSubmitting && <LoaderCircle className="animate-spin" />}{resetMode ? t('auth.sendLink') : isSubmitting ? t('auth.signingIn') : t('auth.signIn')}</Button>{resetMode && <button type="button" onClick={() => setResetMode(false)} className="w-full text-sm font-semibold text-primary hover:underline">{t('auth.signIn')}</button>}</form>
      </div>
    </section>
  </main>;
}
