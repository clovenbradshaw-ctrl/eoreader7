# eoreader6.1 — retired, pointer only

EOReader 7 began from the frozen EOReader 6.1 snapshot at commit
`e20e441d3cdfb735d605c75037e6d73892e707c0`. The `legacy-eoreader6.1`
submodule and the root compatibility symlinks that exposed its historical
paths are **retired** (2026-09-15). They are not part of the v7 loading
path.

The frozen 6.1 checkout still exists at its own repository:

```
https://github.com/clovenbradshaw-ctrl/eoreader6.1.git
```

Clone it beside this repo if you need the historical `packages/engine` /
`packages/host` / `nul` surface:

```sh
git clone https://github.com/clovenbradshaw-ctrl/eoreader6.1.git eoreader6.1
```

Consumers that still import `../eoreader7/legacy-eoreader6.1/...` or the
old root paths (`packages/`, `nul/`, `frame/`, `cascade/`, ...) must
migrate to eoreader7's native `kernel.js` / `native/` surface. That
migration is the owning consumer's pass; this pointer is the replacement,
not the migration.

The canonical pairing: **the fold is a surface on eoreader7.** the-fold
depends on eoreader7; eoreader7 does not depend on the fold. Cloning
either repo from GitHub provides the pair — the-fold's README `./fold`
quickstart clones its sibling repos, and the fold's imports resolve
`../eoreader7/native/` and `../eoreader7/kernel.js`.