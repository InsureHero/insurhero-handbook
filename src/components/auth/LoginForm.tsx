import React, {useState, type FormEvent} from 'react';
import {useAuth} from '@site/src/context/AuthContext';
import styles from './auth.module.css';

type Mode = 'login' | 'recovery';

export default function LoginForm(): React.ReactElement {
  const {signIn, sendPasswordRecovery} = useAuth();
  const [mode, setMode] = useState<Mode>('login');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [recoveryEmail, setRecoveryEmail] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  async function handleLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setSubmitting(true);
    try {
      const {error: authError} = await signIn(email.trim(), password);
      if (authError) {
        setError(
          authError.message === 'Invalid login credentials'
            ? 'Credenciales inválidas. Verifica tu correo y contraseña.'
            : authError.message,
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado al iniciar sesión.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRecovery(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setSubmitting(true);
    try {
      const {error: recError} = await sendPasswordRecovery(recoveryEmail.trim());
      if (recError) {
        setError(recError.message);
      } else {
        setSuccessMsg(
          'Si el correo existe, te enviaremos un enlace para restablecer tu contraseña.',
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado al enviar el correo.');
    } finally {
      setSubmitting(false);
    }
  }

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setSuccessMsg(null);
  }

  return (
    <div className={styles.authShell}>
      <div className={styles.card}>
        <div className={styles.brand}>
          <h1 className={styles.title}>InsureHero Handbook</h1>
          <p className={styles.subtitle}>
            {mode === 'login'
              ? 'Inicia sesión para acceder a la documentación interna.'
              : 'Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.'}
          </p>
        </div>

        {error ? <div className={styles.error}>{error}</div> : null}
        {successMsg ? <div className={styles.success}>{successMsg}</div> : null}

        {mode === 'login' ? (
          <form className={styles.form} onSubmit={handleLogin} noValidate>
            <div className={styles.field}>
              <label htmlFor="login-email" className={styles.label}>
                Correo electrónico
              </label>
              <input
                id="login-email"
                type="email"
                className={styles.input}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
                disabled={submitting}
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="login-password" className={styles.label}>
                Contraseña
              </label>
              <input
                id="login-password"
                type="password"
                className={styles.input}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                disabled={submitting}
              />
            </div>

            <div className={styles.footerRow}>
              <span />
              <button
                type="button"
                className={styles.linkBtn}
                onClick={() => switchMode('recovery')}
                disabled={submitting}
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>

            <button type="submit" className={styles.primaryBtn} disabled={submitting}>
              {submitting ? 'Ingresando…' : 'Iniciar sesión'}
            </button>
          </form>
        ) : (
          <form className={styles.form} onSubmit={handleRecovery} noValidate>
            <div className={styles.field}>
              <label htmlFor="recovery-email" className={styles.label}>
                Correo electrónico
              </label>
              <input
                id="recovery-email"
                type="email"
                className={styles.input}
                value={recoveryEmail}
                onChange={(e) => setRecoveryEmail(e.target.value)}
                autoComplete="email"
                required
                disabled={submitting}
              />
            </div>

            <button type="submit" className={styles.primaryBtn} disabled={submitting}>
              {submitting ? 'Enviando…' : 'Enviar enlace de recuperación'}
            </button>

            <div className={styles.switcher}>
              <button
                type="button"
                className={styles.linkBtn}
                onClick={() => switchMode('login')}
                disabled={submitting}
              >
                ← Volver a iniciar sesión
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
