import fs from 'node:fs';
import {loadModel,analyse,tokenize,sentences} from '../text/english-parser.js';
import {toEot} from '../../kernel/eot-rich.js';
let model;
export function englishGrammar(text) {
 model??=loadModel(JSON.parse(fs.readFileSync(new URL('../../priors/parser-eng-ewt.json',import.meta.url),'utf8')));
 const nodes=[{key:'root',kind:'Document',start:0,end:text.length}],arcs=[],records=[];
 for(const [i,s]of sentences(text).entries()){
  const toks=tokenize(s.text);if(toks.length>256)return {grammar:'english',gap:'grammar_sentence_token_budget_exceeded'};
  const rows=analyse(model,toks.map(t=>t.form));
  const rich=toEot({tokens:rows,lines:rows.map(r=>[r.id,r.form,r.lemma,r.upos,r.xpos,r.feats,r.head,r.deprel,r.deps,r.misc].join('\t')),text:s.text,sentId:String(i)}, {language:'en'});
  records.push(rich);
  const key=id=>id?`sentence-${i}/token-${id}`:'root';
  rows.forEach((r,j)=>{
   const t=toks[j];nodes.push({key:key(r.id),name:r.form,kind:r.upos,start:s.start+t.start,end:s.start+t.end,annotations:{lemma:r.lemma,features:r.feats}});
   arcs.push({from:key(r.head),to:key(r.id),label:r.deprel,start:s.start,end:s.end,standing:'grammar_candidate',grammaticalCell:rich.meaning.arcs.find(a=>a.to===rich.surface.keyOfId[r.id])?.cell});
  });
 }
 return {grammar:'english',giver:'EnglishParser@1 / UD English EWT received model',standing:'grammar_candidate',nodes,arcs,records};
}
