/**
 * Local Git helpers for optional branch creation (autotrack-api tooling).
 * Does not push, merge, or open PRs.
 */

import { execFileSync } from 'node:child_process';

/**
 * @param {string[]} args
 * @param {{ cwd?: string }} [opts]
 */
function git(args, opts = {}) {
  return execFileSync('git', args, {
    cwd: opts.cwd ?? process.cwd(),
    encoding: 'utf8',
  }).trim();
}

/**
 * @param {{ expectedRepo: string; cwd?: string }} opts
 */
export function assertExpectedRepository(opts) {
  let remote = '';
  try {
    remote = git(['remote', 'get-url', 'origin'], { cwd: opts.cwd });
  } catch {
    const err = new Error('Não foi possível ler git remote origin.');
    err.code = 'GIT_REMOTE_MISSING';
    throw err;
  }

  if (!remote.includes(opts.expectedRepo)) {
    const err = new Error(
      `Repositório inesperado. Remote origin="${remote}" não contém "${opts.expectedRepo}".`
    );
    err.code = 'GIT_REPO_MISMATCH';
    throw err;
  }

  return remote;
}

/**
 * @param {string} branchName
 * @param {{ cwd?: string }} [opts]
 */
export function branchExists(branchName, opts = {}) {
  try {
    git(['show-ref', '--verify', '--quiet', `refs/heads/${branchName}`], opts);
    return true;
  } catch {
    return false;
  }
}

/**
 * Suggest-only helper — never mutates git.
 * @param {string} branchName
 */
export function suggestBranch(branchName) {
  return {
    action: 'suggest',
    branchName,
    created: false,
  };
}

/**
 * Create local branch from base. Refuses to overwrite an existing branch.
 * Does not push.
 *
 * @param {{
 *   branchName: string;
 *   baseBranch: string;
 *   expectedRepo: string;
 *   cwd?: string;
 * }} opts
 */
export function createBranch(opts) {
  assertExpectedRepository({ expectedRepo: opts.expectedRepo, cwd: opts.cwd });

  if (branchExists(opts.branchName, { cwd: opts.cwd })) {
    const err = new Error(
      `Branch já existe localmente: ${opts.branchName}. Não será sobrescrita.`
    );
    err.code = 'BRANCH_EXISTS';
    throw err;
  }

  try {
    git(['rev-parse', '--verify', opts.baseBranch], { cwd: opts.cwd });
  } catch {
    const err = new Error(`Base branch não encontrada: ${opts.baseBranch}`);
    err.code = 'BASE_BRANCH_MISSING';
    throw err;
  }

  git(['checkout', '-b', opts.branchName, opts.baseBranch], { cwd: opts.cwd });

  return {
    action: 'create',
    branchName: opts.branchName,
    baseBranch: opts.baseBranch,
    created: true,
    pushed: false,
  };
}
