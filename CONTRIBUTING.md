# Contributing to PixelVault

Thanks for your interest in contributing! PixelVault is privacy-first: all processing stays in the browser.

## Branch workflow (required)

`main` is protected — always deployable, no direct pushes. Every change goes through a short-lived branch + PR:

```
main (protected)
 └── feat/<short-name>   new features
 └── fix/<short-name>    bug fixes
 └── chore/<short-name>  deps, tooling, docs, ci
```

```bash
git checkout main && git pull
git checkout -b feat/my-feature
# ... make changes, commit (hooks run automatically) ...
git push -u origin feat/my-feature
gh pr create --title "feat: my feature" --body "What/why..."
# wait for CI green -> squash-merge on GitHub -> branch auto-deleted
```

- One topic per branch/PR. Keep PRs small.
- Use [Conventional Commits](https://www.conventionalcommits.org/): `feat:`, `fix:`, `chore:`, `docs:`, `ci:`, `refactor:`, `test:`.
  Commit messages are linted by commitlint (local hook + CI). This enables auto-changelogs later.
- Releases stay manual: maintainer tags `vX.Y.Z` + `gh release create`.

## Pre-commit hooks (Husky + lint-staged + commitlint)

Hooks install automatically via `npm ci` (the `prepare` script). On `git commit`:

- `pre-commit`: ESLint `--fix` + Prettier on staged files.
- `commit-msg`: commitlint (Conventional Commits).

No host Node? The hooks fall back to a throwaway Podman container automatically — nothing is installed on your laptop.

Bypass only in emergencies: `git commit --no-verify` (CI will still check).

## Quick start (no host Node required)

```bash
# Throwaway Podman dev — nothing installed on your laptop
podman run --rm -it -p 3000:3000 -v ./:/app:z -w /app docker.io/node:22-alpine sh -c "npm ci && npm run dev -- --host 0.0.0.0 --port 3000"
# open http://127.0.0.1:3000/PixelVault/, Ctrl-C to stop (container is auto-removed)
```

Or with the committed `Containerfile`:

```bash
podman build -t pixelvault:throwaway -f Containerfile .
podman run --rm -it -p 3000:3000 pixelvault:throwaway
podman rmi pixelvault:throwaway
```

With local Node 22 (optional):

```bash
npm ci
npm run format:check
npm run lint
npm run typecheck
npm run build
```

## Guidelines

1. **Type safety** — all new code needs TypeScript types; run `npm run typecheck` before pushing.
2. **Privacy first** — never add network uploads, tracking, or analytics. Processing must stay client-side.
3. **Memory hygiene** — revoke object URLs with `URL.revokeObjectURL()` after use.
4. **Small PRs** — one feature/fix per PR, include before/after screenshots for UI changes.

## Feature requests & bugs

Use GitHub Issues (bug report / feature request templates). For large features, open a Discussion or Issue first.
