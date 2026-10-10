# Contributing to PixelVault

Thanks for your interest in contributing! PixelVault is privacy-first: all processing stays in the browser.

## Quick start (no host Node required)

```bash
# Throwaway Podman test — nothing installed on your laptop
podman run --rm -it -p 3000:3000 -v ./:/app:z -w /app docker.io/node:22-alpine sh -c "npm ci && npm run dev -- --host 0.0.0.0 --port 3000"
# open http://localhost:3000, Ctrl-C to stop (container is auto-removed)
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
