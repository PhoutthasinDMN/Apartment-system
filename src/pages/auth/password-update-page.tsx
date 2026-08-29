'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Building2, LoaderCircle } from 'lucide-react';
import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/src/contexts/auth-context';
import { useI18n } from '@/src/i18n/i18n-context';
import { useTheme } from '@/src/contexts/theme-context';

export function PasswordUpdatePage() {
  const { signOut, updatePassword } = useAuth();
  const { t } = useI18n();
  const { dark } = useTheme();
  const navigate = useNavigate();
  const schema = useMemo(() => z.object({ password: z.string().min(8, t('auth.passwordLength')), confirm: z.string() }).refine((values) => values.password === values.confirm, { path: ['confirm'], message: t('auth.passwordMismatch') }), [t]);
  type Values = z.infer<typeof schema>;
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { password: '', confirm: '' } });
  const submit = handleSubmit(async ({ password }) => {
    try {
      await updatePassword(password);
      await Swal.fire({ icon: 'success', title: t('auth.passwordUpdated'), confirmButtonColor: '#4318ff', background: dark ? '#111c44' : '#ffffff', color: dark ? '#ffffff' : '#1b2559' });
      await signOut();
      await navigate('/login', { replace: true });
    } catch {
      await Swal.fire({ icon: 'error', title: t('common.error'), confirmButtonColor: '#4318ff', background: dark ? '#111c44' : '#ffffff', color: dark ? '#ffffff' : '#1b2559' });
    }
  });

  return <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10"><div className="w-full max-w-[440px] rounded-2xl border border-border bg-card p-6 shadow-[0_12px_35px_rgba(15,23,42,0.08)] sm:p-10"><div className="mb-8 text-center"><div className="mx-auto mb-5 grid size-12 place-items-center rounded-xl bg-primary text-white"><Building2 className="size-6" /></div><h1 className="text-2xl font-bold text-foreground">{t('auth.newPasswordTitle')}</h1><p className="mt-2 text-sm leading-6 text-muted-foreground">{t('auth.newPasswordHelp')}</p></div><form className="space-y-5" onSubmit={submit}><div className="space-y-2"><Label htmlFor="new-password">{t('auth.newPassword')}</Label><Input id="new-password" type="password" autoComplete="new-password" className="h-12 rounded-lg" {...register('password')} />{errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}</div><div className="space-y-2"><Label htmlFor="confirm-password">{t('auth.confirmPassword')}</Label><Input id="confirm-password" type="password" autoComplete="new-password" className="h-12 rounded-lg" {...register('confirm')} />{errors.confirm && <p className="text-xs text-destructive">{errors.confirm.message}</p>}</div><Button type="submit" className="h-12 w-full rounded-lg font-bold" disabled={isSubmitting}>{isSubmitting && <LoaderCircle className="animate-spin" />}{t('auth.updatePassword')}</Button></form></div></main>;
}
