/* 小遊戲「御劍斬魔」：左右移動，自動射出劍氣，打碎迎面而來的心魔與落石。
   打倒敵人會掉法寶（重複：多一道劍氣、疾風：射速變快、♥：補血）；技能條滿了可以放「萬劍歸宗」清光全場。
   撐過一波波心魔後大魔頭登場，打掉血條就過關。靈石可以強化劍氣威力。
   用法：MiniGame.open({title, unit, enemy, gold, shot, skill, boss, save:{lv,gold,up}, onSave(save), onEnd(result)}) */
(function(){
const W=480,H=720,PY=H-110,WAVE=36;
const ri=(a,b)=>a+Math.floor(Math.random()*(b-a+1)),rf=(a,b)=>a+Math.random()*(b-a),pick=a=>a[Math.floor(Math.random()*a.length)];
let st=null,cv,ctx,raf=0,box,opts=null;
const L=k=>({shot:'劍氣',skill:'萬劍歸宗',boss:'大魔頭',enemy:'心魔',gold:'靈石',title:'御劍斬魔'})[k],T=k=>(opts&&opts[k])||L(k);
function css(){if(document.getElementById('miniCss'))return;const s=document.createElement('style');s.id='miniCss';s.textContent=`
#mini{position:fixed;inset:0;z-index:35;background:rgba(3,6,12,.82);display:flex;align-items:center;justify-content:center}
#mini.hidden{display:none}
#mini .mbox{position:relative;height:min(96vh,860px);aspect-ratio:2/3;max-width:96vw}
#mini canvas{width:100%;height:100%;border-radius:14px;box-shadow:0 0 0 2px rgba(243,210,122,.6),0 20px 60px rgba(0,0,0,.6);touch-action:none;display:block}
#mini .mclose{position:absolute;top:64px;right:10px;z-index:2}
#mini .mpanel{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;text-align:center;background:rgba(10,14,24,.86);border-radius:14px;overflow:auto}
#mini .mpanel[hidden]{display:none}
#mini .mpanel h3{font-size:1.7rem;margin:0 0 8px;color:#fff3cf}
#mini .mpanel p{margin:6px 0;line-height:1.55}
#mini .stars{font-size:2.4rem;letter-spacing:.2em;color:#ffd75a;text-shadow:0 0 12px rgba(255,200,60,.6)}
#mini .stars i{color:#555;font-style:normal}
#mini .shop{display:flex;gap:10px;align-items:center;justify-content:center;flex-wrap:wrap;margin:10px 0;padding:8px 12px;border:1px dashed rgba(243,210,122,.6);border-radius:10px}
#mini .legend{display:grid;grid-template-columns:auto 1fr;gap:6px 12px;text-align:left;margin:10px 0;font-size:.98rem}
#mini .legend b{color:#ffd75a}`;document.head.appendChild(s);}
function build(){
  if(box)return;css();box=document.createElement('div');box.id='mini';box.className='hidden';
  box.innerHTML='<div class="mbox"><canvas width="'+W+'" height="'+H+'"></canvas><button class="btn small ghost mclose" type="button">關閉</button><div class="mpanel" hidden></div></div>';
  document.body.appendChild(box);cv=box.querySelector('canvas');ctx=cv.getContext('2d');
  box.querySelector('.mclose').onclick=close;
  const pos=e=>{const r=cv.getBoundingClientRect();return[(e.clientX-r.left)/r.width*W,(e.clientY-r.top)/r.height*H];};
  cv.addEventListener('pointerdown',e=>{if(!st||st.phase!=='run')return;const[x,y]=pos(e);if(Math.hypot(x-SKX,y-SKY)<44){skill();return;}st.drag=true;st.tx=x;try{cv.setPointerCapture(e.pointerId);}catch(_){}});
  cv.addEventListener('pointermove',e=>{if(!st||st.phase!=='run')return;const[x,y]=pos(e);if(st.drag||e.pointerType==='mouse')st.tx=x;});
  cv.addEventListener('pointerup',()=>{if(st)st.drag=false;});
  window.addEventListener('keydown',e=>{if(!st||box.classList.contains('hidden'))return;
    if(e.key==='ArrowLeft'){st.kl=true;e.preventDefault();}if(e.key==='ArrowRight'){st.kr=true;e.preventDefault();}
    if(e.key===' '||e.key==='Enter'){skill();e.preventDefault();}if(e.key==='Escape')close();});
  window.addEventListener('keyup',e=>{if(!st)return;if(e.key==='ArrowLeft')st.kl=false;if(e.key==='ArrowRight')st.kr=false;});
}
const SKX=W-52,SKY=H-52;
const SV=()=>opts.save||(opts.save={lv:1,gold:0,up:0});
const upCost=()=>15+10*SV().up;
function open(o){build();opts=o;box.classList.remove('hidden');intro();loop();}
function intro(){const sv=SV();st={phase:'menu',t:0,clouds:clouds()};
  panel(`<h3>${T('title')}</h3><p>第 <b>${sv.lv}</b> 關　${T('shot')}威力 <b>${1+sv.up}</b>　${T('gold')} <b>${sv.gold}</b></p>
  <div class="legend"><b>移動</b><span>拖曳畫面，或按 ← →。${T('shot')}會自動發射。</span>
  <b>${T('enemy')}</b><span>數字是血量，打到 0 就消滅。讓它衝到底線會扣一顆 ♥。</span>
  <b>法寶</b><span>「重複」多一道${T('shot')}、「疾風」射得更快、「♥」補血。</span>
  <b>${T('skill')}</b><span>右下角的技能，充滿後點它（或按空白鍵），清光整個畫面！</span>
  <b>${T('boss')}</b><span>撐過心魔大軍後登場，打掉血條就過關。</span></div>
  ${shopHTML()}<div class="row" style="justify-content:center"><button class="btn" data-m="go">出發！第 ${sv.lv} 關</button>${sv.lv>1?'<button class="btn ghost" data-m="prev">玩上一關</button>':''}</div>`);}
function shopHTML(){const sv=SV(),c=upCost();return `<div class="shop"><span>強化：${T('shot')}威力 +1（${T('gold')} ${c}）</span><button class="btn small ${sv.gold>=c?'':'ghost'}" data-m="buy" ${sv.gold>=c?'':'disabled'}>購買</button></div>`;}
function clouds(){return Array.from({length:9},()=>({x:rf(0,W),y:rf(0,H),r:rf(30,80),v:rf(20,50)}));}
function begin(lv){const sv=SV();
  st={phase:'run',lv,t:0,x:W/2,tx:W/2,hp:3,maxhp:3,dmg:1+sv.up,ways:1,rate:.24,cd:0,charge:0,shots:[],foes:[],items:[],parts:[],rings:[],eshots:[],
    spawn:0,gold:0,kills:0,boss:null,shake:0,clouds:clouds(),last:performance.now(),msg:{t:0,txt:'第 '+lv+' 關！'}};
  panel(null);}
function panel(html){const p=box.querySelector('.mpanel');if(html===null){p.hidden=true;return;}p.innerHTML=html;p.hidden=false;
  p.querySelectorAll('[data-m]').forEach(b=>b.onclick=()=>{const a=b.dataset.m,sv=SV();
    if(a==='go'||a==='next')begin(sv.lv);else if(a==='prev')begin(Math.max(1,sv.lv-1));else if(a==='again')begin(st.lv);
    else if(a==='buy'){const c=upCost();if(sv.gold>=c){sv.gold-=c;sv.up++;opts.onSave&&opts.onSave(sv);}if(st.phase==='menu')intro();else{p.querySelector('.shop').outerHTML=shopHTML();p.querySelector('[data-m=buy]').onclick=b.onclick;}}
    else close();});}
function close(){cancelAnimationFrame(raf);raf=0;if(box)box.classList.add('hidden');st=null;}
function loop(){cancelAnimationFrame(raf);const step=now=>{if(!box||box.classList.contains('hidden'))return;if(st){const dt=Math.min(.05,(now-(st.last||now))/1000);st.last=now;update(dt);draw();}raf=requestAnimationFrame(step);};raf=requestAnimationFrame(step);}
/* ---------- 遊戲 ---------- */
function boom(x,y,c,n=14,sp=200){for(let k=0;k<n;k++){const a=rf(0,7),v=rf(sp*.3,sp);st.parts.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,t:0,life:rf(.4,.8),c,r:rf(2,4.5)});}}
function spawnFoe(){const s=st,lv=s.lv,rock=Math.random()<.25,big=!rock&&Math.random()<.12+lv*.01;
  const hp=rock?ri(3,5)+lv:big?ri(6,10)+lv*2:ri(1,3)+Math.floor(lv/2);
  s.foes.push({x:rf(40,W-40),y:-30,vy:(rock?rf(60,90):rf(70,110))+lv*5,vx:rock?0:rf(-30,30),hp,max:hp,r:rock?24:big?30:19,kind:rock?'rock':big?'big':'imp',wob:rf(0,6)});}
function drop(x,y){const r=Math.random();if(r<.16)st.items.push({x,y,k:pick(['rep','rep','fast','heart']),t:0});else if(r<.5)st.items.push({x,y,k:'gold',t:0});}
function hurt(){const s=st;if(s.inv>0)return;s.hp--;s.inv=1.2;s.shake=.35;boom(s.x,PY,'#ff6b6b',18);if(s.hp<=0)finish(false);}
function skill(){const s=st;if(!s||s.phase!=='run'||s.charge<1)return;s.charge=0;s.shake=.5;s.rings.push({t:0});
  s.foes.forEach(f=>{boom(f.x,f.y,'#a78bfa',16,260);s.kills++;s.gold+=f.kind==='big'?2:1;});s.foes=[];s.eshots=[];
  if(s.boss){s.boss.hp-=Math.ceil(s.boss.max*.15);boom(s.boss.x,s.boss.y,'#ffd75a',30,300);if(s.boss.hp<=0)return winBoss();}
  s.msg={t:0,txt:T('skill')+'！'};}
function winBoss(){const s=st;boom(s.boss.x,s.boss.y,'#ffd75a',60,380);boom(s.boss.x,s.boss.y,'#a78bfa',40,300);s.gold+=10;s.boss=null;s.phase='won';s.wonT=0;}
function update(dt){
  const s=st;s.t+=dt;if(s.phase==='menu'){s.clouds.forEach(c=>{c.y+=c.v*dt*.6;if(c.y-c.r>H){c.y=-c.r;c.x=rf(0,W);}});return;}
  (s.clouds||[]).forEach(c=>{c.y+=c.v*dt*(s.phase==='run'?2.2:.6);if(c.y-c.r>H){c.y=-c.r;c.x=rf(0,W);}});
  s.parts.forEach(p=>{p.t+=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=.96;p.vy*=.96;});s.parts=s.parts.filter(p=>p.t<p.life);
  (s.rings||[]).forEach(r=>r.t+=dt);if(s.rings)s.rings=s.rings.filter(r=>r.t<.8);
  if(s.msg)s.msg.t+=dt;if(s.shake>0)s.shake-=dt;
  if(s.phase==='won'){s.wonT+=dt;if(s.wonT>1.2)finish(true);return;}
  if(s.phase!=='run')return;
  if(s.inv>0)s.inv-=dt;
  if(s.kl)s.tx=s.x-260*dt*3;if(s.kr)s.tx=s.x+260*dt*3;
  s.tx=Math.max(26,Math.min(W-26,s.tx));s.x+=(s.tx-s.x)*Math.min(1,dt*14);
  /* 發射 */
  s.cd-=dt;if(s.cd<=0){s.cd=s.rate;const n=s.ways;for(let k=0;k<n;k++){const a=(k-(n-1)/2)*.16;s.shots.push({x:s.x+(k-(n-1)/2)*6,y:PY-34,vx:Math.sin(a)*620,vy:-Math.cos(a)*620});}}
  s.shots.forEach(b=>{b.x+=b.vx*dt;b.y+=b.vy*dt;});s.shots=s.shots.filter(b=>b.y>-20&&b.x>-20&&b.x<W+20&&!b.hit);
  /* 敵人 */
  if(!s.boss&&s.t<WAVE){s.spawn-=dt;if(s.spawn<=0){s.spawn=Math.max(.32,1.0-s.lv*.05-s.t*.012)*rf(.7,1.2);spawnFoe();if(s.t>12&&Math.random()<.3)spawnFoe();}}
  if(!s.boss&&s.t>=WAVE&&s.foes.length===0){const hp=50+s.lv*30;s.boss={x:W/2,y:-80,ty:150,hp,max:hp,cd:1.5,t:0};s.msg={t:0,txt:T('boss')+'來了！'};}
  s.foes.forEach(f=>{f.y+=f.vy*dt;f.x+=f.vx*dt+Math.sin(s.t*3+f.wob)*(f.kind==='imp'?30:0)*dt;if(f.x<24||f.x>W-24)f.vx*=-1;
    s.shots.forEach(b=>{if(!b.hit&&Math.hypot(b.x-f.x,b.y-f.y)<f.r+5){b.hit=true;f.hp-=s.dmg;f.flash=.08;boom(b.x,b.y,'#9ff3ff',3,120);}});
    if(f.flash>0)f.flash-=dt;
    if(f.hp<=0&&!f.dead){f.dead=true;s.kills++;s.charge=Math.min(1,s.charge+(f.kind==='big'?.14:.07));boom(f.x,f.y,f.kind==='rock'?'#9ca3af':'#a78bfa',f.kind==='big'?26:16);drop(f.x,f.y);}
    if(!f.dead&&Math.hypot(f.x-s.x,f.y-PY)<f.r+18){f.dead=true;boom(f.x,f.y,'#a78bfa',12);hurt();}
    if(!f.dead&&f.y>H+20){f.dead=true;hurt();}});
  s.foes=s.foes.filter(f=>!f.dead);
  /* 大魔頭 */
  const B=s.boss;if(B){B.t+=dt;B.y+=(B.ty-B.y)*Math.min(1,dt*2);B.x=W/2+Math.sin(B.t*.9)*(W/2-90);
    s.shots.forEach(b=>{if(!b.hit&&Math.abs(b.x-B.x)<62&&Math.abs(b.y-B.y)<56){b.hit=true;B.hp-=s.dmg;B.flash=.06;boom(b.x,b.y,'#ffd75a',3,140);}});
    if(B.flash>0)B.flash-=dt;
    B.cd-=dt;if(B.cd<=0&&B.y>100){B.cd=Math.max(.55,1.4-s.lv*.07);const n=3+Math.min(4,Math.floor(s.lv/2));for(let k=0;k<n;k++){const a=Math.PI/2+(k-(n-1)/2)*.32;s.eshots.push({x:B.x,y:B.y+40,vx:Math.cos(a)*170,vy:Math.sin(a)*170});}}
    if(B.hp<=0)return winBoss();}
  s.eshots.forEach(e=>{e.x+=e.vx*dt;e.y+=e.vy*dt;if(!e.hit&&Math.hypot(e.x-s.x,e.y-PY)<16){e.hit=true;hurt();}});s.eshots=s.eshots.filter(e=>!e.hit&&e.y<H+20);
  /* 法寶 */
  s.items.forEach(it=>{it.t+=dt;it.y+=90*dt;const d=Math.hypot(it.x-s.x,it.y-PY);if(d<120){it.x+=(s.x-it.x)*dt*4;it.y+=(PY-it.y)*dt*4;}
    if(d<26){it.got=true;if(it.k==='gold')s.gold++;else if(it.k==='rep'){if(s.ways<5){s.ways++;s.msg={t:0,txt:'重複！'+s.ways+' 道'+T('shot')};}else s.gold+=3;}
      else if(it.k==='fast'){s.rate=Math.max(.1,s.rate*.8);s.msg={t:0,txt:'疾風！射速提升'};}else if(it.k==='heart'){if(s.hp<s.maxhp)s.hp++;else s.gold+=3;}}});
  s.items=s.items.filter(it=>!it.got&&it.y<H+20);
}
function finish(win){const s=st,sv=SV();if(s.phase==='end')return;s.phase='end';
  const stars=win?s.hp:0,earned=s.gold+(win?stars*5:0);sv.gold+=earned;if(win&&s.lv===sv.lv)sv.lv++;opts.onSave&&opts.onSave(sv);
  let note=false;if(opts.onEnd)note=opts.onEnd({win,stars,lv:s.lv})||false;
  setTimeout(()=>panel(`<h3>${win?'斬魔成功！第 '+s.lv+' 關':'被'+T('enemy')+'擊退了……'}</h3>${win?`<div class="stars">${'★'.repeat(stars)}<i>${'★'.repeat(3-stars)}</i></div>`:''}
  <p>消滅 <b>${s.kills}</b> 隻${T('enemy')}，得到${T('gold')} <b>${earned}</b>${win?`（含星星獎勵 ${stars*5}）`:''}。</p>${note?`<p style="color:#7fe0bf">${note}</p>`:''}
  ${win?'':`<p>小技巧：先打掉衝得快的${T('enemy')}；技能留給${T('boss')}或敵人太多的時候。</p>`}
  ${shopHTML()}
  <div class="row" style="justify-content:center">${win?`<button class="btn" data-m="next">下一關（第 ${sv.lv} 關）</button>`:`<button class="btn" data-m="again">再挑戰一次</button>`}<button class="btn ghost" data-m="close">回去修煉</button></div>`),win?0:500);}
/* ---------- 繪圖 ---------- */
function rr(x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();}
function sky(){const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'#1b2a4a');g.addColorStop(.6,'#3a5a7a');g.addColorStop(1,'#7fa3a8');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  (st.clouds||[]).forEach(c=>{ctx.fillStyle='rgba(255,255,255,.10)';ctx.beginPath();ctx.arc(c.x,c.y,c.r,0,7);ctx.arc(c.x+c.r*.8,c.y+10,c.r*.7,0,7);ctx.arc(c.x-c.r*.8,c.y+12,c.r*.6,0,7);ctx.fill();});}
function hero(x,y,t,blink){if(blink&&Math.floor(t*20)%2)return;
  ctx.save();ctx.translate(x,y);
  ctx.fillStyle='rgba(127,224,191,.35)';ctx.beginPath();ctx.ellipse(0,18,34,7,0,0,7);ctx.fill();
  ctx.fillStyle='#d9e6ef';ctx.strokeStyle='#7fe0bf';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-34,16);ctx.lineTo(30,16);ctx.lineTo(38,12);ctx.lineTo(30,20);ctx.lineTo(-34,20);ctx.closePath();ctx.fill();ctx.stroke();
  ctx.fillStyle='#f3f0e8';ctx.strokeStyle='#c9a54a';ctx.beginPath();ctx.moveTo(0,-18);ctx.lineTo(14,14);ctx.lineTo(-14,14);ctx.closePath();ctx.fill();ctx.stroke();
  ctx.fillStyle='#3fa58c';ctx.fillRect(-11,2,22,4);ctx.fillStyle='#f1c9a0';ctx.beginPath();ctx.arc(0,-22,9,0,7);ctx.fill();ctx.fillStyle='#1d1d22';ctx.beginPath();ctx.arc(0,-29,5,0,7);ctx.fill();
  const sc=1+Math.sin(t*10)*.15;ctx.strokeStyle='rgba(159,243,255,.7)';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,-6,30*sc,Math.PI*1.15,Math.PI*1.85);ctx.stroke();
  ctx.restore();}
function foe(f,t){ctx.save();ctx.translate(f.x,f.y);
  if(f.kind==='rock'){ctx.fillStyle=f.flash>0?'#fff':'#6b7280';ctx.beginPath();for(let k=0;k<8;k++){const a=k/8*7+.3,r=f.r*(k%2?.85:1);ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r);}ctx.closePath();ctx.fill();ctx.strokeStyle='#374151';ctx.lineWidth=2;ctx.stroke();}
  else{const g=ctx.createRadialGradient(0,-4,2,0,0,f.r);g.addColorStop(0,f.flash>0?'#fff':'#c4b5fd');g.addColorStop(1,f.kind==='big'?'#5b21b6':'#7c3aed');ctx.fillStyle=g;
    ctx.beginPath();ctx.arc(0,0,f.r,0,7);ctx.fill();ctx.fillStyle='#4c1d95';ctx.beginPath();ctx.moveTo(-f.r*.7,-f.r*.6);ctx.lineTo(-f.r*.45,-f.r*1.25);ctx.lineTo(-f.r*.2,-f.r*.8);ctx.fill();ctx.beginPath();ctx.moveTo(f.r*.7,-f.r*.6);ctx.lineTo(f.r*.45,-f.r*1.25);ctx.lineTo(f.r*.2,-f.r*.8);ctx.fill();
    ctx.fillStyle='#fde047';ctx.beginPath();ctx.arc(-f.r*.33,-f.r*.1,f.r*.16,0,7);ctx.arc(f.r*.33,-f.r*.1,f.r*.16,0,7);ctx.fill();ctx.strokeStyle='#1e1b4b';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,f.r*.25,f.r*.3,.2,Math.PI-.2);ctx.stroke();}
  ctx.fillStyle='#fff';ctx.font='900 '+(f.kind==='big'?20:16)+'px system-ui,sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.strokeStyle='rgba(0,0,0,.6)';ctx.lineWidth=3;
  ctx.strokeText(Math.max(0,f.hp),0,f.r+12);ctx.fillText(Math.max(0,f.hp),0,f.r+12);ctx.restore();}
function draw(){const s=st;ctx.save();if(s.shake>0)ctx.translate(rf(-6,6)*s.shake*2,rf(-6,6)*s.shake*2);sky();
  if(s.phase==='menu'){ctx.restore();return;}
  ctx.strokeStyle='rgba(255,107,107,.35)';ctx.setLineDash([10,10]);ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,H-6);ctx.lineTo(W,H-6);ctx.stroke();ctx.setLineDash([]);
  s.items.forEach(it=>{const b=Math.sin(it.t*6)*3;ctx.save();ctx.translate(it.x,it.y+b);
    if(it.k==='gold'){ctx.fillStyle='#ffe27a';ctx.strokeStyle='#b88a1e';ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,0,9,0,7);ctx.fill();ctx.stroke();}
    else{const c={rep:'#38bdf8',fast:'#34d399',heart:'#fb7185'}[it.k],txt={rep:'重複',fast:'疾風',heart:'♥'}[it.k];ctx.fillStyle=c;ctx.shadowColor=c;ctx.shadowBlur=14;rr(-24,-14,48,28,14);ctx.fill();ctx.shadowBlur=0;
      ctx.fillStyle='#fff';ctx.font='900 15px system-ui,sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(txt,0,1);}ctx.restore();});
  s.foes.forEach(f=>foe(f,s.t));
  const B=s.boss;if(B){ctx.save();ctx.translate(B.x,B.y);const g=ctx.createRadialGradient(0,-10,8,0,0,70);g.addColorStop(0,B.flash>0?'#fff':'#f0abfc');g.addColorStop(1,'#701a75');ctx.fillStyle=g;
    ctx.beginPath();ctx.arc(0,0,60,0,7);ctx.fill();ctx.fillStyle='#4a044e';for(const sx of[-1,1]){ctx.beginPath();ctx.moveTo(sx*40,-40);ctx.lineTo(sx*60,-90);ctx.lineTo(sx*18,-55);ctx.fill();}
    ctx.fillStyle='#fde047';ctx.beginPath();ctx.arc(-22,-8,10,0,7);ctx.arc(22,-8,10,0,7);ctx.fill();ctx.fillStyle='#1e1b4b';ctx.beginPath();ctx.arc(-22,-6,4,0,7);ctx.arc(22,-6,4,0,7);ctx.fill();
    ctx.fillStyle='#fff';ctx.beginPath();ctx.moveTo(-26,22);for(let k=0;k<6;k++){ctx.lineTo(-26+k*10+5,k%2?22:32);}ctx.lineTo(26,22);ctx.fill();ctx.restore();
    ctx.fillStyle='rgba(0,0,0,.6)';rr(40,70,W-80,16,8);ctx.fill();ctx.fillStyle='#e879f9';rr(40,70,(W-80)*Math.max(0,B.hp/B.max),16,8);ctx.fill();
    ctx.fillStyle='#fff';ctx.font='800 13px system-ui,sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(T('boss')+'　'+Math.max(0,B.hp)+' / '+B.max,W/2,78);}
  s.eshots.forEach(e=>{ctx.fillStyle='#f472b6';ctx.shadowColor='#f472b6';ctx.shadowBlur=12;ctx.beginPath();ctx.arc(e.x,e.y,8,0,7);ctx.fill();ctx.shadowBlur=0;});
  ctx.strokeStyle='#9ff3ff';ctx.lineWidth=4;ctx.lineCap='round';ctx.shadowColor='#67e8f9';ctx.shadowBlur=10;s.shots.forEach(b=>{ctx.beginPath();ctx.moveTo(b.x,b.y);ctx.lineTo(b.x-b.vx*.02,b.y-b.vy*.02);ctx.stroke();});ctx.shadowBlur=0;
  if(s.phase!=='end'||s.hp>0)hero(s.x,PY,s.t,s.inv>0);
  s.parts.forEach(p=>{ctx.globalAlpha=Math.max(0,1-p.t/p.life);ctx.fillStyle=p.c;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,7);ctx.fill();});ctx.globalAlpha=1;
  s.rings.forEach(r=>{ctx.strokeStyle=`rgba(255,215,90,${1-r.t/.8})`;ctx.lineWidth=10;ctx.beginPath();ctx.arc(s.x,PY,r.t*900,0,7);ctx.stroke();
    ctx.fillStyle=`rgba(255,245,200,${.35*(1-r.t/.8)})`;ctx.fillRect(0,0,W,H);});
  ctx.restore();
  /* 介面 */
  ctx.fillStyle='rgba(10,14,24,.7)';rr(12,12,W-24,44,12);ctx.fill();ctx.textBaseline='middle';ctx.font='800 17px system-ui,sans-serif';ctx.textAlign='left';ctx.fillStyle='#fb7185';
  ctx.fillText('♥'.repeat(Math.max(0,s.hp))+'♡'.repeat(Math.max(0,s.maxhp-s.hp)),24,34);ctx.fillStyle='#fff3cf';ctx.fillText(`第${s.lv}關　${T('gold')} ${s.gold}`,100,34);
  ctx.textAlign='right';ctx.fillText(s.boss?T('boss')+'戰！':`${T('enemy')}大軍 ${Math.max(0,Math.ceil(WAVE-s.t))} 秒`,W-24,34);
  /* 技能鈕 */
  const full=s.charge>=1;ctx.fillStyle='rgba(10,14,24,.75)';ctx.beginPath();ctx.arc(SKX,SKY,38,0,7);ctx.fill();
  ctx.strokeStyle=full?'#ffd75a':'rgba(255,215,90,.6)';ctx.lineWidth=6;ctx.beginPath();ctx.arc(SKX,SKY,34,-Math.PI/2,-Math.PI/2+Math.PI*2*s.charge);ctx.stroke();
  if(full){ctx.shadowColor='#ffd75a';ctx.shadowBlur=20+Math.sin(s.t*8)*10;}ctx.fillStyle=full?'#ffd75a':'#9ca3af';ctx.font='900 15px system-ui,sans-serif';ctx.textAlign='center';
  const sk=T('skill');ctx.fillText(sk.slice(0,2),SKX,SKY-8);ctx.fillText(sk.slice(2),SKX,SKY+10);ctx.shadowBlur=0;
  if(s.msg&&s.msg.t<1.4){ctx.globalAlpha=Math.min(1,(1.4-s.msg.t)*2);ctx.fillStyle='#fff3cf';ctx.font='900 34px system-ui,sans-serif';ctx.strokeStyle='rgba(0,0,0,.6)';ctx.lineWidth=5;ctx.strokeText(s.msg.txt,W/2,H/2-80-s.msg.t*20);ctx.fillText(s.msg.txt,W/2,H/2-80-s.msg.t*20);ctx.globalAlpha=1;}
}
window.MiniGame={open,close,_state:()=>st};
})();
