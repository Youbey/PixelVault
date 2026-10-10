# PixelVault — Privacy-First Media Converter

**Zero-knowledge image processing. All conversion happens locally in your browser. Your files never leave your device.**

## Overview

PixelVault is a privacy-first image conversion tool to convert, compress, and optimize images locally in your browser (Canvas API, no server uploads).

**Current state:** Image Suite MVP — conversion, compression, resize, batch processing, before/after comparison.

## Key Features

- **100% local processing** — no server uploads, no tracking, no analytics.
- **Format conversion** — JPG / PNG / WebP.
- **Compression** — adjustable quality, up to ~80% size reduction.
- **Resize** — custom dimensions, aspect-ratio lock, quick presets.
- **Batch processing** — convert many images, download individually or all.
- **Before/after comparison** — slider preview + savings stats.

## Technology Stack

| Component    | Version  |
| ------------ | -------- |
| React        | ^18.2.0  |
| TypeScript   | ^5.7.0   |
| Vite         | ^6.3.5   |
| Tailwind CSS | ^4.1.7   |
| Lucide React | ^0.294.0 |
| UUID         | ^9.0.1   |

## Live Demo

[Try it now](https://youbey.github.io/PixelVault/)

## Installation

Requires Node 22+ **or** Podman (no host Node needed).

```bash
git clone https://github.com/Youbey/PixelVault.git
cd PixelVault
```

With local Node:

```bash
npm ci
npm run dev      # http://localhost:3000
npm run build    # -> dist/
```

Throwaway Podman (nothing installed on your laptop, container auto-removed):

```bash
podman run --rm -it -p 3000:3000 -v ./:/app:z -w /app docker.io/node:22-alpine sh -c "npm ci && npm run dev -- --host 0.0.0.0 --port 3000"
# open http://localhost:3000, Ctrl-C to stop
```

Or via the committed `Containerfile`:

```bash
podman build -t pixelvault:throwaway -f Containerfile .
podman run --rm -it -p 3000:3000 pixelvault:throwaway
podman rmi pixelvault:throwaway
```

## Usage

1. Upload images (drag & drop or browse).
2. Choose format, quality, dimensions.
3. Click Convert.
4. Download individually or Download All.

## Project Architecture

```
PixelVault/
├── .github/workflows/   # ci.yml (PRs) + gh-pages.yml (deploy)
├── public/favicon.svg
├── src/
│   ├── components/      # Header, DropZone, SettingsPanel, ComparisonSlider, BatchList
│   ├── hooks/useImageProcessor.ts
│   ├── App.tsx
│   ├── main.tsx
│   ├── index.css
│   └── types.ts
├── index.html
├── Containerfile
├── package.json
└── vite.config.js
```

Processing flow: Browser → React UI → Canvas API (local) → Blob → Download. Nothing leaves the device.

## Scripts

| Script              | Description              |
| ------------------- | ------------------------ |
| `npm run dev`       | Start development server |
| `npm run build`     | Build for production     |
| `npm run typecheck` | TypeScript type checking |

## Deployment (GitHub Pages)

Deploys automatically on push to `main` via `.github/workflows/gh-pages.yml` (Node 22, `npm ci`, typecheck, build, `deploy-pages`).

Setup once in GitHub: Settings → Pages → Source: **GitHub Actions**. Site: `https://youbey.github.io/PixelVault/`.

`vite.config.js` uses `base: '/PixelVault/'` so assets resolve under the project subpath.

## Privacy Policy

- No tracking, no analytics, no server communication.
- Only conversion state in memory; object URLs revoked after use.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Feature requests and bugs via GitHub Issues. Run `npm run typecheck` before pushing.

## Roadmap

- Phase 1 (done): JPG/PNG/WebP convert, resize/crop, compress.
- Phase 2 (next): video/audio trim + convert (MP4/MOV, WAV/MP3).
- Phase 3 (later): PDF merge/split, enhancements.

## Browser Support

Chrome 90+, Firefox 88+, Safari 14+, Edge 90+. Mobile: Chrome on Android, Safari on iOS.

## License

[MIT License](LICENSE) — Copyright (c) 2026 Youbey.

## Contact

- GitHub: [Youbey](https://github.com/Youbey)
- Email: ayoub_bendraou@outlook.fr

## Acknowledgments

- [React](https://react.dev/) · [Vite](https://vite.dev/) · [Tailwind CSS](https://tailwindcss.com/) · [Lucide](https://lucide.dev/)
