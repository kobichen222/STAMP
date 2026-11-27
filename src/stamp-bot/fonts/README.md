# Fonts

Heebo and Frank Ruhl Libre, static weights (Regular / Bold / Black), Hebrew + Latin, from Google Fonts.
Both are licensed under the SIL Open Font License 1.1 - https://openfontlicense.org

`glyphs.ts` reads these files and draws the stamp text as outlines.
To add a font: drop `<Name>-Regular.ttf`, `<Name>-Bold.ttf`, `<Name>-Black.ttf` here and add it to `FILES` in `glyphs.ts`, to `Family` in `kinds.ts` and to `font` in `spec.ts` and `prompt.ts`.
