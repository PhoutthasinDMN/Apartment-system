'use client';

import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from '@/src/components/layout/app-shell';
import { AuthProvider } from '@/src/contexts/auth-context';
import { I18nProvider } from '@/src/i18n/i18n-context';
import { ThemeProvider } from '@/src/contexts/theme-context';
import { LoginPage } from '@/src/pages/auth/login-page';
import { PasswordUpdatePage } from '@/src/pages/auth/password-update-page';
import { DashboardPage } from '@/src/pages/dashboard/dashboard-page';
import { ModulePage } from '@/src/pages/modules/module-page';
import { ProtectedRoute } from '@/src/routes/protected-route';

export function App() {
  return <I18nProvider><ThemeProvider><AuthProvider><HashRouter><Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route path="/reset-password" element={<PasswordUpdatePage />} />
    <Route path="/*" element={<ProtectedRoute><AppShell><Routes>
      <Route path="/" element={<DashboardPage />} />
      <Route path="/buildings" element={<ModulePage module="buildings" />} />
      <Route path="/rooms" element={<ModulePage module="rooms" />} />
      <Route path="/tenants" element={<ModulePage module="tenants" />} />
      <Route path="/contracts" element={<ModulePage module="contracts" />} />
      <Route path="/utilities" element={<ModulePage module="utilities" />} />
      <Route path="/invoices" element={<ModulePage module="invoices" />} />
      <Route path="/payments" element={<ModulePage module="payments" />} />
      <Route path="/maintenance" element={<ModulePage module="maintenance" />} />
      <Route path="/expenses" element={<ModulePage module="expenses" />} />
      <Route path="/reports" element={<ModulePage module="reports" />} />
      <Route path="/settings" element={<ModulePage module="settings" />} />
      <Route path="/users" element={<ModulePage module="users" />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes></AppShell></ProtectedRoute>} />
  </Routes></HashRouter></AuthProvider></ThemeProvider></I18nProvider>;
}
