// The public doorway and model-output assays share this reader. Grammar is
// perceived, witnessed and folded by the native kernel, not a side-channel gist.
import {createRecursiveReader} from '../kernel/reading.js';
import {deltaFold} from '../kernel/fold.js';
import {parseGrammar,languages,canonicalLanguage} from '../adapters/grammar/registry.js';
import {projectGrammar} from '../adapters/grammar/project.js';
import {createSession,admitChunked,sessionReferents,sessionRelations} from '../legacy-ported/packages/host/corpus.js';
const extensions={py:'python',js:'javascript',mjs:'javascript',c:'c',h:'c',go:'go',ts:'typescript',tsx:'tsx',jsx:'jsx',json:'json'};
export function materialSegments(text,{language='english',format='mixed'}={}){
 if(format!=='mixed')return [{text,start:0,language}];
 const out=[];let cursor=0;
 const prose=(a,b)=>{const raw=text.slice(a,b);let pos=a;
  for(const line of raw.split(/(?<=\n)/)){
   if(line.trim())out.push({text:line,start:pos,language:/^\s*"?[\d+\-().\s]+(?:[*/+\-][\d+\-().\s]+)*\s*=\s*[\d+\-().\s]+"?\s*$/.test(line)?'math':language});pos+=line.length;
  }
 };
 // Delimiters belong to the container; body spans retain original coordinates.
 const fence=/^(`{3,}|~{3,})([^\n]*)\n([\s\S]*?)^\1[ \t]*(?:\n|$)/gm;let m;
 while((m=fence.exec(text))){prose(cursor,m.index);const start=m.index+m[1].length+m[2].length+1;
  out.push({text:m[3],start,language:m[2].trim().split(/\s+/)[0]||'unknown'});cursor=fence.lastIndex;
 }
 const tail=text.slice(cursor);const open=/^(`{3,}|~{3,})([^\n]*)\n/gm.exec(tail);
 if(open){prose(cursor,cursor+open.index);const start=cursor+open.index+open[0].length;out.push({text:text.slice(start),start,language:open[2].trim().split(/\s+/)[0]||'unknown',containerGap:'unclosed_code_fence'});}
 else prose(cursor,text.length);return out;
}
export async function readMaterial({text,source='doc:unnamed',language,format='mixed',name=''}={}){
 if(typeof text!=='string')throw new TypeError('text is required');
 const inferred=extensions[name.split('.').pop()?.toLowerCase()];
 language=canonicalLanguage(language??inferred??'english');if(inferred&&format==='mixed')format='raw';
 const segments=materialSegments(text,{language,format}),gaps=[],tuples=[],referents=[],grammarRecords=[];let current;
 const reader=createRecursiveReader({perceivers:[{id:'shared-grammar',perceive(enc){
  if(!current)return [];
  const mentions=current.referents.map(r=>({schema:'EOMention@1',id:`mention:${r.id}`,source,referent:r.id,encounterRef:`${source}#${enc.anchor.start}-${enc.anchor.end}`,anchor:enc.anchor}));
  return [{evidence:{source,anchor:enc.anchor,text:enc.material,basis:'parsed grammatical structure; external claims unverified'},
   candidate:{distinctions:[{kind:'grammar',language:current.grammar}],graphEntries:[...current.referents,...current.edges,...mentions]}}];
 }}],adapters:{revise:()=>deltaFold([])}});
 for(const [i,s]of segments.entries()){
  if(i>=256){gaps.push('grammar_segment_budget_exceeded: remaining material retained by HOST, not grammar parsed');break;}
  if(s.containerGap)gaps.push(s.containerGap);
  const parsed=await parseGrammar(s.text,s.language);gaps.push(...(parsed.gaps??[]).map(g=>`${parsed.grammar}: ${g}`));
  current=null;
  if(parsed.gap)gaps.push(`${parsed.gap}: ${parsed.grammar} at ${s.start}${parsed.detail?`: ${parsed.detail}`:''}`);
  else{
   current={...projectGrammar({...parsed,text:s.text,source,start:s.start}),grammar:parsed.grammar};
   tuples.push(...current.tuples);referents.push(...current.referents);grammarRecords.push({source,start:s.start,grammar:parsed.grammar,records:parsed.records??[],verification:parsed.verification??null});
  }
  await reader.step({schema:'Encounter@1',source,modality:'text',sequencePosition:i,anchor:{start:s.start,end:s.start+s.text.length},material:s.text});
 }
 // Preserve the constitutional HOST face for compatibility, without pretending
 // its proper-name cast can supply program identity or arithmetic evidence.
 const session=createSession();admitChunked(session,{text,sourceId:source,language:'en'});
 const cast=sessionReferents(session,{sourceId:source,priors:[],limit:200});
 const host={referents:(cast.referents??[]).map(r=>({surfaces:[r.display].filter(Boolean),routes:r.fromPrior?['prior']:['witnessed'],grain:r.individuation??null})),relations:sessionRelations(session,{sourceId:source}),gaps:cast.gaps??[]};
 return {schema:'EORead@1',source,assembly:'constitutional-host + native-grammar-fold',referents,relations:tuples,tuples,readingEntries:reader.getLog(),grammarRecords,host,
  supportedLanguages:languages,priorsInjected:['EnglishParser@1 (English segments only)','HOST language:en (legacy face)'],stagesNotRun:['general lexical binding resolution','execution of source code','independent external truth checking','HOST 5b','HOST 6','HOST 7','HOST 8'],
  basis:'language grammar -> scoped EOReferent / EOHyperedge -> native perception, witness, Fold -> holograph address book; syntax does not verify model testimony',gaps};
}
