# giftcard-design

Gift card design / print layout app built with Angular (with SSR support).

## Requirements

- Node.js 20+ (recommended: latest Node 20 LTS)
- npm (comes with Node.js)

## Install

```bash
npm install
```

## Run (development)

Starts Angular dev server:

```bash
npm start
```

Then open:

- http://localhost:4200/

## Build

Creates production build output in `dist/`:

```bash
npm run build
```

## SSR (serve the built app)

This project includes an Express SSR server (`src/server.ts`). After building, you can run:

```bash
npm run build
npm run serve:ssr:giftcard-design
```

Then open:

- http://localhost:4000/

## Tests

```bash
npm test
```

## Useful npm scripts

- `npm start` - dev server
- `npm run build` - production build
- `npm run watch` - build in watch mode
- `npm test` - unit tests
- `npm run serve:ssr:giftcard-design` - run the built SSR server

## Firebase Hosting (optional)

This repo contains Firebase Hosting configuration in `firebase.json`.

High-level flow:

```bash
npm run build
firebase login
firebase deploy
```

Notes:

- Hosting `public` is set to `dist/giftcard-design/browser`.
- The local Firebase CLI state folder `.firebase/` is intentionally ignored by git.

## Project structure

- `src/app/` - app UI and logic
- `src/assets/` - static assets (fonts, images, etc.)
- `src/styles.scss` - global styles
- `src/server.ts` - Express SSR server entry
