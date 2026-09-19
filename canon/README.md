# canon/ — the physics field

The committed canon the machine is built on. The AntiStrauss gate and the
organs do not carry their grounds as English strings — they carry byte
anchors into these files, and `native/the-fold/canon-ground.mjs` reads those
bytes at load, verifies each file's sha256, cuts each mechanic's span plus
the window around it, and binds the ground digest to the canon.

The index is `../antistrauss-physics.txt` (the `AntiStraussPhysics@1` spec):
it names every file here and every mechanic grounded on it.

## Provenance convention

Each source file has a `<file>.provenance.json` sidecar: `{ title, language,
url, note, license, sha256, chars }`. The sha256 must match the file's own
bytes — `native/conformance/canon-ground.test.mjs` verifies it. This is the
same convention eo-teachings uses (`snip.mjs check`); Kondo's name-scan does
not see it, and that is fine — the conformance test is the reader.

## The rule

A canon file is the ground, not a citation. Change it and the ground digest
moves; a hot process whose laws no longer match the ground refuses closed
(ungrounded) rather than running ungoverned. Delete a canon file and the
gate refuses every call — there is no fallback that silently ungrounds.