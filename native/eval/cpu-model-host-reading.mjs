// Real HOST + actual public proxy reading door over untouched CPU outputs.
import fs from 'node:fs';
import net from 'node:net';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {createSession,admitChunked,sessionReferents,sessionRelations,serializeSession,deserializeSession,documentText} from '../legacy-ported/packages/host/corpus.js';
const input=fs.readFileSync(new URL('./results/cpu-llm-learning-falsify.json',import.meta.url));
const experiment=JSON.parse(input),sha=s=>createHash('sha256').update(s).digest('hex');
const session=createSession(),sources=[];
for(const [i,g]of experiment.generations.entries()) {
 const source=`doc:cpu-model-${i}`,admission=admitChunked(session,{text:g.text,sourceId:source,language:'en'});
 const cast=sessionReferents(session,{sourceId:source,priors:[],limit:200});
 const relations=sessionRelations(session,{sourceId:source});
 const sourceBytes=Buffer.from(g.text);
 const spans=[...session.spans.values()].filter(s=>String(s.source_id??'').startsWith(source+':chunk-'));
 const spanChecks=spans.map(s=>({id:s.span_id??s.id,source:s.source_id,start:s.byte_start,end:s.byte_end,
  exact:sourceBytes.subarray(s.byte_start,s.byte_end).toString('utf8')===s.text}));
 assert.equal(spanChecks.length,admission.chunks);
 assert.ok(spanChecks.every(s=>s.exact));
 assert.equal(documentText(session,source).text,g.text);
 sources.push({source,text:g.text,prompt:g.prompt,sha256:sha(g.text),characters:g.text.length,utf8Bytes:sourceBytes.length,
  admission,cast,relations,spanChecks,
  coverage:spans.length ? 'registered_source_spans' : 'source_retained_but_no_registered_span',
  ...(spans.length?{}:{gap:'host_short_material_not_indexed'})});
}
// Keep every output as its own source; do not turn transcript labels into
// artificially capitalised entities. Cross-source reading is explicitly scoped.
const shared=sessionReferents(session,{sourceId:sources.map(s=>s.source),priors:[],limit:200});
const saved=serializeSession(session),restored=deserializeSession(saved);
for(const s of sources){
 assert.equal(documentText(restored,s.source).text,s.text);
 assert.deepEqual(sessionReferents(restored,{sourceId:s.source,priors:[],limit:200}),s.cast);
 assert.deepEqual(sessionRelations(restored,{sourceId:s.source}),s.relations);
}
// End-to-end through the SAME HTTP endpoint consumed by the surface.
const reserve=net.createServer();reserve.listen(0,'127.0.0.1');await once(reserve,'listening');
const port=reserve.address().port;await new Promise(r=>reserve.close(r));
// The parent explicitly supervises this model-free assay. Use the proxy's
// existing passive-door mode; do not start/reconcile an Ollama daemon.
const lockPath=new URL('../../state/heimdall-driver.lock',import.meta.url);
const lockBackup=fs.existsSync(lockPath)?fs.readFileSync(lockPath):null;
let ownsAssayLock=false, liveHolder=false;
if(lockBackup){try{const old=JSON.parse(lockBackup);process.kill(old.pid,0);liveHolder=true;}catch{}}
if(!liveHolder){fs.mkdirSync(new URL('../../state/',import.meta.url),{recursive:true});fs.writeFileSync(lockPath,JSON.stringify({pid:process.pid,port:null,owner:'cpu-model-host-reading-assay'}));ownsAssayLock=true;}
const child=spawn(process.execPath,['proxy.mjs'],{cwd:fileURLToPath(new URL('../../',import.meta.url)),
 env:{...process.env,ER7_PROXY_PORT:String(port),ER7_HEIMDALL_PORT:'0',ER7_CHANNEL_PORT:'0',ER7_EXTERNAL_HEIMDALL:'1',ER7_MODEL_WATCHDOG:'0'},stdio:['ignore','pipe','pipe']});
let consoleOutput='';child.stdout.on('data',c=>consoleOutput+=c);child.stderr.on('data',c=>consoleOutput+=c);
const http=[];
try {
 const deadline=Date.now()+12000;
 while(!consoleOutput.includes('proxy listening')&&child.exitCode===null&&Date.now()<deadline)await new Promise(r=>setTimeout(r,50));
 assert.equal(child.exitCode,null);assert.ok(consoleOutput.includes('proxy listening'));
 for(const [i,s]of sources.entries()) {
  const response=await fetch(`http://127.0.0.1:${port}/v1/read`,{method:'POST',headers:{'content-type':'application/json'},
   body:JSON.stringify({name:`cpu-model-${i}`,text:s.text,maxCharacters:1000000}),signal:AbortSignal.timeout(5000)});
  const data=await response.json();assert.equal(response.status,200);
  assert.equal(data.assembly,'constitutional-host');assert.equal(data.truncated,false);
  assert.equal(data.readCharacters,s.characters);assert.equal(data.sourceCharacters,s.characters);
  assert.deepEqual(data.referents.map(r=>r.surfaces[0]),s.cast.referents.map(r=>r.display));
  assert.deepEqual(data.relations,s.relations.relations);
  http.push({source:s.source,status:response.status,response:data});
 }
}catch(err){
 console.error(consoleOutput);throw err;
}finally {
 if(child.exitCode===null){const stopped=once(child,'exit');child.kill('SIGTERM');const timer=setTimeout(()=>child.kill('SIGKILL'),2000);await stopped;clearTimeout(timer);}
 if(ownsAssayLock){if(lockBackup)fs.writeFileSync(lockPath,lockBackup);else fs.unlinkSync(lockPath);}
}
const report={schema:'EOCPUModelHostReading@1',inputHash:sha(input),model:experiment.model,
 assembly:'constitutional-host: createSession -> admitChunked -> sessionReferents / sessionRelations; additionally real proxy POST /v1/read',
 material:'all ten original CPU generations, distinct documents in one HOST session; full material, no labels added to sources',
 modelCalls:0,proxyMode:'passive door, supervised by assay; no model daemon reconciliation',truncated:false,priors:{languageDeclared:'en',abbreviationPriorReceived:false,coreference:[],gap:'no_abbreviation_prior_for_language'},
 stagesRun:['perception','byte-addressed source admission (except disclosed short-material span gaps)','name-variant identity','pronoun binding attempts','5a directional relation extraction'],
 stagesNotRun:['5b emergence/binding','6 altitude','7 population','8 kind','code AST reading','arithmetic evaluation','holograph semantic chase'],
 summary:{sources:sources.length,sourceTextsRetained:sources.length,registeredSpans:sources.reduce((n,s)=>n+s.spanChecks.length,0),
  exactSpanChecks:sources.reduce((n,s)=>n+s.spanChecks.filter(c=>c.exact).length,0),sourcesWithoutSpans:sources.filter(s=>!s.spanChecks.length).length,
  perSourceReferents:sources.reduce((n,s)=>n+s.cast.referents.length,0),relations:sources.reduce((n,s)=>n+s.relations.relations.length,0),httpParityChecks:http.length,roundtripParityChecks:sources.length},
 sources,shared,http};
fs.writeFileSync(new URL('./results/cpu-model-host-session.json',import.meta.url),JSON.stringify(saved,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
