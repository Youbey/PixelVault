# AGENTS.md

PixelVault — privacy-first media converter. Everything runs client-side in the browser (Canvas + WebCodecs via `mediabunny`); there is no backend. Single package, not a monorepo.

## Commands (npm, Node 22+)

```bash
npm ci                  # install; use ci, not install (lockfile committed)
npm run dev              # vite dev server -> http://localhost:3000/PixelVault/ (port 3000 strict)
npm run typecheck        # tsc --noEmit
npm run lint             # eslint .   (no --fix)
npm run format:check     # prettier --check .
npm run format           # prettier --write .
npm run build            # vite build -> dist/
```

Verification order matches CI exactly (`.github/workflows/ci.yml`): `format:check -> lint -> typecheck -> build`. Run all four before pushing.

**There is no test suite** — no test script, no framework, no `*.test.*` files. Verification is the four gates above plus manual dev-server checks.

## Workflow (enforced)

- `main` is protected: branch as `feat/` | `fix/` | `chore/`, small PRs, squash-merge (see `CONTRIBUTING.md`).
- Commits must be Conventional Commits (`feat:`, `fix:`, `chore:`...) — commitlint runs in `.husky/commit-msg` and CI.
- Husky pre-commit runs `lint-staged` (eslint `--fix` + prettier on staged files) — hooks auto-fix style on commit.
- Husky hooks fall back to a throwaway Podman `node:22-alpine` container if host Node is missing.

## Architecture

- Entry: `index.html` -> `src/main.tsx` -> `src/App.tsx`. `App.tsx` (~590 lines) holds **all** app state; no router, no state library, no context providers.
- Import direction is strict: `App -> {components, hooks} -> {types, utils}`. `src/types.ts` and `src/utils/media.ts` are leaf modules.
  - **Components are presentational and never import from `src/hooks/`** — hooks are wired to components as props in `App.tsx` only.
  - No path aliases in `tsconfig.json` — relative imports only.
- New features generally land as: state/orchestration in `App.tsx` + a presentational component + (if needed) a hook. Don't introduce a state library or new top-level folder structure.
- `src/types.ts` contains runtime code too (`supportsVideoConversion()` feature-detects WebCodecs) — not types-only.
- `src/hooks/useVideoProcessor.ts` lazy-loads the runtime lib via `await import('mediabunny')` (top-level import is `import type`); keep that pattern.
- Transcription: `src/workers/asr.worker.ts` (module worker) + `src/hooks/useTranscriber.ts` + `src/hooks/useRecorder.ts` + `src/components/TranscriptPanel.tsx`. Parallel to (never entangled with) the `MediaFile` convert pipeline; `TranscriptItem` state lives in `App.tsx`.
- `vite.config.js` sets `worker: { format: 'es' }` — required for the ESM transformers.js worker bundle; do not remove.
- Whisper model weights (~45 MB, `whisper-tiny.en` q8) are **committed first-party** under `public/models/whisper-tiny.en/` and served like any app asset. In `src/workers/asr.worker.ts`, `env.allowRemoteModels = false` + `env.allowLocalModels = true` + absolute `localModelPath` are a **privacy invariant — never remove or weaken them** (transformers.js otherwise falls back to fetching from Hugging Face).
- onnxruntime-web comes ONLY transitively via `@huggingface/transformers` (exact pin) — do not add a direct dependency (version mismatch breaks its wasm assets). `env.backends.onnx.wasm.wasmPaths` points at locally `?url`-imported **asyncify** `.wasm/.mjs` assets (the `onnxruntime-web/webgpu` build transformers loads resolves the asyncify pair, not jsep) and `numThreads = 1` (GitHub Pages cannot set COOP/COEP → no SharedArrayBuffer → no threaded WASM). Mutate the shared `wasm` object in place — replacing it never reaches the real ort env. NEVER load ort wasm from a CDN.
- Audio prep runs on the MAIN thread (Web Audio is unavailable in workers): `decodeAudioData` + `OfflineAudioContext` 16 kHz mono first, mediabunny `Conversion → WavOutputFormat` fallback; only PCM crosses into the worker (transferred, not copied).
- Tailwind 4 via `@tailwindcss/vite`; styles in `src/index.css` (v4 syntax). Dark mode = `.dark` class on `<html>`.

## Gotchas

- **Privacy invariant** (project's core promise): never add network uploads, tracking, or analytics. All processing must stay in the browser.
  - Transcription's model weights ship **with the app** (`public/models/whisper-tiny.en/`, first-party, committed) — users' browsers load them from this site exactly like the JS bundle. No runtime third-party requests are permitted, not even small ones. If weights are ever upgraded, replace the committed files; never switch to a runtime Hugging Face download.
- Always `URL.revokeObjectURL()` object URLs when done — the codebase does this consistently; preserve it when touching file handling.
- `vite.config.js` sets `base: '/PixelVault/'` (GitHub Pages subpath) — dev URL includes the subpath.
- `dist/` is build output (gitignored) — never edit; regenerate with `npm run build`.
- Push to `main` auto-deploys to GitHub Pages (`.github/workflows/gh-pages.yml`).
- `.zcode/plans/` holds prior-agent implementation plans (gitignored, local-only). They can be stale — verify every claim against the code before acting.
