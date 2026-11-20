# Contributing

Thanks for helping! Bug reports, accuracy fixes, accessibility fixes and
translations are all welcome.

## Ground rules

- **Audio stays on the device.** No analytics, ads, accounts, network calls
  or third-party SDKs that phone home. The microphone is used for pitch and
  nothing else.
- **Usable with a guitar in your hands.** Big touch targets, and a readout
  you can see from arm's length on a music stand.
- **Measure against the chosen string.** The tuner tells you how far you are
  from the string you picked, never just the nearest note.

## Making a change

1. Fork, then branch from `main`.
2. `npm install`, then `npm run dev` and tune a real guitar as you work.
3. Add or update tests next to the code (`*.test.ts`) for anything in
   `src/lib/`. `npm test` must pass.
4. Open a pull request. CI tests it and builds Android and iOS apps you can
   download from the run to try it on a device.

### Pitch detection

`src/lib/pitch.test.ts` synthesizes plucked-string tones (with a loud second
harmonic, like a real guitar) and checks every string is found within a
cent. If you change the detector, keep those passing, and if you find a real
recording it gets wrong, a test that reproduces it is the most useful bug
report there is.

### Changing the icon or splash screen

Edit `resources/icon.svg`, re-render `resources/icon-only.png`,
`resources/splash.png` and the PNGs in `public/` from it, then run
`npm run assets` to regenerate every Android and iOS size.
