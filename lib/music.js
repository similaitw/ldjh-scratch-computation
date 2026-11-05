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
/* 仙俠：固定編好的 16 小節曲子（D 宮調五聲音階），不再隨機，一直重複播放。
   第 1–8 小節古箏彈旋律，第 9–16 小節換笛子吹同一段旋律，古箏在下面伴奏。 */
const XA=[[[69,1.5],[71,.5],[74,2]],[[71,1],[69,1],[66,2]],[[64,1],[66,.5],[69,.5],[71,1],[69,1]],[[66,1],[64,1],[62,2]]];
const XB=[[[74,1.5],[76,.5],[78,2]],[[76,1],[74,1],[71,2]],[[69,1],[71,.5],[74,.5],[76,1],[74,1]],[[71,1],[69,1],[69,2]]];
const XEND=[[66,1],[64,1],[62,2]];
const XMEL=[...XA,...XB,...XA.slice(0,3),XA[3],...XA,...XB.slice(0,3),XEND];
const XCH=[[50,57,62],[47,54,62],[52,57,59],[50,57,62],[50,57,62],[47,54,59],[45,52,57],[45,52,57]];
const XIAN={beat:.75,
  bar(t,k){const b=this.beat,i=k%16,mel=XMEL[i],ch=XCH[i%8],second=i>=8;
    if(i%8===0)pad([38,45],t,b*32,.022);
    pluck(ch[0]-12,t,b*4,.16);                       /* 每小節第一拍的低音 */
    const arp=[ch[0],ch[1],ch[2],ch[1]];              /* 古箏八分音符分解和弦 */
    for(let s=0;s<8;s++)pluck(arp[s%4]+(s>=4&&s%4===2?12:0),t+s*b/2,1.4,second?.085:.06);
    let x=0;mel.forEach(([n,d])=>{const tt=t+x*b;
      if(second){flute(n,tt,d*b*.98,.075);pluck(n+12,tt,1.2,.045);}
      else pluck(n,tt,Math.max(1.4,d*b*1.2),.21);
      x+=d;});
    return b*4;}};
/* 魔法學院：A 小調－F－C－G 和弦進行 */
const MAGIC={beat:.36,chords:[[57,60,64],[53,57,60],[48,52,55],[55,59,62]],
  bar(t,k){const b=this.beat,ch=this.chords[k%4];
    pad(ch.map(n=>n),t,b*8,.03);pluck(ch[0]-12,t,2.6,.12);
    const arp=[ch[0]+12,ch[1]+12,ch[2]+12,ch[1]+24,ch[2]+12,ch[1]+12];
    for(let s=0;s<8;s++){if(s<6||Math.random()<.5)bell(s<6?arp[s]:rnd(arp)+12,t+s*b*.5,1.6,s===0?.1:.07);}
    return b*4;}};

/* 戰鬥曲：給小遊戲用。D 小調、每分鐘 150 拍，大鼓＋小鼓＋銅鈸、八分音符低音、方波主旋律，固定 8 小節循環。 */
let NOISE=null;
function noiseBuf(){if(NOISE)return NOISE;const c=M.ctx,b=c.createBuffer(1,c.sampleRate*.5,c.sampleRate),d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;return NOISE=b;}
function kick(t,v=.55){const c=M.ctx,o=c.createOscillator(),g=c.createGain();o.type='sine';o.frequency.setValueAtTime(150,t);o.frequency.exponentialRampToValueAtTime(42,t+.12);
  g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.001,t+.28);o.connect(g);g.connect(M.dry);o.start(t);o.stop(t+.3);}
function hit(t,v,type,freq,len){const c=M.ctx,s=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain();s.buffer=noiseBuf();f.type=type;f.frequency.value=freq;
  g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.001,t+len);s.connect(f);f.connect(g);g.connect(M.dry);s.start(t);s.stop(t+len+.02);}
const snare=(t,v=.28)=>{hit(t,v,'bandpass',1800,.16);const c=M.ctx,o=c.createOscillator(),g=c.createGain();o.type='triangle';o.frequency.value=190;g.gain.setValueAtTime(v*.6,t);g.gain.exponentialRampToValueAtTime(.001,t+.1);o.connect(g);g.connect(M.dry);o.start(t);o.stop(t+.12);};
const hat=(t,v=.07)=>hit(t,v,'highpass',7000,.05);
const taiko=(t,v=.4)=>{const c=M.ctx,o=c.createOscillator(),g=c.createGain();o.type='sine';o.frequency.setValueAtTime(110,t);o.frequency.exponentialRampToValueAtTime(60,t+.25);g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.001,t+.45);o.connect(g);g.connect(M.dry);o.start(t);o.stop(t+.5);hit(t,v*.3,'lowpass',600,.12);};
function bass(n,t,len,v=.16){const c=M.ctx,o=c.createOscillator(),f=c.createBiquadFilter(),g=c.createGain();o.type='sawtooth';o.frequency.value=midi(n);f.type='lowpass';f.frequency.setValueAtTime(900,t);f.frequency.exponentialRampToValueAtTime(220,t+len);
  g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.001,t+len);o.connect(f);f.connect(g);g.connect(M.dry);o.start(t);o.stop(t+len+.02);}
function lead(n,t,len,v=.07){const c=M.ctx,o=c.createOscillator(),g=c.createGain(),f=c.createBiquadFilter();o.type='square';o.frequency.value=midi(n);f.type='lowpass';f.frequency.value=2600;
  g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v,t+.01);g.gain.setValueAtTime(v*.8,t+len*.7);g.gain.linearRampToValueAtTime(0,t+len);o.connect(f);f.connect(g);out(g,.25);o.start(t);o.stop(t+len+.02);}
/* 仙俠戰鬥曲：國樂打鬥風，D 羽調五聲音階、每分鐘 160 拍。
   大鼓＋堂鼓打節奏、大鑼開段落、鈸、琵琶輪指、阮彈低音、嗩吶主旋律、古箏刮奏。 */
function dagu(t,v=.6){const c=M.ctx,o=c.createOscillator(),g=c.createGain();o.type='sine';o.frequency.setValueAtTime(95,t);o.frequency.exponentialRampToValueAtTime(52,t+.18);
  g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.001,t+.55);o.connect(g);g.connect(M.dry);o.start(t);o.stop(t+.6);hit(t,v*.35,'lowpass',700,.09);}
function tanggu(t,v=.35){const c=M.ctx,o=c.createOscillator(),g=c.createGain();o.type='sine';o.frequency.setValueAtTime(240,t);o.frequency.exponentialRampToValueAtTime(150,t+.08);
  g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.001,t+.22);o.connect(g);g.connect(M.dry);o.start(t);o.stop(t+.25);hit(t,v*.4,'bandpass',1200,.06);}
function gong(t,v=.22,small=false){const c=M.ctx,g=c.createGain(),base=small?520:120;
  [[1,1],[1.48,.6],[2.13,.45],[2.95,.3],[3.8,.2]].forEach(([r,a])=>{const o=c.createOscillator(),og=c.createGain();o.type='sine';o.frequency.setValueAtTime(base*r,t);
    o.frequency.linearRampToValueAtTime(base*r*(small?1.12:.97),t+(small?.25:1.5));og.gain.value=a;o.connect(og);og.connect(g);o.start(t);o.stop(t+(small?.8:2.6));});
  g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v,t+.01);g.gain.exponentialRampToValueAtTime(.001,t+(small?.7:2.5));out(g,.6);hit(t,v*.5,'highpass',2500,small?.15:.6);}
const bo=(t,v=.1)=>hit(t,v,'highpass',3200,.35);
function suona(n,t,len,v=.06){const c=M.ctx,f=c.createBiquadFilter(),g=c.createGain(),lfo=c.createOscillator(),lg=c.createGain();f.type='bandpass';f.frequency.value=1600;f.Q.value=.9;
  lfo.frequency.value=6.2;lg.gain.value=midi(n)*.008;lfo.connect(lg);
  [['sawtooth',1],['square',.5]].forEach(([ty,a])=>{const o=c.createOscillator(),og=c.createGain();o.type=ty;o.frequency.setValueAtTime(midi(n)*.97,t);o.frequency.linearRampToValueAtTime(midi(n),t+.04);lg.connect(o.frequency);og.gain.value=a;o.connect(og);og.connect(f);o.start(t);o.stop(t+len+.05);});
  g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v,t+.02);g.gain.setValueAtTime(v,t+len*.8);g.gain.linearRampToValueAtTime(0,t+len);f.connect(g);out(g,.4);lfo.start(t);lfo.stop(t+len+.05);}
const PENTA=[62,65,67,69,72,74,77,79,81,84,86];
const BR=[38,41,36,38,38,41,36,38];
const BCH=[[62,69,74],[65,72,77],[60,67,72],[62,69,74],[62,69,74],[65,72,77],[60,67,72],[62,69,74]];
const BM=[[[74,.5],[72,.25],[74,.25],[77,1],[74,.5],[72,.5],[69,1]],[[72,.5],[74,.5],[77,1],[79,1],[77,1]],[[79,.5],[77,.5],[74,.5],[72,.5],[74,1],[69,1]],[[69,1.5],[72,.5],[74,2]],
          [[81,.5],[79,.5],[77,1],[79,.5],[81,.5],[84,1]],[[86,1],[84,.5],[81,.5],[79,1],[77,1]],[[79,.5],[77,.5],[74,.5],[72,.5],[69,1],[72,1]],[[74,.5],[74,.25],[74,.25],[77,.5],[79,.5],[81,2]]];
const BATTLE={beat:.375,
  bar(t,k){const b=this.beat,i=k%8,r=BR[i],ch=BCH[i];
    /* 阮：八分音符低音 */
    for(let s=0;s<8;s++)pluck(r+(s%4===2?7:0)+(s%2?12:0),t+s*b/2,.5,.13);
    /* 琵琶輪指：十六分音符快速撥弦 */
    for(let s=0;s<16;s++)pluck(ch[(s>>2)%3]+(s%2?12:0),t+s*b/4,.25,s%4===0?.07:.045);
    /* 鼓、鈸、鑼 */
    dagu(t);dagu(t+b*.5,.35);dagu(t+b*1.5,.45);dagu(t+b*2,.55);dagu(t+b*3.25,.4);
    tanggu(t+b);tanggu(t+b*3);bo(t+b);bo(t+b*3);bo(t+b*2.5,.05);
    if(i===0||i===4)gong(t,.24);
    if(i===2||i===6)gong(t+b*3.5,.12,true);
    if(i===7)for(let q=0;q<8;q++)dagu(t+b*2+q*b/4,.25+q*.05);
    /* 嗩吶主旋律 */
    let x=0;BM[i].forEach(([n,d])=>{suona(n,t+x*b,d*b*.92,.06);x+=d;});
    /* 古箏刮奏：段落結尾 */
    if(i===3||i===7)PENTA.forEach((n,q)=>pluck(n+12,t+b*3+q*.035,.6,.05));
    return b*4;}};
/* 魔法學院戰鬥曲：交響樂風格，E 小調、每分鐘 150 拍。
   弦樂四個聲部（大提琴低音推進、中提琴十六分快奏、第一小提琴主旋律加高八度、高音長音），圓號長和弦，打擊樂只用定音鼓。 */
function timp(n,t,v=.5,len=1.1){const c=M.ctx,g=c.createGain();
  [[1,1],[1.5,.35],[2,.18]].forEach(([r,a])=>{const o=c.createOscillator(),og=c.createGain();o.type='sine';o.frequency.setValueAtTime(midi(n)*r*1.03,t);o.frequency.exponentialRampToValueAtTime(midi(n)*r,t+.07);
    og.gain.setValueAtTime(a,t);og.gain.exponentialRampToValueAtTime(.001,t+len/r);o.connect(og);og.connect(g);o.start(t);o.stop(t+len+.05);});
  g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.001,t+len);out(g,.35);hit(t,v*.18,'lowpass',350,.07);}
function timpRoll(n,t,len,v0=.08,v1=.4){const k=Math.floor(len/.055);for(let q=0;q<k;q++)timp(n,t+q*.055,v0+(v1-v0)*q/k,.35);}
function bowed(n,t,len,v,att=.05,cut=3200,vib=true){const c=M.ctx,f=c.createBiquadFilter(),g=c.createGain();f.type='lowpass';f.frequency.value=cut;
  let lfo=null;if(vib){lfo=c.createOscillator();lfo.frequency.value=5.6;}
  [-9,-3,4,10].forEach(dt=>{const o=c.createOscillator();o.type='sawtooth';o.frequency.value=midi(n);o.detune.value=dt;
    if(lfo){const lg=c.createGain();lg.gain.value=midi(n)*.004;lfo.connect(lg);lg.connect(o.frequency);}o.connect(f);o.start(t);o.stop(t+len+.1);});
  if(lfo){lfo.start(t);lfo.stop(t+len+.1);}
  g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v,t+att);g.gain.setValueAtTime(v,t+Math.max(att,len-.08));g.gain.linearRampToValueAtTime(0,t+len+.05);f.connect(g);out(g,.6);}
function spic(n,t,len,v=.03){const c=M.ctx,f=c.createBiquadFilter(),g=c.createGain();f.type='lowpass';f.frequency.value=2400;
  [-6,6].forEach(dt=>{const o=c.createOscillator();o.type='sawtooth';o.frequency.value=midi(n);o.detune.value=dt;o.connect(f);o.start(t);o.stop(t+len+.02);});
  g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.001,t+len);f.connect(g);out(g,.35);}
function hornPad(ns,t,len,v=.022){const c=M.ctx,f=c.createBiquadFilter(),g=c.createGain();f.type='lowpass';f.frequency.value=1100;
  ns.forEach(n=>{[-5,5].forEach(dt=>{const o=c.createOscillator();o.type='sawtooth';o.frequency.value=midi(n);o.detune.value=dt;o.connect(f);o.start(t);o.stop(t+len+.1);});});
  g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v,t+.25);g.gain.setValueAtTime(v,t+len-.2);g.gain.linearRampToValueAtTime(0,t+len);f.connect(g);out(g,.6);}
const crash=(t,v=.1)=>hit(t,v,'highpass',4500,1.6);
const MR=[40,36,38,35,40,36,33,35];
const MCH=[[52,55,59],[48,52,55],[50,54,57],[47,51,54],[52,55,59],[48,52,55],[45,48,52],[47,51,54]];
const MM=[[[64,.5],[64,.25],[67,.25],[71,1],[72,.5],[71,.5],[67,1]],[[72,1.5],[71,.5],[69,1],[67,1]],[[69,.5],[69,.25],[71,.25],[74,1],[76,.5],[74,.5],[71,1]],[[71,1.5],[75,.5],[78,2]],
          [[76,.5],[79,.5],[83,1],[81,.5],[79,.5],[76,1]],[[79,1],[76,1],[72,1],[76,1]],[[81,1],[79,.5],[77,.5],[76,1],[72,1]],[[71,.5],[75,.5],[78,.5],[83,.5],[78,2]]];
const BATTLE_M={beat:.4,
  bar(t,k){const b=this.beat,i=k%8,r=MR[i],ch=MCH[i];
    /* 大提琴＋低音提琴：八分音符推進 */
    for(let s=0;s<8;s++){const n=r+(s%4===2?7:0)+(s===7?12:0);spic(n,t+s*b/2,b*.46,.05);spic(n-12,t+s*b/2,b*.46,.03);}
    /* 中提琴、第二小提琴：十六分音符快奏 */
    const os=[ch[0]+12,ch[1]+12,ch[2]+12,ch[1]+12];for(let s=0;s<16;s++)spic(os[s%4],t+s*b/4,b*.2,s%4===0?.026:.018);
    /* 高音弦樂長音、圓號長和弦 */
    bowed(ch[2]+24,t,b*4,.012,.4,2600,false);hornPad(ch,t,b*4);
    /* 第一小提琴：主旋律＋高八度 */
    let x=0;MM[i].forEach(([n,d])=>{bowed(n,t+x*b,d*b*.96,.045,.03);bowed(n+12,t+x*b,d*b*.96,.018,.03);x+=d;});
    /* 定音鼓 */
    timp(r,t,.55);timp(r+7,t+b*1.5,.32);timp(r,t+b*2,.45);
    if(i===3||i===7)timpRoll(r,t+b*3,b,.08,.45);else{timp(r+7,t+b*3,.3);timp(r,t+b*3.5,.38);}
    if(i===0||i===4)crash(t,i===0?.11:.07);
    return b*4;}};
function tick(){
  const c=M.ctx;if(!c||!M.on)return;const T=M.mode==='battle'?(M.theme==='magic'?BATTLE_M:BATTLE):M.theme==='magic'?MAGIC:XIAN;
  while(M.next<c.currentTime+.6){M.next+=T.bar(M.next,M.step++);}
}
M.start=function(){const c=ensure();if(!c)return;if(c.state==='suspended')c.resume();
  M.on=true;M.master.gain.cancelScheduledValues(c.currentTime);M.master.gain.setTargetAtTime(M.vol*.5,c.currentTime,.8);
  if(M.next<c.currentTime)M.next=c.currentTime+.1;clearInterval(M.timer);M.timer=setInterval(tick,150);tick();};
M.stop=function(){if(!M.ctx)return;M.on=false;clearInterval(M.timer);M.master.gain.setTargetAtTime(0,M.ctx.currentTime,.3);};
/* 切換戰鬥曲：小遊戲開始時切過去，離開時換回原本的配樂 */
M.battle=function(on){const md=on?'battle':'normal';if(M.mode===md)return;M.mode=md;M.step=0;if(M.ctx){M.next=M.ctx.currentTime+.15;if(M.on)M.master.gain.setTargetAtTime(M.vol*.5,M.ctx.currentTime,.3);}};
M.duck=function(on){if(!M.ctx||!M.on)return;M.master.gain.setTargetAtTime(M.vol*(on?.25:.5),M.ctx.currentTime,.5);};
/* 音效：不受背景音樂開關影響之外的另一個開關 */
M.sfxOn=true;
M.play=function(kind){if(!M.sfxOn)return;const c=ensure();if(!c)return;if(c.state==='suspended')c.resume();const t=c.currentTime+.02,d=M.sfx;
  if(kind==='ok'){[74,78,81,86].forEach((n,i)=>(M.theme==='magic'?bell:pluck)(n,t+i*.09,1.2,.2,d));}
  else if(kind==='bad'){pluck(57,t,.6,.18,d);pluck(56,t+.16,.9,.16,d);}
  else if(kind==='win'){[62,66,69,74,78,81,86].forEach((n,i)=>(M.theme==='magic'?bell:pluck)(n,t+i*.08,1.8,.2,d));pluck(50,t,2.5,.2,d);}
  else if(kind==='boom'){hit(t,.18,'lowpass',900,.18);}
  else if(kind==='skill'){hit(t,.4,'lowpass',500,.9);kick(t,.6);[62,69,74,81].forEach((n,i)=>lead(n,t+i*.05,.5,.06));}
  else if(kind==='hurt'){hit(t,.25,'bandpass',400,.25);}
  else if(kind==='click'){(M.theme==='magic'?bell:pluck)(86,t,.4,.08,d);}
};
M.T={xian:XIAN,magic:MAGIC,battle:BATTLE,battleMagic:BATTLE_M};
root.Music=M;
})(window);
