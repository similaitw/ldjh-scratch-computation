/* 小遊戲「靈兵大道」：帶著靈兵往前衝。
   路上有：運算門（左右二選一，每道門都是一個積木）、心魔小隊（吃掉同數量的靈兵）、移動刀陣（撞到少四分之一）、靈石。
   關卡越後面越長、越快、門越難；撿到的靈石可以強化起始靈兵。結束時把走過的路翻成積木程式。
   用法：MiniGame.open({tier, unit, enemy, gold, title, save:{lv,gold,up}, onSave(save), onEnd(result)}) */
(function(){
const W=480,H=720,PY=H-150,CAP=9999;
const ri=(a,b)=>a+Math.floor(Math.random()*(b-a+1)),pick=a=>a[Math.floor(Math.random()*a.length)];
const esc=s=>String(s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
/* ---------- 運算門 ---------- */
function gateOf(kind,U){
  switch(kind){
  case'add':{const k=ri(5,25);return{label:'+'+k,f:x=>x+k,code:`將 ${U} 設為 ${U} + ${k}`};}
  case'sub':{const k=ri(4,15);return{label:'−'+k,f:x=>x-k,code:`將 ${U} 設為 ${U} − ${k}`};}
  case'mul':{const k=pick([2,2,2,3]);return{label:'×'+k,f:x=>x*k,code:`將 ${U} 設為 ${U} × ${k}`};}
  case'div':{const k=pick([2,3]);return{label:'÷'+k,small:'無條件捨去',f:x=>Math.floor(x/k),code:`將 ${U} 設為 無條件捨去(${U} ÷ ${k})`};}
  case'mix':{const a=2,b=ri(3,20),neg=Math.random()<.5;return{label:`×${a} ${neg?'−':'+'}${b}`,small:'先乘再'+(neg?'減':'加'),f:x=>neg?x*a-b:x*a+b,code:`將 ${U} 設為 ${U} × ${a} ${neg?'−':'+'} ${b}`};}
  case'par':{const b=ri(3,9),a=2;return{label:`(+${b})×${a}`,small:'先加再乘',f:x=>(x+b)*a,code:`將 ${U} 設為 (${U} + ${b}) × ${a}`};}
  case'if':{const t=pick([20,30,40,60,80,120]),a=2,b=ri(5,15);return{label:`≥${t} 就 ×${a}`,small:`否則 +${b}`,f:x=>x>=t?x*a:x+b,code:`如果 ${U} ≥ ${t}\n  將 ${U} 設為 ${U} × ${a}\n否則\n  將 ${U} 設為 ${U} + ${b}`};}
  case'even':{const b=ri(3,12);return{label:'偶數 ×2',small:`奇數 −${b}`,f:x=>x%2===0?x*2:x-b,code:`如果 ${U} 是偶數\n  將 ${U} 設為 ${U} × 2\n否則\n  將 ${U} 設為 ${U} − ${b}`};}
  case'rep':{const n=pick([3,4,5]),k=ri(3,9);return{label:`重複${n}次`,small:`每次 +${k}`,f:x=>x+n*k,code:`重複 ${n} 次\n  將 ${U} 的值加 ${k}`};}
  case'rep2':{const n=2;return{label:`重複${n}次`,small:'每次 ×2',f:x=>x*2**n,code:`重複 ${n} 次\n  將 ${U} 設為 ${U} × 2`};}
  case'mod':{const k=pick([7,10,20]);return{label:`餘數÷${k}`,small:'只剩餘數',f:x=>x%k,code:`將 ${U} 設為 餘數(${U}, ${k})`};}
  case'sq':return{label:'平方根',small:'無條件捨去',f:x=>Math.floor(Math.sqrt(Math.max(0,x))),code:`將 ${U} 設為 無條件捨去(平方根(${U}))`};
  }
}
const POOLS=[
  ['add','add','sub','mul','mix'],
  ['add','sub','mul','div','mix','if'],
  ['add','sub','mul','div','mix','if','rep','par'],
  ['add','sub','mul','div','mix','par','if','even','rep','rep','rep2','mod','sq']];
/* ---------- 關卡 ---------- */
function makeStage(tier,lv,U){
  const pool=POOLS[Math.min(3,tier+Math.floor((lv-1)/3))],nGate=5+Math.min(lv,5),ev=[];let y=0;
  for(let k=0;k<nGate;k++){
    y+=235;let a,b;do{a=gateOf(pick(pool),U);b=gateOf(pick(pool),U);}while(a.label===b.label);
    if(lv>=4&&Math.random()<.18+lv*.02){(Math.random()<.5?a:b).mystery=true;}
    ev.push({t:'gate',y,pair:[a,b]});
    if(k>=1&&Math.random()<Math.min(.75,.25+lv*.08)){y+=150;ev.push({t:'enemy',y,n:0,lvl:k});}
    if(lv>=2&&Math.random()<Math.min(.6,.15+lv*.06)){y+=130;ev.push({t:'blade',y,ph:Math.random()*6,sp:1.4+lv*.18+Math.random()});}
  }
  y+=320;ev.push({t:'castle',y});
  const coins=[];ev.forEach((e,k)=>{if(e.t==='gate'&&k){const base=e.y-140,lane=Math.random()<.5?.25:.75;for(let c=0;c<4;c++)coins.push({x:lane+(Math.random()-.5)*.12,y:base+c*30,got:false});}});
  return{ev,coins,len:y,speed:200+lv*12};
}
/* 依照目前的兵力，訂出心魔小隊的人數：跟著最佳路線長大 */
function tune(stage,start){
  const gates=stage.ev.filter(e=>e.t==='gate'),n=gates.length;
  const run=mask=>{let x=start,ok=true,gi=0;for(const e of stage.ev){if(e.t==='gate'){x=Math.min(CAP,Math.round(e.pair[(mask>>gi)&1].f(x)));gi++;if(x<=0){ok=false;break;}}else if(e.t==='enemy'){x-=e.n;if(x<=0){ok=false;break;}}}return ok?x:-1;};
  /* 先依「平均路線」決定敵人規模，再算最佳結果 */
  let x=start,gi=0;
  for(const e of stage.ev){if(e.t==='gate'){const v=e.pair.map(g=>g.f(x));x=Math.max(1,Math.round((Math.max(...v)*2+Math.min(...v))/3));gi++;}
    else if(e.t==='enemy'){e.n=Math.max(3,Math.round(x*(.3+Math.random()*.25)));x-=e.n;if(x<1)x=1;}}
  let best=-1;for(let m=0;m<(1<<n);m++){const v=run(m);if(v>best)best=v;}
  if(best<=0){stage.ev.forEach(e=>{if(e.t==='enemy')e.n=Math.max(1,Math.floor(e.n/3));});best=-1;for(let m=0;m<(1<<n);m++){const v=run(m);if(v>best)best=v;}}
  stage.best=Math.max(1,best);stage.hp=Math.max(start+3,Math.round(stage.best*.6));
}
/* ---------- 畫面 ---------- */
let st=null,cv,ctx,raf=0,box,opts=null;
function css(){if(document.getElementById('miniCss'))return;const s=document.createElement('style');s.id='miniCss';s.textContent=`
#mini{position:fixed;inset:0;z-index:35;background:rgba(3,6,12,.82);display:flex;align-items:center;justify-content:center}
#mini.hidden{display:none}
#mini .mbox{position:relative;height:min(96vh,860px);aspect-ratio:2/3;max-width:96vw}
#mini canvas{width:100%;height:100%;border-radius:14px;box-shadow:0 0 0 2px rgba(243,210,122,.6),0 20px 60px rgba(0,0,0,.6);touch-action:none;display:block}
#mini .mclose{position:absolute;top:64px;right:10px;z-index:2}
#mini .mpanel{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:22px;text-align:center;background:rgba(10,14,24,.88);border-radius:14px;overflow:auto}
#mini .mpanel[hidden]{display:none}
#mini .mpanel h3{font-size:1.6rem;margin:0 0 6px;color:#fff3cf}
#mini .mpanel p{margin:5px 0;line-height:1.55}
#mini .stars{font-size:2.2rem;letter-spacing:.2em;color:#ffd75a;text-shadow:0 0 12px rgba(255,200,60,.6)}
#mini .stars i{color:#555;font-style:normal}
#mini .mcode{text-align:left;background:#fff;color:#222;border-radius:8px;padding:10px 14px;font-size:.86rem;white-space:pre;max-height:26vh;overflow:auto;margin:8px 0;width:100%;font-family:ui-monospace,Consolas,"Noto Sans Mono CJK TC",monospace}
#mini .shop{display:flex;gap:10px;align-items:center;justify-content:center;flex-wrap:wrap;margin:8px 0;padding:8px 12px;border:1px dashed rgba(243,210,122,.6);border-radius:10px}
#mini .legend{display:grid;grid-template-columns:auto 1fr;gap:6px 10px;text-align:left;margin:8px 0;font-size:.95rem}
#mini .legend b{color:#ffd75a}`;document.head.appendChild(s);}
function build(){
  if(box)return;css();box=document.createElement('div');box.id='mini';box.className='hidden';
  box.innerHTML='<div class="mbox"><canvas width="'+W+'" height="'+H+'"></canvas><button class="btn small ghost mclose" type="button">關閉</button><div class="mpanel" hidden></div></div>';
  document.body.appendChild(box);cv=box.querySelector('canvas');ctx=cv.getContext('2d');
  box.querySelector('.mclose').onclick=close;
  const mv=e=>{if(!st||st.phase!=='run')return;const r=cv.getBoundingClientRect();st.tx=Math.min(.92,Math.max(.08,(e.clientX-r.left)/r.width));};
  cv.addEventListener('pointerdown',e=>{mv(e);try{cv.setPointerCapture(e.pointerId);}catch(_){}});cv.addEventListener('pointermove',mv);
  window.addEventListener('keydown',e=>{if(!st||box.classList.contains('hidden'))return;
    if(e.key==='ArrowLeft'){st.tx=Math.max(.08,st.tx-.21);e.preventDefault();}if(e.key==='ArrowRight'){st.tx=Math.min(.92,st.tx+.21);e.preventDefault();}if(e.key==='Escape')close();});
}
const SV=()=>opts.save||(opts.save={lv:1,gold:0,up:0});
const startArmy=()=>10+5*SV().up;
const upCost=()=>15+10*SV().up;
function open(o){build();opts=o;intro();box.classList.remove('hidden');loop();}
function intro(){
  const sv=SV(),U=opts.unit||'靈兵',E=opts.enemy||'心魔城',G=opts.gold||'靈石';
  st={phase:'menu',t:0};
  panel(`<h3>${opts.title||'靈兵大道'}</h3><p>第 <b>${sv.lv}</b> 關　起始${U} <b>${startArmy()}</b>　${G} <b>${sv.gold}</b></p>
  <div class="legend"><b>運算門</b><span>左右二選一，${U}照門上的積木改變。要心算！</span><b>心魔小隊</b><span>紅色敵軍，會吃掉同樣多的${U}；不夠多就全軍覆沒。</span>
  <b>刀陣</b><span>左右移動，撞到少四分之一。隊伍越大越難躲。</span><b>？門</b><span>第 4 關起出現，靠近才看得到。</span><b>${E}</b><span>終點：${U}比血量多才攻得下。</span></div>
  ${shopHTML()}<p class="sub" style="opacity:.8">拖曳畫面或按 ← → 移動。</p>
  <div class="row" style="justify-content:center"><button class="btn" data-m="go">出發！第 ${sv.lv} 關</button>${sv.lv>1?'<button class="btn ghost" data-m="prev">重玩上一關</button>':''}</div>`);
}
function shopHTML(){const sv=SV(),c=upCost(),G=opts.gold||'靈石';
  return `<div class="shop"><span>強化：起始${opts.unit||'靈兵'} +5（${G} ${c}）</span><button class="btn small ${sv.gold>=c?'':'ghost'}" data-m="buy" ${sv.gold>=c?'':'disabled'}>購買</button></div>`;}
function begin(lv){
  const U=opts.unit||'靈兵',tier=Math.max(0,Math.min(3,opts.tier|0)),start=startArmy();
  const stg=makeStage(tier,lv,U);tune(stg,start);
  st={phase:'run',lv,U,G:opts.gold||'靈石',E:opts.enemy||'心魔城',stg,x:.5,tx:.5,scroll:0,army:start,start,gold:0,trace:[`將 ${U} 設為 ${start}`],next:0,t:0,
    fx:[],parts:[],battle:null,last:performance.now()};
  panel(null);
}
function panel(html){const p=box.querySelector('.mpanel');if(html===null){p.hidden=true;return;}p.innerHTML=html;p.hidden=false;
  p.querySelectorAll('[data-m]').forEach(b=>b.onclick=()=>{const a=b.dataset.m,sv=SV();
    if(a==='go')begin(sv.lv);else if(a==='prev')begin(Math.max(1,sv.lv-1));else if(a==='again')begin(st.lv);else if(a==='menu')intro();
    else if(a==='next'){begin(sv.lv);}
    else if(a==='buy'){const c=upCost();if(sv.gold>=c){sv.gold-=c;sv.up++;opts.onSave&&opts.onSave(sv);}if(st.phase==='menu')intro();else{const sh=p.querySelector('.shop');if(sh)sh.outerHTML=shopHTML();p.querySelectorAll('[data-m=buy]').forEach(x=>x.onclick=b.onclick);}}
    else close();});}
function close(){cancelAnimationFrame(raf);raf=0;if(box)box.classList.add('hidden');st=null;}
function loop(){cancelAnimationFrame(raf);const step=now=>{if(!box||box.classList.contains('hidden'))return;if(st&&st.phase!=='menu'){const dt=Math.min(.05,(now-(st.last||now))/1000);st.last=now;update(dt);draw();}else drawIdle(now);raf=requestAnimationFrame(step);};raf=requestAnimationFrame(step);}
/* ---------- 遊戲進行 ---------- */
const crowdR=n=>Math.min(70,12+Math.sqrt(Math.max(0,n))*5.2);
function lose(n,x,y){for(let k=0;k<Math.min(n,30);k++)st.parts.push({x:x+(Math.random()-.5)*crowdR(st.army)*1.6,y:y+(Math.random()-.5)*30,vx:(Math.random()-.5)*160,vy:-80-Math.random()*160,t:0,c:'#2f6fd6'});}
function popText(txt,good){st.fx.push({t:0,txt,good});}
function update(dt){
  const s=st;s.t+=dt;s.parts.forEach(p=>{p.t+=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=420*dt;});s.parts=s.parts.filter(p=>p.t<1.2);s.fx.forEach(f=>f.t+=dt);s.fx=s.fx.filter(f=>f.t<1);
  if(s.phase==='battle'){const b=s.battle;b.t+=dt;const step=Math.max(1,Math.ceil(b.total/40));
    if(b.t>.03){b.t=0;const k=Math.min(step,b.left,s.army);s.army-=k;b.left-=k;if(b.kind==='castle')b.hp-=k;lose(k,s.x*W,PY-30);
      if(b.left<=0||s.army<=0){if(b.kind==='castle')return finish(b.hp<=0&&s.army>0);
        if(s.army<=0)return finish(false,'全軍覆沒');s.phase='run';}}return;}
  if(s.phase!=='run')return;
  s.x+=(s.tx-s.x)*Math.min(1,dt*9);s.scroll+=s.stg.speed*dt;
  const px=s.x*W;
  while(s.next<s.stg.ev.length&&s.scroll>=s.stg.ev[s.next].y){const e=s.stg.ev[s.next++];
    if(e.t==='gate'){const g=e.pair[s.x<.5?0:1],b=s.army;s.army=Math.min(CAP,Math.max(0,Math.round(g.f(s.army))));s.trace.push(g.code);
      popText((s.army>=b?'+':'')+(s.army-b),s.army>=b);if(s.army<b)lose(b-s.army,px,PY);if(s.army<=0)return finish(false,'兵力歸零');}
    else if(e.t==='enemy'){s.trace.push(`將 ${s.U} 設為 ${s.U} − ${e.n}　（擊退心魔小隊）`);s.phase='battle';s.battle={kind:'enemy',left:e.n,total:e.n,t:0};e.done=true;return;}
    else if(e.t==='blade'){const bx=bladeX(e);if(Math.abs(bx-px)<crowdR(s.army)+18){const k=Math.max(1,Math.ceil(s.army/4));s.army-=k;lose(k,px,PY);popText('−'+k+' 刀陣',false);s.trace.push(`將 ${s.U} 設為 ${s.U} − ${k}　（撞到刀陣）`);if(s.army<=0)return finish(false,'全軍覆沒');}else popText('閃過！',true);}
    else if(e.t==='castle'){s.phase='battle';s.battle={kind:'castle',left:s.stg.hp,total:s.stg.hp,hp:s.stg.hp,t:0};return;}}
  s.stg.coins.forEach(c=>{if(c.got)return;const y=PY-(c.y-s.scroll);if(Math.abs(y-PY)<26&&Math.abs(c.x*W-px)<crowdR(s.army)*.7+16){c.got=true;s.gold++;}});
}
const bladeX=e=>W/2+Math.sin(st.t*e.sp+e.ph)*(W/2-70);
function finish(win,why){
  const s=st,sv=SV();s.phase='end';
  const pct=win?(s.army)/(s.stg.best-s.stg.hp||1):0;
  const final=win?s.army:0,stars=win?(final>=s.stg.best-s.stg.hp?3:final>=(s.stg.best-s.stg.hp)*.5?2:1):0;
  const earned=s.gold+(win?stars*5:0);sv.gold+=earned;
  if(win&&s.lv===sv.lv)sv.lv++;
  opts.onSave&&opts.onSave(sv);
  let note=false;if(opts.onEnd)note=opts.onEnd({win,stars,lv:s.lv})||false;
  const starsH=win?`<div class="stars">${'★'.repeat(stars)}<i>${'★'.repeat(3-stars)}</i></div>`:'';
  panel(`<h3>${win?'攻下了！第 '+s.lv+' 關':'失敗：'+(why||s.E+'太堅固')}</h3>${starsH}
  <p>${win?`攻城後還剩 <b>${final}</b> 名${s.U}，`:''}${s.E}血量 ${s.stg.hp}。這一關最佳路線攻城前最多 <b>${s.stg.best}</b> 名${s.U}。</p>
  <p>得到${s.G} <b>${earned}</b>（撿到 ${s.gold}${win?`＋星星獎勵 ${stars*5}`:''}）</p>${note?`<p style="color:#7fe0bf">${note}</p>`:''}
  ${win?'':`<p>想想看：${pick(['先乘再加，還是先加再乘比較多？','遇到心魔小隊之前，兵力夠不夠？','門上的條件成立嗎？算一算再選。','隊伍很大時，刀陣比較難閃。'])}</p>`}
  ${shopHTML()}
  <p style="margin-top:6px">你走過的路，就是這段程式：</p><div class="mcode">${esc(s.trace.join('\n'))}</div>
  <div class="row" style="justify-content:center">${win?`<button class="btn" data-m="next">下一關（第 ${sv.lv} 關）</button>`:`<button class="btn" data-m="again">再挑戰一次</button>`}<button class="btn ghost" data-m="close">回去修煉</button></div>`);
}
/* ---------- 繪圖 ---------- */
function rr(x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();}
function ground(scroll){
  const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'#bf8f52');g.addColorStop(1,'#e2ba7c');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  ctx.fillStyle='#7d4f33';ctx.fillRect(0,0,24,H);ctx.fillRect(W-24,0,24,H);
  ctx.fillStyle='#a06a44';for(let k=-1;k<10;k++){const y=((k*110+scroll)%(H+110))-110;ctx.beginPath();ctx.arc(12,y,16,0,7);ctx.fill();ctx.beginPath();ctx.arc(W-12,y+55,16,0,7);ctx.fill();}
  ctx.strokeStyle='rgba(255,255,255,.3)';ctx.setLineDash([24,22]);ctx.lineWidth=4;ctx.lineDashOffset=-scroll;ctx.beginPath();ctx.moveTo(W/2,0);ctx.lineTo(W/2,H);ctx.stroke();ctx.setLineDash([]);
}
function drawIdle(now){ground(now*.06);ctx.fillStyle='rgba(0,0,0,.25)';ctx.fillRect(0,0,W,H);}
function soldier(x,y,c,bob){ctx.fillStyle=c;ctx.beginPath();ctx.arc(x,y+bob,7,0,7);ctx.fill();ctx.fillStyle='#f1c9a0';ctx.beginPath();ctx.arc(x,y-6+bob,4.2,0,7);ctx.fill();}
function crowd(cx,cy,n,c,t){const m=Math.min(n,90);for(let k=m-1;k>=0;k--){const a=k*2.399,rad=Math.sqrt(k)*5.2+(k?4:0);soldier(cx+Math.cos(a)*rad,cy+Math.sin(a)*rad*.75,c,Math.sin(t*14+k)*1.4);}}
function draw(){
  const s=st;ground(s.scroll);const sy=y=>PY-(y-s.scroll);
  /* 靈石 */
  s.stg.coins.forEach(c=>{if(c.got)return;const y=sy(c.y);if(y<-20||y>H+20)return;const x=c.x*W;
    ctx.fillStyle='#ffe27a';ctx.strokeStyle='#b88a1e';ctx.lineWidth=3;ctx.beginPath();ctx.arc(x,y,10+Math.sin(s.t*6+c.y)*1.5,0,7);ctx.fill();ctx.stroke();});
  /* 事件 */
  s.stg.ev.forEach((e,k)=>{const y=sy(e.y);if(y<-260||y>H+80)return;const passed=k<s.next;
    if(e.t==='gate')e.pair.forEach((g,side)=>{const x=side?W/2+6:30,w=W/2-36,hid=g.mystery&&y<PY-260,good=!hid&&g.f(s.army)>=s.army;
      ctx.globalAlpha=passed?.22:1;ctx.fillStyle=hid?'rgba(120,90,200,.9)':good?'rgba(46,180,110,.86)':'rgba(220,64,64,.86)';rr(x,y-44,w,72,12);ctx.fill();ctx.strokeStyle='rgba(255,255,255,.9)';ctx.lineWidth=3;ctx.stroke();
      ctx.fillStyle='#fff';ctx.textAlign='center';ctx.textBaseline='middle';
      if(hid){ctx.font='900 40px system-ui,sans-serif';ctx.fillText('？',x+w/2,y-8);}
      else{ctx.font='900 '+(g.label.length>7?24:29)+'px system-ui,sans-serif';ctx.fillText(g.label,x+w/2,y-(g.small?18:8));if(g.small){ctx.font='700 16px system-ui,sans-serif';ctx.fillText(g.small,x+w/2,y+12);}}
      ctx.globalAlpha=1;});
    else if(e.t==='enemy'&&!e.done){crowd(W/2,y,e.n,'#d63b3b',s.t);ctx.fillStyle='rgba(120,10,10,.85)';rr(W/2-36,y-62,72,30,15);ctx.fill();ctx.fillStyle='#fff';ctx.font='900 19px system-ui,sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('心魔 '+e.n,W/2,y-47);}
    else if(e.t==='blade'&&!passed){const bx=bladeX(e);ctx.save();ctx.translate(bx,y);ctx.rotate(s.t*9);ctx.fillStyle='#d9dde3';ctx.strokeStyle='#6b7280';ctx.lineWidth=2;
      for(let q=0;q<4;q++){ctx.rotate(Math.PI/2);ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(28,-8);ctx.lineTo(34,6);ctx.closePath();ctx.fill();ctx.stroke();}ctx.fillStyle='#374151';ctx.beginPath();ctx.arc(0,0,8,0,7);ctx.fill();ctx.restore();
      ctx.strokeStyle='rgba(80,60,40,.5)';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(46,y);ctx.lineTo(W-46,y);ctx.stroke();}
    else if(e.t==='castle'){const hp=s.battle&&s.battle.kind==='castle'?Math.max(0,s.battle.hp):s.stg.hp;ctx.fillStyle='#4b3252';rr(W/2-130,y-150,260,160,10);ctx.fill();ctx.fillStyle='#6b4a74';for(let q=0;q<5;q++)ctx.fillRect(W/2-130+q*56,y-182,34,36);
      ctx.fillStyle='#1d1022';rr(W/2-36,y-66,72,76,32);ctx.fill();ctx.fillStyle='#ff6b6b';ctx.font='900 36px system-ui,sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('♥ '+hp,W/2,y-106);
      ctx.fillStyle='#fff';ctx.font='800 16px system-ui,sans-serif';ctx.fillText(s.E,W/2,y-140);}});
  /* 我方 */
  const px=s.x*W;crowd(px,PY+20,s.army,'#2f6fd6',s.t);
  ctx.fillStyle='#f3f0e8';ctx.strokeStyle='#c9a54a';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(px,PY-22);ctx.lineTo(px+14,PY+10);ctx.lineTo(px-14,PY+10);ctx.closePath();ctx.fill();ctx.stroke();
  ctx.fillStyle='#f1c9a0';ctx.beginPath();ctx.arc(px,PY-27,9,0,7);ctx.fill();ctx.fillStyle='#1d1d22';ctx.beginPath();ctx.arc(px,PY-34,5,0,7);ctx.fill();
  s.parts.forEach(p=>{ctx.globalAlpha=Math.max(0,1-p.t/1.2);soldier(p.x,p.y,p.c,0);});ctx.globalAlpha=1;
  ctx.fillStyle='rgba(10,14,24,.8)';rr(px-40,PY-84,80,34,17);ctx.fill();ctx.fillStyle='#fff';ctx.font='900 22px system-ui,sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(s.army,px,PY-67);
  s.fx.forEach(f=>{ctx.globalAlpha=1-f.t;ctx.fillStyle=f.good?'#7dffb2':'#ff8a8a';ctx.font='900 28px system-ui,sans-serif';ctx.fillText(f.txt,px,PY-104-f.t*50);});ctx.globalAlpha=1;
  /* 上方資訊 */
  const prog=Math.min(1,s.scroll/s.stg.len);
  ctx.fillStyle='rgba(10,14,24,.75)';rr(12,12,W-24,44,12);ctx.fill();ctx.fillStyle='#fff3cf';ctx.font='800 17px system-ui,sans-serif';ctx.textAlign='left';ctx.textBaseline='middle';
  ctx.fillText(`第${s.lv}關　${s.U} ${s.army}　${s.G} ${s.gold}`,24,34);ctx.textAlign='right';ctx.fillText(`${s.E} ♥${s.stg.hp}`,W-24,34);
  ctx.fillStyle='rgba(255,255,255,.2)';ctx.fillRect(24,50,W-48,4);ctx.fillStyle='#ffd75a';ctx.fillRect(24,50,(W-48)*prog,4);
}
window.MiniGame={open,close,_state:()=>st,_test:{makeStage,tune,POOLS,gateOf}};
})();
