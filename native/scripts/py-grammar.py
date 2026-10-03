#!/usr/bin/env python3
"""Python grammar to witnessed nodes/arcs. AST only; NEVER executes input.
AST column offsets are UTF-8 bytes. Node spans are emitted in byte coordinates.
Expression-context/operator enum nodes are annotations on their construct.
"""
import ast,json,sys
text=sys.stdin.buffer.read().decode('utf8');raw=text.encode('utf8')
lines=text.splitlines(keepends=True);starts=[0]
for line in lines:starts.append(starts[-1]+len(line.encode('utf8')))
try:tree=ast.parse(text)
except (SyntaxError,ValueError,RecursionError) as e:
 print(json.dumps({'ok':False,'gap':'grammar_syntax_error','detail':str(e)[:500]}));sys.exit(0)
nodes=[];arcs=[];keys={};bounds={};stack=[(tree,'root',None,0,len(raw))]
while stack:
 node,key,parent,a,b=stack.pop()
 if isinstance(node,(ast.expr_context,ast.operator,ast.unaryop,ast.boolop,ast.cmpop)):continue
 if hasattr(node,'lineno'):
  a=starts[node.lineno-1]+node.col_offset;b=starts[node.end_lineno-1]+node.end_col_offset
 keys[id(node)]=key;bounds[key]=(a,b)
 name=getattr(node,'name',None) or getattr(node,'arg',None) or getattr(node,'id',None)
 nodes.append({'key':key,'kind':type(node).__name__,'name':name,'annotations':{**{f:type(v).__name__ for f,v in ast.iter_fields(node) if isinstance(v,(ast.expr_context,ast.operator,ast.unaryop,ast.boolop))}, **({'operators':[type(v).__name__ for v in node.ops]} if isinstance(node,ast.Compare) else {}), **({'attribute':node.attr} if isinstance(node,ast.Attribute) else {}), **({'literal':repr(node.value)} if isinstance(node,ast.Constant) else {})},'start':a,'end':b})
 if len(nodes)>5000:
  print(json.dumps({'ok':False,'gap':'grammar_node_budget_exceeded'}));sys.exit(0)
 if parent:arcs.append({'from':parent[0],'label':parent[1],'to':key,'start':a,'end':b})
 for field,value in reversed(list(ast.iter_fields(node))):
  kids=list(enumerate(value)) if isinstance(value,list) else [(None,value)]
  for i,child in reversed(kids):
   if isinstance(child,ast.AST):stack.append((child,key+'.'+field+(f'[{i}]' if i is not None else ''),(key,field),a,b))
# Structural semantic aliases are syntax rules, not inferred program behavior.
for node in ast.walk(tree):
 key=keys.get(id(node))
 if not key:continue
 a,b=bounds[key]
 def add(child,label):
  target=keys.get(id(child))
  if target:arcs.append({'from':key,'label':label,'to':target,'start':a,'end':b})
 if isinstance(node,(ast.FunctionDef,ast.AsyncFunctionDef,ast.Lambda)):
  for arg in node.args.posonlyargs+node.args.args+node.args.kwonlyargs:add(arg,'accepts_argument')
  for arg in [node.args.vararg,node.args.kwarg]:
   if arg:add(arg,'accepts_argument')
  # Stop at nested definitions: their returns belong to their own scope.
  pending=list(node.body) if isinstance(node.body,list) else [node.body]
  while pending:
   c=pending.pop()
   if isinstance(c,(ast.FunctionDef,ast.AsyncFunctionDef,ast.ClassDef,ast.Lambda)):continue
   if isinstance(c,ast.Return) and c.value:add(c.value,'returns_expression')
   pending.extend(ast.iter_child_nodes(c))
 if isinstance(node,ast.Call):
  add(node.func,'callee')
  for arg in node.args:add(arg,'argument')
 if isinstance(node,ast.Attribute):add(node.value,'receiver')
 if isinstance(node,ast.Return) and node.value:add(node.value,'value')
print(json.dumps({'ok':True,'grammar':'python','giver':'CPython ast '+sys.version.split()[0], 'nodes':nodes,'arcs':arcs}))
