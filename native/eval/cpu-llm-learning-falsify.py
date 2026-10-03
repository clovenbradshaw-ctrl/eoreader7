"""CPU proposal -> executable checks -> withheld transfer, no weight changes.
Run with CPU torch + transformers==4.57.1:
  python cpu-llm-learning-falsify.py --model-dir /path/to/local/model > report.json
The model directory must include revision.json {repo,sha} from its download.
No generated code executes until its AST passes the narrow whitelist below.
"""
import argparse, ast, hashlib, json, re, time, subprocess, sys
import torch
from transformers import AutoTokenizer, AutoModelForCausalLM
ap=argparse.ArgumentParser();ap.add_argument('--model-dir',required=True);args=ap.parse_args()
torch.set_num_threads(4);torch.manual_seed(7)
tokenizer=AutoTokenizer.from_pretrained(args.model_dir,local_files_only=True)
start=time.monotonic()
model=AutoModelForCausalLM.from_pretrained(args.model_dir,local_files_only=True).to('cpu').eval()
load_s=time.monotonic()-start
assert all(p.device.type=='cpu' for p in model.parameters())
records=[]
def generate(prompt,budget=96):
 messages=[{'role':'user','content':prompt}]
 inputs=tokenizer.apply_chat_template(messages,add_generation_prompt=True,return_tensors='pt')
 start=time.monotonic()
 with torch.inference_mode():
  out=model.generate(inputs,attention_mask=torch.ones_like(inputs),do_sample=False,max_new_tokens=budget,pad_token_id=tokenizer.eos_token_id)
 elapsed=time.monotonic()-start
 new=out[0,inputs.shape[-1]:]
 text=tokenizer.decode(new,skip_special_tokens=True).strip()
 records.append({'prompt':prompt,'text':text,'tokens':len(new),'seconds':elapsed})
 return text
# Exact-answer checks are independent from model output. All strings are
# synthetic complete tasks, not a benchmark of real documents or general code.
train=[('1 2 3',6),('4 5',9)]
validation=[('2 -5',-3),('',0),(' 3\n4\t-2 ',5),('0 0',0)]
heldout=[('8 11',19),('-9 -4',-13),('12 -12',0),('7\n8\n9',24),('  -3\t10  ',7),('1000 23',1023),('0',0),('  ',0)]
# Only one function with one return expression. This prevents generated code
# from doing filesystem, networking, imports, loops or unrelated operations.
allowed=(ast.Module,ast.FunctionDef,ast.arguments,ast.arg,ast.Return,ast.Call,ast.Name,ast.Load,ast.Attribute,ast.Constant,ast.GeneratorExp,ast.comprehension,ast.Store)
def candidate_from(text):
 fences=re.findall(r'```(?:python)?\s*\n(.*?)```',text,re.S)
 code=fences[0] if fences else text
 try:
  tree=ast.parse(code)
  assert len(tree.body)==1 and isinstance(tree.body[0],ast.FunctionDef)
  fn=tree.body[0];assert fn.name=='solve' and not fn.decorator_list and fn.returns is None
  assert len(fn.args.args)==1 and fn.args.args[0].arg=='text'
  assert not fn.args.posonlyargs and not fn.args.kwonlyargs and not fn.args.defaults and not fn.args.kw_defaults and fn.args.vararg is None and fn.args.kwarg is None
  assert fn.args.args[0].annotation is None
  assert len(fn.body)==1 and isinstance(fn.body[0],ast.Return)
  for node in ast.walk(tree):
   assert isinstance(node,allowed),type(node).__name__
   if isinstance(node,ast.Name):assert node.id in {'text','sum','map','int','x','n','s'}
   if isinstance(node,ast.Attribute):assert node.attr=='split' and isinstance(node.value,ast.Name) and node.value.id=='text'
   if isinstance(node,ast.Call):
    assert not node.keywords
    assert (isinstance(node.func,ast.Name) and node.func.id in {'sum','map','int'}) or isinstance(node.func,ast.Attribute)
   if isinstance(node,ast.Constant):assert isinstance(node.value,(str,int)) and len(str(node.value))<32
  return code, None
 except Exception as e:return None,'refused AST: '+(str(e) or type(e).__name__)
def check(code,cases):
 # A second interpreter process with timeout, only whitelisted builtin calls.
 # Every input is bounded. No shell or model-provided test is involved.
 runner="import json,sys\nc,cases=json.load(sys.stdin)\ng={'__builtins__':{'sum':sum,'int':int,'map':map}}\nexec(compile(c,'<candidate>','exec'),g)\nr=[]\nfor s,w in cases:\n try: v=g['solve'](s);r.append({'input':s,'expected':w,'actual':v,'pass':type(v)==int and v==w})\n except Exception as e:r.append({'input':s,'expected':w,'error':type(e).__name__,'pass':False})\nprint(json.dumps(r))"
 try:
  p=subprocess.run([sys.executable,'-I','-c',runner],input=json.dumps([code,cases]),text=True,capture_output=True,timeout=3)
  if p.returncode!=0:return [{'pass':False,'error':'execution failed','stderr':p.stderr[:1000]}]
  return json.loads(p.stdout)
 except subprocess.TimeoutExpired:return [{'pass':False,'error':'execution timeout'}]
base='Write only Python code, no explanation. Define solve(text) returning the sum of whitespace-separated signed integers in text. Empty or whitespace-only text returns 0. Use no imports. Use exactly one return statement.'
proposals=[];promoted=None
# Prompts differ only in instruction/example style. No held-out outcome or input
# feeds back into proposals. Promotion uses train + validation only.
for suffix in ['', '\nExamples: solve("1 2 3") == 6; solve("4 5") == 9.', '\nUse Python builtins sum, map, int and text.split().']:
 raw=generate(base+suffix,128);code,refusal=candidate_from(raw)
 result={'raw':raw,'code':code,'refusal':refusal}
 if code:
  result['training']=check(code,train);result['validation']=check(code,validation)
  if all(r['pass'] for r in result['training']+result['validation']):promoted=code
 proposals.append(result)
 if promoted:break
# Evaluate model-alone separately AFTER freezing the promoted procedure.
model_rows=[]
for text,expected in heldout:
 raw=generate('Sum these whitespace-separated integers. Empty input sums to 0. Reply with only the integer answer.\nInput: '+json.dumps(text),32)
 parsed=int(raw) if re.fullmatch(r'-?\d+',raw) else None
 # A second parser permits an equation's final value or a plainly stated
 # answer. It never compares candidate numbers against the expected answer.
 semantic=parsed
 if semantic is None:
  matches=re.findall(r'(?:=|(?:answer|sum of the integers) is)\s*(-?\d+)\.?[\"\']?$',raw,re.I)
  semantic=int(matches[0]) if len(matches)==1 else None
 model_rows.append({'input':text,'expected':expected,'raw':raw,'actual':parsed,'pass':parsed==expected,'refused':parsed is None,'semanticActual':semantic,'semanticPass':semantic==expected})
transfer=check(promoted,heldout) if promoted else None
# Reload exact procedure bytes in another interpreter; no call to the model.
restart=check(promoted,heldout) if promoted else None
# Explicit routing scope: invalid numeric formats become typed gaps, rather
# than silently cleaning commas, words, fractions or units into integers.
negative_inputs=['3.5 2','1,2','three 4','8 kg','1; import os']
scope=lambda text: re.fullmatch(r'\s*(?:[+-]?\d+(?:\s+[+-]?\d+)*)?\s*',text) is not None
scope_controls=[{'input':s,'admitted':scope(s),'gap':None if scope(s) else 'outside_signed_integer_scope'} for s in negative_inputs]
assert not any(r['admitted'] for r in scope_controls)
# A hand-coded classical baseline already solves this task. This prevents
# calling a toy use of Python builtins an advance over existing algorithms.
mechanical=[{'input':s,'expected':w,'actual':sum(map(int,s.split()))} for s,w in heldout]
assert all(r['actual']==r['expected'] for r in mechanical)
if transfer: assert transfer==restart
report={'schema':'EOCPULLMLearningFalsification@1','model':json.load(open(args.model_dir+'/revision.json')),
 'runtime':{'torch':torch.__version__,'device':'cpu','threads':torch.get_num_threads(),'parameterCount':sum(p.numel() for p in model.parameters()),'loadSeconds':load_s,'weightsChanged':False,'frontierCalls':0},
 'scope':'Standalone bounded synthetic procedure-transfer assay, not production Heimdall integration or broad intelligence benchmark. CPU model receives scaffolding and a narrow DSL/AST gate; no independent invention claim.',
 'proposals':proposals,'promoted':bool(promoted),'procedureHash':hashlib.sha256(promoted.encode()).hexdigest() if promoted else None,
 'heldout':{'modelAlone':model_rows,'learnedProcedure':transfer,'restart':restart,'modelCorrect':sum(r['pass'] for r in model_rows),'modelSemanticCorrect':sum(r['semanticPass'] for r in model_rows),'classicalBaseline':mechanical,'scopeControls':scope_controls,'procedureRemoved':{'status':'no_learned_procedure','modelFreeAnswers':0},'procedureCorrect':sum(r['pass'] for r in transfer) if transfer else None},
 'callCounts':{'proposal':len(proposals),'modelAloneHeldout':len(heldout),'procedureHeldout':0,'procedureRestart':0},'generations':records}
print(json.dumps(report,indent=2))
