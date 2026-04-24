import type {ReactNode} from 'react';
import Layout from '@theme/Layout';
import LoginForm from '@site/src/components/auth/LoginForm';

export default function LoginPage(): ReactNode {
  return (
    <Layout
      title="Iniciar sesión"
      description="Acceso al handbook interno de InsureHero."
      noFooter
    >
      <LoginForm />
    </Layout>
  );
}
