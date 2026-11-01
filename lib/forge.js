/* 修煉室引擎：scratch-blocks 積木編輯區 + scratch-vm 執行與自動驗證 */
(function(){
const TOOLBOX=`<xml style="display:none">
<category name="事件" id="events" colour="#FFBF00" secondaryColour="#CC9900">
  <block type="event_whenflagclicked"/>
</category>
<category name="外觀" id="looks" colour="#9966FF" secondaryColour="#774DCB">
  <block type="looks_say"><value name="MESSAGE"><shadow type="text"><field name="TEXT">你好！</field></shadow></value></block>
  <block type="looks_sayforsecs"><value name="MESSAGE"><shadow type="text"><field name="TEXT">你好！</field></shadow></value><value name="SECS"><shadow type="math_number"><field name="NUM">2</field></shadow></value></block>
</category>
<category name="控制" id="control" colour="#FFAB19" secondaryColour="#CF8B17">
  <block type="control_wait"><value name="DURATION"><shadow type="math_positive_number"><field name="NUM">1</field></shadow></value></block>
  <block type="control_repeat"><value name="TIMES"><shadow type="math_whole_number"><field name="NUM">10</field></shadow></value></block>
  <block type="control_if"/>
  <block type="control_if_else"/>
  <block type="control_repeat_until"/>
  <block type="control_stop"/>
</category>
<category name="偵測" id="sensing" colour="#4CBFE6" secondaryColour="#2E8EB8">
  <block type="sensing_askandwait"><value name="QUESTION"><shadow type="text"><field name="TEXT">是多少？</field></shadow></value></block>
  <block type="sensing_answer"/>
</category>
<category name="運算" id="operators" colour="#40BF4A" secondaryColour="#389438">
  <block type="operator_add"><value name="NUM1"><shadow type="math_number"><field name="NUM"></field></shadow></value><value name="NUM2"><shadow type="math_number"><field name="NUM"></field></shadow></value></block>
  <block type="operator_subtract"><value name="NUM1"><shadow type="math_number"><field name="NUM"></field></shadow></value><value name="NUM2"><shadow type="math_number"><field name="NUM"></field></shadow></value></block>
  <block type="operator_multiply"><value name="NUM1"><shadow type="math_number"><field name="NUM"></field></shadow></value><value name="NUM2"><shadow type="math_number"><field name="NUM"></field></shadow></value></block>
  <block type="operator_divide"><value name="NUM1"><shadow type="math_number"><field name="NUM"></field></shadow></value><value name="NUM2"><shadow type="math_number"><field name="NUM"></field></shadow></value></block>
  <block type="operator_gt"><value name="OPERAND1"><shadow type="text"><field name="TEXT"></field></shadow></value><value name="OPERAND2"><shadow type="text"><field name="TEXT">50</field></shadow></value></block>
  <block type="operator_lt"><value name="OPERAND1"><shadow type="text"><field name="TEXT"></field></shadow></value><value name="OPERAND2"><shadow type="text"><field name="TEXT">50</field></shadow></value></block>
  <block type="operator_equals"><value name="OPERAND1"><shadow type="text"><field name="TEXT"></field></shadow></value><value name="OPERAND2"><shadow type="text"><field name="TEXT">50</field></shadow></value></block>
  <block type="operator_and"/>
  <block type="operator_or"/>
  <block type="operator_not"/>
  <block type="operator_join"><value name="STRING1"><shadow type="text"><field name="TEXT">蘋果</field></shadow></value><value name="STRING2"><shadow type="text"><field name="TEXT">香蕉</field></shadow></value></block>
  <block type="operator_mod"><value name="NUM1"><shadow type="math_number"><field name="NUM"></field></shadow></value><value name="NUM2"><shadow type="math_number"><field name="NUM"></field></shadow></value></block>
  <block type="operator_round"><value name="NUM"><shadow type="math_number"><field name="NUM"></field></shadow></value></block>
  <block type="operator_mathop"><value name="NUM"><shadow type="math_number"><field name="NUM"></field></shadow></value></block>
</category>
<category name="變數" id="variables" colour="#FF8C1A" secondaryColour="#DB6E00" custom="VARIABLE"></category>
</xml>`;

const blank=()=>({projectVersion:3,targets:[
 {isStage:true,name:'Stage',variables:{},lists:{},broadcasts:{},blocks:{},comments:{},currentCostume:0,costumes:[],sounds:[],volume:100,layerOrder:0,tempo:60,videoTransparency:50,videoState:'off',textToSpeechLanguage:null},
 {isStage:false,name:'弟子',variables:{},lists:{},broadcasts:{},
  blocks:{hat:{opcode:'event_whenflagclicked',next:null,parent:null,inputs:{},fields:{},shadow:false,topLevel:true,x:40,y:40}},
  comments:{},currentCostume:0,costumes:[],sounds:[],volume:100,layerOrder:1,visible:true,x:0,y:0,size:100,direction:90,draggable:false,rotationStyle:'all around'}],
 monitors:[],extensions:[],meta:{semver:'3.0.0',vm:'0.2.0',agent:''}});

const F={ready:false,testing:false,host:{}};
F.init=function(el,host){
  F.host=host;
  Blockly.ScratchMsgs.setLocale('zh-tw');
  Blockly.prompt=(msg,def,cb,title)=>host.prompt(title||msg,def,v=>cb(v,[],{scope:'global',isCloud:false}));
  Blockly.confirm=(msg,cb)=>host.confirm(msg,cb);
  Blockly.alert=(msg,cb)=>{host.toast(msg);if(cb)cb();};
  const ws=Blockly.inject(el,{media:host.media,toolbox:TOOLBOX,trashcan:true,sounds:false,comments:false,collapse:false,
    zoom:{controls:true,wheel:true,startScale:.7},grid:{spacing:40,length:2,colour:'#ddd'},
    colours:{workspace:'#F9F9F9',flyout:'#F9F9F9',toolbox:'#FFFFFF',toolboxSelected:'#E9EEF2',scrollbar:'#CECDCE',scrollbarHover:'#CECDCE',insertionMarker:'#000000',insertionMarkerOpacity:.2,fieldShadow:'rgba(255,255,255,0.3)',dragShadowOpacity:.6}});
  const vm=new VirtualMachine();
  F.ws=ws;F.vm=vm;
  ws.addChangeListener(vm.blockListener);
  ws.getFlyout().getWorkspace().addChangeListener(vm.flyoutBlockListener);
  let t=null;
  ws.addChangeListener(e=>{if(e.isUiEvent||F.loading)return;clearTimeout(t);t=setTimeout(()=>host.onChange&&host.onChange(),400);});
  vm.on('workspaceUpdate',data=>{
    ws.removeChangeListener(vm.blockListener);F.loading=true;
    try{Blockly.Xml.clearWorkspaceAndLoadFromXml(Blockly.Xml.textToDom(data.xml),ws);}catch(e){console.error(e);}
    ws.addChangeListener(vm.blockListener);setTimeout(()=>{F.loading=false;},0);
  });
  vm.on('SCRIPT_GLOW_ON',d=>{try{ws.glowStack(d.id,true);}catch(e){}});
  vm.on('SCRIPT_GLOW_OFF',d=>{try{ws.glowStack(d.id,false);}catch(e){}});
  vm.on('BLOCK_GLOW_ON',d=>{try{ws.glowBlock(d.id,true);}catch(e){}});
  vm.on('BLOCK_GLOW_OFF',d=>{try{ws.glowBlock(d.id,false);}catch(e){}});
  vm.runtime.on('SAY',(tg,type,text)=>{if(!F.testing&&host.onSay)host.onSay(String(text??''));});
  vm.runtime.on('QUESTION',q=>{if(!F.testing&&host.onAsk)host.onAsk(q);});
  vm.runtime.on('PROJECT_RUN_START',()=>{if(!F.testing&&host.onRun)host.onRun(true);});
  vm.runtime.on('PROJECT_RUN_STOP',()=>{if(!F.testing&&host.onRun)host.onRun(false);});
  vm.start();F.ready=true;
};
F.load=async function(json){
  let obj=null;try{obj=json?JSON.parse(json):null;}catch(e){obj=null;}
  if(!obj||!obj.targets)obj=blank();
  obj.projectVersion=3;F.loading=true;
  try{await F.vm.deserializeProject(obj,null);F.vm.runtime.handleProjectLoaded();}
  catch(e){console.error(e);await F.vm.deserializeProject(blank(),null);F.vm.runtime.handleProjectLoaded();}
  setTimeout(()=>{F.loading=false;Blockly.svgResize(F.ws);F.ws.scrollCenter&&F.ws.scrollCenter();},50);
};
F.json=()=>F.vm.toJSON();
F.resize=()=>{if(F.ws)Blockly.svgResize(F.ws);};
F.green=()=>{F.vm.greenFlag();};
F.stop=()=>{F.vm.stopAll();};
F.answer=v=>F.vm.runtime.emit('ANSWER',String(v));
F.vars=()=>{const out=[];const st=F.vm.runtime.getTargetForStage(),ed=F.vm.editingTarget;
  [st,ed].forEach(tg=>{if(!tg)return;Object.values(tg.variables).forEach(v=>{if(v.type==='')out.push({name:v.name,value:v.value});});});return out;};
F.hasBlocks=op=>{const ed=F.vm.editingTarget;if(!ed)return false;return Object.values(ed.blocks._blocks).some(b=>b.opcode===op);};
F.runCase=function(inputs,ms=6000){
  return new Promise(res=>{
    const vm=F.vm,rt=vm.runtime;let i=0,done=false,says=[],timer,lastRaw='';
    const onSay=(tg,type,text)=>{const s=String(text??'');lastRaw=s;if(s!=='')says.push(s);};
    const onQ=q=>{if(q===null)return;if(q===''&&lastRaw!=='')says.pop();const v=i<inputs.length?String(inputs[i]):'';i++;setTimeout(()=>rt.emit('ANSWER',v),0);};
    const finish=to=>{if(done)return;done=true;clearTimeout(timer);rt.removeListener('SAY',onSay);rt.removeListener('QUESTION',onQ);rt.removeListener('PROJECT_RUN_STOP',onStop);
      vm.stopAll();setTimeout(()=>res({says,last:says.length?says[says.length-1]:'',timedOut:to,asked:i}),30);};
    const onStop=()=>setTimeout(()=>finish(false),20);
    rt.on('SAY',onSay);rt.on('QUESTION',onQ);
    vm.stopAll();
    setTimeout(()=>{rt.on('PROJECT_RUN_STOP',onStop);timer=setTimeout(()=>finish(true),ms);vm.greenFlag();
      setTimeout(()=>{if(!done&&rt.threads.length===0)finish(false);},120);},40);
  });
};
F.runCases=async function(cases,onEach){F.testing=true;const out=[];
  try{for(let k=0;k<cases.length;k++){const r=await F.runCase(cases[k]);out.push(r);if(onEach)onEach(k,r);}}finally{F.testing=false;}
  return out;};
window.Forge=F;
})();
