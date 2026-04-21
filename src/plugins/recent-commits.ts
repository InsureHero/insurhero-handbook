import {execSync} from 'child_process';
import type {LoadContext, Plugin} from '@docusaurus/types';

export interface RecentCommit {
  hash: string;
  shortHash: string;
  date: string; // ISO
  author: string;
  subject: string;
  prNumber: string | null;
  prUrl: string | null;
}

const REPO_URL = 'https://github.com/Trade-EC/insurehero-handbook';
const COMMIT_COUNT = 4;

/**
 * Extrae el número de PR (#NNN) del mensaje de commit, si existe.
 * Convención Conventional Commits con squash merge: "feat: ... (#42)"
 */
function extractPrNumber(subject: string): string | null {
  const match = subject.match(/\(#(\d+)\)\s*$/);
  return match ? match[1] : null;
}

function readCommits(): RecentCommit[] {
  try {
    // Formato pipe-separated para parseo seguro.
    // %H = hash completo, %h = hash corto, %aI = author date ISO 8601 strict,
    // %an = author name, %s = subject
    const SEP = '||---||';
    const format = ['%H', '%h', '%aI', '%an', '%s'].join(SEP);
    const raw = execSync(
      `git log -n ${COMMIT_COUNT} --pretty=format:"${format}"`,
      {encoding: 'utf-8'},
    );

    return raw
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        const [hash, shortHash, date, author, subject] = line.split(SEP);
        const prNumber = extractPrNumber(subject);
        return {
          hash,
          shortHash,
          date,
          author,
          subject,
          prNumber,
          prUrl: prNumber ? `${REPO_URL}/pull/${prNumber}` : null,
        };
      });
  } catch (error) {
    // Si git no está disponible (builds aislados) devolvemos lista vacía.
    // El componente debe manejar este caso con un fallback.
    // eslint-disable-next-line no-console
    console.warn('[recent-commits] No se pudo leer git log:', error);
    return [];
  }
}

export default function recentCommitsPlugin(
  _context: LoadContext,
): Plugin<RecentCommit[]> {
  return {
    name: 'recent-commits-plugin',

    async loadContent() {
      return readCommits();
    },

    async contentLoaded({content, actions}) {
      const {setGlobalData} = actions;
      setGlobalData({commits: content});
    },
  };
}
