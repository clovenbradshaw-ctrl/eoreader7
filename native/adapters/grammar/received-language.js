// Existing multilingual priors and relation organs, projected without an
// English parser fallback. POS distributions are testimony, not resolved tags.
import fs from 'node:fs';
import {relationExtractorsFor} from '../text/relations-language.js';
import {classifyWord,dominantClass} from '../text/wordclass.js';
import {relationPriorOptionsFor} from '../text/relation-priors-i18n.js';
export const receivedLanguages=Object.freeze(['fra','tur','cmn','fin','heb','fas','lat','grc','arb','ell','spa','san','kor','rus','jpn']);
const cache=new Map();
export function receivedLanguageGrammar(text,grammar){
 if(!cache.has(grammar)){
  const prior=JSON.parse(fs.readFileSync(new URL(`../../priors/pos-${grammar}${grammar==='jpn'?'-unimorph':''}.json`,import.meta.url),'utf8'));
  let roleConfig=null;try{roleConfig=JSON.parse(fs.readFileSync(new URL(`../../priors/role-config-${grammar}.json`,import.meta.url),'utf8'));}catch{}
  cache.set(grammar,{prior,roleConfig});
 }
 const {prior,roleConfig}=cache.get(grammar);
 const gaps=['partial_grammar: received lexical distributions and relation organ; full dependency parsing, binding, segmentation and truth checking unclaimed'];
 const tokens=[...text.matchAll(/[\p{L}\p{M}\p{N}_]+/gu)];
 if(tokens.length>5000)return {grammar,gap:'grammar_node_budget_exceeded'};
 const nodes=[{key:'root',kind:'Document',start:0,end:text.length}],arcs=[];
 tokens.forEach((t,i)=>{
  const distribution=prior.forms?.[t[0].toLowerCase()]??null;
  nodes.push({key:String(i),kind:'TokenOccurrence',name:t[0],start:t.index,end:t.index+t[0].length,annotations:{uposDistribution:distribution,standing:distribution?'received_prior':'unattested'}});
  arcs.push({from:'root',to:String(i),label:'contains_token',start:t.index,end:t.index+t[0].length});
 });
 const engine=relationExtractorsFor({language:grammar,roleConfig,posPrior:prior,classifyWord,dominantClass,...(relationPriorOptionsFor(grammar)??{})});
 const relations=engine.extractRelations(text,{posPrior:prior});
 for(const r of relations){
  const ends=[r.end1,r.end2].map(sf=>nodes.filter(n=>n.name===sf));
  if(ends.some(xs=>xs.length!==1)){gaps.push('relation_occurrence_unresolved: repeated or non-token endpoint');continue;}
  arcs.push({from:ends[0][0].key,to:ends[1][0].key,label:r.label,start:0,end:text.length,standing:'grammar_candidate',grammaticalCell:r.cell});
 }
 return {grammar,giver:prior.provenance?.giver??`POSPrior@1:${grammar}`,standing:'grammar_candidate',nodes,arcs,gaps};
}
