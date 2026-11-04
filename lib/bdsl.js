/* 積木文字 → Blockly JSON（引導用的積木圖與自動驗證共用）
   一行一個積木，用兩個空白縮排表示「放在裡面」。
   當綠旗被點擊 / 將 X 設為 運算式 / 將 X 的值加 運算式 / 說出 運算式
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
  '空清單':a=>({type:'lists_create_with',extraState:{itemCount:0}}),
  '清單':a=>{const inputs={};a.forEach((b,i)=>inputs['ADD'+i]={block:b});return{type:'lists_create_with',extraState:{itemCount:a.length},inputs};},
  '重複清單':a=>({type:'lists_repeat',inputs:{ITEM:{block:a[0]},NUM:{block:a[1]}}}),
  '清單長度':a=>({type:'lists_length',inputs:{VALUE:{block:a[0]}}}),
  '清單為空':a=>({type:'lists_isEmpty',inputs:{VALUE:{block:a[0]}}}),
  '排序':a=>({type:'lists_sort',fields:{TYPE:'NUMERIC',DIRECTION:'1'},inputs:{LIST:{block:a[0]}}}),
  '排序降':a=>({type:'lists_sort',fields:{TYPE:'NUMERIC',DIRECTION:'-1'},inputs:{LIST:{block:a[0]}}}),
  '排序字母':a=>({type:'lists_sort',fields:{TYPE:'TEXT',DIRECTION:'1'},inputs:{LIST:{block:a[0]}}}),
  '切割':a=>({type:'lists_split',extraState:{mode:'SPLIT'},fields:{MODE:'SPLIT'},inputs:{INPUT:{block:a[0]},DELIM:{block:a[1]}}}),
  '合併':a=>({type:'lists_split',extraState:{mode:'JOIN'},fields:{MODE:'JOIN'},inputs:{INPUT:{block:a[0]},DELIM:{block:a[1]}}}),
  '反轉':a=>({type:'lists_reverse',inputs:{LIST:{block:a[0]}}}),
  '子清單':a=>({type:'lists_getSublist',fields:{WHERE1:'FROM_START',WHERE2:'FROM_START'},extraState:'<mutation at1="true" at2="true"></mutation>',inputs:{LIST:{block:a[0]},AT1:{block:a[1]},AT2:{block:a[2]}}}),
  '找項':a=>({type:'lists_indexOf',fields:{END:'FIRST'},inputs:{VALUE:{block:a[0]},FIND:{block:a[1]}}}),
  '子字串':a=>({type:'text_getSubstring',fields:{WHERE1:'FROM_START',WHERE2:'FROM_START'},extraState:'<mutation at1="true" at2="true"></mutation>',inputs:{STRING:{block:a[0]},AT1:{block:a[1]},AT2:{block:a[2]}}}),
  '找字':a=>({type:'text_indexOf',fields:{END:'FIRST'},inputs:{VALUE:{block:a[0]},FIND:{block:a[1]}}}),
  '為空':a=>({type:'text_isEmpty',inputs:{VALUE:{block:a[0]}}}),
  '大寫':a=>({type:'text_changeCase',fields:{CASE:'UPPERCASE'},inputs:{TEXT:{block:a[0]}}}),
  '小寫':a=>({type:'text_changeCase',fields:{CASE:'LOWERCASE'},inputs:{TEXT:{block:a[0]}}}),
  '總和':a=>({type:'math_on_list',extraState:'<mutation op="SUM"></mutation>',fields:{OP:'SUM'},inputs:{LIST:{block:a[0]}}}),
  '最大值':a=>({type:'math_on_list',extraState:'<mutation op="MAX"></mutation>',fields:{OP:'MAX'},inputs:{LIST:{block:a[0]}}}),
  '最小值':a=>({type:'math_on_list',extraState:'<mutation op="MIN"></mutation>',fields:{OP:'MIN'},inputs:{LIST:{block:a[0]}}}),
  '平均':a=>({type:'math_on_list',extraState:'<mutation op="AVERAGE"></mutation>',fields:{OP:'AVERAGE'},inputs:{LIST:{block:a[0]}}}),
  '是偶數':a=>({type:'math_number_property',extraState:'<mutation divisor_input="false"></mutation>',fields:{PROPERTY:'EVEN'},inputs:{NUMBER_TO_CHECK:{block:a[0]}}}),
  '是奇數':a=>({type:'math_number_property',extraState:'<mutation divisor_input="false"></mutation>',fields:{PROPERTY:'ODD'},inputs:{NUMBER_TO_CHECK:{block:a[0]}}}),
  '是質數':a=>({type:'math_number_property',extraState:'<mutation divisor_input="false"></mutation>',fields:{PROPERTY:'PRIME'},inputs:{NUMBER_TO_CHECK:{block:a[0]}}}),
  '是整數':a=>({type:'math_number_property',extraState:'<mutation divisor_input="false"></mutation>',fields:{PROPERTY:'WHOLE'},inputs:{NUMBER_TO_CHECK:{block:a[0]}}}),
  '可被整除':a=>({type:'math_number_property',extraState:'<mutation divisor_input="true"></mutation>',fields:{PROPERTY:'DIVISIBLE_BY'},inputs:{NUMBER_TO_CHECK:{block:a[0]},DIVISOR:{block:a[1]}}}),
  '測試':a=>({type:'logic_ternary',inputs:{IF:{block:a[0]},THEN:{block:a[1]},ELSE:{block:a[2]}}}),
  '限制':a=>({type:'math_constrain',inputs:{VALUE:{block:a[0]},LOW:{block:a[1]},HIGH:{block:a[2]}}}),
  '第幾個字':a=>({type:'text_charAt',fields:{WHERE:'FROM_START'},extraState:'<mutation at="true"></mutation>',inputs:{VALUE:{block:a[0]},AT:{block:a[1]}}})
};
const OPS2={'^':'POWER','+':'ADD','−':'MINUS','-':'MINUS','×':'MULTIPLY','*':'MULTIPLY','÷':'DIVIDE','/':'DIVIDE'};
const CMP={'=':'EQ','≠':'NEQ','<':'LT','≤':'LTE','>':'GT','≥':'GTE'};
function tokenize(s){
  const t=[];let i=0;
  while(i<s.length){const c=s[i];
    if(/\s/.test(c)){i++;continue;}
    if(c==='「'){const j=s.indexOf('」',i);t.push({k:'str',v:s.slice(i+1,j)});i=j+1;continue;}
    if(/[0-9.]/.test(c)){let j=i;while(j<s.length&&/[0-9.]/.test(s[j]))j++;t.push({k:'num',v:Number(s.slice(i,j))});i=j;continue;}
    if('+−-×*÷/^=≠<≤>≥(),，[]'.includes(c)){t.push({k:'op',v:c==='，'?',':c});i++;continue;}
    let j=i;while(j<s.length&&!/[\s「+−\-×*÷/^=≠<≤>≥(),，\[\]]/.test(s[j]))j++;
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
  function mul(){let a=pow();while(peek()&&'×*÷/'.includes(peek().v)&&peek().k==='op'){const o=OPS2[eat().v];a={type:'math_arithmetic',fields:{OP:o},inputs:{A:{block:a},B:{block:pow()}}};}return a;}
  function pow(){let a=post();if(peek()&&peek().v==='^'){eat();a={type:'math_arithmetic',fields:{OP:'POWER'},inputs:{A:{block:a},B:{block:pow()}}};}return a;}
  function post(){let a=atom();while(peek()&&peek().v==='['){eat('[');const ix=or();eat(']');a={type:'lists_getIndex',fields:{MODE:'GET',WHERE:'FROM_START'},extraState:'<mutation statement="false" at="true"></mutation>',inputs:{VALUE:{block:a},AT:{block:ix}}};}return a;}
  function atom(){const x=eat();
    if(x.k==='num')return{type:'math_number',fields:{NUM:x.v}};
    if(x.k==='str')return{type:'text',fields:{TEXT:x.v}};
    if(x.v==='('){const e=or();eat(')');return e;}
    if(x.v==='−'||x.v==='-'){const y=atom();if(y.type==='math_number'){y.fields.NUM=-y.fields.NUM;return y;}return{type:'math_single',fields:{OP:'NEG'},inputs:{NUM:{block:y}}};}
    if(x.k==='id'){
      if(peek()&&peek().v==='('){eat('(');const args=[];if(peek().v!==')'){args.push(or());while(peek().v===','){eat();args.push(or());}}eat(')');
        if(!FUNCS[x.v])throw new Error('沒有這個函式：'+x.v);return FUNCS[x.v](args);}
      if(x.v==='真'||x.v==='假')return{type:'logic_boolean',fields:{BOOL:x.v==='真'?'TRUE':'FALSE'}};
      if(x.v==='空')return{type:'logic_null'};
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
    if((m=s.match(/^將 (.+?) 設為 (.+)$/))||(m=s.match(/^賦值 (.+?) 成 (.+)$/)))return{type:'variables_set',fields:{VAR:V(m[1])},inputs:{VALUE:{block:parseExpr(m[2])}}};
    if((m=s.match(/^將 (.+?) 的值加 (.+)$/))||(m=s.match(/^修改 (.+?) 自 (.+)$/)))return{type:'math_change',fields:{VAR:V(m[1])},inputs:{DELTA:{block:parseExpr(m[2])}}};
    if((m=s.match(/^說出 (.+)$/)))return{type:'io_print',inputs:{TEXT:{block:parseExpr(m[1])}}};
    if((m=s.match(/^至 (.+?) 套用文字 (.+)$/)))return{type:'text_append',fields:{VAR:V(m[1])},inputs:{TEXT:{block:parseExpr(m[2])}}};
    if(s==='中斷循環')return{type:'controls_flow_statements',fields:{FLOW:'BREAK'}};
    if(s==='繼續下一個循環')return{type:'controls_flow_statements',fields:{FLOW:'CONTINUE'}};
    const LV=n=>({block:{type:'variables_get',fields:{VAR:{name:n.trim()}}}});
    if((m=s.match(/^清單 (.+?) 加入 (.+)$/)))return{type:'lists_setIndex',fields:{MODE:'INSERT',WHERE:'LAST'},extraState:'<mutation at="false"></mutation>',inputs:{LIST:LV(m[1]),TO:{block:parseExpr(m[2])}}};
    if((m=s.match(/^清單 (.+?) 插入第 (.+?) 項 (.+)$/)))return{type:'lists_setIndex',fields:{MODE:'INSERT',WHERE:'FROM_START'},extraState:'<mutation at="true"></mutation>',inputs:{LIST:LV(m[1]),AT:{block:parseExpr(m[2])},TO:{block:parseExpr(m[3])}}};
    if((m=s.match(/^清單 (.+?) 第 (.+?) 項設為 (.+)$/)))return{type:'lists_setIndex',fields:{MODE:'SET',WHERE:'FROM_START'},extraState:'<mutation at="true"></mutation>',inputs:{LIST:LV(m[1]),AT:{block:parseExpr(m[2])},TO:{block:parseExpr(m[3])}}};
    if((m=s.match(/^清單 (.+?) 刪除第 (.+?) 項$/)))return{type:'lists_getIndex',fields:{MODE:'REMOVE',WHERE:'FROM_START'},extraState:'<mutation statement="true" at="true"></mutation>',inputs:{VALUE:LV(m[1]),AT:{block:parseExpr(m[2])}}};
    if((m=s.match(/^為列表 (.+) 裡的每一項 (.+)$/))){const b={type:'controls_forEach',fields:{VAR:V(m[2])},inputs:{LIST:{block:parseExpr(m[1])}}};const c=body();if(c)b.inputs.DO={block:c};return b;}
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
