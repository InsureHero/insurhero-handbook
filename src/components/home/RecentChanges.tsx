import type {ReactNode} from 'react';
import {usePluginData} from '@docusaurus/useGlobalData';
import type {RecentCommit} from '@site/src/plugins/recent-commits';
import styles from './RecentChanges.module.css';

const REPO_URL = 'https://github.com/Trade-EC/insurehero-handbook';

function formatRelativeDate(iso: string): string {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'hoy';
  if (diffDays === 1) return 'ayer';
  if (diffDays < 7) return `hace ${diffDays} días`;
  if (diffDays < 30) return `hace ${Math.floor(diffDays / 7)} semanas`;
  return date.toLocaleDateString('es', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function RecentChanges(): ReactNode {
  const data = usePluginData('recent-commits-plugin') as
    | {commits: RecentCommit[]}
    | undefined;
  const commits = data?.commits ?? [];

  if (commits.length === 0) {
    return null;
  }

  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <header className={styles.header}>
          <h2 className={styles.heading}>Últimos cambios</h2>
          <a
            href={`${REPO_URL}/commits/main`}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.viewAll}
          >
            Ver todos en GitHub →
          </a>
        </header>

        <ul className={styles.list}>
          {commits.map((commit) => {
            const targetUrl =
              commit.prUrl ?? `${REPO_URL}/commit/${commit.hash}`;
            return (
              <li key={commit.hash} className={styles.item}>
                <a
                  href={targetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.link}
                >
                  <div className={styles.meta}>
                    <span className={styles.date}>
                      {formatRelativeDate(commit.date)}
                    </span>
                    <span className={styles.author}>{commit.author}</span>
                    {commit.prNumber && (
                      <span className={styles.pr}>#{commit.prNumber}</span>
                    )}
                  </div>
                  <p className={styles.subject}>{commit.subject}</p>
                </a>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
