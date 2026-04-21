import type {ReactNode} from 'react';
import Layout from '@theme/Layout';
import Hero from '@site/src/components/home/Hero';
import MainSections from '@site/src/components/home/MainSections';
import GovernanceSection from '@site/src/components/home/GovernanceSection';
import RecentChanges from '@site/src/components/home/RecentChanges';

export default function Home(): ReactNode {
  return (
    <Layout
      title="InsureHero Handbook"
      description="Documentación técnica interna de la plataforma InsureHero: arquitectura, integraciones, APIs y guías de desarrollo."
    >
      <main>
        <Hero />
        <MainSections />
        <GovernanceSection />
        <RecentChanges />
      </main>
    </Layout>
  );
}
