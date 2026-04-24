import React, {useEffect, useMemo, type ReactNode} from 'react';
import {useHistory, useLocation} from '@docusaurus/router';
import ExecutionEnvironment from '@docusaurus/ExecutionEnvironment';
import {useAuth} from '@site/src/context/AuthContext';
import styles from './auth.module.css';

const PUBLIC_PATHS = ['/login', '/reset-password'] as const;

function isPublicPath(pathname: string): boolean {
  const normalized = pathname.replace(/\/+$/, '') || '/';
  return (PUBLIC_PATHS as readonly string[]).some(
    (p) => normalized === p || normalized.startsWith(`${p}/`),
  );
}

type Props = {
  readonly children: ReactNode;
};

function GateOverlay(): React.ReactElement {
  return (
    <div className={styles.gateOverlay} role="status" aria-live="polite" aria-label="Cargando">
      <div className={styles.gateSpinner} />
    </div>
  );
}

export default function AuthGate({children}: Props): React.ReactElement {
  const {session, loading, recoveryMode} = useAuth();
  const location = useLocation();
  const history = useHistory();

  const pathPublic = useMemo(() => isPublicPath(location.pathname), [location.pathname]);
  const isLoginPath = useMemo(
    () => location.pathname.replace(/\/+$/, '') === '/login',
    [location.pathname],
  );
  const isResetPath = useMemo(
    () => location.pathname.replace(/\/+$/, '') === '/reset-password',
    [location.pathname],
  );

  useEffect(() => {
    if (!ExecutionEnvironment.canUseDOM) return;
    if (loading) return;

    if (recoveryMode && !isResetPath) {
      history.replace('/reset-password');
      return;
    }

    if (!session && !pathPublic) {
      history.replace('/login');
      return;
    }

    if (session && isLoginPath && !recoveryMode) {
      // Read ?redirectTo from URL, set by edge middleware when redirecting
      // unauthenticated requests to /login.
      const params = new URLSearchParams(location.search);
      const redirectTo = params.get('redirectTo');
      // Validate it's an internal path (not an external URL) to prevent
      // open redirect vulnerability.
      const safeRedirect =
        redirectTo && redirectTo.startsWith('/') && !redirectTo.startsWith('//')
          ? redirectTo
          : '/';
      history.replace(safeRedirect);
    }
  }, [loading, session, recoveryMode, pathPublic, isLoginPath, isResetPath, history]);

  if (!ExecutionEnvironment.canUseDOM) {
    return <GateOverlay />;
  }

  if (loading) {
    return <GateOverlay />;
  }

  if (recoveryMode && !isResetPath) {
    return <GateOverlay />;
  }

  if (!session && !pathPublic) {
    return <GateOverlay />;
  }

  if (session && isLoginPath && !recoveryMode) {
    return <GateOverlay />;
  }

  return <>{children}</>;
}
