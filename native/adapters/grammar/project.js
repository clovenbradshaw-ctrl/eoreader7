// Grammar engines nominate witnessed structure; the medium-neutral graph
// contract carries it into the SAME recursive Fold and holograph address book.
import {createHash} from 'node:crypto';
import {hyperedge} from '../../kernel/hypergraph.js';
const hash=s=>createHash('sha256').update(s).digest('hex');
export function projectGrammar({text,source,start=0,grammar,giver,nodes=[],arcs=[],standing='syntax_witnessed'}) {
 if(!source||!grammar||!giver)throw new TypeError('grammar projection needs source, grammar and giver');
 const scope=`${source}#${start}-${start+text.length}:${grammar}`;
 if(new Set(nodes.map(n=>n.key)).size!==nodes.length)throw new TypeError('duplicate grammar node key');
 const ids=new Map(nodes.map(n=>[n.key,`ref:grammar:${hash(`${scope}|${n.key}|${text}`)}`]));
 const receipt=(a,b)=>{
  if(!Number.isInteger(a)||!Number.isInteger(b)||a<0||b<a||b>text.length)throw new RangeError('grammar span outside material');
  return {at:`${source}#${start+a}-${start+b}`,source,start:start+a,end:start+b,utf8Start:Buffer.byteLength(text.slice(0,a)),utf8End:Buffer.byteLength(text.slice(0,b)),text:text.slice(a,b),coordinate:'character',utf8Coordinate:'segment-relative'};
 };
 const referents=nodes.map(n=>({schema:'EOReferent@1',id:ids.get(n.key),surfaces:[n.name||n.text||n.kind],
  kind:n.kind,annotations:n.annotations??{},grammar,identityScope:scope,caseSensitive:true,standing,
  provenance:[{giver,basis:'grammar structure in source; not external truth',...receipt(n.start,n.end)}],fedBy:[]}));
 const tuples=arcs.map((a,i)=>{
  const end1=ids.get(a.from),end2=ids.get(a.to);if(!end1||!end2||!a.label)throw new TypeError('grammar arc has missing endpoint');
  const witness=receipt(a.start??0,a.end??text.length);
  return {id:`edge:grammar:${hash(`${scope}|${i}|${a.label}|${end1}|${end2}`)}`,end1,label:a.label,end2,
   standing:a.standing??standing,frame:{source,grammar,identityScope:scope},spans:[witness],
   witnesses:[`${source}#${witness.start}-${witness.end}`],verification:a.verification??{status:'not_checked'},
   ...(a.grammaticalCell?{grammaticalCell:a.grammaticalCell}:{}),giver};
 });
 const byId=new Map(referents.map(r=>[r.id,r]));
 const edges=tuples.map(t=>hyperedge({id:t.id,relation:t.label,
  participants:[t.end1,t.end2].map((id,i)=>({ref:id,role:i?'end2':'end1',standing:'referent',surface:byId.get(id).surfaces[0]})),
  witness:t.witnesses[0],scope:t.frame,eo:{op:'CON',grain:'Figure'},meta:{source,grammar,standing:t.standing,verification:t.verification,spans:t.spans}}));
 return {scope,referents,tuples,edges};
}
