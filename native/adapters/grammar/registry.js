// S1/S2/S6/S7/S8/S9: a shared representation is not a shared parser or a truth oracle.
import {parse as mathParse} from 'mathjs';
import {pythonGrammar,javascriptGrammar} from './code.js';
import {englishGrammar} from './prose.js';
import {receivedLanguages,receivedLanguageGrammar} from './received-language.js';
import {parseDeclarations} from '../text/code-structure.js';
export const languages=Object.freeze({...Object.fromEntries(receivedLanguages.map(l=>[l,'lexical_and_relation_candidates'])),english:'dependency_candidates',python:'ast',javascript:'ast',math:'expression_ast',json:'value_tree',c:'declarations_only',go:'declarations_only',typescript:'declarations_only',tsx:'declarations_only',jsx:'declarations_only'});
const aliases={japanese:'jpn',ja:'jpn',french:'fra',fr:'fra',spanish:'spa',es:'spa',arabic:'arb',ar:'arb',hebrew:'heb',he:'heb',russian:'rus',ru:'rus',latin:'lat',la:'lat',greek:'ell',el:'ell',ancientgreek:'grc',sanskrit:'san',sa:'san',korean:'kor',ko:'kor',chinese:'cmn',zh:'cmn',mandarin:'cmn',finnish:'fin',fi:'fin',turkish:'tur',tr:'tur',persian:'fas',fa:'fas',eng:'english',en:'english',py:'python',js:'javascript',mjs:'javascript',ts:'typescript',equation:'math',arithmetic:'math'};
export const canonicalLanguage=l=>aliases[String(l).toLowerCase()]??String(l).toLowerCase();
const ext={c:'c',go:'go',typescript:'ts',tsx:'tsx',jsx:'jsx'};
function declarations(text,grammar){
 const decls=parseDeclarations(text,`material.${ext[grammar]}`);
 return {grammar,giver:'received code-structure declaration recipes (partial grammar)',standing:'grammar_candidate',gaps:['partial_grammar: declaration recipes; bodies, binding and call resolution not parsed'],
 nodes:[{key:'root',kind:'Document',start:0,end:text.length},...decls.map((d,i)=>({key:String(i),kind:d.kind,name:d.name,start:d.start,end:d.end}))],
 arcs:decls.map((d,i)=>({from:'root',to:String(i),label:'declares',start:d.start,end:d.end}))};
}
function jsonGrammar(text){
 let value;try{value=JSON.parse(text);}catch(e){return {grammar:'json',gap:'grammar_syntax_error',detail:e.message};}
 const nodes=[],arcs=[],stack=[{v:value,key:'root'}];
 while(stack.length){const {v,key,parent,field,item}=stack.pop();if(nodes.length>=5000)return {grammar:'json',gap:'grammar_node_budget_exceeded'};
  nodes.push({key,kind:v===null?'null':Array.isArray(v)?'array':typeof v,name:parent?String(field):'JSON document',start:0,end:text.length,annotations:{spanBasis:'containing_document',...(v===null||typeof v!=='object'?{value:v}:{}),field}});
  if(parent)arcs.push({from:parent,to:key,label:item?'item':'member',start:0,end:text.length});
  if(v&&typeof v==='object')for(const [f,c]of Object.entries(v))stack.push({v:c,key:`${key}/${JSON.stringify(f)}`,parent:key,field:f,item:Array.isArray(v)});
 }
 return {grammar:'json',giver:'ECMAScript JSON.parse (source witness is containing document)',nodes,arcs};
}
// Independent bounded exact rational arithmetic; never mathjs.evaluate, compile,
// user function calls, assignment, property access or host-language execution.
function rational(n){
 if(n.isConstantNode){const s=String(n.value);if(!/^-?\d+(?:\.\d+)?$/.test(s)||s.length>64)throw Error('non-rational constant');const [a,b='']=s.split('.');return [BigInt(a+b),10n**BigInt(b.length)];}
 if(n.isParenthesisNode)return rational(n.content);
 if(!n.isOperatorNode||!['+','-','*','/'].includes(n.op))throw Error('outside arithmetic verifier');
 const [a,b]=rational(n.args[0]);if(n.args.length===1)return [n.op==='-'?-a:a,b];
 const [c,d]=rational(n.args[1]);
 if(n.op==='+')return [a*d+c*b,b*d];if(n.op==='-')return [a*d-c*b,b*d];if(n.op==='*')return [a*c,b*d];if(c===0n)throw Error('division by zero');return [a*d,b*c];
}
function mathGrammar(text){
 const expression=text.trim().replace(/^"([\s\S]*)"$/, '$1');
 const equality=expression.match(/^\s*([^=]+?)\s*=\s*([^=]+?)\s*$/);let trees;
 try{trees=(equality?[equality[1],equality[2]]:[expression]).map(s=>mathParse(s));}catch(e){return {grammar:'math',gap:'grammar_syntax_error',detail:e.message};}
 let verification={status:'not_checked'};
 if(equality)try{const [a,b]=rational(trees[0]),[c,d]=rational(trees[1]);verification={status:a*d===c*b?'verified':'contradicted',method:'independent exact rational arithmetic',scope:'this numeric equality only'};}catch(e){verification={status:'not_checked',gap:e.message};}
 const nodes=[{key:'root',kind:equality?'Equality':'Expression',name:text.trim(),start:0,end:text.length}],arcs=[];
 const visit=(n,key,parent,label)=>{
  if(nodes.length>=500)throw Error('grammar_node_budget_exceeded');
  nodes.push({key,kind:n.type,name:n.isSymbolNode?n.name:undefined,start:0,end:text.length,annotations:{operator:n.op,spanBasis:'containing_expression'}});
  arcs.push({from:parent,to:key,label,start:0,end:text.length});
  n.forEach((child,path)=>visit(child,`${key}/${path}`,key,path));
 };
 try{trees.forEach((n,i)=>visit(n,String(i),'root',equality?(i?'right':'left'):'expression'));}catch(e){return {grammar:'math',gap:e.message};}
 if(equality)arcs.push({from:'0',to:'1',label:'equals',start:0,end:text.length,standing:'asserted_in_source',verification});
 return {grammar:'math',giver:'mathjs expression grammar; separate bounded rational verifier',nodes,arcs,verification};
}
export async function parseGrammar(text,language){
 const grammar=canonicalLanguage(language);
 if(text.length>100000)return {grammar,gap:'grammar_character_budget_exceeded'};
 try{
  if(grammar==='python')return await pythonGrammar(text);
  if(grammar==='javascript')return javascriptGrammar(text);
  if(grammar==='english')return englishGrammar(text);
  if(grammar==='math')return mathGrammar(text);
  if(grammar==='json')return jsonGrammar(text);
  if(ext[grammar])return declarations(text,grammar);
  if(receivedLanguages.includes(grammar))return receivedLanguageGrammar(text,grammar);
  return {grammar,gap:'grammar_unavailable'};
 }catch(e){return {grammar,gap:'grammar_engine_failed',detail:String(e.message).slice(0,500)};}
}
