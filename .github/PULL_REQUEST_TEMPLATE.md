## What / why

## How to test (throwaway Podman)

```bash
podman run --rm -it -p 3000:3000 -v ./:/app:z -w /app docker.io/node:22-alpine sh -c "npm ci && npm run dev -- --host 0.0.0.0 --port 3000"
```

## Checklist

- [ ] Branch named `feat/*`, `fix/*`, or `chore/*` off `main`
- [ ] Commits follow Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `ci:`)
- [ ] Pre-commit hooks pass (`npx lint-staged`, commitlint)
- [ ] `npm run format:check` passes
- [ ] `npm run lint` passes
- [ ] `npm run typecheck` passes
- [ ] `npm run build` passes
- [ ] No network uploads / tracking added
- [ ] Screenshots for UI changes (if any)
