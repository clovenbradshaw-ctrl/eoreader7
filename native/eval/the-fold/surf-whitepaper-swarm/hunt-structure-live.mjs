import { huntDeclaredStructure } from "../../../the-fold/canonical-sections.js";

const out = await huntDeclaredStructure("white paper", { learn: true });
console.log(JSON.stringify(out, null, 2));
