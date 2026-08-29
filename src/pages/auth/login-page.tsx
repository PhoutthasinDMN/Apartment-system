'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Building2, LoaderCircle, Moon, Sun, UserPlus } from 'lucide-react';
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
  const { configured, session, signIn, signUp, resetPassword } = useAuth();
  const { language, setLanguage, t } = useI18n();
  const { dark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [resetMode, setResetMode] = useState(false);
  const [signupMode, setSignupMode] = useState(false);

  const schema = useMemo(() => {
    if (resetMode) return z.object({ email: z.string().refine((v) => z.email().safeParse(v.trim()).success, t('common.invalidEmail')), password: z.string().optional() });
    if (signupMode) return z.object({
      fullName: z.string().min(1, t('common.required')),
      email: z.string().refine((v) => z.email().safeParse(v.trim()).success, t('common.invalidEmail')),
      password: z.string().min(8, t('common.required')),
      confirmPassword: z.string().min(8, t('common.required')),
    }).refine((v) => v.password === v.confirmPassword, { message: t('common.required'), path: ['confirmPassword'] });
    return z.object({
      email: z.string().refine((value) => value.trim().toLowerCase() === 'admin' || z.email().safeParse(value.trim()).success, t('common.invalidEmail')),
      password: z.string().min(8, t('common.required')),
    });
  }, [resetMode, signupMode, t]);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Record<string, string>>({ resolver: zodResolver(schema) as never, defaultValues: { email: '', password: '' } });

  if (!configured) return <Navigate to="/" replace />;
  if (session) return <Navigate to="/" replace />;

  const submit = handleSubmit(async (values) => {
    try {
      if (resetMode) {
        await resetPassword(values.email);
        await Swal.fire({ icon: 'success', title: t('auth.linkSent'), confirmButtonColor: '#4318FF', background: dark ? '#111C44' : '#fff', color: dark ? '#fff' : '#2B3674' });
        setResetMode(false);
      } else if (signupMode) {
        const v = values as { email: string; password: string; fullName: string };
        await signUp(v.email, v.password, v.fullName);
        await Swal.fire({ icon: 'success', title: t('auth.signupSuccess') || 'Account created!', confirmButtonColor: '#4318FF', background: dark ? '#111C44' : '#fff', color: dark ? '#fff' : '#2B3674' });
        setSignupMode(false);
      } else {
        const identifier = values.email.trim().toLowerCase();
        await signIn(identifier === 'admin' ? 'admin@apartment.app' : identifier, values.password ?? '');
        await navigate('/', { replace: true });
      }
    } catch {
      await Swal.fire({ icon: 'error', title: t('auth.invalid'), confirmButtonColor: '#4318FF', background: dark ? '#111C44' : '#fff', color: dark ? '#fff' : '#2B3674' });
    }
  });

  return <main className="min-h-dvh bg-background transition-colors">
    <header className="flex min-h-14 items-center justify-between gap-2 border-b border-border/70 bg-card px-3 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))] sm:min-h-16 sm:px-8">
      <div className="flex min-w-0 items-center gap-2 sm:gap-2.5">
        <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary text-white sm:size-9"><Building2 className="size-4 sm:size-5" /></div>
        <div className="min-w-0"><p className="truncate text-xs font-bold leading-tight text-foreground sm:text-sm">{t('app.name')}</p><p className="hidden text-xs text-muted-foreground sm:block">{t('app.tagline')}</p></div>
      </div>
      <div className="flex items-center gap-1">
        <div className="flex rounded-lg border border-border bg-background p-0.5 text-xs font-semibold"><button type="button" onClick={() => setLanguage('lo')} className={cn('rounded-md px-2 py-1.5 transition-colors sm:px-2.5', language === 'lo' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>{t('common.lao')}</button><button type="button" onClick={() => setLanguage('en')} className={cn('rounded-md px-2 py-1.5 transition-colors sm:px-2.5', language === 'en' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>{t('common.english')}</button></div>
        <Button variant="ghost" size="icon" onClick={toggleTheme} className="rounded-lg text-muted-foreground" aria-label={dark ? t('common.lightMode') : t('common.darkMode')}>{dark ? <Sun /> : <Moon />}</Button>
      </div>
    </header>
    <section className="flex min-h-[calc(100dvh-3.5rem)] items-center justify-center px-4 pb-[max(2rem,env(safe-area-inset-bottom))] pt-6 sm:min-h-[calc(100dvh-4rem)] sm:px-6 sm:pt-8">
      <div className="w-full max-w-[440px] rounded-2xl border border-border bg-card p-5 shadow-[0_12px_35px_rgba(15,23,42,0.08)] sm:p-10 dark:shadow-[0_16px_45px_rgba(0,0,0,0.28)]">
        <div className="mb-6 text-center sm:mb-8">
          <div className="mx-auto mb-4 grid size-10 place-items-center rounded-xl bg-primary text-white sm:mb-5 sm:size-12"><Building2 className="size-5 sm:size-6" /></div>
          <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">{resetMode ? t('auth.resetTitle') : signupMode ? (t('auth.signupTitle') || 'ສ້າງບັນຊີໃໝ່') : t('auth.welcome')}</h1>
          <p className="mt-1.5 text-sm leading-6 text-muted-foreground sm:mt-2">{resetMode ? t('auth.resetHelp') : signupMode ? (t('auth.signupHelp') || 'ລົງທະບຽນບັນຊີໃໝ່ເພື່ອເຂົ້າໃຊ້ລະບົບ') : t('auth.subtitle')}</p>
        </div>
        <form className="space-y-4 sm:space-y-5" onSubmit={submit}>
          {signupMode && <div className="space-y-2"><Label htmlFor="fullName" className="font-semibold text-foreground">{t('auth.fullName') || 'ຊື່ເຕັມ'}</Label><Input id="fullName" type="text" autoComplete="name" placeholder={t('auth.fullNamePlaceholder') || 'ຊື່ ແລະ ນາມສະກຸນ'} className="h-11 rounded-lg bg-background px-4 sm:h-12" {...register('fullName')} />{errors.fullName && <p className="text-xs font-medium text-destructive">{errors.fullName.message}</p>}</div>}
          <div className="space-y-2">
            <Label htmlFor="email" className="font-semibold text-foreground">{t('auth.email')}</Label>
            <Input id="email" type="text" inputMode={resetMode || signupMode ? 'email' : 'text'} autoCapitalize="none" spellCheck={false} autoComplete={resetMode || signupMode ? 'email' : 'username'} placeholder={resetMode || signupMode ? 'name@example.com' : 'admin'} className="h-11 rounded-lg bg-background px-4 sm:h-12" {...register('email')} />
            {errors.email && <p className="text-xs font-medium text-destructive">{errors.email.message}</p>}
          </div>
          {!resetMode && <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="font-semibold text-foreground">{t('auth.password')}</Label>
              {!signupMode && <button type="button" onClick={() => { setResetMode(true); setSignupMode(false); }} className="min-h-10 text-xs font-semibold text-primary hover:underline sm:min-h-11">{t('auth.forgot')}</button>}
            </div>
            <Input id="password" type="password" autoComplete={signupMode ? 'new-password' : 'current-password'} className="h-11 rounded-lg bg-background px-4 sm:h-12" {...register('password')} />
            {errors.password && <p className="text-xs font-medium text-destructive">{errors.password.message}</p>}
          </div>}
          {signupMode && <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="font-semibold text-foreground">{t('auth.confirmPassword') || 'ຢັ້ງຢືນລະຫັດຜ່ານ'}</Label>
            <Input id="confirmPassword" type="password" autoComplete="new-password" className="h-11 rounded-lg bg-background px-4 sm:h-12" {...register('confirmPassword')} />
            {errors.confirmPassword && <p className="text-xs font-medium text-destructive">{errors.confirmPassword.message}</p>}
          </div>}
          <Button type="submit" className="h-11 w-full rounded-lg text-sm font-bold shadow-none sm:h-12" disabled={isSubmitting}>{isSubmitting && <LoaderCircle className="animate-spin" />}{resetMode ? t('auth.sendLink') : signupMode ? (t('auth.signUp') || 'ສ້າງບັນຊີ') : isSubmitting ? t('auth.signingIn') : t('auth.signIn')}</Button>
          {resetMode && <button type="button" onClick={() => setResetMode(false)} className="min-h-10 w-full text-sm font-semibold text-primary hover:underline sm:min-h-11">{t('auth.signIn')}</button>}
          {!resetMode && !signupMode && <button type="button" onClick={() => { setSignupMode(true); setResetMode(false); }} className="min-h-10 w-full text-sm font-semibold text-primary hover:underline sm:min-h-11 flex items-center justify-center gap-1.5"><UserPlus className="size-4" />{t('auth.signupLink') || 'ສ້າງບັນຊີໃໝ່'}</button>}
          {signupMode && <button type="button" onClick={() => { setSignupMode(false); setResetMode(false); }} className="min-h-10 w-full text-sm font-semibold text-primary hover:underline sm:min-h-11">{t('auth.signIn')}</button>}
        </form>
      </div>
    </section>
  </main>;
}
