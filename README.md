# PixelVault — Privacy-First Media Converter

**Zero-knowledge media processing. All conversion happens locally in your browser. Your files never leave your device.**

## Overview

PixelVault is a privacy-first media conversion tool to convert, compress, and optimize images and videos locally in your browser (Canvas API + WebCodecs, no server uploads).

**Current state:** Image Suite MVP + video conversion (Phase 2a) + speech-to-text transcription (Phase 2c) — conversion, compression, resize, batch processing, before/after comparison, in-browser transcription.

## Key Features

- **100% local processing** — no server uploads, no tracking, no analytics.
- **Format conversion** — JPG / PNG / WebP for images; MP4 (H.264) / WebM (VP9) for videos.
- **Compression** — adjustable quality, up to ~80% size reduction.
- **Resize** — custom dimensions, aspect-ratio lock, quick presets (images) and 1080p/720p/480p scale presets (videos).
- **Batch processing** — convert many files (images and videos mixed), download individually or all.
- **Video conversion** — GPU-accelerated via WebCodecs (hardware encoders with automatic software fallback), live per-file progress, cancel anytime.
- **Before/after comparison** — slider preview + savings stats.
- **Speech-to-text** — transcribe audio/video files or mic recordings entirely in your browser (Whisper tiny.en, English). The ~45 MB model ships with PixelVault itself — no third-party requests, ever, and it loads automatically when you add media; copy or export .txt/.srt with timestamps.

## Technology Stack

| Component       | Version  | Notes                                        |
| --------------- | -------- | -------------------------------------------- |
| React           | ^18.2.0  |                                              |
| TypeScript      | ^5.7.0   |                                              |
| Vite            | ^6.3.5   |                                              |
| Tailwind CSS    | ^4.1.7   |                                              |
| Mediabunny      | ^1.61.4  | Video conversion engine (WebCodecs, bundled) |
| Transformers.js | ^4.3.1   | Whisper inference (local wasm, no CDN)       |
| Lucide React    | ^0.294.0 |                                              |
| UUID            | ^11.0.0  |                                              |

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
│   ├── components/      # TopBar, DropZone, Filmstrip, Logo, SettingsPanel,
│   │                    # VideoSettingsPanel, ComparisonSlider
│   ├── hooks/           # useImageProcessor, useVideoProcessor
│   ├── utils/media.ts
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

- No tracking, no analytics. Your files, recordings, and transcripts never leave your device.
- No server communication: the app makes no requests beyond loading PixelVault itself. The
  Whisper speech-model weights (~45 MB) ship with the app as first-party assets served from
  this site — nothing is ever fetched from Hugging Face, a CDN, or any other third party.
- Everything runs in this browser tab; object URLs revoked after use.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Feature requests and bugs via GitHub Issues. Run `npm run typecheck` before pushing.

## Roadmap

- Phase 1 (done): JPG/PNG/WebP convert, resize/crop, compress.
- Phase 2a (this release): video convert/compress/scale (MP4/WebM in → MP4/WebM out, MOV/MKV accepted).
- Phase 2b (next): video/audio trim + audio conversion (WAV/MP3).
- Phase 2c (this release): in-browser speech-to-text transcription (Whisper tiny.en, English) — model bundled with the app, zero third-party requests.
- Phase 3 (later): PDF merge/split, enhancements.

## Browser Support

Chrome 90+, Firefox 88+, Safari 14+, Edge 90+. Mobile: Chrome on Android, Safari on iOS.

Video conversion additionally needs the WebCodecs API: Chrome 94+, Safari 16.4+, Firefox 130+ (image features keep the wider range above).

Transcription needs WebAssembly (all listed browsers) and is dramatically faster with WebGPU (Chrome/Edge); Firefox/Safari fall back to single-threaded WASM — expect slower transcription. Best on desktop.

## License

[MIT License](LICENSE) — Copyright (c) 2026 Youbey.

## Contact

- GitHub: [Youbey](https://github.com/Youbey)
- Email: ayoub_bendraou@outlook.fr

## Acknowledgments

- [React](https://react.dev/) · [Vite](https://vite.dev/) · [Tailwind CSS](https://tailwindcss.com/) · [Lucide](https://lucide.dev/)
