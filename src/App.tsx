import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { ExpenseEditorProvider } from './components/expenses/ExpenseEditor';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { LoadingScreen } from './components/ui/LoadingScreen';
import { ProfileProvider, useProfile } from './providers/ProfileProvider';
import { ThemeProvider } from './providers/ThemeProvider';
import { ToastProvider } from './providers/ToastProvider';
import { OnboardingPage } from './pages/OnboardingPage';
import { DashboardPage } from './pages/DashboardPage';
import { ExpensesPage } from './pages/ExpensesPage';
import { VouchersPage } from './pages/VouchersPage';
import { VoucherPage } from './pages/VoucherPage';
import { CategoriesPage } from './pages/CategoriesPage';
import { SettingsPage } from './pages/SettingsPage';
import { InstallPage } from './pages/InstallPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { isNativeApp } from './lib/native';

function AppRoutes() {
  const { user, loading } = useProfile();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return (
      <Routes>
        <Route path="*" element={<OnboardingPage />} />
      </Routes>
    );
  }

  return (
    <ExpenseEditorProvider>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<DashboardPage />} />
          <Route path="expenses" element={<ExpensesPage />} />
          <Route path="vouchers" element={<VouchersPage />} />
          <Route path="vouchers/:id" element={<VoucherPage />} />
          <Route path="categories" element={<CategoriesPage />} />
          <Route path="settings" element={<SettingsPage />} />
          {!isNativeApp() && <Route path="install" element={<InstallPage />} />}
          <Route path="onboarding" element={<Navigate to="/" replace />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </ExpenseEditorProvider>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <ToastProvider>
          <ProfileProvider>
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
          </ProfileProvider>
        </ToastProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
