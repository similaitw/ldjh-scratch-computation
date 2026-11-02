/* 積木文字 → Blockly JSON（引導用的積木圖與自動驗證共用）
   一行一個積木，用兩個空白縮排表示「放在裡面」。
   當綠旗被點擊 / 賦值 X 成 運算式 / 修改 X 自 運算式 / 說出 運算式
   如果 條件 / 否則，如果 條件 / 否則 / 重複 N 次 / 重複，當 條件 / 重複直到 條件
   循環計數 i 從 A 到 B 每次增加 C / 中斷循環 / 至 X 套用文字 運算式
   運算式：+ − × ÷，= ≠ < ≤ > ≥，且、或、不成立，「文字」，函式(…)
*/
(function(root){
const FUNCS={
  '讀取數字':a=>({type:'io_input_number'}),
  '讀取文字':a=>({type:'io_input'}),
  '無條件捨去':a=>({type:'math_round',fields:{OP:'ROUNDDOWN'},inputs:{NUM:{block:a[0]}}}),
  '無條件進位':a=>({type:'math_round',fields:{OP:'ROUNDUP'},inputs:{NUM:{block:a[0]}}}),
  '四捨五入':a=>({type:'math_round',fields:{OP:'ROUND'},inputs:{NUM:{block:a[0]}}}),
  '絕對值':a=>({type:'math_single',fields:{OP:'ABS'},inputs:{NUM:{block:a[0]}}}),
  '開根號':a=>({type:'math_single',fields:{OP:'ROOT'},inputs:{NUM:{block:a[0]}}}),
  '餘數':a=>({type:'math_modulo',inputs:{DIVIDEND:{block:a[0]},DIVISOR:{block:a[1]}}}),
  '組合':a=>{const inputs={};a.forEach((b,i)=>inputs['ADD'+i]={block:b});return{type:'text_join',extraState:{itemCount:a.length},inputs};},
  '長度':a=>({type:'text_length1',inputs:{VALUE:{block:a[0]}}}),
  '第幾個字':a=>({type:'text_charAt',fields:{WHERE:'FROM_START'},extraState:'<mutation at="true"></mutation>',inputs:{VALUE:{block:a[0]},AT:{block:a[1]}}})
};
const OPS2={'+':'ADD','−':'MINUS','-':'MINUS','×':'MULTIPLY','*':'MULTIPLY','÷':'DIVIDE','/':'DIVIDE'};
const CMP={'=':'EQ','≠':'NEQ','<':'LT','≤':'LTE','>':'GT','≥':'GTE'};
function tokenize(s){
  const t=[];let i=0;
  while(i<s.length){const c=s[i];
    if(/\s/.test(c)){i++;continue;}
    if(c==='「'){const j=s.indexOf('」',i);t.push({k:'str',v:s.slice(i+1,j)});i=j+1;continue;}
    if(/[0-9.]/.test(c)){let j=i;while(j<s.length&&/[0-9.]/.test(s[j]))j++;t.push({k:'num',v:Number(s.slice(i,j))});i=j;continue;}
    if('+−-×*÷/=≠<≤>≥(),，'.includes(c)){t.push({k:'op',v:c==='，'?',':c});i++;continue;}
    let j=i;while(j<s.length&&!/[\s「+−\-×*÷/=≠<≤>≥(),，]/.test(s[j]))j++;
    const w=s.slice(i,j);t.push({k:['且','或','不成立'].includes(w)?'op':'id',v:w});i=j;
  }
  return t;
}
function parseExpr(src){
  const t=tokenize(src);let p=0;
  const peek=()=>t[p],eat=v=>{const x=t[p];if(!x||(v&&x.v!==v))throw new Error('看不懂：'+src);p++;return x;};
  function or(){let a=and();while(peek()&&peek().v==='或'){eat();a={type:'logic_operation',fields:{OP:'OR'},inputs:{A:{block:a},B:{block:and()}}};}return a;}
  function and(){let a=not();while(peek()&&peek().v==='且'){eat();a={type:'logic_operation',fields:{OP:'AND'},inputs:{A:{block:a},B:{block:not()}}};}return a;}
  function not(){if(peek()&&peek().v==='不成立'){eat();return{type:'logic_negate',inputs:{BOOL:{block:not()}}};}return cmp();}
  function cmp(){let a=add();if(peek()&&CMP[peek().v]){const o=CMP[eat().v];a={type:'logic_compare',fields:{OP:o},inputs:{A:{block:a},B:{block:add()}}};}return a;}
  function add(){let a=mul();while(peek()&&'+−-'.includes(peek().v)&&peek().k==='op'){const o=OPS2[eat().v];a={type:'math_arithmetic',fields:{OP:o},inputs:{A:{block:a},B:{block:mul()}}};}return a;}
  function mul(){let a=atom();while(peek()&&'×*÷/'.includes(peek().v)&&peek().k==='op'){const o=OPS2[eat().v];a={type:'math_arithmetic',fields:{OP:o},inputs:{A:{block:a},B:{block:atom()}}};}return a;}
  function atom(){const x=eat();
    if(x.k==='num')return{type:'math_number',fields:{NUM:x.v}};
    if(x.k==='str')return{type:'text',fields:{TEXT:x.v}};
    if(x.v==='('){const e=or();eat(')');return e;}
    if(x.v==='−'||x.v==='-'){const y=atom();if(y.type==='math_number'){y.fields.NUM=-y.fields.NUM;return y;}return{type:'math_single',fields:{OP:'NEG'},inputs:{NUM:{block:y}}};}
    if(x.k==='id'){
      if(peek()&&peek().v==='('){eat('(');const args=[];if(peek().v!==')'){args.push(or());while(peek().v===','){eat();args.push(or());}}eat(')');
        if(!FUNCS[x.v])throw new Error('沒有這個函式：'+x.v);return FUNCS[x.v](args);}
      return{type:'variables_get',fields:{VAR:{name:x.v}}};
    }
    throw new Error('看不懂：'+src);
  }
  const e=or();if(p<t.length)throw new Error('多出來的字：'+src);return e;
}
const V=n=>({name:n.trim()});
function parse(text){
  const lines=String(text).split('\n').filter(l=>l.trim()!=='').map(l=>{const m=l.match(/^( *)(.*)$/);return{d:m[1].length>>1,s:m[2].trim()};});
  let i=0;
  function block(d){
    const L=lines[i],s=L.s;let m;i++;
    const body=()=>chain(d+1);
    if(s==='當綠旗被點擊'){const b={type:'event_whenflagclicked',inputs:{}};const c=body();if(c)b.inputs.DO={block:c};return b;}
    if((m=s.match(/^賦值 (.+?) 成 (.+)$/)))return{type:'variables_set',fields:{VAR:V(m[1])},inputs:{VALUE:{block:parseExpr(m[2])}}};
    if((m=s.match(/^修改 (.+?) 自 (.+)$/)))return{type:'math_change',fields:{VAR:V(m[1])},inputs:{DELTA:{block:parseExpr(m[2])}}};
    if((m=s.match(/^說出 (.+)$/)))return{type:'io_print',inputs:{TEXT:{block:parseExpr(m[1])}}};
    if((m=s.match(/^至 (.+?) 套用文字 (.+)$/)))return{type:'text_append',fields:{VAR:V(m[1])},inputs:{TEXT:{block:parseExpr(m[2])}}};
    if(s==='中斷循環')return{type:'controls_flow_statements',fields:{FLOW:'BREAK'}};
    if((m=s.match(/^重複 (.+) 次$/))){const b={type:'controls_repeat_ext',inputs:{TIMES:{block:parseExpr(m[1])}}};const c=body();if(c)b.inputs.DO={block:c};return b;}
    if((m=s.match(/^重複(，當|直到) (.+)$/))){const b={type:'controls_whileUntil',fields:{MODE:m[1]==='，當'?'WHILE':'UNTIL'},inputs:{BOOL:{block:parseExpr(m[2])}}};const c=body();if(c)b.inputs.DO={block:c};return b;}
    if((m=s.match(/^循環計數 (.+?) 從 (.+?) 到 (.+?) 每次增加 (.+)$/))){const b={type:'controls_for',fields:{VAR:V(m[1])},inputs:{FROM:{block:parseExpr(m[2])},TO:{block:parseExpr(m[3])},BY:{block:parseExpr(m[4])}}};const c=body();if(c)b.inputs.DO={block:c};return b;}
    if((m=s.match(/^如果 (.+)$/))){
      const b={type:'controls_if',inputs:{IF0:{block:parseExpr(m[1])}}};let c=body();if(c)b.inputs.DO0={block:c};let k=0,hasElse=false;
      while(i<lines.length&&lines[i].d===d){const s2=lines[i].s;
        if((m=s2.match(/^否則，如果 (.+)$/))){i++;k++;b.inputs['IF'+k]={block:parseExpr(m[1])};c=body();if(c)b.inputs['DO'+k]={block:c};}
        else if(s2==='否則'){i++;hasElse=true;c=body();if(c)b.inputs.ELSE={block:c};break;}
        else break;}
      if(k||hasElse)b.extraState={elseIfCount:k,hasElse};
      return b;
    }
    return parseExpr(s);
  }
  function chain(d){let first=null,last=null;
    while(i<lines.length&&lines[i].d===d){if(first&&/^否則/.test(lines[i].s))break;const b=block(d);
      if(!first)first=b;else last.next={block:b};last=b;}
    return first;}
  const tops=[];let y=8;
  while(i<lines.length){const d=lines[i].d;const c=chain(d);if(!c)break;c.x=8;c.y=y;y+=400;tops.push(c);}
  return tops;
}
const api={parse,parseExpr};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.BDSL=api;
})(this);
