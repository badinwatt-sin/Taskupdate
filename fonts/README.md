# Fonts

- `SourceSansPro-*.ttf` (Light, Regular, Semibold, Bold, Black) — Source Sans Pro by Adobe, licensed under the SIL Open Font License 1.1 (https://scripts.sil.org/OFL). Free to bundle and serve. Used for Latin text in the calendar export and the CI Poster.
- **Publico** (brand headline font, Commercial Type) and **DB Helvethaica X** (brand Thai font, DB Fonts) are commercial and are intentionally **not** stored here: this repository is public, and the Publico EULA limits use to internal business use and forbids copying the font files.
  The app uses them only when installed on the viewer's computer (`local()` / system font stack). Otherwise Thai falls back to IBM Plex Sans Thai and Latin headlines to the sans stack.
  To bundle them, first confirm that the company licence covers web embedding, and keep the files out of this public repo (for example, served only to signed-in users).
