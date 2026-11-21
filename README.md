# Two of a Kind

A spot-the-difference game. Two near-identical procedurally drawn garden scenes sit
side by side; click the differences in either picture. Five to eight differences per
level, three levels, a counter of how many remain, and a marker drawn on every find.

Play it:

```
node serve.ts      # then open http://localhost:8080
```

Everything is static — `game/index.html` plus ES modules under `game/src/`. No build
step, no network requests, no dependencies.

## Files

- `game/` — the playable game (static files)
- `screenshots/` — real renders of the game's own code
- `main.ts` — hands the game and screenshots to the grader, writes `dossier.json`
- `vendor/makefun-game.ts` — the make.fun dossier builder, unchanged from the kit

## License

MIT — see LICENSE.
