import {execFile} from 'node:child_process';
import {parse} from 'acorn';
export async function pythonGrammar(text) {
 // execFile stdin is supplied through the child stream, not options.input.
 return new Promise(resolve=>{
  const child=execFile('python3',[new URL('../../scripts/py-grammar.py',import.meta.url).pathname],
   {encoding:'utf8',timeout:5000,maxBuffer:8*1024*1024},(err,stdout)=>{
    if(err){resolve({gap:'grammar_engine_unavailable',grammar:'python',detail:err.code??err.message});return;}
    try{
     const doc=JSON.parse(stdout);if(!doc.ok){resolve({gap:doc.gap,grammar:'python',detail:doc.detail});return;}
     const bytes=Buffer.from(text);
     const chars=byte=>bytes.subarray(0,byte).toString('utf8').length;
     for(const n of doc.nodes){n.start=chars(n.start);n.end=chars(n.end);n.text=text.slice(n.start,n.end);}
     for(const a of doc.arcs){a.start=chars(a.start);a.end=chars(a.end);}
     resolve(doc);
    }catch(e){resolve({gap:'grammar_engine_output_invalid',grammar:'python',detail:e.message});}
   });
  child.stdin.on('error',()=>{});child.stdin.end(text);
 });
}
export function javascriptGrammar(text) {
 let tree;try{tree=parse(text,{ecmaVersion:2025,sourceType:'module'});}catch(e){return {gap:'grammar_syntax_error',grammar:'javascript',detail:e.message};}
 const nodes=[],arcs=[],stack=[{node:tree,key:'root'}],keys=new Map();
 while(stack.length){
  const {node,key,parent,field}=stack.pop();keys.set(node,key);
  nodes.push({key,kind:node.type,annotations:{operator:node.operator,computed:node.computed,optional:node.optional,literal:node.type==='Literal'?node.raw:undefined},name:node.type==='Identifier'?node.name:node.id?.name,start:node.start,end:node.end,text:text.slice(node.start,node.end)});
  if(nodes.length>5000)return {gap:'grammar_node_budget_exceeded',grammar:'javascript'};
  if(parent)arcs.push({from:parent,label:field,to:key,start:node.start,end:node.end});
  for(const [f,v]of Object.entries(node)){
   const values=Array.isArray(v)?v:[v];
   values.forEach((c,i)=>{if(c&&typeof c.type==='string')stack.push({node:c,key:`${key}.${f}${Array.isArray(v)?`[${i}]`:''}`,parent:key,field:f});});
  }
 }
 for(const [node,key]of keys){
  const add=(c,label)=>{if(keys.has(c))arcs.push({from:key,label,to:keys.get(c),start:node.start,end:node.end});};
  if(['FunctionDeclaration','FunctionExpression','ArrowFunctionExpression'].includes(node.type)){
   node.params.forEach(p=>add(p,'accepts_argument'));
   const pending=[node.body];
   while(pending.length){const c=pending.pop();if(!c)continue;
    if(c!==node.body&&['FunctionDeclaration','FunctionExpression','ArrowFunctionExpression','ClassDeclaration'].includes(c.type))continue;
    if(c.type==='ReturnStatement'&&c.argument)add(c.argument,'returns_expression');
    for(const v of Object.values(c))for(const x of Array.isArray(v)?v:[v])if(x&&typeof x.type==='string')pending.push(x);
   }
   if(node.type==='ArrowFunctionExpression'&&node.body.type!=='BlockStatement')add(node.body,'returns_expression');
  }
  if(node.type==='CallExpression'){add(node.callee,'callee');node.arguments.forEach(p=>add(p,'argument'));}
  if(node.type==='MemberExpression')add(node.object,'receiver');
 }
 return {grammar:'javascript',giver:'Acorn 8.15.0 / ECMAScript 2025',nodes,arcs};
}
