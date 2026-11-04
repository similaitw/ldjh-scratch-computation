/* 小遊戲「靈兵大道」：帶著靈兵往前衝，左右選一道運算門。
   每道門都是一個積木（將 靈兵 設為 靈兵 × 2…），結束時把走過的門翻成程式。
   用法：MiniGame.open({tier, unit, enemy, onEnd:r=>{}})；tier 0–3 決定出現哪些門。 */
(function(){
const W=480,H=720,ROWS=7,GAP=300,SPEED=175,START=10;
const ri=(a,b)=>a+Math.floor(Math.random()*(b-a+1)),pick=a=>a[Math.floor(Math.random()*a.length)];
function gateOf(kind,U){
  if(kind==='add'){const k=ri(4,20);return{label:'+'+k,f:x=>x+k,code:`將 ${U} 設為 ${U} + ${k}`};}
  if(kind==='sub'){const k=ri(3,12);return{label:'−'+k,f:x=>Math.max(0,x-k),code:`將 ${U} 設為 ${U} − ${k}`};}
  if(kind==='mul'){const k=pick([2,2,3]);return{label:'×'+k,f:x=>x*k,code:`將 ${U} 設為 ${U} × ${k}`};}
  if(kind==='div'){const k=pick([2,3]);return{label:'÷'+k,small:'無條件捨去',f:x=>Math.floor(x/k),code:`將 ${U} 設為 無條件捨去(${U} ÷ ${k})`};}
  if(kind==='if'){const t=pick([20,30,40,50]),a=pick([2,3]),b=ri(5,15);return{label:`≥${t} 就 ×${a}`,small:`否則 +${b}`,f:x=>x>=t?x*a:x+b,code:`如果 ${U} ≥ ${t}\n  將 ${U} 設為 ${U} × ${a}\n否則\n  將 ${U} 設為 ${U} + ${b}`};}
  if(kind==='rep'){const n=pick([2,3,4]),k=ri(3,8);return{label:`重複${n}次`,small:`每次 +${k}`,f:x=>x+n*k,code:`重複 ${n} 次\n  將 ${U} 的值加 ${k}`};}
  if(kind==='mod'){const k=pick([5,10]);return{label:`餘數÷${k}`,small:'只剩餘數',f:x=>x%k,code:`將 ${U} 設為 餘數(${U}, ${k})`};}
}
const POOLS=[['add','add','sub','mul'],['add','sub','mul','div','if'],['add','sub','mul','div','if','rep'],['add','sub','mul','div','if','rep','mod']];
let st=null,cv,ctx,raf=0,box;
function css(){if(document.getElementById('miniCss'))return;const s=document.createElement('style');s.id='miniCss';s.textContent=`
#mini{position:fixed;inset:0;z-index:35;background:rgba(3,6,12,.82);display:flex;align-items:center;justify-content:center}
#mini.hidden{display:none}
#mini .mbox{position:relative;height:min(96vh,860px);aspect-ratio:2/3;max-width:96vw}
#mini canvas{width:100%;height:100%;border-radius:14px;box-shadow:0 0 0 2px rgba(243,210,122,.6),0 20px 60px rgba(0,0,0,.6);touch-action:none;display:block}
#mini .mclose{position:absolute;top:10px;right:10px;z-index:2}
#mini .mclose{top:64px!important}
#mini .mpanel{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:26px;text-align:center;background:rgba(10,14,24,.86);border-radius:14px;overflow:auto}
#mini .mpanel[hidden]{display:none}
#mini .mpanel h3{font-size:1.6rem;margin:0 0 8px;color:#fff3cf}
#mini .mpanel p{margin:6px 0;line-height:1.6}
#mini .mcode{text-align:left;background:#fff;color:#222;border-radius:8px;padding:10px 14px;font-size:.9rem;white-space:pre;max-height:34vh;overflow:auto;margin:10px 0;width:100%;font-family:ui-monospace,Consolas,"Noto Sans Mono CJK TC",monospace}`;document.head.appendChild(s);}
function build(){
  if(box)return;css();box=document.createElement('div');box.id='mini';box.className='hidden';
  box.innerHTML='<div class="mbox"><canvas width="'+W+'" height="'+H+'"></canvas><button class="btn small ghost mclose" type="button">關閉</button><div class="mpanel" hidden></div></div>';
  document.body.appendChild(box);cv=box.querySelector('canvas');ctx=cv.getContext('2d');
  box.querySelector('.mclose').onclick=close;
  const mv=e=>{if(!st||st.phase!=='run')return;const r=cv.getBoundingClientRect();st.tx=Math.min(.92,Math.max(.08,(e.clientX-r.left)/r.width));};
  cv.addEventListener('pointerdown',e=>{mv(e);cv.setPointerCapture(e.pointerId);});cv.addEventListener('pointermove',e=>{if(e.buttons||e.pointerType!=='mouse')mv(e);else mv(e);});
  window.addEventListener('keydown',e=>{if(!st||box.classList.contains('hidden'))return;
    if(e.key==='ArrowLeft'){st.tx=Math.max(.08,st.tx-.42);e.preventDefault();}if(e.key==='ArrowRight'){st.tx=Math.min(.92,st.tx+.42);e.preventDefault();}if(e.key==='Escape')close();});
}
function best(rows){let b=-1;for(let m=0;m<(1<<rows.length);m++){let x=START;rows.forEach((r,k)=>{x=r[(m>>k)&1].f(x);});if(x>b)b=x;}return b;}
function open(o){
  build();const U=o.unit||'靈兵',pool=POOLS[Math.max(0,Math.min(3,o.tier|0))];
  const rows=Array.from({length:ROWS},()=>{let a,b;do{a=gateOf(pick(pool),U);b=gateOf(pick(pool),U);}while(a.label===b.label);return[a,b];});
  const top=best(rows),hp=Math.max(START+5,Math.round(top*.65));
  const coins=[];for(let k=0;k<ROWS;k++)for(let c=0;c<3;c++)coins.push({x:ri(12,88)/100,y:-(k*GAP+GAP*.5+c*38),got:false});
  st={o,U,G:o.gold||'靈石',rows,hp,top,coins,phase:'ready',x:.5,tx:.5,scroll:0,army:START,gold:0,trace:[],passed:0,t:0,flash:null};
  box.classList.remove('hidden');panel(`<h3>${o.title||'靈兵大道'}</h3><p>帶著 ${START} 名${U}往前衝！左右拖曳（或按 ← →）選一道門。</p><p>每道門都是一個積木：${U}會照門上的運算改變。</p><p>最後${U}要比${o.enemy||'心魔城'}的 <b>${hp}</b> 點血量多才能攻下。</p><div class="row" style="justify-content:center"><button class="btn" data-m="go">出發！</button></div>`);
  loop();
}
function panel(html){const p=box.querySelector('.mpanel');if(html===null){p.hidden=true;return;}p.innerHTML=html;p.hidden=false;
  p.querySelectorAll('[data-m]').forEach(b=>b.onclick=()=>{const a=b.dataset.m;if(a==='go'){panel(null);st.phase='run';st.last=performance.now();}else if(a==='again'){const o=st.o;open(o);}else close();});}
function close(){cancelAnimationFrame(raf);raf=0;if(box)box.classList.add('hidden');st=null;}
function loop(){cancelAnimationFrame(raf);const step=now=>{if(!st)return;const dt=Math.min(.05,(now-(st.last||now))/1000);st.last=now;update(dt);draw();raf=requestAnimationFrame(step);};raf=requestAnimationFrame(step);}
const PY=H-150;
function update(dt){
  if(st.phase!=='run'){st.t+=dt;return;}
  st.t+=dt;st.x+=(st.tx-st.x)*Math.min(1,dt*10);st.scroll+=SPEED*dt;
  while(st.passed<ROWS&&st.scroll>=(st.passed+1)*GAP){const r=st.rows[st.passed],side=st.x<.5?0:1,g=r[side],before=st.army;st.army=g.f(st.army);
    st.trace.push({g,before,after:st.army});st.flash={t:0,txt:(st.army>=before?'+':'')+(st.army-before),good:st.army>=before};st.passed++;}
  st.coins.forEach(c=>{if(c.got)return;const y=PY+(c.y+st.scroll);if(Math.abs(y-PY)<22&&Math.abs(c.x-st.x)*W<34){c.got=true;st.gold++;}});
  if(st.flash)st.flash.t+=dt;
  if(st.scroll>=(ROWS+1)*GAP){st.phase='end';finish();}
}
function finish(){
  const win=st.army>st.hp,U=st.U;
  const code=st.trace.map(x=>x.g.code).join('\n');
  const r={win,army:st.army,hp:st.hp,best:st.top,gold:st.gold,code};
  let first=false;if(st.o.onEnd)first=st.o.onEnd(r)||false;
  panel(`<h3>${win?'攻下了！':'差一點……'}</h3><p>最後${U} <b>${st.army}</b>，${st.o.enemy||'心魔城'}血量 <b>${st.hp}</b>。撿到${st.G} ${st.gold} 枚。</p>
  <p>這條路最多可以有 <b>${st.top}</b> 名${U}。${st.army>=st.top?'你走的就是最佳路線！':'想想看：先加再乘，還是先乘再加比較多？'}</p>
  ${first?`<p style="color:#7fe0bf">${first}</p>`:''}
  <p style="margin-top:10px">你走過的門，就是這段程式（${U}一開始是 ${START}）：</p><div class="mcode">${esc(`將 ${U} 設為 ${START}\n`+code)}</div>
  <div class="row" style="justify-content:center"><button class="btn" data-m="again">再玩一次</button><button class="btn ghost" data-m="close">回去修煉</button></div>`);
}
const esc=s=>String(s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
/* ---------- 繪圖 ---------- */
function rr(x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();}
function draw(){
  const s=st;ctx.clearRect(0,0,W,H);
  /* 地面與道路 */
  const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'#c99a5b');g.addColorStop(1,'#e0b676');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  ctx.fillStyle='#8a5a3b';ctx.fillRect(0,0,26,H);ctx.fillRect(W-26,0,26,H);
  ctx.fillStyle='rgba(120,80,50,.25)';for(let k=-1;k<12;k++){const y=((k*90+s.scroll*1)%(H+90))-90;ctx.fillRect(40,y,6,40);ctx.fillRect(W-46,y+45,6,40);}
  ctx.strokeStyle='rgba(255,255,255,.35)';ctx.setLineDash([24,22]);ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(W/2,0);ctx.lineTo(W/2,H);ctx.lineDashOffset=-s.scroll;ctx.stroke();ctx.setLineDash([]);
  /* 靈石 */
  s.coins.forEach(c=>{if(c.got)return;const y=PY+(c.y+s.scroll);if(y<-20||y>H+20)return;const x=c.x*W;
    ctx.fillStyle='#ffe27a';ctx.strokeStyle='#b88a1e';ctx.lineWidth=3;ctx.beginPath();ctx.arc(x,y,11+Math.sin(s.t*6+c.y)*1.5,0,7);ctx.fill();ctx.stroke();ctx.fillStyle='#b88a1e';ctx.font='bold 12px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(st.G[0],x,y+1);});
  /* 門 */
  s.rows.forEach((r,k)=>{const y=PY+(-(k+1)*GAP+s.scroll);if(y<-120||y>H+40)return;const done=k<s.passed;
    r.forEach((gt,side)=>{const x=side?W/2+6:32,w=W/2-38,good=gt.f(s.army)>=s.army;
      ctx.globalAlpha=done?.25:1;ctx.fillStyle=good?'rgba(56,189,120,.82)':'rgba(222,70,70,.82)';rr(x,y-46,w,74,12);ctx.fill();ctx.strokeStyle='rgba(255,255,255,.85)';ctx.lineWidth=3;ctx.stroke();
      ctx.fillStyle='#fff';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='900 30px system-ui,sans-serif';ctx.fillText(gt.label,x+w/2,y-(gt.small?18:9));
      if(gt.small){ctx.font='700 17px system-ui,sans-serif';ctx.fillText(gt.small,x+w/2,y+12);}ctx.globalAlpha=1;});});
  /* 心魔城 */
  const cy=PY+(-(ROWS+1)*GAP+s.scroll)+40;if(cy>-200){ctx.fillStyle='#4b3252';rr(W/2-120,cy-140,240,150,10);ctx.fill();
    ctx.fillStyle='#6b4a74';for(let k=0;k<5;k++)ctx.fillRect(W/2-120+k*52,cy-170,32,34);ctx.fillStyle='#1d1022';rr(W/2-34,cy-60,68,70,30);ctx.fill();
    ctx.fillStyle='#ff6b6b';ctx.font='900 34px system-ui,sans-serif';ctx.textAlign='center';ctx.fillText('♥ '+s.hp,W/2,cy-100);}
  /* 靈兵隊伍 */
  const px=s.x*W,n=Math.min(s.army,80);
  for(let k=n-1;k>=0;k--){const a=k*2.399,rad=8+Math.sqrt(k)*7.5,x=px+Math.cos(a)*rad,y=PY+18+Math.abs(Math.sin(a))*rad*.9+Math.sin(s.t*12+k)*1.5;
    ctx.fillStyle='#2f6fd6';ctx.beginPath();ctx.arc(x,y,7,0,7);ctx.fill();ctx.fillStyle='#f1c9a0';ctx.beginPath();ctx.arc(x,y-6,4.2,0,7);ctx.fill();}
  ctx.fillStyle='#f3f0e8';ctx.strokeStyle='#c9a54a';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(px,PY-26);ctx.lineTo(px+15,PY+8);ctx.lineTo(px-15,PY+8);ctx.closePath();ctx.fill();ctx.stroke();
  ctx.fillStyle='#f1c9a0';ctx.beginPath();ctx.arc(px,PY-30,9,0,7);ctx.fill();ctx.fillStyle='#1d1d22';ctx.beginPath();ctx.arc(px,PY-37,5,0,7);ctx.fill();
  /* 數字 */
  ctx.fillStyle='rgba(10,14,24,.78)';rr(px-38,PY-82,76,34,17);ctx.fill();ctx.fillStyle='#fff';ctx.font='900 22px system-ui,sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(s.army,px,PY-65);
  if(s.flash&&s.flash.t<.9){ctx.globalAlpha=1-s.flash.t/.9;ctx.fillStyle=s.flash.good?'#7dffb2':'#ff8a8a';ctx.font='900 30px system-ui,sans-serif';ctx.fillText(s.flash.txt,px,PY-100-s.flash.t*40);ctx.globalAlpha=1;}
  /* 上方資訊 */
  ctx.fillStyle='rgba(10,14,24,.7)';rr(12,12,W-24,44,12);ctx.fill();ctx.fillStyle='#fff3cf';ctx.font='800 17px system-ui,sans-serif';ctx.textAlign='left';
  ctx.fillText(`${s.U} ${s.army}　${s.G} ${s.gold}`,26,35);ctx.textAlign='right';ctx.fillText(`門 ${s.passed}/${ROWS}　目標 > ${s.hp}`,W-26,35);
}
window.MiniGame={open,close};
})();
