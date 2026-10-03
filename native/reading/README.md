# Shared material reading

`readMaterial` is the reader used by `POST /v1/read`. Every language provider
nominates scoped grammar structure under the same contract. The native kernel
perceives, witnesses and folds it into `EOReferent@1`, `EOHyperedge@1` and
`EOMention@1`. The holograph uses that reading log to resolve queries and read
source passages back. No model generation or source-code execution occurs.

| Coverage | Languages |
| --- | --- |
| Received English dependency parser; revisable candidates; rich EOT retained | English |
| Real syntax AST | Python (CPython), JavaScript (Acorn ECMAScript 2025) |
| Expression AST; independently bounded exact rational equality verification | Math |
| Parsed value tree; witnesses cover containing document | JSON |
| Existing declaration recipes only; explicit partial-grammar gap | C, Go, TypeScript, TSX, JSX |
| Received lexical distributions and existing relation organs; explicit partial-grammar gap | French, Turkish, Mandarin, Finnish, Hebrew, Persian, Latin, Ancient Greek, Arabic, Modern Greek, Spanish, Sanskrit, Korean, Russian, Japanese |

Japanese uses the vendored UniMorph prior; other received languages use their
vendored POS prior. Ambiguous word-class distributions remain distributions.
Unattested words remain unattested. Word segmentation and full dependency parsing
are unclaimed in these partial readers. Unknown languages produce
`grammar_unavailable`, without an English fallback.

```js
import {readMaterial} from './material.js';
const reading = await readMaterial({
  text: 'def solve(text):\n    return text.split()\n',
  source: 'model:proposal-1', language: 'python', format: 'raw'
});
```

Equivalent HTTP body:

```json
{"name":"proposal.py","text":"def solve(text):\n    return text.split()\n"}
```

Use `language` with `format: "raw"` for an explicitly declared language. File
extensions infer supported code and JSON formats. Mixed text dispatches fenced
blocks by their language labels, recognizes complete numeric equality lines, and
reads surrounding prose with its declared language (English by default). An
unclosed fence is disclosed and its body still goes to its declared reader.

The result carries `referents`, `tuples` / `relations`, `readingEntries`,
`grammarRecords`, `gaps`, and `supportedLanguages`. The previous constitutional
HOST cast and relations are retained under `host`. This is an API behavior
change: top-level relations now have scoped endpoints and grammar witnesses.

Identity is scoped to source, segment, grammar and node path. Equal spellings
are not an identity proof: a function declaration, its identifier token, another
occurrence, and a function in another source retain distinct addresses. Full
lexical binding is not implemented. Exact grammar surfaces are case-sensitive;
ambiguous queries may resolve multiple occurrences, without merging them.

Witness positions `start` / `end` are JavaScript character indices in the
original source. `utf8Start` / `utf8End` are UTF-8 byte indices relative to the
segment, explicitly marked as such. Every tuple also has an absolute character
address and original source text. Parser annotations may witness a containing
construct rather than a narrower token (Python locationless AST nodes, JSON,
and math). Fences and blank separators belong to the container.

Limits are declared resource budgets: 100,000 characters per grammar segment,
256 segments per read, 5,000 code/JSON/lexical nodes, 500 math nodes, and 256
English tokens per sentence. Exceeding a budget produces a gap. These limits
are not confidence thresholds. The HOST retains the original material.

Syntax standing is separate from verification. Python and JavaScript are never
executed by reading. Numeric equalities use a separate whitelisted rational
verifier for decimal constants, parentheses, unary signs and `+ - * /`; symbols,
function calls and unsupported operations remain unchecked. A witnessed model
claim cannot corroborate itself.

Reproduce the real CPU-output reading and holograph assay:

```sh
node native/eval/grammar-model-output.mjs
node --test native/tests/grammar-reading.test.js native/tests/read-door.test.js
```
