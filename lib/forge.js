/* 修煉室引擎：與「宜蘭縣資訊科技創意實作競賽」平台相同的 Blockly 積木（Scratch 模式工具箱）
   執行與評分規則也照平台：輸入以空白、換行或逗號分隔，每個「讀取」依序取一筆；
   所有「說出」用空白接起來，與答案逐項比對（數字 3 和 3.0 視為相同）。 */
(function(root){
const B=root.Blockly;
function defineBlocks(Bk){
  if(Bk.Blocks.io_print)return;
  Bk.common.defineBlocksWithJsonArray([
    {type:'event_whenflagclicked',message0:'當綠旗被點擊 %1 %2',args0:[{type:'field_label_serializable',name:'FLAG',text:'⚑'},{type:'input_statement',name:'DO'}],colour:'#F6B73C',tooltip:'Scratch 風格的起始事件。'},
    {type:'io_print',message0:'說出 %1',args0:[{type:'input_value',name:'TEXT'}],previousStatement:null,nextStatement:null,colour:'#8B5CF6',tooltip:'輸出一段文字或數值。'},
    {type:'io_input',message0:'讀取文字',output:null,colour:'#0EA5E9',tooltip:'讀取下一筆輸入資料。'},
    {type:'io_input_number',message0:'讀取數字',output:'Number',colour:'#0EA5E9',tooltip:'讀取下一筆輸入資料，並轉成數字。'},
    {type:'text_length1',message0:'字串長度 %1',args0:[{type:'input_value',name:'VALUE',check:'String'}],output:'Number',colour:'#5CA68D',tooltip:'回傳文字長度。'}
  ]);
}
function defineGen(G){
  G.forBlock.event_whenflagclicked=(b,g)=>g.statementToCode(b,'DO');
  G.forBlock.io_print=(b,g)=>`window.alert(${g.valueToCode(b,'TEXT',0)||"''"});\n`;
  G.forBlock.io_input=()=>["window.prompt('')",0];
  G.forBlock.io_input_number=()=>["Number(window.prompt(''))",0];
  G.forBlock.text_length1=(b,g)=>[`String(${g.valueToCode(b,'VALUE',0)||"''"}).length`,0];
}
const s=(type,inputs,fields,extraState)=>({kind:'block',type,...(inputs?{inputs}:{}),...(fields?{fields}:{}),...(extraState?{extraState}:{})});
const sh=(type,fields)=>({shadow:{type,...(fields?{fields}:{})}}),num=v=>sh('math_number',{NUM:String(v)}),txt=v=>sh('text',{TEXT:v});
const TOOLBOX={kind:'categoryToolbox',contents:[
 {kind:'category',name:'事件與輸入輸出',colour:'#F6B73C',contents:[s('event_whenflagclicked'),s('io_print',{TEXT:txt('')}),s('io_input_number'),s('io_input')]},
 {kind:'category',name:'邏輯',colour:'#5C81A6',contents:[s('controls_if'),s('logic_compare'),s('logic_operation'),s('logic_negate'),s('logic_boolean'),s('logic_null'),s('logic_ternary')]},
 {kind:'category',name:'迴圈',colour:'#5CA65C',contents:[s('controls_repeat_ext',{TIMES:num(10)}),s('controls_whileUntil'),s('controls_for',{FROM:num(1),TO:num(10),BY:num(1)}),s('controls_forEach'),s('controls_flow_statements')]},
 {kind:'category',name:'數學',colour:'#5C68A6',contents:[s('math_number',null,{NUM:'0'}),s('math_arithmetic',{A:num(1),B:num(1)}),s('math_single',{NUM:num(9)}),s('math_trig',{NUM:num(45)}),s('math_constant'),s('math_number_property',{NUMBER_TO_CHECK:num(0)}),s('math_round',{NUM:num(3.1)}),s('math_on_list'),s('math_modulo',{DIVIDEND:num(64),DIVISOR:num(10)}),s('math_constrain',{VALUE:num(50),LOW:num(1),HIGH:num(100)}),s('math_random_int',{FROM:num(1),TO:num(100)}),s('math_random_float')]},
 {kind:'category',name:'文字',colour:'#5CA68D',contents:[s('text'),s('text_join'),s('text_append',{TEXT:txt('')}),s('text_length1',{VALUE:txt('abc')}),s('text_isEmpty',{VALUE:txt('')}),s('text_indexOf',{VALUE:txt('abc'),FIND:txt('b')}),s('text_charAt',{VALUE:txt('abc')}),s('text_getSubstring',{STRING:txt('abc')}),s('text_changeCase',{TEXT:txt('abc')}),s('text_trim',{TEXT:txt('abc')})]},
 {kind:'category',name:'清單',colour:'#745CA6',contents:[s('lists_create_with',null,null,{itemCount:0}),s('lists_create_with'),s('lists_repeat',{NUM:num(5)}),s('lists_length'),s('lists_isEmpty'),s('lists_indexOf'),s('lists_getIndex'),s('lists_setIndex'),s('lists_getSublist'),s('lists_sort'),s('lists_split'),s('lists_reverse')]},
 {kind:'category',name:'變數',custom:'VARIABLE',colour:'#A65C81'},
 {kind:'category',name:'函式',custom:'PROCEDURE',colour:'#995BA5'}]};

/* 與平台相同的輸入切割與輸出比對 */
const splitInput=t=>String(t??'').split(/[\s,]+/).map(x=>x.trim()).filter(Boolean);
const normNum=x=>{const t=x.trim();if(!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(t))return null;const sg=t.startsWith('-')?'-':'',r=t.replace(/^[+-]/,''),[a,b='']=r.split('.'),ip=(a||'0').replace(/^0+(?=\d)/,'')||'0',fp=b.replace(/0+$/,''),v=fp?ip+'.'+fp:ip;return v==='0'?'0':sg+v;};
const toks=t=>String(t??'').trim().split(/\s+/).filter(Boolean);
function sameOutput(got,exp){const a=toks(got),b=toks(exp);if(a.length!==b.length)return false;return b.every((x,i)=>{if(a[i]===x)return true;const p=normNum(a[i]),q=normNum(x);return p!==null&&q!==null&&p===q;});}

function makeCode(ws,G){
  G.INFINITE_LOOP_TRAP='if(--__loop<0||(__loop%4096===0&&Date.now()>__deadline))throw new Error("__TIMEOUT__");\n';
  G.init(ws);let code='';const names=ws.getVariableMap().getAllVariables().map(v=>({name:v.getName(),js:G.getVariableName(v.getId())}));
  ws.getTopBlocks(true).forEach(b=>{if(b.type==='event_whenflagclicked'||b.type.startsWith('procedures_def')){const c=G.blockToCode(b);if(typeof c==='string')code+=c;}});
  code=G.finish(code);
  return{code,names};
}
function execute(ws,G,tokens,ms){
  const {code,names}=makeCode(ws,G);const q=tokens.slice();const says=[];let asked=0;
  const win={alert:x=>{says.push(String(x));},prompt:()=>{asked++;return q.length?q.shift():'';}};
  const ret='\nreturn {'+names.map(n=>JSON.stringify(n.name)+':(typeof '+n.js+'==="undefined"?undefined:'+n.js+')').join(',')+'};';
  let vars={},error=null,timedOut=false;
  try{vars=new Function('window','__deadline','var __loop=5000000;\n'+code+ret)(win,Date.now()+(ms||3000))||{};}
  catch(e){if(String(e&&e.message).includes('__TIMEOUT__'))timedOut=true;else error=(e&&e.message)||String(e);}
  return{says,output:says.join(' ').trim(),asked,vars,error,timedOut,code};
}

const F={ready:false,host:{},splitInput,sameOutput,TOOLBOX};
F.setup=function(Bk,G){defineBlocks(Bk);defineGen(G);};
F.init=function(el,host){
  F.host=host;const Bk=root.Blockly,G=root.javascript.javascriptGenerator;F.Bk=Bk;F.G=G;F.setup(Bk,G);
  if(Bk.dialog){Bk.dialog.setPrompt((msg,def,cb)=>host.prompt(msg,def,cb));Bk.dialog.setConfirm((msg,cb)=>host.confirm(msg,cb));Bk.dialog.setAlert((msg,cb)=>{host.toast(msg);if(cb)cb();});}
  const ws=Bk.inject(el,{toolbox:TOOLBOX,media:host.media,trashcan:true,sounds:false,renderer:'geras',
    zoom:{controls:true,wheel:true,startScale:.85,maxScale:2,minScale:.4},grid:{spacing:24,length:3,colour:'#e3e3e3',snap:true},move:{scrollbars:true,drag:true,wheel:false}});
  F.ws=ws;let t=null;
  ws.addChangeListener(e=>{if(e.isUiEvent||F.loading)return;clearTimeout(t);t=setTimeout(()=>host.onChange&&host.onChange(),400);});
  F.ready=true;
};
F.load=function(json){
  const Bk=F.Bk,ws=F.ws;let obj=null;try{obj=json?JSON.parse(json):null;}catch(e){obj=null;}
  F.loading=true;ws.clear();
  try{if(obj&&obj.blocks)Bk.serialization.workspaces.load(obj,ws);else throw 0;}
  catch(e){ws.clear();const b=ws.newBlock('event_whenflagclicked');b.initSvg();b.render();b.moveBy(40,40);}
  setTimeout(()=>{F.loading=false;Bk.svgResize(ws);ws.scrollCenter();},30);
};
F.json=()=>JSON.stringify(F.Bk.serialization.workspaces.save(F.ws));
F.resize=()=>{if(F.ws)F.Bk.svgResize(F.ws);};
F.hats=()=>F.ws.getTopBlocks().filter(b=>b.type==='event_whenflagclicked').length;
F.loose=()=>F.ws.getTopBlocks().filter(b=>b.type!=='event_whenflagclicked'&&!b.type.startsWith('procedures_def')).length;
F.run=(inputText,ms)=>execute(F.ws,F.G,Array.isArray(inputText)?inputText.map(String):splitInput(inputText),ms);
F.runCases=cases=>cases.map(c=>F.run(c));
F.execute=execute;
root.Forge=F;
if(typeof module!=='undefined'&&module.exports)module.exports=F;
})(typeof window!=='undefined'?window:globalThis);
