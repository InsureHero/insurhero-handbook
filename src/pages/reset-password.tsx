import React, {useState, type FormEvent, type ReactNode} from 'react';
import Layout from '@theme/Layout';
import {useHistory} from '@docusaurus/router';
import {useAuth} from '@site/src/context/AuthContext';
import styles from '@site/src/components/auth/auth.module.css';

function ResetPasswordContent(): React.ReactElement {
  const {recoveryMode, session, updatePassword, signOut, loading} = useAuth();
  const history = useHistory();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const canSubmit = recoveryMode || !!session;

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setSubmitting(true);
    try {
      const {error: updateError} = await updatePassword(password);
      if (updateError) {
        setError(updateError.message);
        return;
      }
      setDone(true);
      await signOut();
      window.setTimeout(() => history.replace('/login'), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado al actualizar la contraseña.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <div className={styles.authShell} />;
  }

  return (
    <div className={styles.authShell}>
      <div className={styles.card}>
        <div className={styles.brand}>
          <h1 className={styles.title}>Restablecer contraseña</h1>
          <p className={styles.subtitle}>
            {canSubmit
              ? 'Elige una nueva contraseña para tu cuenta.'
              : 'Este enlace no es válido o ha expirado. Solicita uno nuevo desde la pantalla de inicio de sesión.'}
          </p>
        </div>

        {error ? <div className={styles.error}>{error}</div> : null}
        {done ? (
          <div className={styles.success}>
            Contraseña actualizada correctamente. Redirigiendo a inicio de sesión…
          </div>
        ) : null}

        {canSubmit && !done ? (
          <form className={styles.form} onSubmit={handleSubmit} noValidate>
            <div className={styles.field}>
              <label htmlFor="new-password" className={styles.label}>
                Nueva contraseña
              </label>
              <input
                id="new-password"
                type="password"
                className={styles.input}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                minLength={8}
                required
                disabled={submitting}
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="confirm-password" className={styles.label}>
                Confirmar contraseña
              </label>
              <input
                id="confirm-password"
                type="password"
                className={styles.input}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
                minLength={8}
                required
                disabled={submitting}
              />
            </div>

            <button type="submit" className={styles.primaryBtn} disabled={submitting}>
              {submitting ? 'Guardando…' : 'Actualizar contraseña'}
            </button>
          </form>
        ) : null}

        {!canSubmit ? (
          <div className={styles.switcher}>
            <button
              type="button"
              className={styles.linkBtn}
              onClick={() => history.replace('/login')}
            >
              ← Ir a iniciar sesión
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function ResetPasswordPage(): ReactNode {
  return (
    <Layout
      title="Restablecer contraseña"
      description="Define una nueva contraseña para tu cuenta del handbook."
      noFooter
    >
      <ResetPasswordContent />
    </Layout>
  );
}
