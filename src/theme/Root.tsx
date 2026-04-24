import React, {type ReactNode, useEffect} from 'react';
import {useLocation} from '@docusaurus/router';
import ExecutionEnvironment from '@docusaurus/ExecutionEnvironment';
import type {Zoom} from 'medium-zoom';
import {AuthProvider} from '@site/src/context/AuthContext';
import AuthGate from '@site/src/components/auth/AuthGate';
import LogoutButton from '@site/src/components/auth/LogoutButton';

type Props = {
  readonly children: ReactNode;
};

/**
 * Zoom a pantalla completa en diagramas estáticos (img.diagram-asset).
 * Se re-inicializa en cada navegación SPA para enlazar imágenes nuevas.
 */
function MediumZoomEffect(): null {
  const location = useLocation();

  useEffect(() => {
    if (!ExecutionEnvironment.canUseDOM) {
      return undefined;
    }

    let cancelled = false;
    let zoomInstance: Zoom | null = null;

    const timer = window.setTimeout(() => {
      void import('medium-zoom').then(({default: mediumZoom}) => {
        if (cancelled) {
          return;
        }
        zoomInstance = mediumZoom('.diagram-asset', {
          margin: 28,
          background: 'rgba(15, 23, 42, 0.92)',
          scrollOffset: 0,
        });
      });
    }, 160);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      zoomInstance?.detach();
      zoomInstance = null;
    };
  }, [location.pathname]);

  return null;
}

export default function Root({children}: Props): ReactNode {
  return (
    <AuthProvider>
      <MediumZoomEffect />
      <AuthGate>{children}</AuthGate>
      <LogoutButton />
    </AuthProvider>
  );
}
