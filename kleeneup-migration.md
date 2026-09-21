# kleeneUp migration plan

The 749 migratable regexes below FIND. Each becomes a needle set measured at byte addresses (native/kernel/kleene-up.js). Worked example: native/organs/verbatim-snip.js (2026-09-21).

- `cli/proxy-client.mjs:108` — `hang`/i
  `findNeedles(field, ["hang"], ci: true)` — measured, never matched; absence is a result.
- `cli/tests/github-login.test.mjs:67` — `access_denied`
  `findNeedles(field, ["access_denied"])` — measured, never matched; absence is a result.
- `cli/tests/holograph.test.mjs:40` — `The Poles shouted Vivat across the water\.`
  `findNeedles(field, ["The Poles shouted Vivat across the water."])` — measured, never matched; absence is a result.
- `cli/tests/holograph.test.mjs:75` — `not an EOHolographOutput@1`
  `findNeedles(field, ["not an EOHolographOutput@1"])` — measured, never matched; absence is a result.
- `cli/tests/matrix-login.test.mjs:58` — `Invalid password`
  `findNeedles(field, ["Invalid password"])` — measured, never matched; absence is a result.
- `cli/tests/proxy-client-stream.test.mjs:105` — `bad model name`
  `findNeedles(field, ["bad model name"])` — measured, never matched; absence is a result.
- `cli/tests/proxy-client.test.mjs:130` — `busy`
  `findNeedles(field, ["busy"])` — measured, never matched; absence is a result.
- `cli/tests/proxy-client.test.mjs:139` — `bad model name`
  `findNeedles(field, ["bad model name"])` — measured, never matched; absence is a result.
- `cli/tests/tui.e2e.test.mjs:41` — `PASS`
  `findNeedles(field, ["PASS"])` — measured, never matched; absence is a result.
- `content-rules.test.mjs:32` — `concedes`
  `findNeedles(field, ["concedes"])` — measured, never matched; absence is a result.
- `heimdall.mjs:168` — `hang`/i
  `findNeedles(field, ["hang"], ci: true)` — measured, never matched; absence is a result.
- `heimdall.mjs:990` — `ollama|llama-server`/i
  `findNeedles(field, ["ollama", "llama-server"], ci: true)` — measured, never matched; absence is a result.
- `heimdall.mjs:990` — `pgrep|grep `
  `findNeedles(field, ["pgrep", "grep "])` — measured, never matched; absence is a result.
- `heimdall.mjs:1566` — `llama-server\b`
  `findNeedles(field, ["llama-server"])` — measured, never matched; absence is a result.
- `heimdall.mjs:1752` — `WindowServer|kernel_task|launchd|loginwindow|\bDock\b|Finder|SystemUIServer|ControlCenter|NotificationCenter|coreaudiod|bluetoothd|ollama serve|llama-server|Ollama\.app|Brave Browser|Google Chrome|Chromium|Safari|Firefox|Microsoft Edge|Arc|Comet|Chrome Helper|WebKit|WebContent|\bnode\b|opencode|OpenCode|\bCode Helper\b|electron\.app`/i
  `findNeedles(field, ["WindowServer", "kernel_task", "launchd", "loginwindow", "Dock", "Finder", "SystemUIServer", "ControlCenter", "NotificationCenter", "coreaudiod", "bluetoothd", "ollama serve", "llama-server", "Ollama.app", "Brave Browser", "Google Chrome", "Chromium", "Safari", "Firefox", "Microsoft Edge", "Arc", "Comet", "Chrome Helper", "WebKit", "WebContent", "node", "opencode", "OpenCode", "Code Helper", "electron.app"], ci: true)` — measured, never matched; absence is a result.
- `heimdall.mjs:2416` — `conced|answered`/i
  `findNeedles(field, ["conced", "answered"], ci: true)` — measured, never matched; absence is a result.
- `heimdall.mjs:2625` — `Ollama\.app\/Contents\/Resources\/ollama serve|llama-server`/i
  `findNeedles(field, ["Ollama.app/Contents/Resources/ollama serve", "llama-server"], ci: true)` — measured, never matched; absence is a result.
- `heimdall.mjs:2646` — `api`/tags
  `findNeedles(field, ["api"])` — measured, never matched; absence is a result.
- `native/heimdall/falsify-fixed.test.mjs:60` — `should we terminate er7`
  `findNeedles(field, ["should we terminate er7"])` — measured, never matched; absence is a result.
- `native/heimdall/falsify-fixed.test.mjs:94` — `saturated`
  `findNeedles(field, ["saturated"])` — measured, never matched; absence is a result.
- `native/heimdall/fleet.test.mjs:47` — `should we terminate`
  `findNeedles(field, ["should we terminate"])` — measured, never matched; absence is a result.
- `native/heimdall/fleet.test.mjs:127` — `should we terminate fleet3`
  `findNeedles(field, ["should we terminate fleet3"])` — measured, never matched; absence is a result.
- `native/heimdall/peer-mesh.test.mjs:22` — `should we terminate er7\?`
  `findNeedles(field, ["should we terminate er7?"])` — measured, never matched; absence is a result.
- `native/kernel/antimatter.js:96` — `\|`/g
  `findNeedles(field, ["|"])` — measured, never matched; absence is a result.
- `native/kernel/antimatter.js:96` — `—`/g
  `findNeedles(field, ["—"])` — measured, never matched; absence is a result.
- `native/kernel/discovery.test.mjs:42` — `the moment of no return`
  `findNeedles(field, ["the moment of no return"])` — measured, never matched; absence is a result.
- `native/kernel/discovery.test.mjs:43` — `rise-fall`
  `findNeedles(field, ["rise-fall"])` — measured, never matched; absence is a result.
- `native/kernel/discovery.test.mjs:77` — `What is the moment of no return, and how does it relate to the river\?`
  `findNeedles(field, ["What is the moment of no return, and how does it relate to the river?"])` — measured, never matched; absence is a result.
- `native/kernel/discovery.test.mjs:78` — `die stille danach`
  `findNeedles(field, ["die stille danach"])` — measured, never matched; absence is a result.
- `native/kernel/discovery.test.mjs:84` — `register's own staging stands`
  `findNeedles(field, ["register's own staging stands"])` — measured, never matched; absence is a result.
- `native/kernel/foreclosing-kinds.js:77` — `\bbom\b`/iu
  `findNeedles(field, ["bom"], ci: true)` — measured, never matched; absence is a result.
- `native/kernel/foreclosing-kinds.js:78` — `бомб`/iu
  `findNeedles(field, ["бомб"], ci: true)` — measured, never matched; absence is a result.
- `native/kernel/foreclosing-kinds.js:79` — `炸弹`
  `findNeedles(field, ["炸弹"])` — measured, never matched; absence is a result.
- `native/kernel/foreclosing-kinds.js:80` — `爆弾`
  `findNeedles(field, ["爆弾"])` — measured, never matched; absence is a result.
- `native/kernel/foreclosing-kinds.js:81` — `폭탄`
  `findNeedles(field, ["폭탄"])` — measured, never matched; absence is a result.
- `native/kernel/foreclosing-kinds.js:82` — `قنبلة`
  `findNeedles(field, ["قنبلة"])` — measured, never matched; absence is a result.
- `native/kernel/foreclosing-kinds.js:83` — `بمب`
  `findNeedles(field, ["بمب"])` — measured, never matched; absence is a result.
- `native/kernel/foreclosing-kinds.js:84` — `बम`
  `findNeedles(field, ["बम"])` — measured, never matched; absence is a result.
- `native/kernel/foreclosing-kinds.js:85` — `ระเบิด`
  `findNeedles(field, ["ระเบิด"])` — measured, never matched; absence is a result.
- `native/kernel/foreclosing-kinds.js:86` — `βόμβ`/iu
  `findNeedles(field, ["βόμβ"], ci: true)` — measured, never matched; absence is a result.
- `native/kernel/register.js:48` — `\.py\b|python|python3`/i
  `findNeedles(field, [".py", "python", "python3"], ci: true)` — measured, never matched; absence is a result.
- `native/kernel/register.js:51` — `\.sh\b|bash|shell|zsh`/i
  `findNeedles(field, [".sh", "bash", "shell", "zsh"], ci: true)` — measured, never matched; absence is a result.
- `native/kernel/register.js:52` — `\.go\b|golang`/i
  `findNeedles(field, [".go", "golang"], ci: true)` — measured, never matched; absence is a result.
- `native/kernel/register.js:53` — `\.rs\b|rust`/i
  `findNeedles(field, [".rs", "rust"], ci: true)` — measured, never matched; absence is a result.
- `native/kernel/register.js:54` — `\.css\b|css`/i
  `findNeedles(field, [".css", "css"], ci: true)` — measured, never matched; absence is a result.
- `native/kernel/register.js:100` — `image|picture|photo|painting|drawing|visual`/i
  `findNeedles(field, ["image", "picture", "photo", "painting", "drawing", "visual"], ci: true)` — measured, never matched; absence is a result.
- `native/kernel/register.js:101` — `video|film|footage|shot`/i
  `findNeedles(field, ["video", "film", "footage", "shot"], ci: true)` — measured, never matched; absence is a result.
- `native/kernel/register.js:102` — `audio|recording|sound`/i
  `findNeedles(field, ["audio", "recording", "sound"], ci: true)` — measured, never matched; absence is a result.
- `native/kernel/register.js:114` — `children|kids|child`/i
  `findNeedles(field, ["children", "kids", "child"], ci: true)` — measured, never matched; absence is a result.
- `native/kernel/register.js:115` — `expert|professional|specialist`/i
  `findNeedles(field, ["expert", "professional", "specialist"], ci: true)` — measured, never matched; absence is a result.
- `native/kernel/register.js:116` — `lay|general|everyone|public`/i
  `findNeedles(field, ["lay", "general", "everyone", "public"], ci: true)` — measured, never matched; absence is a result.
- `native/organs/aliases.test.mjs:60` — `minUses is declared`
  `findNeedles(field, ["minUses is declared"])` — measured, never matched; absence is a result.
- `native/organs/aliases.test.mjs:61` — `splitSentences is injected`
  `findNeedles(field, ["splitSentences is injected"])` — measured, never matched; absence is a result.
- `native/organs/aliases.test.mjs:62` — `shapes are received`
  `findNeedles(field, ["shapes are received"])` — measured, never matched; absence is a result.
- `native/organs/aliases.test.mjs:63` — `AliasDeclarationPrior@1 is received`
  `findNeedles(field, ["AliasDeclarationPrior@1 is received"])` — measured, never matched; absence is a result.
- `native/organs/aliases.test.mjs:64` — `declared by the caller`
  `findNeedles(field, ["declared by the caller"])` — measured, never matched; absence is a result.
- `native/organs/asserted.test.mjs:86` — `stated once`
  `findNeedles(field, ["stated once"])` — measured, never matched; absence is a result.
- `native/organs/asserted.test.mjs:92` — `stated 3 times`
  `findNeedles(field, ["stated 3 times"])` — measured, never matched; absence is a result.
- `native/organs/asserted.test.mjs:93` — `2 of 20`
  `findNeedles(field, ["2 of 20"])` — measured, never matched; absence is a result.
- `native/organs/asserted.test.mjs:94` — `%`
  `findNeedles(field, ["%"])` — measured, never matched; absence is a result.
- `native/organs/binding-transfer.test.mjs:110` — `Hamlin`
  `findNeedles(field, ["Hamlin"])` — measured, never matched; absence is a result.
- `native/organs/binding-transfer.test.mjs:158` — `import \{ bind, BINDING_CORE_REFUSALS as REFUSALS \} from "\.\/index\.js"`/g
  `findNeedles(field, ["import { bind, BINDING_CORE_REFUSALS as REFUSALS } from \"./index.js\""])` — measured, never matched; absence is a result.
- `native/organs/bridge-witness.test.mjs:80` — `"Smith"`
  `findNeedles(field, ["\"Smith\""])` — measured, never matched; absence is a result.
- `native/organs/bridge-witness.test.mjs:81` — `"Sir John Smith"`
  `findNeedles(field, ["\"Sir John Smith\""])` — measured, never matched; absence is a result.
- `native/organs/bridge-witness.test.mjs:82` — `SAME real-world`
  `findNeedles(field, ["SAME real-world"])` — measured, never matched; absence is a result.
- `native/organs/bridge-witness.test.mjs:84` — `1\. Sir John Smith chaired it\.`
  `findNeedles(field, ["1. Sir John Smith chaired it."])` — measured, never matched; absence is a result.
- `native/organs/bridge-witness.test.mjs:130` — `selectAsk is injected`
  `findNeedles(field, ["selectAsk is injected"])` — measured, never matched; absence is a result.
- `native/organs/bridge-witness.test.mjs:162` — `refer to different things`
  `findNeedles(field, ["refer to different things"])` — measured, never matched; absence is a result.
- `native/organs/bridge-witness.test.mjs:221` — `maxAsks is declared`
  `findNeedles(field, ["maxAsks is declared"])` — measured, never matched; absence is a result.
- `native/organs/bridges.test.mjs:48` — `basis: identity-organ`
  `findNeedles(field, ["basis: identity-organ"])` — measured, never matched; absence is a result.
- `native/organs/build-clarify.test.mjs:103` — `moved nothing|closed ground`
  `findNeedles(field, ["moved nothing", "closed ground"])` — measured, never matched; absence is a result.
- `native/organs/build-clarify.test.mjs:113` — `budget`
  `findNeedles(field, ["budget"])` — measured, never matched; absence is a result.
- `native/organs/build-clarify.test.mjs:152` — `from "\.\/ethos|from "\.\/askshape|from "\.\/reasoning-lint|from "\.\/pathos`
  `findNeedles(field, ["from \"./ethos", "from \"./askshape", "from \"./reasoning-lint", "from \"./pathos"])` — measured, never matched; absence is a result.
- `native/organs/case-marked-relations.test.mjs:35` — `splitSentences is injected`
  `findNeedles(field, ["splitSentences is injected"])` — measured, never matched; absence is a result.
- `native/organs/case-marked-relations.test.mjs:36` — `extractCaseMarkedRelation is injected`
  `findNeedles(field, ["extractCaseMarkedRelation is injected"])` — measured, never matched; absence is a result.
- `native/organs/cast.test.mjs:43` — `Mesoten`
  `findNeedles(field, ["Mesoten"])` — measured, never matched; absence is a result.
- `native/organs/cast.test.mjs:60` — `SPURIOUS|Debris`
  `findNeedles(field, ["SPURIOUS", "Debris"])` — measured, never matched; absence is a result.
- `native/organs/cast.test.mjs:61` — `Napoleon`
  `findNeedles(field, ["Napoleon"])` — measured, never matched; absence is a result.
- `native/organs/cast.test.mjs:64` — `SPURIOUS|Debris`
  `findNeedles(field, ["SPURIOUS", "Debris"])` — measured, never matched; absence is a result.
- `native/organs/cast.test.mjs:71` — `SPURIOUS|Debris`
  `findNeedles(field, ["SPURIOUS", "Debris"])` — measured, never matched; absence is a result.
- `native/organs/cast.test.mjs:89` — `Mesoten|DOW\b`
  `findNeedles(field, ["Mesoten", "DOW"])` — measured, never matched; absence is a result.
- `native/organs/cast.test.mjs:92` — `Bagration`
  `findNeedles(field, ["Bagration"])` — measured, never matched; absence is a result.
- `native/organs/cast.test.mjs:92` — `Tolly`
  `findNeedles(field, ["Tolly"])` — measured, never matched; absence is a result.
- `native/organs/cast.test.mjs:93` — `Bagration`
  `findNeedles(field, ["Bagration"])` — measured, never matched; absence is a result.
- `native/organs/cast.test.mjs:93` — `Tolly`
  `findNeedles(field, ["Tolly"])` — measured, never matched; absence is a result.
- `native/organs/cast.test.mjs:94` — `Bagration`
  `findNeedles(field, ["Bagration"])` — measured, never matched; absence is a result.
- `native/organs/cast.test.mjs:140` — `Bezukhov`
  `findNeedles(field, ["Bezukhov"])` — measured, never matched; absence is a result.
- `native/organs/charter.js:165` — `torture|slavery|servitude`/i
  `findNeedles(field, ["torture", "slavery", "servitude"], ci: true)` — measured, never matched; absence is a result.
- `native/organs/charter.js:218` — `shall|should|must|ought|may|can\b|has the right|entitled|right to|prohibited`/i
  `findNeedles(field, ["shall", "should", "must", "ought", "may", "can", "has the right", "entitled", "right to", "prohibited"], ci: true)` — measured, never matched; absence is a result.
- `native/organs/claims.test.mjs:53` — `the web was not reached`
  `findNeedles(field, ["the web was not reached"])` — measured, never matched; absence is a result.
- `native/organs/claims.test.mjs:76` — `one document can't settle it`
  `findNeedles(field, ["one document can't settle it"])` — measured, never matched; absence is a result.
- `native/organs/composed-fixer.js:89` — `\/`/g
  `findNeedles(field, ["/"])` — measured, never matched; absence is a result.
- `native/organs/composed-fixer.test.mjs:81` — `gate-ok`
  `findNeedles(field, ["gate-ok"])` — measured, never matched; absence is a result.
- `native/organs/corroboration.js:346` — `\r\n`/g
  `findNeedles(field, ["rn"])` — measured, never matched; absence is a result.
- `native/organs/corroboration.test.mjs:50` — `Kutuzov`
  `findNeedles(field, ["Kutuzov"])` — measured, never matched; absence is a result.
- `native/organs/corroboration.test.mjs:100` — `declared by the caller`
  `findNeedles(field, ["declared by the caller"])` — measured, never matched; absence is a result.
- `native/organs/corroboration.test.mjs:101` — `injected`
  `findNeedles(field, ["injected"])` — measured, never matched; absence is a result.
- `native/organs/corroboration.test.mjs:102` — `declared by the caller`
  `findNeedles(field, ["declared by the caller"])` — measured, never matched; absence is a result.
- `native/organs/corroboration.test.mjs:248` — `Kutuzov`
  `findNeedles(field, ["Kutuzov"])` — measured, never matched; absence is a result.
- `native/organs/corroboration.test.mjs:249` — `Bagration`
  `findNeedles(field, ["Bagration"])` — measured, never matched; absence is a result.
- `native/organs/corroboration.test.mjs:313` — `fought against the Imperial`
  `findNeedles(field, ["fought against the Imperial"])` — measured, never matched; absence is a result.
- `native/organs/corroboration.test.mjs:328` — `fought against General`
  `findNeedles(field, ["fought against General"])` — measured, never matched; absence is a result.
- `native/organs/corroboration.test.mjs:343` — `Kutuzov`
  `findNeedles(field, ["Kutuzov"])` — measured, never matched; absence is a result.
- `native/organs/corroboration.test.mjs:344` — `Napoleon`
  `findNeedles(field, ["Napoleon"])` — measured, never matched; absence is a result.
- `native/organs/corroboration.test.mjs:386` — `declared by the caller`
  `findNeedles(field, ["declared by the caller"])` — measured, never matched; absence is a result.
- `native/organs/corroboration.test.mjs:420` — `Kutuzov commanded`
  `findNeedles(field, ["Kutuzov commanded"])` — measured, never matched; absence is a result.
- `native/organs/corroboration.test.mjs:530` — `Napoleon faced General Mikhail Kutuzov`
  `findNeedles(field, ["Napoleon faced General Mikhail Kutuzov"])` — measured, never matched; absence is a result.
- `native/organs/corroboration.test.mjs:580` — `declared by the caller`
  `findNeedles(field, ["declared by the caller"])` — measured, never matched; absence is a result.
- `native/organs/corroboration.test.mjs:583` — `again Napoleon pressed Kutuzov hard`
  `findNeedles(field, ["again Napoleon pressed Kutuzov hard"])` — measured, never matched; absence is a result.
- `native/organs/corroboration.test.mjs:597` — `General Kutúzov met Napoleon|General Kutuzov met Napoleon`
  `findNeedles(field, ["General Kutúzov met Napoleon", "General Kutuzov met Napoleon"])` — measured, never matched; absence is a result.
- `native/organs/corroboration.test.mjs:705` — `Marshal Davout`
  `findNeedles(field, ["Marshal Davout"])` — measured, never matched; absence is a result.
- `native/organs/corroboration.test.mjs:733` — `Marshal Davout`
  `findNeedles(field, ["Marshal Davout"])` — measured, never matched; absence is a result.
- `native/organs/corroboration.test.mjs:784` — `Russian army prepared`
  `findNeedles(field, ["Russian army prepared"])` — measured, never matched; absence is a result.
- `native/organs/corroboration.test.mjs:837` — `descent to the lunar surface`
  `findNeedles(field, ["descent to the lunar surface"])` — measured, never matched; absence is a result.
- `native/organs/corroboration.test.mjs:842` — `climbed down the ladder`
  `findNeedles(field, ["climbed down the ladder"])` — measured, never matched; absence is a result.
- `native/organs/corroboration.test.mjs:864` — `fought against General Mikhail Kutuzov`
  `findNeedles(field, ["fought against General Mikhail Kutuzov"])` — measured, never matched; absence is a result.
- `native/organs/corroboration.test.mjs:868` — `Napoleon faced General Mikhail Kutuzov`
  `findNeedles(field, ["Napoleon faced General Mikhail Kutuzov"])` — measured, never matched; absence is a result.
- `native/organs/current-facts.test.mjs:135` — `since 2025-01-20, until 2029-01-20`
  `findNeedles(field, ["since 2025-01-20, until 2029-01-20"])` — measured, never matched; absence is a result.
- `native/organs/current-holder.js:18` — `\bthe\b`/g
  `findNeedles(field, ["the"])` — measured, never matched; absence is a result.
- `native/organs/current-holder.js:54` — `fiction|video game|character`/i
  `findNeedles(field, ["fiction", "video game", "character"], ci: true)` — measured, never matched; absence is a result.
- `native/organs/current-holder.test.mjs:37` — `Wikidata lists Donald Trump as the current President of the United States, since 2025-01-20`
  `findNeedles(field, ["Wikidata lists Donald Trump as the current President of the United States, since 2025-01-20"])` — measured, never matched; absence is a result.
- `native/organs/derivation.test.mjs:54` — `declared`
  `findNeedles(field, ["declared"])` — measured, never matched; absence is a result.
- `native/organs/derivation.test.mjs:55` — `declared`
  `findNeedles(field, ["declared"])` — measured, never matched; absence is a result.
- `native/organs/derivation.test.mjs:69` — `declared`
  `findNeedles(field, ["declared"])` — measured, never matched; absence is a result.
- `native/organs/derivation.test.mjs:211` — `floor`
  `findNeedles(field, ["floor"])` — measured, never matched; absence is a result.
- `native/organs/essay-shape-register-falsify.test.mjs:64` — `refuted`
  `findNeedles(field, ["refuted"])` — measured, never matched; absence is a result.
- `native/organs/essay-shape-register-falsify.test.mjs:109` — `refuted`
  `findNeedles(field, ["refuted"])` — measured, never matched; absence is a result.
- `native/organs/essay-shape-register-falsify.test.mjs:164` — `Cumberland River`
  `findNeedles(field, ["Cumberland River"])` — measured, never matched; absence is a result.
- `native/organs/essay-shape-register-falsify.test.mjs:165` — `Corps|flood`/i
  `findNeedles(field, ["Corps", "flood"], ci: true)` — measured, never matched; absence is a result.
- `native/organs/event-arrangements.test.mjs:62` — `shared-instrument law`
  `findNeedles(field, ["shared-instrument law"])` — measured, never matched; absence is a result.
- `native/organs/experiencer.test.mjs:9` — `experiencer is declared`
  `findNeedles(field, ["experiencer is declared"])` — measured, never matched; absence is a result.
- `native/organs/experiencer.test.mjs:10` — `experiencer is declared`
  `findNeedles(field, ["experiencer is declared"])` — measured, never matched; absence is a result.
- `native/organs/experiencer.test.mjs:11` — `experiencer is declared`
  `findNeedles(field, ["experiencer is declared"])` — measured, never matched; absence is a result.
- `native/organs/experiencer.test.mjs:15` — `experiencer\.who is required`
  `findNeedles(field, ["experiencer.who is required"])` — measured, never matched; absence is a result.
- `native/organs/experiencer.test.mjs:16` — `experiencer\.who is required`
  `findNeedles(field, ["experiencer.who is required"])` — measured, never matched; absence is a result.
- `native/organs/experiencer.test.mjs:20` — `experiencer\.read is required`
  `findNeedles(field, ["experiencer.read is required"])` — measured, never matched; absence is a result.
- `native/organs/experiencer.test.mjs:21` — `experiencer\.read is required`
  `findNeedles(field, ["experiencer.read is required"])` — measured, never matched; absence is a result.
- `native/organs/experiencer.test.mjs:32` — `experiencer\.revision must be a string or null`
  `findNeedles(field, ["experiencer.revision must be a string or null"])` — measured, never matched; absence is a result.
- `native/organs/experiencer.test.mjs:54` — `experiencer\.who is required`
  `findNeedles(field, ["experiencer.who is required"])` — measured, never matched; absence is a result.
- `native/organs/fact-block.test.mjs:75` — `may be wrong`
  `findNeedles(field, ["may be wrong"])` — measured, never matched; absence is a result.
- `native/organs/fact-block.test.mjs:76` — `the source is right`
  `findNeedles(field, ["the source is right"])` — measured, never matched; absence is a result.
- `native/organs/fact-block.test.mjs:110` — `sentence\(s\)`
  `findNeedles(field, ["sentence(s)"])` — measured, never matched; absence is a result.
- `native/organs/fact-block.test.mjs:164` — `omitted`
  `findNeedles(field, ["omitted"])` — measured, never matched; absence is a result.
- `native/organs/fact-block.test.mjs:198` — `I made no notes on these`
  `findNeedles(field, ["I made no notes on these"])` — measured, never matched; absence is a result.
- `native/organs/fact-block.test.mjs:201` — `Do not fill this in from memory`
  `findNeedles(field, ["Do not fill this in from memory"])` — measured, never matched; absence is a result.
- `native/organs/fact-block.test.mjs:250` — `hamlin|hannibal|johnson|lincoln`/i
  `findNeedles(field, ["hamlin", "hannibal", "johnson", "lincoln"], ci: true)` — measured, never matched; absence is a result.
- `native/organs/fact-block.test.mjs:268` — `15th vice president`/gi
  `findNeedles(field, ["15th vice president"], ci: true)` — measured, never matched; absence is a result.
- `native/organs/fact-block.test.mjs:279` — `served as vice president`/gi
  `findNeedles(field, ["served as vice president"], ci: true)` — measured, never matched; absence is a result.
- `native/organs/fact-block.test.mjs:295` — `15th vice president`/gi
  `findNeedles(field, ["15th vice president"], ci: true)` — measured, never matched; absence is a result.
- `native/organs/fact-gate.test.mjs:56` — `What the search returned: “Donald Trump`
  `findNeedles(field, ["What the search returned: “Donald Trump"])` — measured, never matched; absence is a result.
- `native/organs/fact-gate.test.mjs:60` — `I took this to mean the United States, as of 2026-09-19\.`
  `findNeedles(field, ["I took this to mean the United States, as of 2026-09-19."])` — measured, never matched; absence is a result.
- `native/organs/fact-gate.test.mjs:61` — `I took this to mean`
  `findNeedles(field, ["I took this to mean"])` — measured, never matched; absence is a result.
- `native/organs/fact-gate.test.mjs:84` — `That does not match what I found \(as of 2026-09-19\): Wikidata lists Donald Trump as the current President`
  `findNeedles(field, ["That does not match what I found (as of 2026-09-19): Wikidata lists Donald Trump as the current President"])` — measured, never matched; absence is a result.
- `native/organs/fact-gate.test.mjs:85` — `Nothing I found backed this up`
  `findNeedles(field, ["Nothing I found backed this up"])` — measured, never matched; absence is a result.
- `native/organs/fact-gate.test.mjs:88` — `Checked against Wikidata, as of 2026-09-19`
  `findNeedles(field, ["Checked against Wikidata, as of 2026-09-19"])` — measured, never matched; absence is a result.
- `native/organs/fact-gate.test.mjs:102` — `Joe Biden`
  `findNeedles(field, ["Joe Biden"])` — measured, never matched; absence is a result.
- `native/organs/falsify-categorization.mjs:73` — `run`/i
  `findNeedles(field, ["run"], ci: true)` — measured, never matched; absence is a result.
- `native/organs/falsify-categorization.mjs:73` — `row`/i
  `findNeedles(field, ["row"], ci: true)` — measured, never matched; absence is a result.
- `native/organs/falsify-categorization.mjs:88` — `paraphrase`/i
  `findNeedles(field, ["paraphrase"], ci: true)` — measured, never matched; absence is a result.
- `native/organs/falsify-categorization.mjs:159` — `Shadow chase`
  `findNeedles(field, ["Shadow chase"])` — measured, never matched; absence is a result.
- `native/organs/falsify-categorization.mjs:199` — `empty hub of this fold`
  `findNeedles(field, ["empty hub of this fold"])` — measured, never matched; absence is a result.
- `native/organs/falsify-categorization.mjs:201` — `the LaVar face of this fold`
  `findNeedles(field, ["the LaVar face of this fold"])` — measured, never matched; absence is a result.
- `native/organs/falsify-omnilingual.test.mjs:159` — `\bwho\b|кто|qui|wer|chi|quem|誰|누구|ποιος|ใคร|pwy|ai|nani`/i
  `findNeedles(field, ["who", "кто", "qui", "wer", "chi", "quem", "誰", "누구", "ποιος", "ใคร", "pwy", "ai", "nani"], ci: true)` — measured, never matched; absence is a result.
- `native/organs/falsify-omnilingual.test.mjs:159` — `Trump|Macron|Путин|ماكرون|マクロン|मैक्रों|마크롱|Μακρόν|มาครง`/i
  `findNeedles(field, ["Trump", "Macron", "Путин", "ماكرون", "マクロン", "मैक्रों", "마크롱", "Μακρόν", "มาครง"], ci: true)` — measured, never matched; absence is a result.
- `native/organs/falsify-omnilingual.test.mjs:165` — `As of |the president is|I don't have`
  `findNeedles(field, ["As of ", "the president is", "I don't have"])` — measured, never matched; absence is a result.
- `native/organs/firewall.test.mjs:26` — `Hamlin`
  `findNeedles(field, ["Hamlin"])` — measured, never matched; absence is a result.
- `native/organs/firewall.test.mjs:38` — `Hannibal Hamlin`
  `findNeedles(field, ["Hannibal Hamlin"])` — measured, never matched; absence is a result.
- `native/organs/firewall.test.mjs:105` — `a:`
  `findNeedles(field, ["a:"])` — measured, never matched; absence is a result.
- `native/organs/firewall.test.mjs:105` — `b:`
  `findNeedles(field, ["b:"])` — measured, never matched; absence is a result.
- `native/organs/fold-gate.test.mjs:23` — `DECLARED`
  `findNeedles(field, ["DECLARED"])` — measured, never matched; absence is a result.
- `native/organs/fold-gate.test.mjs:24` — `DECLARED`
  `findNeedles(field, ["DECLARED"])` — measured, never matched; absence is a result.
- `native/organs/fold-gate.test.mjs:25` — `DECLARED`
  `findNeedles(field, ["DECLARED"])` — measured, never matched; absence is a result.
- `native/organs/fold-gate.test.mjs:106` — `alpha must be declared`
  `findNeedles(field, ["alpha must be declared"])` — measured, never matched; absence is a result.
- `native/organs/fold-gate.test.mjs:197` — `alpha must be declared`
  `findNeedles(field, ["alpha must be declared"])` — measured, never matched; absence is a result.
- `native/organs/grammar-lens.test.mjs:87` — `minShare is declared`
  `findNeedles(field, ["minShare is declared"])` — measured, never matched; absence is a result.
- `native/organs/grammar-lens.test.mjs:151` — `Universal Dependencies UD_English-EWT`
  `findNeedles(field, ["Universal Dependencies UD_English-EWT"])` — measured, never matched; absence is a result.
- `native/organs/grammar-lens.test.mjs:152` — `Dionysius Thrax`
  `findNeedles(field, ["Dionysius Thrax"])` — measured, never matched; absence is a result.
- `native/organs/grounding.js:331` — `,`/g
  `findNeedles(field, [","])` — measured, never matched; absence is a result.
- `native/organs/grounding.js:356` — `,`/g
  `findNeedles(field, [","])` — measured, never matched; absence is a result.
- `native/organs/grounding.test.mjs:73` — `Karataev`
  `findNeedles(field, ["Karataev"])` — measured, never matched; absence is a result.
- `native/organs/grounding.test.mjs:74` — `Karataev`
  `findNeedles(field, ["Karataev"])` — measured, never matched; absence is a result.
- `native/organs/grounding.test.mjs:77` — `Marlborough`
  `findNeedles(field, ["Marlborough"])` — measured, never matched; absence is a result.
- `native/organs/grounding.test.mjs:88` — `Clash|Catalyst`
  `findNeedles(field, ["Clash", "Catalyst"])` — measured, never matched; absence is a result.
- `native/organs/grounding.test.mjs:89` — `Reaction`
  `findNeedles(field, ["Reaction"])` — measured, never matched; absence is a result.
- `native/organs/grounding.test.mjs:90` — `Isn`
  `findNeedles(field, ["Isn"])` — measured, never matched; absence is a result.
- `native/organs/grounding.test.mjs:91` — `Marlborough`
  `findNeedles(field, ["Marlborough"])` — measured, never matched; absence is a result.
- `native/organs/grounding.test.mjs:109` — `HTML|Structure`
  `findNeedles(field, ["HTML", "Structure"])` — measured, never matched; absence is a result.
- `native/organs/grounding.test.mjs:110` — `Counter|Initialization`
  `findNeedles(field, ["Counter", "Initialization"])` — measured, never matched; absence is a result.
- `native/organs/grounding.test.mjs:111` — `Event|Listeners`
  `findNeedles(field, ["Event", "Listeners"])` — measured, never matched; absence is a result.
- `native/organs/grounding.test.mjs:117` — `Structure|Initialization|Listeners`
  `findNeedles(field, ["Structure", "Initialization", "Listeners"])` — measured, never matched; absence is a result.
- `native/organs/grounding.test.mjs:207` — `21`
  `findNeedles(field, ["21"])` — measured, never matched; absence is a result.
- `native/organs/grounding.test.mjs:208` — `Bryan`
  `findNeedles(field, ["Bryan"])` — measured, never matched; absence is a result.
- `native/organs/grounding.test.mjs:209` — `1982`
  `findNeedles(field, ["1982"])` — measured, never matched; absence is a result.
- `native/organs/grounding.test.mjs:235` — `99`
  `findNeedles(field, ["99"])` — measured, never matched; absence is a result.
- `native/organs/grounding.test.mjs:329` — `30`
  `findNeedles(field, ["30"])` — measured, never matched; absence is a result.
- `native/organs/grounding.test.mjs:330` — `60`
  `findNeedles(field, ["60"])` — measured, never matched; absence is a result.
- `native/organs/heard-surfaces.test.mjs:36` — `minMentions must be declared`
  `findNeedles(field, ["minMentions must be declared"])` — measured, never matched; absence is a result.
- `native/organs/heard-surfaces.test.mjs:37` — `minShare must be declared`
  `findNeedles(field, ["minShare must be declared"])` — measured, never matched; absence is a result.
- `native/organs/heard-surfaces.test.mjs:38` — `minMembers must be declared`
  `findNeedles(field, ["minMembers must be declared"])` — measured, never matched; absence is a result.
- `native/organs/hl-acquire.test.mjs:43` — `minShare is declared`
  `findNeedles(field, ["minShare is declared"])` — measured, never matched; absence is a result.
- `native/organs/hl-acquire.test.mjs:133` — `no live candidate`
  `findNeedles(field, ["no live candidate"])` — measured, never matched; absence is a result.
- `native/organs/hl.test.mjs:41` — `lincoln`/i
  `findNeedles(field, ["lincoln"], ci: true)` — measured, never matched; absence is a result.
- `native/organs/hl.test.mjs:41` — `proclamation`/i
  `findNeedles(field, ["proclamation"], ci: true)` — measured, never matched; absence is a result.
- `native/organs/hypergraph.test.mjs:141` — `Hamlin`/i
  `findNeedles(field, ["Hamlin"], ci: true)` — measured, never matched; absence is a result.
- `native/organs/hypergraph.test.mjs:146` — `Hamlin`/i
  `findNeedles(field, ["Hamlin"], ci: true)` — measured, never matched; absence is a result.
- `native/organs/hypergraph.test.mjs:147` — `Johnson`/i
  `findNeedles(field, ["Johnson"], ci: true)` — measured, never matched; absence is a result.
- `native/organs/hypergraph.test.mjs:162` — `Breckinridge`/i
  `findNeedles(field, ["Breckinridge"], ci: true)` — measured, never matched; absence is a result.
- `native/organs/hypergraph.test.mjs:168` — `Hamlin`/i
  `findNeedles(field, ["Hamlin"], ci: true)` — measured, never matched; absence is a result.
- `native/organs/hypergraph.test.mjs:169` — `Johnson`/i
  `findNeedles(field, ["Johnson"], ci: true)` — measured, never matched; absence is a result.
- `native/organs/hypergraph.test.mjs:261` — `a limit of this check, not a mark against the answer`
  `findNeedles(field, ["a limit of this check, not a mark against the answer"])` — measured, never matched; absence is a result.
- `native/organs/hypergraph.test.mjs:300` — `minShare is declared alongside classifyConnector`
  `findNeedles(field, ["minShare is declared alongside classifyConnector"])` — measured, never matched; absence is a result.
- `native/organs/hypergraph.test.mjs:354` — `Universal Dependencies`
  `findNeedles(field, ["Universal Dependencies"])` — measured, never matched; absence is a result.
- `native/organs/hypergraph.test.mjs:355` — `Dionysius Thrax`
  `findNeedles(field, ["Dionysius Thrax"])` — measured, never matched; absence is a result.
- `native/organs/hypergraph.test.mjs:646` — `Helene`/i
  `findNeedles(field, ["Helene"], ci: true)` — measured, never matched; absence is a result.
- `native/organs/hypergraph.test.mjs:651` — `never says`
  `findNeedles(field, ["never says"])` — measured, never matched; absence is a result.
- `native/organs/hypergraph.test.mjs:651` — `married`
  `findNeedles(field, ["married"])` — measured, never matched; absence is a result.
- `native/organs/hypergraph.test.mjs:664` — `says otherwise`
  `findNeedles(field, ["says otherwise"])` — measured, never matched; absence is a result.
- `native/organs/hypergraph.test.mjs:831` — `Pierre`
  `findNeedles(field, ["Pierre"])` — measured, never matched; absence is a result.
- `native/organs/hypergraph.test.mjs:836` — `Marya`
  `findNeedles(field, ["Marya"])` — measured, never matched; absence is a result.
- `native/organs/hypergraph.test.mjs:858` — `Dolokhov`/i
  `findNeedles(field, ["Dolokhov"], ci: true)` — measured, never matched; absence is a result.
- `native/organs/hypergraph.test.mjs:862` — `Pierre Bezukhov`/i
  `findNeedles(field, ["Pierre Bezukhov"], ci: true)` — measured, never matched; absence is a result.
- `native/organs/hypergraph.test.mjs:877` — `fills this differently`
  `findNeedles(field, ["fills this differently"])` — measured, never matched; absence is a result.
- `native/organs/hypergraph.test.mjs:877` — `Pierre Bezukhov`
  `findNeedles(field, ["Pierre Bezukhov"])` — measured, never matched; absence is a result.
- `native/organs/hypergraph.test.mjs:877` — `married`
  `findNeedles(field, ["married"])` — measured, never matched; absence is a result.
- `native/organs/hypergraph.test.mjs:909` — `Vantage Mills`/i
  `findNeedles(field, ["Vantage Mills"], ci: true)` — measured, never matched; absence is a result.
- `native/organs/hypergraph.test.mjs:916` — `never says`
  `findNeedles(field, ["never says"])` — measured, never matched; absence is a result.
- `native/organs/hypergraph.test.mjs:916` — `acquired`
  `findNeedles(field, ["acquired"])` — measured, never matched; absence is a result.
- `native/organs/hypergraph.test.mjs:917` — `fills this differently`
  `findNeedles(field, ["fills this differently"])` — measured, never matched; absence is a result.
- `native/organs/hypergraph.test.mjs:941` — `Yankees`/i
  `findNeedles(field, ["Yankees"], ci: true)` — measured, never matched; absence is a result.
- `native/organs/hypergraph.test.mjs:945` — `1960`
  `findNeedles(field, ["1960"])` — measured, never matched; absence is a result.
- `native/organs/hypergraph.test.mjs:946` — `1971`
  `findNeedles(field, ["1971"])` — measured, never matched; absence is a result.
- `native/organs/hypergraph.test.mjs:1207` — `polarity was never measured`
  `findNeedles(field, ["polarity was never measured"])` — measured, never matched; absence is a result.
- `native/organs/hypergraph.test.mjs:1216` — `never measured`
  `findNeedles(field, ["never measured"])` — measured, never matched; absence is a result.
- `native/organs/hypergraph.test.mjs:1334` — `first-person claim`
  `findNeedles(field, ["first-person claim"])` — measured, never matched; absence is a result.
- `native/organs/hypergraph.test.mjs:1387` — `esl-example\.com`
  `findNeedles(field, ["esl-example.com"])` — measured, never matched; absence is a result.
- `native/organs/hypergraph.test.mjs:1447` — `Pierre`
  `findNeedles(field, ["Pierre"])` — measured, never matched; absence is a result.
- `native/organs/hypergraph.test.mjs:1451` — `Bezukhov`
  `findNeedles(field, ["Bezukhov"])` — measured, never matched; absence is a result.
- `native/organs/hypergraph.test.mjs:1452` — `Bezukhov`
  `findNeedles(field, ["Bezukhov"])` — measured, never matched; absence is a result.
- `native/organs/hypergraph.test.mjs:1465` — `Scherer`
  `findNeedles(field, ["Scherer"])` — measured, never matched; absence is a result.
- `native/organs/hypergraph.test.mjs:1465` — `Vasili`
  `findNeedles(field, ["Vasili"])` — measured, never matched; absence is a result.
- `native/organs/kind-standing.test.mjs:51` — `alpha must be declared`
  `findNeedles(field, ["alpha must be declared"])` — measured, never matched; absence is a result.
- `native/organs/kind-standing.test.mjs:161` — `must be declared`
  `findNeedles(field, ["must be declared"])` — measured, never matched; absence is a result.
- `native/organs/look.js:212` — `\n`/g
  `findNeedles(field, ["n"])` — measured, never matched; absence is a result.
- `native/organs/look.test.mjs:47` — `weird_formatting`
  `findNeedles(field, ["weird_formatting"])` — measured, never matched; absence is a result.
- `native/organs/measure-blanking.test.mjs:17` — `percentile is declared`
  `findNeedles(field, ["percentile is declared"])` — measured, never matched; absence is a result.
- `native/organs/measure-blanking.test.mjs:18` — `percentile is declared`
  `findNeedles(field, ["percentile is declared"])` — measured, never matched; absence is a result.
- `native/organs/measure-blanking.test.mjs:19` — `measure is declared`
  `findNeedles(field, ["measure is declared"])` — measured, never matched; absence is a result.
- `native/organs/measure-blanking.test.mjs:20` — `fill is declared`
  `findNeedles(field, ["fill is declared"])` — measured, never matched; absence is a result.
- `native/organs/measure-blanking.test.mjs:21` — `minRun is declared`
  `findNeedles(field, ["minRun is declared"])` — measured, never matched; absence is a result.
- `native/organs/measure-blanking.test.mjs:23` — `two is the structural floor`
  `findNeedles(field, ["two is the structural floor"])` — measured, never matched; absence is a result.
- `native/organs/mnemonic-color.test.mjs:244` — `hue-class`
  `findNeedles(field, ["hue-class"])` — measured, never matched; absence is a result.
- `native/organs/mnemonic-colornames.test.mjs:91` — `orange|red`
  `findNeedles(field, ["orange", "red"])` — measured, never matched; absence is a result.
- `native/organs/mnemonic-colornames.test.mjs:93` — `standard color-name prior`
  `findNeedles(field, ["standard color-name prior"])` — measured, never matched; absence is a result.
- `native/organs/mnemonic-colornames.test.mjs:137` — `magenta|purple|pink`
  `findNeedles(field, ["magenta", "purple", "pink"])` — measured, never matched; absence is a result.
- `native/organs/mnemonic-colornames.test.mjs:151` — `no chroma in this region`
  `findNeedles(field, ["no chroma in this region"])` — measured, never matched; absence is a result.
- `native/organs/mnemonic-e2e.test.mjs:282` — `Recognized from memory`
  `findNeedles(field, ["Recognized from memory"])` — measured, never matched; absence is a result.
- `native/organs/mnemonic-e2e.test.mjs:283` — `fast-path memory read`
  `findNeedles(field, ["fast-path memory read"])` — measured, never matched; absence is a result.
- `native/organs/mnemonic-falsify.test.mjs:242` — `Recognized from memory`
  `findNeedles(field, ["Recognized from memory"])` — measured, never matched; absence is a result.
- `native/organs/mnemonic-falsify.test.mjs:243` — `de-lossy it and re-verify any time`
  `findNeedles(field, ["de-lossy it and re-verify any time"])` — measured, never matched; absence is a result.
- `native/organs/mnemonic.test.mjs:127` — `larger than its source`
  `findNeedles(field, ["larger than its source"])` — measured, never matched; absence is a result.
- `native/organs/mnemonic.test.mjs:132` — `larger than its source`
  `findNeedles(field, ["larger than its source"])` — measured, never matched; absence is a result.
- `native/organs/nesting.test.mjs:63` — `nothing says it is so`
  `findNeedles(field, ["nothing says it is so"])` — measured, never matched; absence is a result.
- `native/organs/nesting.test.mjs:81` — `the caller's declaration`
  `findNeedles(field, ["the caller's declaration"])` — measured, never matched; absence is a result.
- `native/organs/nesting.test.mjs:86` — `maxDepth`
  `findNeedles(field, ["maxDepth"])` — measured, never matched; absence is a result.
- `native/organs/notes-text-stance.test.mjs:106` — `source is named`
  `findNeedles(field, ["source is named"])` — measured, never matched; absence is a result.
- `native/organs/notes-text.test.mjs:90` — `settles as`
  `findNeedles(field, ["settles as"])` — measured, never matched; absence is a result.
- `native/organs/obligation.test.mjs:15` — `append-only`
  `findNeedles(field, ["append-only"])` — measured, never matched; absence is a result.
- `native/organs/omnilingual-fact-gate.test.mjs:69` — `As of |the president is|I don't have`
  `findNeedles(field, ["As of ", "the president is", "I don't have"])` — measured, never matched; absence is a result.
- `native/organs/output-claims.js:82` — `(?:therefore|hence|so that|which is why|would have)`/i
  `findNeedles(field, ["therefore", "hence", "so that", "which is why", "would have"], ci: true)` — measured, never matched; absence is a result.
- `native/organs/output-claims.js:84` — `(?:first|then|next|afterward|afterwards|before|after|when|while|once|at that time|then came)`/i
  `findNeedles(field, ["first", "then", "next", "afterward", "afterwards", "before", "after", "when", "while", "once", "at that time", "then came"], ci: true)` — measured, never matched; absence is a result.
- `native/organs/output-claims.js:85` — `(?:\bsaid\b|\basked\b|\breplied\b|\banswered\b|\bcried\b|\bwhispered\b|\bsaid to\b|\bspoke\b|said:)`/i
  `findNeedles(field, ["said", "asked", "replied", "answered", "cried", "whispered", "said to", "spoke", "said:"], ci: true)` — measured, never matched; absence is a result.
- `native/organs/output-claims.js:97` — `(?:כי|משום|בגלל|אם|אלא אם|לולא|אילולא)`/u
  `findNeedles(field, ["כי", "משום", "בגלל", "אם", "אלא אם", "לולא", "אילולא"])` — measured, never matched; absence is a result.
- `native/organs/output-claims.js:98` — `(?:לכן|על כן)`/u
  `findNeedles(field, ["לכן", "על כן"])` — measured, never matched; absence is a result.
- `native/organs/output-claims.js:100` — `(?:אז|אחרי|אחר כך|ראשית|בתחילה|אחרון|ואחרי|לפני)`/u
  `findNeedles(field, ["אז", "אחרי", "אחר כך", "ראשית", "בתחילה", "אחרון", "ואחרי", "לפני"])` — measured, never matched; absence is a result.
- `native/organs/output-claims.js:101` — `(?:אמר|ענה|השיב|קרא|לחש|צעק)`/u
  `findNeedles(field, ["אמר", "ענה", "השיב", "קרא", "לחש", "צעק"])` — measured, never matched; absence is a result.
- `native/organs/output-claims.js:111` — `(?:επει|επειδη|οτι|διοτι|ει|εαν|ειπερ|ει μη)`/u
  `findNeedles(field, ["επει", "επειδη", "οτι", "διοτι", "ει", "εαν", "ειπερ", "ει μη"])` — measured, never matched; absence is a result.
- `native/organs/output-claims.js:112` — `(?:ουν|ουνεκα)`/u
  `findNeedles(field, ["ουν", "ουνεκα"])` — measured, never matched; absence is a result.
- `native/organs/output-claims.js:114` — `(?:πρωτον|επειτα|μετα|τοτε|υστερον|προτερον|ως ταχιστα)`/u
  `findNeedles(field, ["πρωτον", "επειτα", "μετα", "τοτε", "υστερον", "προτερον", "ως ταχιστα"])` — measured, never matched; absence is a result.
- `native/organs/output-claims.js:115` — `(?:εφη|ειπεν|απεκριθη|ημειψεν|φατο)`/u
  `findNeedles(field, ["εφη", "ειπεν", "απεκριθη", "ημειψεν", "φατο"])` — measured, never matched; absence is a result.
- `native/organs/output-claims.js:122` — `(?:quia|quod|propter|si|nisi|dummodo|si modo|quod si)`/i
  `findNeedles(field, ["quia", "quod", "propter", "si", "nisi", "dummodo", "si modo", "quod si"], ci: true)` — measured, never matched; absence is a result.
- `native/organs/output-claims.js:123` — `(?:igitur|ergo|itaque|quapropter)`/i
  `findNeedles(field, ["igitur", "ergo", "itaque", "quapropter"], ci: true)` — measured, never matched; absence is a result.
- `native/organs/output-claims.js:125` — `(?:primum|deinde|postea|postquam|antequam|cum|ubi|mox)`/i
  `findNeedles(field, ["primum", "deinde", "postea", "postquam", "antequam", "cum", "ubi", "mox"], ci: true)` — measured, never matched; absence is a result.
- `native/organs/output-claims.js:126` — `(?:\bdixit\b|\bait\b|\binquit\b|\brespondit\b|\bclamavit\b)`/i
  `findNeedles(field, ["dixit", "ait", "inquit", "respondit", "clamavit"], ci: true)` — measured, never matched; absence is a result.
- `native/organs/output-claims.test.mjs:40` — `first`/i
  `findNeedles(field, ["first"], ci: true)` — measured, never matched; absence is a result.
- `native/organs/output-claims.test.mjs:49` — `dignity`
  `findNeedles(field, ["dignity"])` — measured, never matched; absence is a result.
- `native/organs/output-holograph.test.mjs:73` — `grounded in the record`
  `findNeedles(field, ["grounded in the record"])` — measured, never matched; absence is a result.
- `native/organs/output-order.test.mjs:32` — `The Recurrence`
  `findNeedles(field, ["The Recurrence"])` — measured, never matched; absence is a result.
- `native/organs/output-voice.js:53` — `(?:short|concise|brief|in one line|just tell me|quick)`/i
  `findNeedles(field, ["short", "concise", "brief", "in one line", "just tell me", "quick"], ci: true)` — measured, never matched; absence is a result.
- `native/organs/output-voice.js:54` — `(?:precise|exact|report|detailed|full account|accurately)`/i
  `findNeedles(field, ["precise", "exact", "report", "detailed", "full account", "accurately"], ci: true)` — measured, never matched; absence is a result.
- `native/organs/output-voice.js:55` — `(?:conversation|tell me a story|speak|talk|interview|chat)`/i
  `findNeedles(field, ["conversation", "tell me a story", "speak", "talk", "interview", "chat"], ci: true)` — measured, never matched; absence is a result.
- `native/organs/output-voice.js:56` — `(?:plain|simply|clearly|readable|explain)`/i
  `findNeedles(field, ["plain", "simply", "clearly", "readable", "explain"], ci: true)` — measured, never matched; absence is a result.
- `native/organs/pathos.test.mjs:13` — `experiencer is declared`
  `findNeedles(field, ["experiencer is declared"])` — measured, never matched; absence is a result.
- `native/organs/pathos.test.mjs:14` — `experiencer\.who is required`
  `findNeedles(field, ["experiencer.who is required"])` — measured, never matched; absence is a result.
- `native/organs/pathos.test.mjs:15` — `experiencer\.read is required`
  `findNeedles(field, ["experiencer.read is required"])` — measured, never matched; absence is a result.
- `native/organs/pathos.test.mjs:19` — `pathos requires the text`
  `findNeedles(field, ["pathos requires the text"])` — measured, never matched; absence is a result.
- `native/organs/pathos.test.mjs:20` — `pathos requires the text`
  `findNeedles(field, ["pathos requires the text"])` — measured, never matched; absence is a result.
- `native/organs/pathos.test.mjs:144` — `no re-ground`
  `findNeedles(field, ["no re-ground"])` — measured, never matched; absence is a result.
- `native/organs/pathos.test.mjs:149` — `reGround requires a giver`
  `findNeedles(field, ["reGround requires a giver"])` — measured, never matched; absence is a result.
- `native/organs/pathos.test.mjs:168` — `task log array`
  `findNeedles(field, ["task log array"])` — measured, never matched; absence is a result.
- `native/organs/pathos.test.mjs:169` — `EOPathosReGround@1`
  `findNeedles(field, ["EOPathosReGround@1"])` — measured, never matched; absence is a result.
- `native/organs/precision-race.test.mjs:37` — `disclosed gaps`
  `findNeedles(field, ["disclosed gaps"])` — measured, never matched; absence is a result.
- `native/organs/precision-race.test.mjs:38` — `engine missing`
  `findNeedles(field, ["engine missing"])` — measured, never matched; absence is a result.
- `native/organs/precision-race.test.mjs:44` — `no mechanism settled`
  `findNeedles(field, ["no mechanism settled"])` — measured, never matched; absence is a result.
- `native/organs/provenance.test.mjs:49` — `Marlborough`/i
  `findNeedles(field, ["Marlborough"], ci: true)` — measured, never matched; absence is a result.
- `native/organs/provenance.test.mjs:126` — `married`
  `findNeedles(field, ["married"])` — measured, never matched; absence is a result.
- `native/organs/provenance.test.mjs:129` — `winter`
  `findNeedles(field, ["winter"])` — measured, never matched; absence is a result.
- `native/organs/provenance.test.mjs:154` — `conversation so far`/i
  `findNeedles(field, ["conversation so far"], ci: true)` — measured, never matched; absence is a result.
- `native/organs/provenance.test.mjs:155` — `689,447`
  `findNeedles(field, ["689,447"])` — measured, never matched; absence is a result.
- `native/organs/provenance.test.mjs:202` — `is directly related`
  `findNeedles(field, ["is directly related"])` — measured, never matched; absence is a result.
- `native/organs/provenance.test.mjs:244` — `confirms exactly this`/i
  `findNeedles(field, ["confirms exactly this"], ci: true)` — measured, never matched; absence is a result.
- `native/organs/provenance.test.mjs:261` — `confirms exactly:`/i
  `findNeedles(field, ["confirms exactly:"], ci: true)` — measured, never matched; absence is a result.
- `native/organs/quotes.test.mjs:66` — `Hélène spoke plainly`
  `findNeedles(field, ["Hélène spoke plainly"])` — measured, never matched; absence is a result.
- `native/organs/quotes.test.mjs:67` — `That evening Hélène`
  `findNeedles(field, ["That evening Hélène"])` — measured, never matched; absence is a result.
- `native/organs/quotes.test.mjs:84` — `quotation not found in the material`
  `findNeedles(field, ["quotation not found in the material"])` — measured, never matched; absence is a result.
- `native/organs/quotes.test.mjs:97` — `outside the offered passages`
  `findNeedles(field, ["outside the offered passages"])` — measured, never matched; absence is a result.
- `native/organs/quotes.test.mjs:101` — `\[quay\.txt#`
  `findNeedles(field, ["[quay.txt#"])` — measured, never matched; absence is a result.
- `native/organs/quotes.test.mjs:144` — `bury the report before the equinox`
  `findNeedles(field, ["bury the report before the equinox"])` — measured, never matched; absence is a result.
- `native/organs/quotes.test.mjs:145` — `segment`
  `findNeedles(field, ["segment"])` — measured, never matched; absence is a result.
- `native/organs/quotes.test.mjs:165` — `bury the report before the equinox`
  `findNeedles(field, ["bury the report before the equinox"])` — measured, never matched; absence is a result.
- `native/organs/quotes.test.mjs:168` — `\[assembly\.txt#`
  `findNeedles(field, ["[assembly.txt#"])` — measured, never matched; absence is a result.
- `native/organs/quotes.test.mjs:169` — `\[quay\.txt#`
  `findNeedles(field, ["[quay.txt#"])` — measured, never matched; absence is a result.
- `native/organs/quotes.test.mjs:228` — `no engineer present would defend it`
  `findNeedles(field, ["no engineer present would defend it"])` — measured, never matched; absence is a result.
- `native/organs/ranke.js:218` — `&nbsp;|&#160;`/g
  `findNeedles(field, ["&nbsp;", "&#160;"])` — measured, never matched; absence is a result.
- `native/organs/ranke.js:250` — `&amp;`/g
  `findNeedles(field, ["&amp;"])` — measured, never matched; absence is a result.
- `native/organs/ranke.test.mjs:73` — `wik`/i
  `findNeedles(field, ["wik"], ci: true)` — measured, never matched; absence is a result.
- `native/organs/ranke.test.mjs:155` — `fetchFace is injected`
  `findNeedles(field, ["fetchFace is injected"])` — measured, never matched; absence is a result.
- `native/organs/ranke.test.mjs:202` — `maxFetches is declared`
  `findNeedles(field, ["maxFetches is declared"])` — measured, never matched; absence is a result.
- `native/organs/ranke.test.mjs:203` — `maxSearches is declared`
  `findNeedles(field, ["maxSearches is declared"])` — measured, never matched; absence is a result.
- `native/organs/ranke.test.mjs:237` — `wikipedia|wikimedia`
  `findNeedles(field, ["wikipedia", "wikimedia"])` — measured, never matched; absence is a result.
- `native/organs/reality-kind.test.mjs:54` — `Pierre`
  `findNeedles(field, ["Pierre"])` — measured, never matched; absence is a result.
- `native/organs/reality-kind.test.mjs:66` — `Napoleon`
  `findNeedles(field, ["Napoleon"])` — measured, never matched; absence is a result.
- `native/organs/reality-kind.test.mjs:70` — `Napoleon`
  `findNeedles(field, ["Napoleon"])` — measured, never matched; absence is a result.
- `native/organs/reality-kind.test.mjs:154` — `Napole`
  `findNeedles(field, ["Napole"])` — measured, never matched; absence is a result.
- `native/organs/reality-kind.test.mjs:161` — `Bezukhov`
  `findNeedles(field, ["Bezukhov"])` — measured, never matched; absence is a result.
- `native/organs/reality-kind.test.mjs:161` — `Andrei`
  `findNeedles(field, ["Andrei"])` — measured, never matched; absence is a result.
- `native/organs/reality-kind.test.mjs:161` — `Bolkonsky`
  `findNeedles(field, ["Bolkonsky"])` — measured, never matched; absence is a result.
- `native/organs/reality-kind.test.mjs:161` — `Natasha`
  `findNeedles(field, ["Natasha"])` — measured, never matched; absence is a result.
- `native/organs/reality-kind.test.mjs:161` — `Rostova`
  `findNeedles(field, ["Rostova"])` — measured, never matched; absence is a result.
- `native/organs/reasoning-core.test.mjs:37` — `never declared`
  `findNeedles(field, ["never declared"])` — measured, never matched; absence is a result.
- `native/organs/repetition-cut-falsify.test.mjs:61` — `ranke_nonmove`
  `findNeedles(field, ["ranke_nonmove"])` — measured, never matched; absence is a result.
- `native/organs/repetition-cut-falsify.test.mjs:62` — `the rewrite did not move the section`
  `findNeedles(field, ["the rewrite did not move the section"])` — measured, never matched; absence is a result.
- `native/organs/repetition-cut-falsify.test.mjs:63` — `budget consumed, loop terminates`
  `findNeedles(field, ["budget consumed, loop terminates"])` — measured, never matched; absence is a result.
- `native/organs/repetition-cut-falsify.test.mjs:69` — `NON_MOVING_EDIT_RATIO = 0\.9`
  `findNeedles(field, ["NON_MOVING_EDIT_RATIO = 0.9"])` — measured, never matched; absence is a result.
- `native/organs/shared-text.test.mjs:20` — `minSentenceLength is declared`
  `findNeedles(field, ["minSentenceLength is declared"])` — measured, never matched; absence is a result.
- `native/organs/shared-text.test.mjs:21` — `minShared is declared`
  `findNeedles(field, ["minShared is declared"])` — measured, never matched; absence is a result.
- `native/organs/shared-text.test.mjs:22` — `splitSentences is injected`
  `findNeedles(field, ["splitSentences is injected"])` — measured, never matched; absence is a result.
- `native/organs/signal.test.mjs:63` — `measured absence, not a failure to look`
  `findNeedles(field, ["measured absence, not a failure to look"])` — measured, never matched; absence is a result.
- `native/organs/signal.test.mjs:97` — `one instrument only`
  `findNeedles(field, ["one instrument only"])` — measured, never matched; absence is a result.
- `native/organs/signal.test.mjs:109` — `decoder blew up`
  `findNeedles(field, ["decoder blew up"])` — measured, never matched; absence is a result.
- `native/organs/signal.test.mjs:126` — `search-aware ceiling`
  `findNeedles(field, ["search-aware ceiling"])` — measured, never matched; absence is a result.
- `native/organs/signal.test.mjs:146` — `one instrument only`
  `findNeedles(field, ["one instrument only"])` — measured, never matched; absence is a result.
- `native/organs/signal.test.mjs:147` — `2 recipes, one mechanism`
  `findNeedles(field, ["2 recipes, one mechanism"])` — measured, never matched; absence is a result.
- `native/organs/signal.test.mjs:184` — `Attributed standpoints: muninn`
  `findNeedles(field, ["Attributed standpoints: muninn"])` — measured, never matched; absence is a result.
- `native/organs/source-page-blanking.test.mjs:111` — `Timeline`/g
  `findNeedles(field, ["Timeline"])` — measured, never matched; absence is a result.
- `native/organs/source-page-blanking.test.mjs:196` — `command`/i
  `findNeedles(field, ["command"], ci: true)` — measured, never matched; absence is a result.
- `native/organs/source-page-blanking.test.mjs:295` — `command`/i
  `findNeedles(field, ["command"], ci: true)` — measured, never matched; absence is a result.
- `native/organs/source.test.mjs:129` — `the source file's own declared header — Title: War and Peace, Author: Leo Tolstoy — pg2600\.txt#0-797`
  `findNeedles(field, ["the source file's own declared header — Title: War and Peace, Author: Leo Tolstoy — pg2600.txt#0-797"])` — measured, never matched; absence is a result.
- `native/organs/source.test.mjs:130` — `One of the next arrivals`
  `findNeedles(field, ["One of the next arrivals"])` — measured, never matched; absence is a result.
- `native/organs/source.test.mjs:144` — `answer from these`/i
  `findNeedles(field, ["answer from these"], ci: true)` — measured, never matched; absence is a result.
- `native/organs/source.test.mjs:154` — `retrieved`
  `findNeedles(field, ["retrieved"])` — measured, never matched; absence is a result.
- `native/organs/source.test.mjs:164` — `en\.wikipedia\.org`/g
  `findNeedles(field, ["en.wikipedia.org"])` — measured, never matched; absence is a result.
- `native/organs/source.test.mjs:165` — `first passage`
  `findNeedles(field, ["first passage"])` — measured, never matched; absence is a result.
- `native/organs/source.test.mjs:166` — `second passage`
  `findNeedles(field, ["second passage"])` — measured, never matched; absence is a result.
- `native/organs/source.test.mjs:172` — `\(this looks like: a delimited table`
  `findNeedles(field, ["(this looks like: a delimited table"])` — measured, never matched; absence is a result.
- `native/organs/speaker.test.mjs:40` — `HARKER`/i
  `findNeedles(field, ["HARKER"], ci: true)` — measured, never matched; absence is a result.
- `native/organs/speaker.test.mjs:43` — `SEWARD`/i
  `findNeedles(field, ["SEWARD"], ci: true)` — measured, never matched; absence is a result.
- `native/organs/speaker.test.mjs:44` — `Mina Murray`/i
  `findNeedles(field, ["Mina Murray"], ci: true)` — measured, never matched; absence is a result.
- `native/organs/speaker.test.mjs:49` — `HARKER`/i
  `findNeedles(field, ["HARKER"], ci: true)` — measured, never matched; absence is a result.
- `native/organs/speaker.test.mjs:50` — `SEWARD`/i
  `findNeedles(field, ["SEWARD"], ci: true)` — measured, never matched; absence is a result.
- `native/organs/speaker.test.mjs:51` — `Mina`/i
  `findNeedles(field, ["Mina"], ci: true)` — measured, never matched; absence is a result.
- `native/organs/speaker.test.mjs:64` — `received closed class`
  `findNeedles(field, ["received closed class"])` — measured, never matched; absence is a result.
- `native/organs/testimony.test.mjs:110` — `Pittsburgh Pirates`
  `findNeedles(field, ["Pittsburgh Pirates"])` — measured, never matched; absence is a result.
- `native/organs/testimony.test.mjs:111` — `\n`
  `findNeedles(field, ["n"])` — measured, never matched; absence is a result.
- `native/organs/testimony.test.mjs:136` — `\bIt\b`
  `findNeedles(field, ["It"])` — measured, never matched; absence is a result.
- `native/organs/testimony.test.mjs:192` — `Jefferson`
  `findNeedles(field, ["Jefferson"])` — measured, never matched; absence is a result.
- `native/organs/testimony.test.mjs:193` — `Ferris`
  `findNeedles(field, ["Ferris"])` — measured, never matched; absence is a result.
- `native/organs/testimony.test.mjs:208` — `Pittsburgh Pirates`
  `findNeedles(field, ["Pittsburgh Pirates"])` — measured, never matched; absence is a result.
- `native/organs/testimony.test.mjs:218` — `Reds`
  `findNeedles(field, ["Reds"])` — measured, never matched; absence is a result.
- `native/organs/verbatim-snip.js:136` — `disambiguation page`/i
  `findNeedles(field, ["disambiguation page"], ci: true)` — measured, never matched; absence is a result.
- `native/organs/verbatim-snip.js:144` — `\(ed\.\) by`/i
  `findNeedles(field, ["(ed.) by"], ci: true)` — measured, never matched; absence is a result.
- `native/organs/verbatim-snip.js:145` — `edited by`/i
  `findNeedles(field, ["edited by"], ci: true)` — measured, never matched; absence is a result.
- `native/organs/verbatim-snip.js:211` — `\r`/g
  `findNeedles(field, ["r"])` — measured, never matched; absence is a result.
- `native/organs/voices.test.mjs:31` — `no irregularities in the audit`
  `findNeedles(field, ["no irregularities in the audit"])` — measured, never matched; absence is a result.
- `native/organs/voices.test.mjs:85` — `minRun is declared`
  `findNeedles(field, ["minRun is declared"])` — measured, never matched; absence is a result.
- `native/organs/voices.test.mjs:86` — `names its giver`
  `findNeedles(field, ["names its giver"])` — measured, never matched; absence is a result.
- `native/organs/voices.test.mjs:87` — `lens is declared`
  `findNeedles(field, ["lens is declared"])` — measured, never matched; absence is a result.
- `native/organs/void-outline.js:107` — `dispute|contradict|contested|disagre`/i
  `findNeedles(field, ["dispute", "contradict", "contested", "disagre"], ci: true)` — measured, never matched; absence is a result.
- `native/organs/web.js:451` — `anomaly\.js|anomaly-modal|cc=botnet`/i
  `findNeedles(field, ["anomaly.js", "anomaly-modal", "cc=botnet"], ci: true)` — measured, never matched; absence is a result.
- `native/organs/web.js:489` — `duckduckgo`/i
  `findNeedles(field, ["duckduckgo"], ci: true)` — measured, never matched; absence is a result.
- `native/organs/web.js:721` — `timeout|timed out|ECONNRESET|EPROTO|socket hang up|fetch failed`/i
  `findNeedles(field, ["timeout", "timed out", "ECONNRESET", "EPROTO", "socket hang up", "fetch failed"], ci: true)` — measured, never matched; absence is a result.
- `native/organs/web.test.mjs:58` — `a><a href="`/about
  `findNeedles(field, ["a><a href=\""])` — measured, never matched; absence is a result.
- `native/organs/web.test.mjs:64` — `li><li>second &mdash; item<`/li
  `findNeedles(field, ["li><li>second &mdash; item<"], ci: true)` — measured, never matched; absence is a result.
- `native/organs/web.test.mjs:64` — `ul><`/main
  `findNeedles(field, ["ul><"], ci: true)` — measured, never matched; absence is a result.
- `native/organs/web.test.mjs:67` — `body><`/html
  `findNeedles(field, ["body><"])` — measured, never matched; absence is a result.
- `native/organs/web.test.mjs:105` — `War and Peace`
  `findNeedles(field, ["War and Peace"])` — measured, never matched; absence is a result.
- `native/organs/web.test.mjs:133` — `a><`/li
  `findNeedles(field, ["a><"], ci: true)` — measured, never matched; absence is a result.
- `native/organs/web.test.mjs:134` — `a><`/li
  `findNeedles(field, ["a><"], ci: true)` — measured, never matched; absence is a result.
- `native/organs/web.test.mjs:135` — `div><`/div
  `findNeedles(field, ["div><"], ci: true)` — measured, never matched; absence is a result.
- `native/organs/web.test.mjs:136` — `p><`/main
  `findNeedles(field, ["p><"], ci: true)` — measured, never matched; absence is a result.
- `native/organs/web.test.mjs:233` — `Mesoten`/g
  `findNeedles(field, ["Mesoten"])` — measured, never matched; absence is a result.
- `native/organs/web.test.mjs:301` — `Field notes`
  `findNeedles(field, ["Field notes"])` — measured, never matched; absence is a result.
- `native/organs/web.test.mjs:309` — `<p>`
  `findNeedles(field, ["<p>"])` — measured, never matched; absence is a result.
- `native/organs/web.test.mjs:318` — `first one`
  `findNeedles(field, ["first one"])` — measured, never matched; absence is a result.
- `native/organs/web.test.mjs:321` — `second one`
  `findNeedles(field, ["second one"])` — measured, never matched; absence is a result.
- `native/organs/web.test.mjs:332` — `item 1 of 2: Truth-Seeking Is an Architecture \(Fri, 03 Jul 2026 19:25:45 GMT\)`
  `findNeedles(field, ["item 1 of 2: Truth-Seeking Is an Architecture (Fri, 03 Jul 2026 19:25:45 GMT)"])` — measured, never matched; absence is a result.
- `native/organs/web.test.mjs:333` — `item 2 of 2: The Fold, Explained`
  `findNeedles(field, ["item 2 of 2: The Fold, Explained"])` — measured, never matched; absence is a result.
- `native/organs/web.test.mjs:339` — `\n`/g
  `findNeedles(field, ["n"])` — measured, never matched; absence is a result.
- `native/organs/web.test.mjs:345` — `b> by Leo Tolstoy<`/a
  `findNeedles(field, ["b> by Leo Tolstoy<"])` — measured, never matched; absence is a result.
- `native/organs/web.test.mjs:348` — `a><`/h
  `findNeedles(field, ["a><"])` — measured, never matched; absence is a result.
- `native/organs/web.test.mjs:349` — `a><`/h
  `findNeedles(field, ["a><"])` — measured, never matched; absence is a result.
- `native/organs/web.test.mjs:363` — `td><td class='result-snippet'>Snippet for A<`/td
  `findNeedles(field, ["td><td class='result-snippet'>Snippet for A<"])` — measured, never matched; absence is a result.
- `native/organs/web.test.mjs:364` — `td><td><a rel="nofollow" href="`
  `findNeedles(field, ["td><td><a rel=\"nofollow\" href=\""])` — measured, never matched; absence is a result.
- `native/organs/web.test.mjs:365` — `td><td class='result-snippet'>Snippet for B<`/td
  `findNeedles(field, ["td><td class='result-snippet'>Snippet for B<"])` — measured, never matched; absence is a result.
- `native/organs/web.test.mjs:365` — `tr><`/table
  `findNeedles(field, ["tr><"])` — measured, never matched; absence is a result.
- `native/organs/web.test.mjs:467` — `First kept sentence\.\nSecond kept sentence\.`
  `findNeedles(field, ["First kept sentence.nSecond kept sentence."])` — measured, never matched; absence is a result.
- `native/organs/what.test.mjs:45` — `Vite`
  `findNeedles(field, ["Vite"])` — measured, never matched; absence is a result.
- `native/organs/what.test.mjs:46` — `React`
  `findNeedles(field, ["React"])` — measured, never matched; absence is a result.
- `native/organs/what.test.mjs:47` — `Ant Design`
  `findNeedles(field, ["Ant Design"])` — measured, never matched; absence is a result.
- `native/organs/what.test.mjs:49` — `feature modules`
  `findNeedles(field, ["feature modules"])` — measured, never matched; absence is a result.
- `native/organs/what.test.mjs:50` — `LicenseStatus`
  `findNeedles(field, ["LicenseStatus"])` — measured, never matched; absence is a result.
- `native/organs/what.test.mjs:52` — `\/api\/v1\/surveys\/submissions`
  `findNeedles(field, ["/api/v1/surveys/submissions"])` — measured, never matched; absence is a result.
- `native/organs/what.test.mjs:54` — `someapp v3\.2\.1`
  `findNeedles(field, ["someapp v3.2.1"])` — measured, never matched; absence is a result.
- `native/organs/what.test.mjs:59` — `Example Org`
  `findNeedles(field, ["Example Org"])` — measured, never matched; absence is a result.
- `native/organs/what.test.mjs:69` — `module map`
  `findNeedles(field, ["module map"])` — measured, never matched; absence is a result.
- `native/organs/what.test.mjs:81` — `skipped`
  `findNeedles(field, ["skipped"])` — measured, never matched; absence is a result.
- `native/organs/what.test.mjs:87` — `prose reader`
  `findNeedles(field, ["prose reader"])` — measured, never matched; absence is a result.
- `native/organs/what.test.mjs:122` — `GraphQL schema — 8 types total: 6 object types, 1 enums, 0 unions, 0 input types, 1 scalars`
  `findNeedles(field, ["GraphQL schema — 8 types total: 6 object types, 1 enums, 0 unions, 0 input types, 1 scalars"])` — measured, never matched; absence is a result.
- `native/organs/what.test.mjs:123` — `query on RootQueryType \(1 fields\)`
  `findNeedles(field, ["query on RootQueryType (1 fields)"])` — measured, never matched; absence is a result.
- `native/organs/what.test.mjs:124` — `mutation on RootMutationType \(1 fields\)`
  `findNeedles(field, ["mutation on RootMutationType (1 fields)"])` — measured, never matched; absence is a result.
- `native/organs/what.test.mjs:125` — `Connection`
  `findNeedles(field, ["Connection"])` — measured, never matched; absence is a result.
- `native/organs/what.test.mjs:126` — `Payload`
  `findNeedles(field, ["Payload"])` — measured, never matched; absence is a result.
- `native/organs/what.test.mjs:127` — `LicenseState \(2 values\)`
  `findNeedles(field, ["LicenseState (2 values)"])` — measured, never matched; absence is a result.
- `native/organs/what.test.mjs:128` — `update \(1\)`
  `findNeedles(field, ["update (1)"])` — measured, never matched; absence is a result.
- `native/organs/what.test.mjs:151` — `LicenseStatus`
  `findNeedles(field, ["LicenseStatus"])` — measured, never matched; absence is a result.
- `native/organs/witness-sentences.test.mjs:38` — `replaced the unpopular Barclay de Tolly with Mikhail Kutuzov`
  `findNeedles(field, ["replaced the unpopular Barclay de Tolly with Mikhail Kutuzov"])` — measured, never matched; absence is a result.
- `native/organs/witness-sentences.test.mjs:50` — `maxAsks is declared`
  `findNeedles(field, ["maxAsks is declared"])` — measured, never matched; absence is a result.
- `native/organs/witness-sentences.test.mjs:111` — `goats`
  `findNeedles(field, ["goats"])` — measured, never matched; absence is a result.
- `native/organs/witness-sentences.test.mjs:128` — `already expected`
  `findNeedles(field, ["already expected"])` — measured, never matched; absence is a result.
- `native/organs/witness-sentences.test.mjs:149` — `incoherent`
  `findNeedles(field, ["incoherent"])` — measured, never matched; absence is a result.
- `native/organs/witness-sentences.test.mjs:203` — `replaced the unpopular Barclay`
  `findNeedles(field, ["replaced the unpopular Barclay"])` — measured, never matched; absence is a result.
- `native/organs/witness-sentences.test.mjs:234` — `figure_unbacked`
  `findNeedles(field, ["figure_unbacked"])` — measured, never matched; absence is a result.
- `native/tests/affordance-reference.test.js:72` — `hyperlexicon is injected`
  `findNeedles(field, ["hyperlexicon is injected"])` — measured, never matched; absence is a result.
- `native/tests/anchoring.test.js:56` — `minActivation`
  `findNeedles(field, ["minActivation"])` — measured, never matched; absence is a result.
- `native/tests/anchoring.test.js:57` — `minMargin`
  `findNeedles(field, ["minMargin"])` — measured, never matched; absence is a result.
- `native/tests/anchoring.test.js:61` — `bornActivationFloor`
  `findNeedles(field, ["bornActivationFloor"])` — measured, never matched; absence is a result.
- `native/tests/anchoring.test.js:62` — `bornMarginFloor`
  `findNeedles(field, ["bornMarginFloor"])` — measured, never matched; absence is a result.
- `native/tests/anchoring.test.js:63` — `bornActivationFloor`
  `findNeedles(field, ["bornActivationFloor"])` — measured, never matched; absence is a result.
- `native/tests/antimatter.test.js:160` — `question, not an answer`
  `findNeedles(field, ["question, not an answer"])` — measured, never matched; absence is a result.
- `native/tests/antimatter.test.js:200` — `terrains NOT touched: `
  `findNeedles(field, ["terrains NOT touched: "])` — measured, never matched; absence is a result.
- `native/tests/antimatter.test.js:201` — `questions this chain cannot answer: the council is corrupt`
  `findNeedles(field, ["questions this chain cannot answer: the council is corrupt"])` — measured, never matched; absence is a result.
- `native/tests/antimatter.test.js:262` — `victor|creature`
  `findNeedles(field, ["victor", "creature"])` — measured, never matched; absence is a result.
- `native/tests/antimatter.test.js:263` — `EOMindAntimatter`
  `findNeedles(field, ["EOMindAntimatter"])` — measured, never matched; absence is a result.
- `native/tests/antimatter.test.js:264` — `collide|matter`
  `findNeedles(field, ["collide", "matter"])` — measured, never matched; absence is a result.
- `native/tests/antimatter.test.js:337` — `prefix|suffix`
  `findNeedles(field, ["prefix", "suffix"])` — measured, never matched; absence is a result.
- `native/tests/antimatter.test.js:389` — `beliefs|matter`
  `findNeedles(field, ["beliefs", "matter"])` — measured, never matched; absence is a result.
- `native/tests/antimatter.test.js:406` — `misreading region`
  `findNeedles(field, ["misreading region"])` — measured, never matched; absence is a result.
- `native/tests/attribution.test.js:48` — `injected`
  `findNeedles(field, ["injected"])` — measured, never matched; absence is a result.
- `native/tests/charter.test.js:106` — `injected, never assumed`
  `findNeedles(field, ["injected, never assumed"])` — measured, never matched; absence is a result.
- `native/tests/code-language.test.js:109` — `python import`
  `findNeedles(field, ["python import"])` — measured, never matched; absence is a result.
- `native/tests/code-language.test.js:123` — `def name\(params\):`
  `findNeedles(field, ["def name(params):"])` — measured, never matched; absence is a result.
- `native/tests/code-language.test.js:124` — `received closed class`
  `findNeedles(field, ["received closed class"])` — measured, never matched; absence is a result.
- `native/tests/code-language.test.js:125` — `class, `
  `findNeedles(field, ["class, "])` — measured, never matched; absence is a result.
- `native/tests/code-language.test.js:126` — `illustrative`
  `findNeedles(field, ["illustrative"])` — measured, never matched; absence is a result.
- `native/tests/code-language.test.js:135` — `JavaScript-shaped`
  `findNeedles(field, ["JavaScript-shaped"])` — measured, never matched; absence is a result.
- `native/tests/code-language.test.js:136` — `def name`
  `findNeedles(field, ["def name"])` — measured, never matched; absence is a result.
- `native/tests/code-language.test.js:139` — `Python-shaped`
  `findNeedles(field, ["Python-shaped"])` — measured, never matched; absence is a result.
- `native/tests/code-name-split.test.js:59` — `live_priors CodeNamePrior@1`
  `findNeedles(field, ["live_priors CodeNamePrior@1"])` — measured, never matched; absence is a result.
- `native/tests/code-structure.test.js:160` — `no CodeNamePrior`
  `findNeedles(field, ["no CodeNamePrior"])` — measured, never matched; absence is a result.
- `native/tests/completion.test.js:47` — `at is declared`
  `findNeedles(field, ["at is declared"])` — measured, never matched; absence is a result.
- `native/tests/completion.test.js:48` — `schema is required`
  `findNeedles(field, ["schema is required"])` — measured, never matched; absence is a result.
- `native/tests/completion.test.js:49` — `expectedRoles`
  `findNeedles(field, ["expectedRoles"])` — measured, never matched; absence is a result.
- `native/tests/construction.test.js:53` — `declared`
  `findNeedles(field, ["declared"])` — measured, never matched; absence is a result.
- `native/tests/construction.test.js:54` — `declared`
  `findNeedles(field, ["declared"])` — measured, never matched; absence is a result.
- `native/tests/construction.test.js:55` — `declared`
  `findNeedles(field, ["declared"])` — measured, never matched; absence is a result.
- `native/tests/construction.test.js:81` — `Universal Dependencies`
  `findNeedles(field, ["Universal Dependencies"])` — measured, never matched; absence is a result.
- `native/tests/contest.test.js:12` — `minActivation`
  `findNeedles(field, ["minActivation"])` — measured, never matched; absence is a result.
- `native/tests/contest.test.js:13` — `minMargin`
  `findNeedles(field, ["minMargin"])` — measured, never matched; absence is a result.
- `native/tests/contest.test.js:14` — `contestedMargin`
  `findNeedles(field, ["contestedMargin"])` — measured, never matched; absence is a result.
- `native/tests/contest.test.js:20` — `never the easier case`
  `findNeedles(field, ["never the easier case"])` — measured, never matched; absence is a result.
- `native/tests/contest.test.js:111` — `co-present competitor`
  `findNeedles(field, ["co-present competitor"])` — measured, never matched; absence is a result.
- `native/tests/contest.test.js:135` — `minActivation`
  `findNeedles(field, ["minActivation"])` — measured, never matched; absence is a result.
- `native/tests/contest.test.js:136` — `draws`
  `findNeedles(field, ["draws"])` — measured, never matched; absence is a result.
- `native/tests/contest.test.js:137` — `seed`
  `findNeedles(field, ["seed"])` — measured, never matched; absence is a result.
- `native/tests/contest.test.js:138` — `alpha`
  `findNeedles(field, ["alpha"])` — measured, never matched; absence is a result.
- `native/tests/contextual-dmd.test.js:59` — `DIMS`
  `findNeedles(field, ["DIMS"])` — measured, never matched; absence is a result.
- `native/tests/contextual-dmd.test.js:60` — `RANK`
  `findNeedles(field, ["RANK"])` — measured, never matched; absence is a result.
- `native/tests/contextual-dmd.test.js:62` — `"numerical"`
  `findNeedles(field, ["\"numerical\""])` — measured, never matched; absence is a result.
- `native/tests/contextual-dmd.test.js:63` — `dmdWindow`
  `findNeedles(field, ["dmdWindow"])` — measured, never matched; absence is a result.
- `native/tests/continuation.test.js:25` — `declared`
  `findNeedles(field, ["declared"])` — measured, never matched; absence is a result.
- `native/tests/continuation.test.js:26` — `giver`
  `findNeedles(field, ["giver"])` — measured, never matched; absence is a result.
- `native/tests/continuation.test.js:28` — `declared`
  `findNeedles(field, ["declared"])` — measured, never matched; absence is a result.
- `native/tests/continuation.test.js:29` — `rng`
  `findNeedles(field, ["rng"])` — measured, never matched; absence is a result.
- `native/tests/continuation.test.js:30` — `declared`
  `findNeedles(field, ["declared"])` — measured, never matched; absence is a result.
- `native/tests/conversation-compare.test.js:50` — `\| reasked \| 1 \| 0 \|`
  `findNeedles(field, ["| reasked | 1 | 0 |"])` — measured, never matched; absence is a result.
- `native/tests/declension.test.js:23` — `unimorph\/rus`
  `findNeedles(field, ["unimorph/rus"])` — measured, never matched; absence is a result.
- `native/tests/dispute.test.js:138` — `Johnson`
  `findNeedles(field, ["Johnson"])` — measured, never matched; absence is a result.
- `native/tests/dispute.test.js:164` — `declared by the caller`
  `findNeedles(field, ["declared by the caller"])` — measured, never matched; absence is a result.
- `native/tests/dispute.test.js:174` — `decidable at n=1`
  `findNeedles(field, ["decidable at n=1"])` — measured, never matched; absence is a result.
- `native/tests/dispute.test.js:180` — `cannot be aimed`
  `findNeedles(field, ["cannot be aimed"])` — measured, never matched; absence is a result.
- `native/tests/dispute.test.js:183` — ``kinds` is declared`
  `findNeedles(field, ["`kinds` is declared"])` — measured, never matched; absence is a result.
- `native/tests/dispute.test.js:184` — ``kinds` is declared`
  `findNeedles(field, ["`kinds` is declared"])` — measured, never matched; absence is a result.
- `native/tests/dispute.test.js:194` — `contested \(provenance\)`
  `findNeedles(field, ["contested (provenance)"])` — measured, never matched; absence is a result.
- `native/tests/dispute.test.js:268` — `settled against it`
  `findNeedles(field, ["settled against it"])` — measured, never matched; absence is a result.
- `native/tests/dispute.test.js:285` — `log-4 reads the same handover`
  `findNeedles(field, ["log-4 reads the same handover"])` — measured, never matched; absence is a result.
- `native/tests/dispute.test.js:338` — `declared boolean`
  `findNeedles(field, ["declared boolean"])` — measured, never matched; absence is a result.
- `native/tests/dispute.test.js:436` — `injected`
  `findNeedles(field, ["injected"])` — measured, never matched; absence is a result.
- `native/tests/distinguishing-plan.test.js:6` — `budget is a declared`
  `findNeedles(field, ["budget is a declared"])` — measured, never matched; absence is a result.
- `native/tests/distinguishing-plan.test.js:7` — `non-empty array`
  `findNeedles(field, ["non-empty array"])` — measured, never matched; absence is a result.
- `native/tests/distinguishing-plan.test.js:8` — `non-empty array`
  `findNeedles(field, ["non-empty array"])` — measured, never matched; absence is a result.
- `native/tests/distinguishing-plan.test.js:13` — `exceeds the declared cap`
  `findNeedles(field, ["exceeds the declared cap"])` — measured, never matched; absence is a result.
- `native/tests/distinguishing-plan.test.js:84` — `never resolves`
  `findNeedles(field, ["never resolves"])` — measured, never matched; absence is a result.
- `native/tests/distinguishing-plan.test.js:89` — `must return true or false`
  `findNeedles(field, ["must return true or false"])` — measured, never matched; absence is a result.
- `native/tests/dmd-stream.test.js:59` — `declared`
  `findNeedles(field, ["declared"])` — measured, never matched; absence is a result.
- `native/tests/dmd-stream.test.js:61` — `declared`
  `findNeedles(field, ["declared"])` — measured, never matched; absence is a result.
- `native/tests/dmd-stream.test.js:65` — `declared 2 dims`
  `findNeedles(field, ["declared 2 dims"])` — measured, never matched; absence is a result.
- `native/tests/dmd.test.js:100` — `declared`
  `findNeedles(field, ["declared"])` — measured, never matched; absence is a result.
- `native/tests/dmd.test.js:101` — `declared`
  `findNeedles(field, ["declared"])` — measured, never matched; absence is a result.
- `native/tests/document-ledger.test.js:57` — `disputed`/i
  `findNeedles(field, ["disputed"], ci: true)` — measured, never matched; absence is a result.
- `native/tests/embedded-query.test.js:47` — `honesty must be one of`
  `findNeedles(field, ["honesty must be one of"])` — measured, never matched; absence is a result.
- `native/tests/embedded-query.test.js:48` — `propositionTruth is a declared boolean`
  `findNeedles(field, ["propositionTruth is a declared boolean"])` — measured, never matched; absence is a result.
- `native/tests/embedded-query.test.js:52` — `saysDaBool is declared`
  `findNeedles(field, ["saysDaBool is declared"])` — measured, never matched; absence is a result.
- `native/tests/embedded-query.test.js:59` — `honesty must be one of`
  `findNeedles(field, ["honesty must be one of"])` — measured, never matched; absence is a result.
- `native/tests/gary-doors.test.js:51` — `Worked example`
  `findNeedles(field, ["Worked example"])` — measured, never matched; absence is a result.
- `native/tests/gary-doors.test.js:52` — `every name below is fake`
  `findNeedles(field, ["every name below is fake"])` — measured, never matched; absence is a result.
- `native/tests/gary-doors.test.js:53` — `def stub\(\)`
  `findNeedles(field, ["def stub()"])` — measured, never matched; absence is a result.
- `native/tests/hypergraph.test.js:60` — `inject`
  `findNeedles(field, ["inject"])` — measured, never matched; absence is a result.
- `native/tests/hypergraph.test.js:109` — `project`
  `findNeedles(field, ["project"])` — measured, never matched; absence is a result.
- `native/tests/identity-revision.test.js:109` — `positive integer`
  `findNeedles(field, ["positive integer"])` — measured, never matched; absence is a result.
- `native/tests/identity-revision.test.js:110` — `positive integer`
  `findNeedles(field, ["positive integer"])` — measured, never matched; absence is a result.
- `native/tests/identity-revision.test.js:129` — `corroboration expected`
  `findNeedles(field, ["corroboration expected"])` — measured, never matched; absence is a result.
- `native/tests/levers.test.js:94` — `declared`
  `findNeedles(field, ["declared"])` — measured, never matched; absence is a result.
- `native/tests/lexicon.test.js:25` — `replayed from the append-only witness log`
  `findNeedles(field, ["replayed from the append-only witness log"])` — measured, never matched; absence is a result.
- `native/tests/lexicon.test.js:45` — `non-negative integer`
  `findNeedles(field, ["non-negative integer"])` — measured, never matched; absence is a result.
- `native/tests/lexicon.test.js:53` — `kind-induction`
  `findNeedles(field, ["kind-induction"])` — measured, never matched; absence is a result.
- `native/tests/long-stream.test.js:31` — `____`
  `findNeedles(field, ["____"])` — measured, never matched; absence is a result.
- `native/tests/long-stream.test.js:88` — `a\.txt|b\.txt`
  `findNeedles(field, ["a.txt", "b.txt"])` — measured, never matched; absence is a result.
- `native/tests/mayeroff.test.js:16` — `no interior apart`
  `findNeedles(field, ["no interior apart"])` — measured, never matched; absence is a result.
- `native/tests/mayeroff.test.js:48` — `no shelf|split-interior|typecheck`
  `findNeedles(field, ["no shelf", "split-interior", "typecheck"])` — measured, never matched; absence is a result.
- `native/tests/mayeroff.test.js:52` — `self–interlocutor|self-interlocutor`
  `findNeedles(field, ["self–interlocutor", "self-interlocutor"])` — measured, never matched; absence is a result.
- `native/tests/mayeroff.test.js:77` — `dismiss-and-destroy`
  `findNeedles(field, ["dismiss-and-destroy"])` — measured, never matched; absence is a result.
- `native/tests/mayeroff.test.js:92` — `armed override`
  `findNeedles(field, ["armed override"])` — measured, never matched; absence is a result.
- `native/tests/mayeroff.test.js:121` — `unrealizable`
  `findNeedles(field, ["unrealizable"])` — measured, never matched; absence is a result.
- `native/tests/mayeroff.test.js:140` — `nothing|not this reader`
  `findNeedles(field, ["nothing", "not this reader"])` — measured, never matched; absence is a result.
- `native/tests/measure-media.test.js:58` — `channels: luminance`
  `findNeedles(field, ["channels: luminance"])` — measured, never matched; absence is a result.
- `native/tests/measure-media.test.js:59` — `channels: motion`
  `findNeedles(field, ["channels: motion"])` — measured, never matched; absence is a result.
- `native/tests/measure-media.test.js:62` — `container is named, not parsed; a decoder that offers it as its own series exists on the node side`
  `findNeedles(field, ["container is named, not parsed; a decoder that offers it as its own series exists on the node side"])` — measured, never matched; absence is a result.
- `native/tests/measure-media.test.js:71` — `luminance per 1-scanline frame`
  `findNeedles(field, ["luminance per 1-scanline frame"])` — measured, never matched; absence is a result.
- `native/tests/measure-media.test.js:72` — `sits above every one of the 200 broken copies`
  `findNeedles(field, ["sits above every one of the 200 broken copies"])` — measured, never matched; absence is a result.
- `native/tests/measure-media.test.js:75` — `channel:luminance`
  `findNeedles(field, ["channel:luminance"])` — measured, never matched; absence is a result.
- `native/tests/measure-media.test.js:95` — `decoded from wav`
  `findNeedles(field, ["decoded from wav"])` — measured, never matched; absence is a result.
- `native/tests/measure-media.test.js:96` — `1200 value\(s\)`
  `findNeedles(field, ["1200 value(s)"])` — measured, never matched; absence is a result.
- `native/tests/mechanical.test.js:81` — `all 2 occurrences`
  `findNeedles(field, ["all 2 occurrences"])` — measured, never matched; absence is a result.
- `native/tests/mechanical.test.js:97` — `def total2\(a, b\):`
  `findNeedles(field, ["def total2(a, b):"])` — measured, never matched; absence is a result.
- `native/tests/mechanical.test.js:141` — `merge two bindings`
  `findNeedles(field, ["merge two bindings"])` — measured, never matched; absence is a result.
- `native/tests/mechanical.test.js:212` — `exact unique anchor`
  `findNeedles(field, ["exact unique anchor"])` — measured, never matched; absence is a result.
- `native/tests/mhc-control.test.js:12` — `invocation, not the material`
  `findNeedles(field, ["invocation, not the material"])` — measured, never matched; absence is a result.
- `native/tests/network-standing.test.js:36` — `injected`
  `findNeedles(field, ["injected"])` — measured, never matched; absence is a result.
- `native/tests/network-standing.test.js:37` — `alpha`
  `findNeedles(field, ["alpha"])` — measured, never matched; absence is a result.
- `native/tests/network-standing.test.js:38` — `window`
  `findNeedles(field, ["window"])` — measured, never matched; absence is a result.
- `native/tests/network-standing.test.js:83` — `injected`
  `findNeedles(field, ["injected"])` — measured, never matched; absence is a result.
- `native/tests/nl-file-pointing.test.js:180` — `a\.js`
  `findNeedles(field, ["a.js"])` — measured, never matched; absence is a result.
- `native/tests/nl-file-pointing.test.js:181` — `a\.js`
  `findNeedles(field, ["a.js"])` — measured, never matched; absence is a result.
- `native/tests/nl-file-pointing.test.js:182` — `nope\.js`
  `findNeedles(field, ["nope.js"])` — measured, never matched; absence is a result.
- `native/tests/nl-file-pointing.test.js:183` — `p\.png`
  `findNeedles(field, ["p.png"])` — measured, never matched; absence is a result.
- `native/tests/nl-file-pointing.test.js:184` — `a\.js`
  `findNeedles(field, ["a.js"])` — measured, never matched; absence is a result.
- `native/tests/nl-file-pointing.test.js:188` — `v\.js`
  `findNeedles(field, ["v.js"])` — measured, never matched; absence is a result.
- `native/tests/nl-file-pointing.test.js:189` — `v\.js`
  `findNeedles(field, ["v.js"])` — measured, never matched; absence is a result.
- `native/tests/nl-file-pointing.test.js:190` — `Sandbox`
  `findNeedles(field, ["Sandbox"])` — measured, never matched; absence is a result.
- `native/tests/nl-file-pointing.test.js:197` — `big\.js`
  `findNeedles(field, ["big.js"])` — measured, never matched; absence is a result.
- `native/tests/notes.test.js:44` — `a descriptor`
  `findNeedles(field, ["a descriptor"])` — measured, never matched; absence is a result.
- `native/tests/notes.test.js:122` — `by is one of`
  `findNeedles(field, ["by is one of"])` — measured, never matched; absence is a result.
- `native/tests/notes.test.js:129` — `\bObject\.`/g
  `findNeedles(field, ["Object."])` — measured, never matched; absence is a result.
- `native/tests/notes.test.js:129` — `"object"`/g
  `findNeedles(field, ["\"object\""])` — measured, never matched; absence is a result.
- `native/tests/notes.test.js:199` — `is declared`
  `findNeedles(field, ["is declared"])` — measured, never matched; absence is a result.
- `native/tests/object-boundary.test.js:56` — `fact about the reader`
  `findNeedles(field, ["fact about the reader"])` — measured, never matched; absence is a result.
- `native/tests/omnimodal-kernel.test.js:120` — `declared`
  `findNeedles(field, ["declared"])` — measured, never matched; absence is a result.
- `native/tests/overtones.test.js:36` — `declared`
  `findNeedles(field, ["declared"])` — measured, never matched; absence is a result.
- `native/tests/overtones.test.js:37` — `declared`
  `findNeedles(field, ["declared"])` — measured, never matched; absence is a result.
- `native/tests/pending-sig.test.js:17` — `id is required`
  `findNeedles(field, ["id is required"])` — measured, never matched; absence is a result.
- `native/tests/pending-sig.test.js:18` — `at is declared`
  `findNeedles(field, ["at is declared"])` — measured, never matched; absence is a result.
- `native/tests/pending-sig.test.js:19` — `expiresAt is declared`
  `findNeedles(field, ["expiresAt is declared"])` — measured, never matched; absence is a result.
- `native/tests/pending-sig.test.js:20` — `cannot precede at`
  `findNeedles(field, ["cannot precede at"])` — measured, never matched; absence is a result.
- `native/tests/pending-sig.test.js:21` — `matches is the caller's own predicate`
  `findNeedles(field, ["matches is the caller's own predicate"])` — measured, never matched; absence is a result.
- `native/tests/pending-sig.test.js:46` — `expiresAt \(2\)`
  `findNeedles(field, ["expiresAt (2)"])` — measured, never matched; absence is a result.
- `native/tests/perspective.test.js:25` — `named`
  `findNeedles(field, ["named"])` — measured, never matched; absence is a result.
- `native/tests/perspective.test.js:82` — `cursor`
  `findNeedles(field, ["cursor"])` — measured, never matched; absence is a result.
- `native/tests/perspective.test.js:104` — `adapter`
  `findNeedles(field, ["adapter"])` — measured, never matched; absence is a result.
- `native/tests/perturbation-challenger.test.js:93` — `draws is declared`
  `findNeedles(field, ["draws is declared"])` — measured, never matched; absence is a result.
- `native/tests/perturbation-challenger.test.js:94` — `requires `nul``
  `findNeedles(field, ["requires `nul`"])` — measured, never matched; absence is a result.
- `native/tests/perturbation-challenger.test.js:95` — `requires `extract``
  `findNeedles(field, ["requires `extract`"])` — measured, never matched; absence is a result.
- `native/tests/phasepost-dmd.test.mjs:65` — `classify is injected`
  `findNeedles(field, ["classify is injected"])` — measured, never matched; absence is a result.
- `native/tests/phasepost-dmd.test.mjs:84` — `candidate set`
  `findNeedles(field, ["candidate set"])` — measured, never matched; absence is a result.
- `native/tests/phasepost.test.mjs:57` — `destroyed->destroy`
  `findNeedles(field, ["destroyed->destroy"])` — measured, never matched; absence is a result.
- `native/tests/phasepost.test.mjs:84` — `unattested`
  `findNeedles(field, ["unattested"])` — measured, never matched; absence is a result.
- `native/tests/phasepost.test.mjs:93` — `drew->draw`
  `findNeedles(field, ["drew->draw"])` — measured, never matched; absence is a result.
- `native/tests/phasepost.test.mjs:165` — `morphological re-`
  `findNeedles(field, ["morphological re-"])` — measured, never matched; absence is a result.
- `native/tests/pos-prior.test.js:27` — `Universal Dependencies`
  `findNeedles(field, ["Universal Dependencies"])` — measured, never matched; absence is a result.
- `native/tests/pronouns.test.js:35` — `minActivation`
  `findNeedles(field, ["minActivation"])` — measured, never matched; absence is a result.
- `native/tests/pronouns.test.js:36` — `minMargin`
  `findNeedles(field, ["minMargin"])` — measured, never matched; absence is a result.
- `native/tests/pronouns.test.js:98` — `injected`
  `findNeedles(field, ["injected"])` — measured, never matched; absence is a result.
- `native/tests/pronouns.test.js:99` — `minActivation`
  `findNeedles(field, ["minActivation"])` — measured, never matched; absence is a result.
- `native/tests/pronouns.test.js:238` — `declared together`
  `findNeedles(field, ["declared together"])` — measured, never matched; absence is a result.
- `native/tests/pronouns.test.js:239` — `declared together`
  `findNeedles(field, ["declared together"])` — measured, never matched; absence is a result.
- `native/tests/pronouns.test.js:240` — `activationFloor`
  `findNeedles(field, ["activationFloor"])` — measured, never matched; absence is a result.
- `native/tests/pronouns.test.js:241` — `activationMargin`
  `findNeedles(field, ["activationMargin"])` — measured, never matched; absence is a result.
- `native/tests/pronouns.test.js:242` — `activationFloor`
  `findNeedles(field, ["activationFloor"])` — measured, never matched; absence is a result.
- `native/tests/pronouns.test.js:243` — `activationMargin`
  `findNeedles(field, ["activationMargin"])` — measured, never matched; absence is a result.
- `native/tests/py-engine.test.js:73` — `def broken`
  `findNeedles(field, ["def broken"])` — measured, never matched; absence is a result.
- `native/tests/py-engine.test.js:103` — `"""Tip calculator\."""\nimport json`
  `findNeedles(field, ["\"\"\"Tip calculator.\"\"\"nimport json"])` — measured, never matched; absence is a result.
- `native/tests/py-engine.test.js:127` — `SyntaxError`
  `findNeedles(field, ["SyntaxError"])` — measured, never matched; absence is a result.
- `native/tests/py-engine.test.js:129` — `const x`
  `findNeedles(field, ["const x"])` — measured, never matched; absence is a result.
- `native/tests/py-engine.test.js:173` — `line 1`
  `findNeedles(field, ["line 1"])` — measured, never matched; absence is a result.
- `native/tests/py-engine.test.js:197` — `ARGS=\(\[1, 2, 3, 4\],\)`
  `findNeedles(field, ["ARGS=([1, 2, 3, 4],)"])` — measured, never matched; absence is a result.
- `native/tests/py-engine.test.js:198` — `\[types generator->list\(len 2\)\]`
  `findNeedles(field, ["[types generator->list(len 2)]"])` — measured, never matched; absence is a result.
- `native/tests/py-engine.test.js:199` — `\[list\(your_return\)==want\]`
  `findNeedles(field, ["[list(your_return)==want]"])` — measured, never matched; absence is a result.
- `native/tests/py-engine.test.js:200` — `WANT=\[2, 4\]`
  `findNeedles(field, ["WANT=[2, 4]"])` — measured, never matched; absence is a result.
- `native/tests/py-engine.test.js:221` — `GOT='A\.L'`
  `findNeedles(field, ["GOT='A.L'"])` — measured, never matched; absence is a result.
- `native/tests/py-engine.test.js:222` — `\[common prefix 3 long; lengths 3->4\]`
  `findNeedles(field, ["[common prefix 3 long; lengths 3->4]"])` — measured, never matched; absence is a result.
- `native/tests/py-engine.test.js:223` — `\[want is your return \(uppercased\) plus '\.' at the end\]`
  `findNeedles(field, ["[want is your return (uppercased) plus '.' at the end]"])` — measured, never matched; absence is a result.
- `native/tests/py-engine.test.js:224` — `\[input->want: want-parts are the FIRST LETTERS of the input words: \['Ada', 'Lovelace'\] -> \['A', 'L'\]\]`
  `findNeedles(field, ["[input->want: want-parts are the FIRST LETTERS of the input words: ['Ada', 'Lovelace'] -> ['A', 'L']]"])` — measured, never matched; absence is a result.
- `native/tests/py-engine.test.js:225` — `WANT='A\.L\.'`
  `findNeedles(field, ["WANT='A.L.'"])` — measured, never matched; absence is a result.
- `native/tests/reaction.test.js:65` — `giver`
  `findNeedles(field, ["giver"])` — measured, never matched; absence is a result.
- `native/tests/reaction.test.js:262` — `window is declared`
  `findNeedles(field, ["window is declared"])` — measured, never matched; absence is a result.
- `native/tests/reaction.test.js:264` — `cue is declared`
  `findNeedles(field, ["cue is declared"])` — measured, never matched; absence is a result.
- `native/tests/reaction.test.js:265` — `maxSteps`
  `findNeedles(field, ["maxSteps"])` — measured, never matched; absence is a result.
- `native/tests/reaction.test.js:266` — `floor is declared`
  `findNeedles(field, ["floor is declared"])` — measured, never matched; absence is a result.
- `native/tests/reasoning-lint.test.js:63` — `validity-window check before force or entrenchment`
  `findNeedles(field, ["validity-window check before force or entrenchment"])` — measured, never matched; absence is a result.
- `native/tests/reasoning-lint.test.js:79` — `route to landContest`
  `findNeedles(field, ["route to landContest"])` — measured, never matched; absence is a result.
- `native/tests/reasoning-lint.test.js:105` — `sunset clause had to expire it`
  `findNeedles(field, ["sunset clause had to expire it"])` — measured, never matched; absence is a result.
- `native/tests/reasoning-lint.test.js:127` — `restsOn\.contested = 0`
  `findNeedles(field, ["restsOn.contested = 0"])` — measured, never matched; absence is a result.
- `native/tests/reasoning-lint.test.js:144` — `force`
  `findNeedles(field, ["force"])` — measured, never matched; absence is a result.
- `native/tests/reasoning-lint.test.js:352` — `validity_window`
  `findNeedles(field, ["validity_window"])` — measured, never matched; absence is a result.
- `native/tests/reasoning-lint.test.js:423` — `srcA\.txt, srcB\.txt`
  `findNeedles(field, ["srcA.txt, srcB.txt"])` — measured, never matched; absence is a result.
- `native/tests/reasoning-lint.test.js:437` — `dracula|count`/i
  `findNeedles(field, ["dracula", "count"], ci: true)` — measured, never matched; absence is a result.
- `native/tests/reasoning-lint.test.js:702` — `\[standard·error\] claim_fails_oracle: the same failure`
  `findNeedles(field, ["[standard·error] claim_fails_oracle: the same failure"])` — measured, never matched; absence is a result.
- `native/tests/reasoning-lint.test.js:883` — `exposes no fold`
  `findNeedles(field, ["exposes no fold"])` — measured, never matched; absence is a result.
- `native/tests/referent-merge.test.js:119` — `reassigned on refresh`
  `findNeedles(field, ["reassigned on refresh"])` — measured, never matched; absence is a result.
- `native/tests/refutation-wall.test.js:34` — `licence|not a licence`/i
  `findNeedles(field, ["licence", "not a licence"], ci: true)` — measured, never matched; absence is a result.
- `native/tests/refutation-wall.test.js:35` — `licence|not a licence`/i
  `findNeedles(field, ["licence", "not a licence"], ci: true)` — measured, never matched; absence is a result.
- `native/tests/refutation-wall.test.js:72` — `veto-report:`
  `findNeedles(field, ["veto-report:"])` — measured, never matched; absence is a result.
- `native/tests/refutation-wall.test.js:74` — `veto-report:`
  `findNeedles(field, ["veto-report:"])` — measured, never matched; absence is a result.
- `native/tests/refutation.test.js:61` — `open-world absence is not refutation and this is not a licence`
  `findNeedles(field, ["open-world absence is not refutation and this is not a licence"])` — measured, never matched; absence is a result.
- `native/tests/refutation.test.js:72` — `a positive counterexample was found`
  `findNeedles(field, ["a positive counterexample was found"])` — measured, never matched; absence is a result.
- `native/tests/refutation.test.js:100` — `not declared 1:1`
  `findNeedles(field, ["not declared 1:1"])` — measured, never matched; absence is a result.
- `native/tests/refutation.test.js:119` — `neither a uniqueness violation nor a cycle is structurally expressible`
  `findNeedles(field, ["neither a uniqueness violation nor a cycle is structurally expressible"])` — measured, never matched; absence is a result.
- `native/tests/refutation.test.js:292` — `requires `yields``
  `findNeedles(field, ["requires `yields`"])` — measured, never matched; absence is a result.
- `native/tests/refutation.test.js:332` — `trigger is declared`
  `findNeedles(field, ["trigger is declared"])` — measured, never matched; absence is a result.
- `native/tests/refutation.test.js:333` — `trigger is declared`
  `findNeedles(field, ["trigger is declared"])` — measured, never matched; absence is a result.
- `native/tests/regime.test.js:11` — `unknown operator`
  `findNeedles(field, ["unknown operator"])` — measured, never matched; absence is a result.
- `native/tests/relations-case-marked.test.js:94` — `UD_Latin-Perseus`
  `findNeedles(field, ["UD_Latin-Perseus"])` — measured, never matched; absence is a result.
- `native/tests/relations-case-marked.test.js:95` — `NC-SA`
  `findNeedles(field, ["NC-SA"])` — measured, never matched; absence is a result.
- `native/tests/relations.test.js:357` — `my stay`
  `findNeedles(field, ["my stay"])` — measured, never matched; absence is a result.
- `native/tests/relations.test.js:483` — `declared`
  `findNeedles(field, ["declared"])` — measured, never matched; absence is a result.
- `native/tests/reproduction.test.js:55` — `Baltimore riot of 1861`
  `findNeedles(field, ["Baltimore riot of 1861"])` — measured, never matched; absence is a result.
- `native/tests/reproduction.test.js:58` — `Baltimore riot of 1861`
  `findNeedles(field, ["Baltimore riot of 1861"])` — measured, never matched; absence is a result.
- `native/tests/reproduction.test.js:76` — `minRun is declared`
  `findNeedles(field, ["minRun is declared"])` — measured, never matched; absence is a result.
- `native/tests/reproduction.test.js:113` — `fold is the caller's own`
  `findNeedles(field, ["fold is the caller's own"])` — measured, never matched; absence is a result.
- `native/tests/retrieval-frame.test.js:9` — `what was asked`
  `findNeedles(field, ["what was asked"])` — measured, never matched; absence is a result.
- `native/tests/retrieval-frame.test.js:10` — `what was asked`
  `findNeedles(field, ["what was asked"])` — measured, never matched; absence is a result.
- `native/tests/retrieval-frame.test.js:17` — `difference must make a difference`
  `findNeedles(field, ["difference must make a difference"])` — measured, never matched; absence is a result.
- `native/tests/retrieval-frame.test.js:26` — `not about anything in particular`
  `findNeedles(field, ["not about anything in particular"])` — measured, never matched; absence is a result.
- `native/tests/retrieval-frame.test.js:50` — `the whole reading`
  `findNeedles(field, ["the whole reading"])` — measured, never matched; absence is a result.
- `native/tests/retrieval-frame.test.js:71` — `undeclared_retrieval`
  `findNeedles(field, ["undeclared_retrieval"])` — measured, never matched; absence is a result.
- `native/tests/retrieval-frame.test.js:73` — `what is Prince Andrew to Pierre\?`
  `findNeedles(field, ["what is Prince Andrew to Pierre?"])` — measured, never matched; absence is a result.
- `native/tests/retrieval-frame.test.js:74` — `beside whom`
  `findNeedles(field, ["beside whom"])` — measured, never matched; absence is a result.
- `native/tests/retrieval-frame.test.js:75` — `cursor 2691`
  `findNeedles(field, ["cursor 2691"])` — measured, never matched; absence is a result.
- `native/tests/return-curve.test.js:63` — `material \(no prior supplied\)`
  `findNeedles(field, ["material (no prior supplied)"])` — measured, never matched; absence is a result.
- `native/tests/return-curve.test.js:73` — `prior \(genre:gothic`
  `findNeedles(field, ["prior (genre:gothic"])` — measured, never matched; absence is a result.
- `native/tests/rhythm-priors.test.js:26` — `named giver`
  `findNeedles(field, ["named giver"])` — measured, never matched; absence is a result.
- `native/tests/rhythm-priors.test.js:27` — `positive integer`
  `findNeedles(field, ["positive integer"])` — measured, never matched; absence is a result.
- `native/tests/rhythm-priors.test.js:81` — `at least one half`
  `findNeedles(field, ["at least one half"])` — measured, never matched; absence is a result.
- `native/tests/rhythm-priors.test.js:82` — `named giver`
  `findNeedles(field, ["named giver"])` — measured, never matched; absence is a result.
- `native/tests/rhythm-priors.test.js:83` — `EOExperiencePrior@1`
  `findNeedles(field, ["EOExperiencePrior@1"])` — measured, never matched; absence is a result.
- `native/tests/rhythm-priors.test.js:95` — `EORhythmPrior@1`
  `findNeedles(field, ["EORhythmPrior@1"])` — measured, never matched; absence is a result.
- `native/tests/rich-referents.test.js:229` — `occurrence-level`
  `findNeedles(field, ["occurrence-level"])` — measured, never matched; absence is a result.
- `native/tests/rich-referents.test.js:502` — `sibling|overlap`/i
  `findNeedles(field, ["sibling", "overlap"], ci: true)` — measured, never matched; absence is a result.
- `native/tests/sandboxed-agent.test.js:48` — `hello`
  `findNeedles(field, ["hello"])` — measured, never matched; absence is a result.
- `native/tests/sandboxed-agent.test.js:55` — `boom`
  `findNeedles(field, ["boom"])` — measured, never matched; absence is a result.
- `native/tests/sandboxed-agent.test.js:62` — `undefined`
  `findNeedles(field, ["undefined"])` — measured, never matched; absence is a result.
- `native/tests/sandboxed-agent.test.js:77` — `require is not defined`/i
  `findNeedles(field, ["require is not defined"], ci: true)` — measured, never matched; absence is a result.
- `native/tests/sandboxed-agent.test.js:97` — `def name\(params\):`
  `findNeedles(field, ["def name(params):"])` — measured, never matched; absence is a result.
- `native/tests/sandboxed-agent.test.js:98` — `function name\(params\) \{`
  `findNeedles(field, ["function name(params) {"])` — measured, never matched; absence is a result.
- `native/tests/sandboxed-agent.test.js:99` — `received keyword lists`
  `findNeedles(field, ["received keyword lists"])` — measured, never matched; absence is a result.
- `native/tests/scoped-kind.test.js:23` — `id is required`
  `findNeedles(field, ["id is required"])` — measured, never matched; absence is a result.
- `native/tests/scoped-kind.test.js:24` — `at is declared`
  `findNeedles(field, ["at is declared"])` — measured, never matched; absence is a result.
- `native/tests/scoped-kind.test.js:25` — `scope is required`
  `findNeedles(field, ["scope is required"])` — measured, never matched; absence is a result.
- `native/tests/scoped-kind.test.js:26` — `key is required`
  `findNeedles(field, ["key is required"])` — measured, never matched; absence is a result.
- `native/tests/script-coverage.test.js:75` — `% of this material's letters carry case`
  `findNeedles(field, ["% of this material's letters carry case"])` — measured, never matched; absence is a result.
- `native/tests/sequence.test.js:26` — `giver`
  `findNeedles(field, ["giver"])` — measured, never matched; absence is a result.
- `native/tests/sequence.test.js:27` — `locus`
  `findNeedles(field, ["locus"])` — measured, never matched; absence is a result.
- `native/tests/sequence.test.js:28` — `occupant and position`
  `findNeedles(field, ["occupant and position"])` — measured, never matched; absence is a result.
- `native/tests/sequence.test.js:137` — `refutes nothing`
  `findNeedles(field, ["refutes nothing"])` — measured, never matched; absence is a result.
- `native/tests/surprise-segments.test.js:33` — `declared`
  `findNeedles(field, ["declared"])` — measured, never matched; absence is a result.
- `native/tests/surprise-segments.test.js:34` — `declared`
  `findNeedles(field, ["declared"])` — measured, never matched; absence is a result.
- `native/tests/task-log.test.js:24` — `read only|not extensible|frozen`/i
  `findNeedles(field, ["read only", "not extensible", "frozen"], ci: true)` — measured, never matched; absence is a result.
- `native/tests/temporal-reference.test.js:30` — `id is required`
  `findNeedles(field, ["id is required"])` — measured, never matched; absence is a result.
- `native/tests/temporal-reference.test.js:31` — `at is declared`
  `findNeedles(field, ["at is declared"])` — measured, never matched; absence is a result.
- `native/tests/temporal-reference.test.js:32` — `key is required`
  `findNeedles(field, ["key is required"])` — measured, never matched; absence is a result.
- `native/tests/temporal-reference.test.js:33` — `id is required`
  `findNeedles(field, ["id is required"])` — measured, never matched; absence is a result.
- `native/tests/temporal-reference.test.js:34` — `at is declared`
  `findNeedles(field, ["at is declared"])` — measured, never matched; absence is a result.
- `native/tests/temporal-reference.test.js:35` — `timeId is required`
  `findNeedles(field, ["timeId is required"])` — measured, never matched; absence is a result.
- `native/tests/temporal-reference.test.js:72` — `minActivation is declared`
  `findNeedles(field, ["minActivation is declared"])` — measured, never matched; absence is a result.
- `native/tests/terrain-activation.test.js:72` — `declared`
  `findNeedles(field, ["declared"])` — measured, never matched; absence is a result.
- `native/tests/theory-of-mind.test.js:74` — `echo of human life`
  `findNeedles(field, ["echo of human life"])` — measured, never matched; absence is a result.
- `native/tests/theory-of-mind.test.js:280` — `mind|body`
  `findNeedles(field, ["mind", "body"])` — measured, never matched; absence is a result.
- `native/tests/theory-of-mind.test.js:281` — `body`
  `findNeedles(field, ["body"])` — measured, never matched; absence is a result.
- `native/tests/theory-of-mind.test.js:346` — `depth`
  `findNeedles(field, ["depth"])` — measured, never matched; absence is a result.
- `native/tests/theory-of-mind.test.js:362` — `REFUSED`
  `findNeedles(field, ["REFUSED"])` — measured, never matched; absence is a result.
- `native/tests/topic-phrase.test.js:37` — `2500|words\)|five-page`
  `findNeedles(field, ["2500", "words)", "five-page"])` — measured, never matched; absence is a result.
- `native/tests/tournament.test.js:57` — `return a\+b`
  `findNeedles(field, ["return a+b"])` — measured, never matched; absence is a result.
- `native/tests/walk-fixtures.test.js:45` — `does not narrow its pool`
  `findNeedles(field, ["does not narrow its pool"])` — measured, never matched; absence is a result.
- `native/tests/walk-fixtures.test.js:46` — `fact about the checkout`
  `findNeedles(field, ["fact about the checkout"])` — measured, never matched; absence is a result.
- `native/tests/web-gateways.test.js:22` — `intelechia|n8n`
  `findNeedles(field, ["intelechia", "n8n"])` — measured, never matched; absence is a result.
- `native/tests/web-gateways.test.js:87` — `2\/3 answered · last closed`
  `findNeedles(field, ["2/3 answered · last closed"])` — measured, never matched; absence is a result.
- `native/tests/web-gateways.test.js:88` — `never tried`
  `findNeedles(field, ["never tried"])` — measured, never matched; absence is a result.
- `native/tests/web-gateways.test.js:112` — `forwards your address: YES \(x-forwarded-for\)`
  `findNeedles(field, ["forwards your address: YES (x-forwarded-for)"])` — measured, never matched; absence is a result.
- `native/tests/web-gateways.test.js:113` — `forwards your address: no`
  `findNeedles(field, ["forwards your address: no"])` — measured, never matched; absence is a result.
- `native/tests/web-gateways.test.js:114` — `not measured`
  `findNeedles(field, ["not measured"])` — measured, never matched; absence is a result.
- `native/tests/web-gateways.test.js:115` — `never hears from you`
  `findNeedles(field, ["never hears from you"])` — measured, never matched; absence is a result.
- `proxy-runner.mjs:581` — `&amp;`/g
  `findNeedles(field, ["&amp;"])` — measured, never matched; absence is a result.
- `proxy-runner.mjs:582` — `&quot;`/g
  `findNeedles(field, ["&quot;"])` — measured, never matched; absence is a result.
- `proxy-runner.mjs:584` — `&lt;`/g
  `findNeedles(field, ["&lt;"])` — measured, never matched; absence is a result.
- `proxy-runner.mjs:585` — `&gt;`/g
  `findNeedles(field, ["&gt;"])` — measured, never matched; absence is a result.
- `proxy-runner.mjs:601` — `for works with similar titles`/i
  `findNeedles(field, ["for works with similar titles"], ci: true)` — measured, never matched; absence is a result.
- `proxy-runner.mjs:738` — `\\`/g
  `findNeedles(field, ["\\"])` — measured, never matched; absence is a result.
- `proxy-runner.mjs:796` — `\\`/g
  `findNeedles(field, ["\\"])` — measured, never matched; absence is a result.
- `proxy-runner.mjs:799` — `\\`/g
  `findNeedles(field, ["\\"])` — measured, never matched; absence is a result.
- `proxy-runner.mjs:811` — `\bconfig\b|\bpackage\.json\b`
  `findNeedles(field, ["config", "package.json"])` — measured, never matched; absence is a result.
- `proxy-runner.mjs:812` — `test|spec|e2e`/i
  `findNeedles(field, ["test", "spec", "e2e"], ci: true)` — measured, never matched; absence is a result.
- `proxy-runner.mjs:814` — `\bsource\b|\bcode\b|\bscript\b`
  `findNeedles(field, ["source", "code", "script"])` — measured, never matched; absence is a result.
- `proxy-runner.mjs:930` — `duckduckgo\.com\/`
  `findNeedles(field, ["duckduckgo.com/"])` — measured, never matched; absence is a result.
- `proxy-runner.mjs:948` — `wikipedia\.org|wikisource|wiktionary`
  `findNeedles(field, ["wikipedia.org", "wikisource", "wiktionary"])` — measured, never matched; absence is a result.
- `proxy-runner.mjs:949` — `pmc\.ncbi|pubmed|nature\.com|science\.org|doi\.org|sciencedirect|springer|plos|mdpi|frontiersin`
  `findNeedles(field, ["pmc.ncbi", "pubmed", "nature.com", "science.org", "doi.org", "sciencedirect", "springer", "plos", "mdpi", "frontiersin"])` — measured, never matched; absence is a result.
- `proxy-runner.mjs:950` — `essay|gradesfixer|studymode|bartleby|coursehero|chegg|brainly|examples\.com|templates\.|articlewriting|essaywriting|writinghelper`
  `findNeedles(field, ["essay", "gradesfixer", "studymode", "bartleby", "coursehero", "chegg", "brainly", "examples.com", "templates.", "articlewriting", "essaywriting", "writinghelper"])` — measured, never matched; absence is a result.
- `proxy-runner.mjs:951` — `\.org|\.io|museum|national|foundation|university|institute`
  `findNeedles(field, [".org", ".io", "museum", "national", "foundation", "university", "institute"])` — measured, never matched; absence is a result.
- `proxy-runner.mjs:1446` — `flag|option`
  `findNeedles(field, ["flag", "option"])` — measured, never matched; absence is a result.
- `proxy-runner.mjs:1446` — `\badd_argument\b`/gi
  `findNeedles(field, ["add_argument"], ci: true)` — measured, never matched; absence is a result.
- `proxy-runner.mjs:1589` — `jump to|wikipedia|navigation|search|contents|edit|main|talk|article|portal|help|special|tools`/i
  `findNeedles(field, ["jump to", "wikipedia", "navigation", "search", "contents", "edit", "main", "talk", "article", "portal", "help", "special", "tools"], ci: true)` — measured, never matched; absence is a result.
- `proxy-runner.mjs:1681` — `\bemergency\b`/i
  `findNeedles(field, ["emergency"], ci: true)` — measured, never matched; absence is a result.
- `proxy-runner.mjs:1976` — `_`/g
  `findNeedles(field, ["_"])` — measured, never matched; absence is a result.
- `proxy-runner.mjs:3670` — `haiku`/i
  `findNeedles(field, ["haiku"], ci: true)` — measured, never matched; absence is a result.
- `proxy-runner.mjs:3683` — `gemma`/i
  `findNeedles(field, ["gemma"], ci: true)` — measured, never matched; absence is a result.
- `proxy-runner.mjs:3700` — `riemann`/i
  `findNeedles(field, ["riemann"], ci: true)` — measured, never matched; absence is a result.
- `proxy-runner.mjs:3702` — `hodge`/i
  `findNeedles(field, ["hodge"], ci: true)` — measured, never matched; absence is a result.
- `proxy-runner.mjs:3704` — `goldbach`/i
  `findNeedles(field, ["goldbach"], ci: true)` — measured, never matched; absence is a result.
- `proxy-runner.mjs:4360` — `\bpage\b`/i
  `findNeedles(field, ["page"], ci: true)` — measured, never matched; absence is a result.
- `proxy-runner.mjs:7508` — `torture|slavery|servitude`/i
  `findNeedles(field, ["torture", "slavery", "servitude"], ci: true)` — measured, never matched; absence is a result.
- `proxy-runner.mjs:7952` — `not responding|ECONNREFUSED|fetch failed|upstream_down`/i
  `findNeedles(field, ["not responding", "ECONNREFUSED", "fetch failed", "upstream_down"], ci: true)` — measured, never matched; absence is a result.
- `proxy.mjs:2309` — `embed`/i
  `findNeedles(field, ["embed"], ci: true)` — measured, never matched; absence is a result.
