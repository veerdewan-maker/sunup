# Sunup

A workout and nutrition app that installs to your phone's home screen. Pick a goal, get a weekly lifting plan for the equipment you have, log sets and reps, track calories and macros, and watch your progress.

- Works offline once opened (it is a PWA).
- All data stays on your device (IndexedDB). Use Settings → Backup to save or restore a backup file.
- Food search and barcode lookup use [Open Food Facts](https://openfoodfacts.org) (free, no key).
- No accounts, no server, nothing that costs money.

## Develop

```
npm install
npm run dev        # local dev server
npm test           # logic tests
npm run build      # production build in dist/
```

End-to-end phone walkthrough (needs Playwright installed): `npx vite preview --port 4173` then `node scripts/e2e.cjs`.

Pushing to `main` builds and publishes the app to GitHub Pages.
