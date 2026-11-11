import type { ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router';
import { Layout } from './components/Layout';
import { Loading } from './components/ui';
import { t } from './i18n/sv';
import { AccountPage } from './pages/Account';
import { InvitePage, LoginPage, RegisterPage, ResetPage } from './pages/Auth';
import { ClubPage } from './pages/Club';
import { DrillPage, DrillsPage } from './pages/Drills';
import { HomePage } from './pages/Home';
import { PracticePage } from './pages/Practice';
import { RinkPage, ShareRinkPage } from './pages/Rink';
import { SharePage } from './pages/Share';
import { TeamPage } from './pages/Team';
import { MeProvider, useMe } from './state';

function RequireLogin({ children }: { children: ReactNode }) {
  const { me, loading } = useMe();
  const location = useLocation();
  if (loading) return <Loading />;
  if (!me) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  return <>{children}</>;
}

function Page({ children, auth = true }: { children: ReactNode; auth?: boolean }) {
  return <Layout>{auth ? <RequireLogin>{children}</RequireLogin> : children}</Layout>;
}

export function App() {
  return (
    <MeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Page auth={false}><LoginPage /></Page>} />
          <Route path="/register" element={<Page auth={false}><RegisterPage /></Page>} />
          <Route path="/invite/:token" element={<Page auth={false}><InvitePage /></Page>} />
          <Route path="/reset/:token" element={<Page auth={false}><ResetPage /></Page>} />
          <Route path="/s/:token" element={<Page auth={false}><SharePage /></Page>} />
          <Route path="/s/:token/rink" element={<ShareRinkPage />} />

          <Route path="/" element={<Page><HomePage /></Page>} />
          <Route path="/club/:clubId" element={<Page><ClubPage /></Page>} />
          <Route path="/teams/:teamId" element={<Page><TeamPage /></Page>} />
          <Route path="/drills" element={<Page><DrillsPage /></Page>} />
          <Route path="/drills/new" element={<Page><DrillPage /></Page>} />
          <Route path="/drills/:drillId" element={<Page><DrillPage /></Page>} />
          <Route path="/practices/:practiceId" element={<Page><PracticePage /></Page>} />
          <Route path="/practices/:practiceId/rink" element={<RequireLogin><RinkPage /></RequireLogin>} />
          <Route path="/account" element={<Page><AccountPage /></Page>} />
          <Route path="*" element={<Page auth={false}><p>{t.errors.notFound}</p></Page>} />
        </Routes>
      </BrowserRouter>
    </MeProvider>
  );
}
