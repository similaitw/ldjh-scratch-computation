/* 配樂與音效：用 Web Audio 即時合成，不需要音樂檔，也沒有版權問題。
   仙俠：五聲音階（宮商角徵羽）的古箏撥弦＋笛聲＋低音持續音。
   魔法學院：鐘琴琶音＋柔和和弦墊音。 */
(function(root){
const M={on:false,ctx:null,theme:'xian',timer:null,next:0,step:0,vol:.5};
const midi=n=>440*Math.pow(2,(n-69)/12);
function ensure(){
  if(M.ctx)return M.ctx;const AC=root.AudioContext||root.webkitAudioContext;if(!AC)return null;
  const c=new AC();M.ctx=c;
  M.master=c.createGain();M.master.gain.value=0;M.master.connect(c.destination);
  M.sfx=c.createGain();M.sfx.gain.value=.5;M.sfx.connect(c.destination);
  // 簡單的回聲空間：兩條回授延遲
  M.wet=c.createGain();M.wet.gain.value=.35;M.wet.connect(M.master);
  [.31,.47].forEach((t,i)=>{const d=c.createDelay(1);d.delayTime.value=t;const fb=c.createGain();fb.gain.value=.38;const lp=c.createBiquadFilter();lp.type='lowpass';lp.frequency.value=2400-i*600;
    M.wet.connect(d);d.connect(lp);lp.connect(fb);fb.connect(d);lp.connect(M.master);});
  M.dry=c.createGain();M.dry.gain.value=.8;M.dry.connect(M.master);
  return c;
}
function out(g,wet=.6){g.connect(M.dry);const w=M.ctx.createGain();w.gain.value=wet;g.connect(w);w.connect(M.wet);}
/* 古箏般的撥弦：三角波＋泛音，快速衰減 */
function pluck(n,t,len=1.6,v=.22,dest){
  const c=M.ctx,g=c.createGain(),f=c.createBiquadFilter();f.type='lowpass';f.frequency.setValueAtTime(4200,t);f.frequency.exponentialRampToValueAtTime(700,t+len);
  [[1,'triangle',1],[2,'sine',.35],[3,'sine',.12]].forEach(([m,type,a])=>{const o=c.createOscillator();o.type=type;o.frequency.value=midi(n)*m;const og=c.createGain();og.gain.value=a;o.connect(og);og.connect(f);o.start(t);o.stop(t+len+.05);});
  g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v,t+.006);g.gain.exponentialRampToValueAtTime(.001,t+len);
  f.connect(g);if(dest)g.connect(dest);else out(g);
}
/* 笛聲：正弦波＋顫音，慢起慢收 */
function flute(n,t,len,v=.07){
  const c=M.ctx,o=c.createOscillator(),g=c.createGain(),lfo=c.createOscillator(),lg=c.createGain();
  o.type='sine';o.frequency.value=midi(n);lfo.frequency.value=5.2;lg.gain.value=midi(n)*.006;lfo.connect(lg);lg.connect(o.frequency);
  g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v,t+.25);g.gain.setValueAtTime(v,t+len-.3);g.gain.linearRampToValueAtTime(0,t+len);
  o.connect(g);out(g,.8);o.start(t);lfo.start(t);o.stop(t+len+.05);lfo.stop(t+len+.05);
}
/* 鐘琴：正弦波＋高泛音 */
function bell(n,t,len=1.8,v=.12,dest){
  const c=M.ctx,g=c.createGain();
  [[1,1],[2.76,.25],[5.4,.08]].forEach(([m,a])=>{const o=c.createOscillator();o.type='sine';o.frequency.value=midi(n)*m;const og=c.createGain();og.gain.setValueAtTime(a,t);og.gain.exponentialRampToValueAtTime(.001,t+len/m);o.connect(og);og.connect(g);o.start(t);o.stop(t+len+.05);});
  g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v,t+.004);g.gain.exponentialRampToValueAtTime(.001,t+len);
  if(dest)g.connect(dest);else out(g,.7);
}
/* 墊音：鋸齒波經過低通，慢慢淡入淡出 */
function pad(ns,t,len,v=.035){
  const c=M.ctx,g=c.createGain(),f=c.createBiquadFilter();f.type='lowpass';f.frequency.value=900;
  ns.forEach(n=>{[-6,6].forEach(dt=>{const o=c.createOscillator();o.type='sawtooth';o.frequency.value=midi(n);o.detune.value=dt;o.connect(f);o.start(t);o.stop(t+len+.1);});});
  g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v,t+len*.35);g.gain.linearRampToValueAtTime(0,t+len);
  f.connect(g);out(g,.5);
}
const rnd=a=>a[Math.floor(Math.random()*a.length)];
/* 仙俠：D 宮調五聲音階 */
const XIAN={beat:.42,scale:[62,64,66,69,71,74,76,78,81],
  bar(t,k){const b=this.beat;
    if(k%4===0){pad([50,57],t,b*16,.03);}
    if(k%2===0)pluck(rnd([38,45]),t,3,.16);
    let i=M.xi??4;
    for(let s=0;s<8;s++){if(Math.random()<(s%2?.45:.75)){i=Math.max(0,Math.min(this.scale.length-1,i+rnd([-2,-1,-1,1,1,2,0])));
      pluck(this.scale[i],t+s*b*.5+(Math.random()*.02),1.8,s%4===0?.2:.13);
      if(s===0&&Math.random()<.25)pluck(this.scale[i]-12,t,2,.1);}}
    M.xi=i;
    if(k%4===2&&Math.random()<.7){flute(rnd([74,76,78,81]),t+b,b*5);}
    return b*4;}};
/* 魔法學院：A 小調－F－C－G 和弦進行 */
const MAGIC={beat:.36,chords:[[57,60,64],[53,57,60],[48,52,55],[55,59,62]],
  bar(t,k){const b=this.beat,ch=this.chords[k%4];
    pad(ch.map(n=>n),t,b*8,.03);pluck(ch[0]-12,t,2.6,.12);
    const arp=[ch[0]+12,ch[1]+12,ch[2]+12,ch[1]+24,ch[2]+12,ch[1]+12];
    for(let s=0;s<8;s++){if(s<6||Math.random()<.5)bell(s<6?arp[s]:rnd(arp)+12,t+s*b*.5,1.6,s===0?.1:.07);}
    return b*4;}};
function tick(){
  const c=M.ctx;if(!c||!M.on)return;const T=M.theme==='magic'?MAGIC:XIAN;
  while(M.next<c.currentTime+.6){M.next+=T.bar(M.next,M.step++);}
}
M.start=function(){const c=ensure();if(!c)return;if(c.state==='suspended')c.resume();
  M.on=true;M.master.gain.cancelScheduledValues(c.currentTime);M.master.gain.setTargetAtTime(M.vol*.5,c.currentTime,.8);
  if(M.next<c.currentTime)M.next=c.currentTime+.1;clearInterval(M.timer);M.timer=setInterval(tick,150);tick();};
M.stop=function(){if(!M.ctx)return;M.on=false;clearInterval(M.timer);M.master.gain.setTargetAtTime(0,M.ctx.currentTime,.3);};
M.duck=function(on){if(!M.ctx||!M.on)return;M.master.gain.setTargetAtTime(M.vol*(on?.25:.5),M.ctx.currentTime,.5);};
/* 音效：不受背景音樂開關影響之外的另一個開關 */
M.sfxOn=true;
M.play=function(kind){if(!M.sfxOn)return;const c=ensure();if(!c)return;if(c.state==='suspended')c.resume();const t=c.currentTime+.02,d=M.sfx;
  if(kind==='ok'){[74,78,81,86].forEach((n,i)=>(M.theme==='magic'?bell:pluck)(n,t+i*.09,1.2,.2,d));}
  else if(kind==='bad'){pluck(57,t,.6,.18,d);pluck(56,t+.16,.9,.16,d);}
  else if(kind==='win'){[62,66,69,74,78,81,86].forEach((n,i)=>(M.theme==='magic'?bell:pluck)(n,t+i*.08,1.8,.2,d));pluck(50,t,2.5,.2,d);}
  else if(kind==='click'){(M.theme==='magic'?bell:pluck)(86,t,.4,.08,d);}
};
M.T={xian:XIAN,magic:MAGIC};
root.Music=M;
})(window);
