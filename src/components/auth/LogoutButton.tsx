import React, {useState} from 'react';
import {useLocation} from '@docusaurus/router';
import {useAuth} from '@site/src/context/AuthContext';
import styles from './auth.module.css';

const HIDE_ON_PATHS = ['/login', '/reset-password'];

export default function LogoutButton(): React.ReactElement | null {
  const {session, signOut, loading} = useAuth();
  const location = useLocation();
  const [submitting, setSubmitting] = useState(false);

  const normalized = location.pathname.replace(/\/+$/, '') || '/';
  const hidden = HIDE_ON_PATHS.some(
    (p) => normalized === p || normalized.startsWith(`${p}/`),
  );

  if (loading || !session || hidden) {
    return null;
  }

  async function handleClick() {
    setSubmitting(true);
    try {
      await signOut();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <button
      type="button"
      className={styles.logoutBtn}
      onClick={handleClick}
      disabled={submitting}
      aria-label="Cerrar sesión"
    >
      {submitting ? 'Saliendo…' : 'Cerrar sesión'}
    </button>
  );
}
