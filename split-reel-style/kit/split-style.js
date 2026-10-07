/* ═══ split-style.js — ستايل «سبليت ريل» (بهوية المستخدم من brand.json) ═══
   يتحمّل بعد سكربت المحرّك داخل compose.html:
     <script src="split-style.js"></script>
     <script> SK.preload({...}); SK.shots([...]); ... </script>
   كل شي يعتمد على t فقط (لا تراكم، لا Math.random). الألوان من theme.json (BG/INK/ACC) + SK.PAL للخلفيات.

   أنواع اللقطات (SK.shots):
     split : خلفية ملوّنة فوق + الرسمة (y 170-820) + كابشن «عنوان» + المتحدث تحت (راسه فوق الخلفية لو فيه قناع)
     full  : رسمة ملء الشاشة بلا وجه + كابشن «عنوان» تحت الرسمة
     face  : وجهه ملء الشاشة + زوم دفعة على القطع + كابشن «صغير» عند صدره
   الانتقال بين اللقطات = قطع حاد على بداية الكلمة. الحركة كلها *داخل* اللقطة. */
(function(){
const SK=window.SK={};
/* لوحة الخلفيات — مقاسة من المرجع */
SK.PAL={ beige:'#E4DCCF', light:'#FAFAF8', dark:'#0E1116', ink:'#111111', tint:'#2A0E0B' };
SK.CAP={ font:'Rubik', head:88, small:56, wHead:500, wSmall:500, full:1240,
  faceBottom:1460, maxWords:3,
  mode:'build',      /* 'build' = كلمة كلمة بدفعات بتمشي مع الكلام (الافتراضي) · 'sentence' = الجملة كاملة مرة وحدة */
  maxPhrase:4, pauseBreak:0.22,   /* الدفعة بتخلص عند: علامة ترقيم · سكتة/نفَس > pauseBreak · 4 كلمات — وما بتضل كلمة يتيمة لحالها */
  maxSentence:7,     /* أطول جملة على الشاشة (كلمات)؛ الأطول بتنقسم لنصين متساويين تقريباً */   /* لقطة وجه: أسفل الكابشن عند 1460  */
  gapAboveHead:60 }; /* split: أسفل الكابشن فوق أعلى الراس بـ60 (كرت الفيديو تحت) — الكابشن ما ينزل على الوجه أبداً */
SK.SPLIT={ shift:600, faceScale:1.0, headY:480, pop:250, radius:72, cardShade:0 };   /* pop = قديش الراس طالع فوق الكرت (بكسل) · headY = أعلى الراس بالفيديو الأصلي (احتياط لما ما في قناع) */   /* shift = نزول الفيديو بلقطة split */
let SHOTS=[], PANELS=[], IMGS={};
/* ما في شريط تقدّم بهالستايلات */

/* ── تحميل ── (الخط Rubik جاي من engine/fonts محلياً، بدون إنترنت) */
SK.fontReady=()=>Promise.all(['400','700','900'].flatMap(w=>[document.fonts.load(w+' 80px Rubik','عربي ـ 123'),document.fonts.load('italic '+w+' 80px Rubik','عربي ـ 123')])).catch(()=>0);
SK.preload=map=>{ for(const k in map){ const im=new Image(); im.src=map[k]; IMGS[k]=im; } };
SK.img=k=>{ const im=IMGS[k]; return im&&im.complete&&im.naturalWidth?im:null; };
SK.imgsReady=()=>Promise.all(Object.values(IMGS).map(im=>(im.decode?im.decode():Promise.resolve()).catch(()=>0)));   /* المحرّك بينتظرها قبل أول فريم */

/* ── لقطات ── */
SK.shots=list=>{ SHOTS=list.map(s=>({...s})); SK._shotsList=SHOTS;
  /* الكابشن الأصلي للمحرّك يطفى — الكابشن هني */
  SCENES=SHOTS.map(s=>({s:s.s,e:s.e,m:R_FULL,nocap:true})); SCENES.push({s:SHOTS.length?SHOTS[SHOTS.length-1].e:0,e:999,m:R_FULL,nocap:true}); };
SK.shotAt=t=>SHOTS.find(s=>t>=s.s&&t<s.e)||null;
SK.panel=(s,e,fn)=>PANELS.push({s,e,fn});   /* رسمة داخل لقطة: fn(lt, k, shot) — lt من بداية الرسمة */

/* ═══ الهوية البصرية (ملف دائم لكل مستخدم: ~/.claude/split-reel-brand/brand.json) ═══
   SK.brand(json) بتنعمل بأول shots.js: بتحط ألوان الخلفيات، ولون التمييز (فاتح على الغامق)، وألوان كابشن الوجه، وبيانات البروفايل. */
SK.B=null;
SK.brand=b=>{ SK.B=b; const P=b.palette||{}; Object.assign(SK.PAL,P);
  for(const k in (b.bgMap||{})) SK.PAL[k]=P[b.bgMap[k]]||b.bgMap[k];
  if(!SK.PAL.paper) SK.PAL.paper=SK.PAL.cream||SK.PAL.beige;   /* ستايل الورق */
  if(b.ink) SK.PAL.ink=b.ink; if(b.faceCaption) SK.CAP.face=b.faceCaption; };
/* لون التمييز حسب الخلفية: الغامقة بتاخد accentDark */
SK.acc=sh=>{ const B=SK.B; if(!B) return ACC; return (sh&&SK.isDarkBg(sh))?(B.accentDark||B.accent||ACC):(B.accent||ACC); };
SK.accT=t=>SK.acc(SK.shotAt(t));
const bgOf=sh=>{ const b=sh.bg||'beige', v=SK.PAL[b]; if(v) return v; if(/^(#|rgb)/i.test(b)) return b; return SK.PAL.cream||SK.PAL.beige||'#F4EFE6'; };   /* اسم خلفية مجهول = الكريمي، مش أسود */
SK.isDarkBg=sh=>lum(bgOf(sh).startsWith('#')?bgOf(sh):'#888888')<0.35;

/* ── أدوات ── */
const E3=k=>1-Math.pow(1-k,3), E5=k=>1-Math.pow(1-k,5);
SK.fade=(lt,d=0.35)=>E3(cl(lt/d,0,1));
SK.font=(w,size,it)=>(it?'italic ':'')+w+' '+size+'px "Rubik"';
function shadow(b,y,c){ X.shadowColor=c; X.shadowBlur=b; X.shadowOffsetY=y; }
function noShadow(){ X.shadowColor='transparent'; X.shadowBlur=0; X.shadowOffsetY=0; }
SK.cover=(im,x,y,w,h,ax=0.5,ay=0.5)=>{ const s=Math.max(w/im.naturalWidth,h/im.naturalHeight), iw=im.naturalWidth*s, ih=im.naturalHeight*s;
  X.drawImage(im,x+(w-iw)*ax,y+(h-ih)*ay,iw,ih); };
SK.contain=(im,cx,cy,maxW,maxH)=>{ const s=Math.min(maxW/im.naturalWidth,maxH/im.naturalHeight), w=im.naturalWidth*s, h=im.naturalHeight*s;
  return {x:cx-w/2,y:cy-h/2,w,h,s}; };

/* ═══ طبقة الفيديو: تكوين اللقطة ═══ */
/* ── انتقال ناعم بين اللقطات  ──
   أول SK.TR ثانية من كل لقطة: القديمة لسا مرسومة تحت، والجديدة بتدخل فوقها بتلاشي + زوم 1.06→1،
   وكرت الفيديو بلقطة split بيطلع من تحت، ورسومات اللقطة القديمة بتختفي بنفس الوقت. */
const EIO=k=>k<.5?4*k*k*k:1-Math.pow(-2*k+2,3)/2;
SK.prevShot=sh=>{ const i=SHOTS.indexOf(sh); return i>0?SHOTS[i-1]:null; };
/* كرت الفيديو بلقطة split: زواياه من فوق مدوّرة، وجسمه جوّاه بخلفيته الأصلية، وراسه وشوي من كتافه طالعين فوقه (متل المرجع) */
SK.cardTop=sh=>sh.cardTop??(SK.headTop(sh)+(sh.pop??SK.SPLIT.pop));
function drawShot(sh,t){ const lt=t-sh.s; if(SK.KINDS[sh.kind]) return SK.KINDS[sh.kind](sh,t,lt);
  if(sh.kind==='face'){                                   /* زوم بيستقر: بيبلّش أقرب بشوي وبينزل لحجمه، وبعدين بينساب ببطء */
    const e=EIO(cl(lt/0.45,0,1)), z0=sh.zoom||1.12, z=sh.still?1:z0+0.07*(1-e)+0.025*cl(lt/2.5,0,1), cx=540, cy=sh.fy||700;   /* still:true = الفيديو كامل متل ما انصوّر، بدون زوم ولا قص (آخر لقطة الفولو*/
    X.save(); X.fillStyle='#000'; X.fillRect(0,0,W,H); X.translate(cx,cy); X.scale(z,z); X.translate(-cx,-cy); X.drawImage(VF,0,0,W,H); X.restore(); return; }
  const bg=bgOf(sh); X.save();
  if(IMGS[sh.bg]&&SK.img(sh.bg)){ SK.cover(SK.img(sh.bg),0,0,W,H); } else { X.fillStyle=bg; X.fillRect(0,0,W,H); }
  if(sh.tint){ X.fillStyle=rgba(sh.tint,0.55*SK.fade(lt,0.5)); X.fillRect(0,0,W,H); }
  if(sh.grid&&SK.gridDraw) SK.gridDraw(sh,t);
  X.restore();
  if(sh.kind!=='split') return;
  const P=SK.SPLIT, dy=sh.shift??P.shift, sc=sh.faceScale||P.faceScale, vx=(W-W*sc)/2;
  const up=(1-EIO(cl(lt/0.45,0,1)))*170;                 /* الكرت بيطلع من تحت */
  const top=SK.cardTop(sh)+up, vy=dy+up, R=sh.radius??P.radius;
  X.save(); rr(-2,top,W+4,H-top+R+10,R); X.clip(); X.drawImage(VF,vx,vy,W*sc,H*sc);
  if(P.cardShade){ const g=X.createLinearGradient(0,top,0,top+160); g.addColorStop(0,'rgba(0,0,0,'+P.cardShade+')'); g.addColorStop(1,'rgba(0,0,0,0)'); X.fillStyle=g; X.fillRect(0,top,W,160); }
  X.restore();
  /* الراس فوق حافة الكرت: من القص (person_matte.py)، بس الجزء اللي فوق الحافة */
  if(PRS_OK){ X.save(); X.beginPath(); X.rect(0,0,W,top+1); X.clip(); X.drawImage(PRS,vx,vy,W*sc,H*sc); X.restore(); }
}
/* ═══ مكتبة الانتقالات — كل لقطة بتختار انتقالها بـ tr (افتراضي 'card')، وكل نوع إله مؤثره الصوتي (scripts/trans_sfx.py) ═══
   card   كرت بيكبر فوق القديمة · ووش ناعم
   flash  فلاش كاميرا: قطع ← فريم أبيض محروق مايل للأصفر ← فريم برتقالي محروق ← طبيعي  · صوت كاميرا
   whip   سحبة سريعة لجنب مع ضبابية حركة · سوووش
   zoom   القديمة بتنسحب لجوّا، والجديدة بتطلع من الزوم · ووش طالع + ضربة
   glitch خلل وتقطيع ألوان (لحظات «مشكلة/ثغرات») · خلل رقمي
   cut    قطع مباشر · بدون صوت
   ⛔ نوّع: ما يتكرر نفس الانتقال مرتين ورا بعض، والـflash والـglitch للحظات اللي إلها وزن. */
SK.KINDS={}; SK.TRANS={}; SK.TOPFX={};   /* سجلّات لستايلات تانية (paper-reel-style): أنواع لقطات وانتقالات ومؤثرات فوقية */
SK.TRD={card:0.32, flash:0.16, whip:0.28, zoom:0.34, glitch:0.22, cut:0};
SK.trOf=sh=>(sh&&sh.tr)||'card';
SK.trK=(sh,t)=>{ const d=SK.TRD[SK.trOf(sh)]||0, lt=t-sh.s; return (d&&lt<d&&SK.prevShot(sh))?lt/d:null; };   /* تقدّم الانتقال 0..1 أو null */
function drawScaled(sh,t,z,dx){ X.save(); X.translate(540+(dx||0),960); X.scale(z,z); X.translate(-540,-960); drawShot(sh,t); X.restore(); }
function smear(sh,t,dx,amt){ drawScaled(sh,t,1,dx); if(amt<=0.01) return; X.save(); X.globalAlpha=0.28; [-1,1,2].forEach(i=>drawScaled(sh,t,1,dx+i*amt*36)); X.restore(); }
function stage(t){ SK._t=t; const sh=SK.shotAt(t); if(!sh||t>=VEND) return; const k=SK.trK(sh,t), pv=SK.prevShot(sh), ty=SK.trOf(sh);
  if(k==null){ drawShot(sh,t); return; }
  if(SK.TRANS[ty]){ SK.TRANS[ty](pv,sh,t,k,drawShot,drawScaled); return; }
  const e=EIO(k);
  if(ty==='card'){
    drawScaled(pv,t,1-0.06*e); X.save(); X.fillStyle='rgba(0,0,0,'+(0.45*e)+')'; X.fillRect(0,0,W,H); X.restore();
    const q=0.82+0.18*e, w=W*q, h=H*q, r=56*(1-e);
    X.save(); shadow(60*(1-e),20*(1-e),'rgba(0,0,0,.45)'); rr(540-w/2,960-h/2,w,h,r); X.fillStyle='#000'; X.fill(); noShadow();
    rr(540-w/2,960-h/2,w,h,r); X.clip(); const zi=1.08-0.08*e; X.translate(540,960); X.scale(zi,zi); X.translate(-540,-960); drawShot(sh,t); X.restore(); }
  else if(ty==='whip'){ const blur=Math.sin(Math.PI*k); smear(pv,t,-W*e,blur); smear(sh,t,W*(1-e),blur); }
  else if(ty==='zoom'){ if(k<0.5){ const q=k/0.5; drawScaled(pv,t,1+0.55*q*q); X.save(); X.fillStyle='rgba(255,255,255,'+(0.35*q*q)+')'; X.fillRect(0,0,W,H); X.restore(); }
                        else { const q=EIO((k-0.5)/0.5); drawScaled(sh,t,1.28-0.28*q); X.save(); X.fillStyle='rgba(255,255,255,'+(0.35*(1-q))+')'; X.fillRect(0,0,W,H); X.restore(); } }
  else drawShot(sh,t);   /* flash · glitch · cut: قطع مباشر، والمؤثر فوق كلشي بطبقة SK.fx */
}
stage.layer='video'; SCENE_LIST.push(['SK.stage',stage,'video']);

/* ═══ الرسومات ═══ */
function panels(t){ const sh=SK.shotAt(t); if(!sh) return; const k=SK.trK(sh,t), ty=SK.trOf(sh);
  for(const p of PANELS){ if(t<p.s||t>=p.e) continue; X.save();   /* رسمة اللقطة القديمة بتنقطع مع القطع */
    try{ if(k!=null&&p.s>=sh.s-0.01){ const e=EIO(k);           /* رسمة اللقطة الجديدة بتمشي مع الانتقال */
           if(ty==='whip') X.translate(W*(1-e),0);
           else if(ty==='zoom'){ if(k<0.5){ X.restore(); continue; } const q=EIO((k-0.5)/0.5), z=1.28-0.28*q; X.translate(540,960); X.scale(z,z); X.translate(-540,-960); }
           else if(ty==='card'){ const z=0.94+0.06*e; X.translate(540,800); X.scale(z,z); X.translate(-540,-800); } }
         else if(t-p.s<0.3&&!(k!=null)){ const z=0.94+0.06*EIO((t-p.s)/0.3); X.translate(540,800); X.scale(z,z); X.translate(-540,-800); }
         p.fn(t-p.s,(t-p.s)/(p.e-p.s),sh); } finally{ X.restore(); noShadow(); } } }
SCENE_LIST.push(['SK.panels',panels]);

/* ═══ الكابشن — كلمات تتراكم كلمة كلمة داخل الجملة ═══
   fx للكلمة (fixes.json ← fx): "acc" لون التمييز · "kash" مدّ بالكشيدة · "box" داخل مستطيل معكوس (أبيض والنص بلون الخلفية)
   الستايل: split/full = «عنوان» (Rubik 900 كبير، كشيدة وتمييز) · face = «صغير» (Rubik 700 أبيض بظل) */
const NOJOIN='اأإآدذرزوؤةءى';
SK.kash=(w,n=4)=>{ const a=[...w]; if(a.length<3) return w;
  let best=-1; for(let i=Math.floor(a.length/2);i>=1;i--){ if(!NOJOIN.includes(a[i-1])&&/[ء-ي]/.test(a[i-1])&&/[ء-ي]/.test(a[i])){ best=i; break; } }
  if(best<0) for(let i=Math.floor(a.length/2)+1;i<a.length;i++){ if(!NOJOIN.includes(a[i-1])&&/[ء-ي]/.test(a[i])){ best=i; break; } }
  return best<0?w:a.slice(0,best).join('')+'ـ'.repeat(n)+a.slice(best).join(''); };
const fxOf=w=>(w.fx||'').split(/[ ,+]/);
/* أعلى نقطة براس المتحدث بلقطة split (إحداثيات الشاشة) — من behind.json ← tops (person_matte.py)، وإلا headY.
   ثابت طول اللقطة (أعلى نقطة وصلها) عشان الكابشن ما ينط. */
SK.headTop=sh=>{ if(sh._ht!=null) return sh._ht; const P=SK.SPLIT, dy=sh.shift??P.shift, sc=sh.faceScale||P.faceScale;
  let top=dy+(sh.headY??P.headY)*sc; const tops=(typeof BEHIND!=='undefined'&&BEHIND&&BEHIND.tops)||null;
  if(tops){ const a=Math.round(sh.s*30)+1, b=Math.round(sh.e*30)+1, v=[];
    for(let i=a;i<=b;i++){ if(tops[i]!=null) v.push(tops[i]); }
    /* النسبة 15% مش الأعلى: الإيد اللي بتطلع فوق الراس لحظة ما بترفع الكابشن */
    if(v.length){ v.sort((x,y)=>x-y); top=dy+v[Math.floor(v.length*0.15)]*sc; } }
  return sh._ht=top; };
function capCard(t){ return CAPS.find(c=>t>=c.s-0.02&&t<c.e+0.02); }
function captions(t){ const sh=SK.shotAt(t); if(!sh||sh.nocap) return; const c=capCard(t); if(!c) return;
  /* الجملة بتنقسم لدفعات قصيرة (2-4 كلمات متل المرجع)، والكلمات بتتراكم جوّا الدفعة */
  const SENT=(sh.capMode||SK.CAP.mode)==='sentence';
  let chunks=[];
  if(SENT){ /* جمل: بنقسم على علامات الترقيم، والأطول من maxSentence بتنقسم لأجزاء متساوية تقريباً */
    const M=sh.maxSentence||SK.CAP.maxSentence; let cur=[]; const parts=[];
    c.w.forEach((w,i)=>{ cur.push(w); if(/[؟?.,،!:]$/.test(w.t)||i===c.w.length-1){ parts.push(cur); cur=[]; } });
    parts.forEach(pt=>{ const n=Math.ceil(pt.length/M), sz=Math.ceil(pt.length/n); for(let i=0;i<pt.length;i+=sz) chunks.push(pt.slice(i,i+sz)); }); }
  else { /* دفعات بتمشي مع الكلام: بتنقطع عند الترقيم أو النفَس أو maxPhrase، وبدون كلمة يتيمة */
    const N=sh.maxWords||SK.CAP.maxPhrase, P=SK.CAP.pauseBreak; let cur=[];
    c.w.forEach((w,i)=>{ cur.push(w); const nx=c.w[i+1], end=/[؟?.,،!:]$/.test(w.t)||!nx||(nx.s-w.e)>P;
      const left=nx?c.w.length-1-i:0, full=cur.length>=N&&left!==1;   /* لو بيضل كلمة وحدة بعدها، خليها تلحق هالدفعة */
      if(end||full||cur.length>=N+1){ chunks.push(cur); cur=[]; } });
    if(cur.length) chunks.push(cur);
    for(let i=chunks.length-1;i>0;i--) if(chunks[i].length===1&&chunks[i-1].length<N+1&&!/[؟?.,،!:]$/.test(chunks[i-1][chunks[i-1].length-1].t)){ chunks[i-1]=chunks[i-1].concat(chunks[i]); chunks.splice(i,1); } }
  const said=c.w.filter(w=>t>=w.s-0.02); if(!said.length) return; const last=said[said.length-1];
  const ch=chunks.find(k=>k.includes(last)); const ws=SENT?ch:ch.filter(w=>t>=w.s-0.02);
  const cIn=ch[0].s;   /* وضع الجملة: كل الجملة بتطلع سوا على أول كلمة فيها */
  const small=sh.kind==='face', dark=small||SK.isDarkBg(sh);
  const size=(small?SK.CAP.small:(sh.capSize||SK.CAP.head))*(SENT?0.85:1);   /* الجملة الكاملة أصغر بشوي لتضل بسطرين */
  const FC=SK.CAP.face, col=small?(FC?FC.fill:'#FFFFFF'):(dark?(SK.B?SK.PAL.white||'#FFFFFF':'#FFFFFF'):SK.PAL.ink), accC=SK.acc(sh);
  X.save(); X.direction='rtl'; X.textBaseline='middle';
  const items=ws.map(w=>{ const f=fxOf(w), txt=(!small&&f.includes('kash'))?SK.kash(w.t,w.kn||4):w.t;
    X.font=SK.font(small?SK.CAP.wSmall:SK.CAP.wHead,size,!small&&sh.italic===true&&/[A-Za-z0-9]/.test(txt)); return {w,f,txt,wd:X.measureText(txt).width}; });
  /* أسطر بعرض 900 (يمين لليسار) */
  const gap=size*0.28, lines=[[]]; let lw=0;
  const CW=sh.capW||SK.CAP.capW||900, CX=sh.capX||SK.CAP.capX||540;   /* عرض الكابشن ومركزه (بيتغيّروا لما في فقاعة وجه PiP) */
  for(const it of items){ if(lw+it.wd>CW&&lines[lines.length-1].length){ lines.push([]); lw=0; } lines[lines.length-1].push(it); lw+=it.wd+gap; }
  const LH=size*1.22, bh=lines.length*LH;
  /* المكان: full = وسطه عند 1240 · face = أسفله عند 1460 · split = أسفله فوق الراس */
  const bottom=sh.capY?sh.capY+bh/2:sh.kind==='face'?SK.CAP.faceBottom:sh.kind==='split'?SK.headTop(sh)-SK.CAP.gapAboveHead:SK.CAP.full+bh/2;
  const y0=bottom-bh+LH/2;
  lines.forEach((ln,li)=>{ const tw=ln.reduce((a,it)=>a+it.wd,0)+gap*(ln.length-1); let x=CX+tw/2;
    for(const it of ln){ const k=E5(cl((t-(SENT?cIn:it.w.s)+0.035)/(SENT?0.2:0.16),0,1)), cy=y0+li*LH+(1-k)*size*(SENT?0.12:0.18);
      X.globalAlpha=k; X.font=SK.font(small?SK.CAP.wSmall:SK.CAP.wHead,size,!small&&sh.italic===true&&/[A-Za-z0-9]/.test(it.txt));
      if(it.f.includes('box')){ const px=size*0.22; X.fillStyle=dark?'#FFFFFF':SK.PAL.ink; X.fillRect(x-it.wd-px,cy-size*0.62,it.wd+px*2,size*1.18);
        X.fillStyle=dark?(small?'#111111':bgOf(sh)):SK.PAL.light; X.textAlign='right'; X.fillText(it.txt,x,cy); }
      else { X.textAlign='right'; X.fillStyle=(it.f.includes('acc')&&!small)?accC:col;
        if(small&&FC){ X.lineJoin='round'; X.miterLimit=2; X.strokeStyle=FC.stroke||'#000'; X.lineWidth=FC.strokeW||4; X.strokeText(it.txt,x,cy); }   /* كابشن الوجه: أصفر بإطار أسود رفيع  */
        else if(small){ shadow(18,3,'rgba(0,0,0,.55)'); }
        X.fillText(it.txt,x,cy); noShadow(); }
      x-=it.wd+gap; } });
  X.restore(); }
SCENE_LIST.push(['SK.captions',captions]);

/* ═══ طبقة المؤثرات فوق كلشي (حتى الكابشن): الفلاش والخلل ═══ */
function topFx(t){ const sh=SK.shotAt(t); if(!sh) return; const k=SK.trK(sh,t), ty=SK.trOf(sh); if(k==null) return;
  if(SK.TOPFX[ty]){ SK.TOPFX[ty](sh,t,k); return; }
  if(ty==='flash'){            /* فريم 1: أبيض محروق مايل للأصفر · فريم 2: برتقالي محروق · بعدين بيرجع طبيعي */
    X.save(); const w=Math.pow(1-k,1.6);
    X.globalCompositeOperation='screen'; X.fillStyle='rgba(255,236,170,'+Math.min(1,1.25*w)+')'; X.fillRect(0,0,W,H);
    X.globalCompositeOperation='source-over'; X.fillStyle='rgba(255,250,235,'+(0.85*Math.max(0,1-k*3))+')'; X.fillRect(0,0,W,H);
    X.globalCompositeOperation='overlay'; X.fillStyle='rgba(255,90,30,'+(0.75*Math.sin(Math.PI*Math.min(1,k*1.4)))+')'; X.fillRect(0,0,W,H);
    X.restore(); }
  else if(ty==='glitch'){ const n=Math.floor(t*30); X.save();
    for(let i=0;i<7;i++){ const h=40+((n*13+i*29)%120), y=((n*97+i*211)%1800), dx=(((n*7+i*31)%9)-4)*18*(1-k);
      X.drawImage(C,0,y,W,h,dx,y,W,h); }
    X.globalCompositeOperation='screen'; X.fillStyle='rgba(255,0,60,'+(0.22*(1-k))+')'; X.fillRect(0,((n*53)%1700),W,60);
    X.fillStyle='rgba(0,220,255,'+(0.22*(1-k))+')'; X.fillRect(0,((n*71+400)%1700),W,40); X.restore(); }
}
SCENE_LIST.push(['SK.fx',topFx]);


/* ═══════════ موشن دلالي — الرسمة بتمثّل اللي بيحكيه وبتتحرك على توقيت كلماته  ═══════════
   القاعدة: كل فعل أو شي ملموس بالكلام («بحثت»، «بعتلي رسالة»، «السعر 20$»، «فتحت الموقع») = رسمة بتعيد تمثيله،
   وكل حركة فيها مربوطة بوقت كلمة من caps.json (SK.wordT)، مش بوقت تقريبي. */
const _norm=w=>(w||'').replace(/[ً-ْـ«»"'؟?!.,،:]/g,'').trim();
SK.words=()=>CAPS.flatMap(c=>c.w);
/* وقت أول كلمة بتطابق text (أو بتبلّش فيه) من الثانية from ← {s,e,i} */
SK.wordT=(text,from=0)=>{ const q=_norm(text), ws=SK.words(); for(let i=0;i<ws.length;i++){ const w=ws[i]; if(w.s>=from-0.05&&(_norm(w.t)===q||_norm(w.t).startsWith(q))) return {s:w.s,e:w.e,i}; } return null; };
/* الكلمات المنطوقة من كلمة لكلمة (مع التوقيت) — للكتابة المتزامنة */
SK.span=(fromWord,toWord,from=0)=>{ const a=SK.wordT(fromWord,from); if(!a) return []; const b=SK.wordT(toWord,a.s)||a; return SK.words().slice(a.i,b.i+1); };
/* نص مكتوب حرف حرف على توقيت الكلمات: كل كلمة بتنكتب خلال مدة نطقها */
SK.typed=(t,ws)=>{ let out=''; for(const w of ws){ if(t<w.s) break; const k=cl((t-w.s)/Math.max(0.08,w.e-w.s),0,1), ch=[...w.t.replace(/[،,.:؟?!«»]+$/,'')];   /* بدون ترقيم الكابشن جوّا الواجهة */ out+=(out?' ':'')+ch.slice(0,Math.ceil(ch.length*k)).join(''); } return out; };
const _G=['#4285F4','#EA4335','#FBBC05','#4285F4','#34A853','#EA4335'];
function _mag(x,y,r,c){ X.save(); X.strokeStyle=c; X.lineWidth=r*0.28; X.lineCap='round'; X.beginPath(); X.arc(x,y,r,0,7); X.stroke(); X.beginPath(); X.moveTo(x+r*.72,y+r*.72); X.lineTo(x+r*1.45,y+r*1.45); X.stroke(); X.restore(); }

/* 🔎 شريط بحث متل جوجل
   SK.search(t,{ y:520, query:SK.span('سعر','الشهري'), searchAt:<ثانية الضغط>, result:{at, title, url, icon:'claude', price:{from:0,to:20,at,dur,prefix:'$',suffix:' / شهرياً'}} })
   الحركة: الشريط بينبثق ← كلماته بتنكتب وهو بيحكيها (مع مؤشر) ← ضغطة (الشريط بينضغط والعدسة بتلمع) ← كرت النتيجة بيطلع من تحت ← السعر بيعدّ وبيتظلل */
SK.search=(t,o)=>{ const y=o.y??520, w=o.w??900, h=118, x=540-w/2, t0=o.inAt??(o.query&&o.query[0]?o.query[0].s-0.45:t);
  const kin=back(cl((t-t0)/0.4,0,1)); if(t<t0) return;
  X.save(); X.globalAlpha=cl((t-t0)/0.15,0,1);
  /* الشعار فوق الشريط */
  const ly=y-120; X.font='600 96px "Rubik", sans-serif'; X.textBaseline='middle'; X.direction='ltr'; X.textAlign='left';
  const word='Google', tw=X.measureText(word).width; let lx=540-tw/2;
  [...word].forEach((c,i)=>{ const kk=back(cl((t-t0-i*0.04)/0.35,0,1)); X.save(); X.globalAlpha*=cl(kk,0,1); X.fillStyle=_G[i]; X.fillText(c,lx,ly+(1-kk)*30); X.restore(); lx+=X.measureText(c).width; });
  /* الشريط */
  const press=o.searchAt!=null&&t>=o.searchAt?Math.sin(Math.PI*cl((t-o.searchAt)/0.22,0,1)):0, sc=(0.85+0.15*kin)*(1-0.04*press);
  X.translate(540,y+h/2); X.scale(sc,sc); X.translate(-540,-(y+h/2));
  shadow(40,10,'rgba(32,33,36,.22)'); rr(x,y,w,h,h/2); X.fillStyle='#FFFFFF'; X.fill(); noShadow();
  X.strokeStyle=o.searchAt!=null&&t>=o.searchAt?'#4285F4':'#DFE1E5'; X.lineWidth=3; rr(x,y,w,h,h/2); X.stroke();
  const glow=press; _mag(x+w-70,y+h/2-8,20,glow>0.05?'#4285F4':'#9AA0A6');
  /* الكلام المكتوب (يمين لليسار) */
  const txt=o.query?SK.typed(t,o.query):'', done=o.query&&o.query.length&&t>=o.query[o.query.length-1].e;
  X.font='500 50px "Rubik", sans-serif'; X.direction='rtl'; X.textAlign='right'; X.fillStyle='#202124';
  X.save(); X.beginPath(); X.rect(x+60,y,w-170,h); X.clip(); const tx=x+w-120; X.fillText(txt,tx,y+h/2+2);
  const cw=X.measureText(txt).width; if(!(o.searchAt!=null&&t>=o.searchAt)&&Math.floor(t*2.4)%2===0){ X.fillStyle='#4285F4'; X.fillRect(tx-cw-8,y+30,4,h-60); }
  X.restore();
  X.restore();
  /* كرت النتيجة */
  const R=o.result; if(!R||t<R.at) return;
  const kr=E3(cl((t-R.at)/0.45,0,1)), cy=y+h+60+(1-kr)*90, cw2=w, ch=o.result.price?330:200;
  X.save(); X.globalAlpha=kr; shadow(50,16,'rgba(32,33,36,.18)'); rr(x,cy,cw2,ch,28); X.fillStyle='#FFFFFF'; X.fill(); noShadow();
  X.direction='rtl'; X.textAlign='right'; X.textBaseline='middle';
  const ic=R.icon&&SK.img(R.icon); if(ic){ const B=SK.contain(ic,x+cw2-70,cy+66,56,56); X.drawImage(ic,B.x,B.y,B.w,B.h); }
  X.font='400 30px "Rubik", sans-serif'; X.fillStyle='#4D5156'; X.direction='ltr'; X.textAlign='right'; X.fillText(R.url||'',x+cw2-120,cy+66);
  X.direction='rtl'; X.font='600 46px "Rubik", sans-serif'; X.fillStyle='#1A0DAB'; X.fillText(R.title||'',x+cw2-50,cy+140);
  const P=R.price; if(P&&t>=P.at){ const pk=E5(cl((t-P.at)/(P.dur||0.7),0,1)), v=Math.round(P.from+(P.to-P.from)*pk);
    const big=(P.prefix||'')+v; X.direction='ltr'; X.textAlign='right'; X.font='800 120px "Rubik", sans-serif';
    const bx=x+cw2-50, by=cy+250, bw=X.measureText(big).width;
    if(t>=P.at){ const hk=E3(cl((t-P.at-(P.dur||0.7))/0.35,0,1)); if(hk>0){ X.save(); X.globalAlpha*=hk; X.fillStyle=SK.PAL.hl||'#FFE45C'; X.fillRect(bx-bw-14,by-10,(bw+28)*hk,64); X.restore(); } }
    X.save(); X.globalAlpha*=cl((t-P.at)/0.12,0,1); X.fillStyle='#202124'; X.fillText(big,bx,by); X.restore();
    X.direction='rtl'; X.textAlign='right'; X.font='500 40px "Rubik", sans-serif'; X.fillStyle='#4D5156'; X.fillText(P.suffix||'',bx-bw-36,by+14); }
  X.restore(); };


/* 💬 فقاعة شات (سألت كلود / ChatGPT)
   SK.chat(t,{ inAt, title:'Claude', icon:'claude', y:300, h:900,
     ask: SK.span('اكتبلي','القهوة'),      ← سؤاله بينكتب بخانة الكتابة وهو بيحكيه
     sendAt, thinkAt,                      ← ضغطة إرسال ← نقاط «بيكتب…»
     answer:'نص الجواب', answerAt, answerDur:1.2 })   ← الجواب بينزل كلمة كلمة
   فقاعته هو يسار (RTL: رسايلي على اليسار) بلون التمييز، والمساعد يمين بالرمادي. */
function _wrap(txt,maxW){ const ws=txt.split(' '), L=[]; let cur=''; for(const w of ws){ const n=cur?cur+' '+w:w; if(X.measureText(n).width>maxW&&cur){ L.push(cur); cur=w; } else cur=n; } if(cur) L.push(cur); return L; }
SK.chat=(t,o)=>{ const t0=o.inAt; if(t<t0) return; const x=70, w=940, y=o.y??300, h=o.h??900, k=back(cl((t-t0)/0.4,0,1));
  X.save(); X.globalAlpha=cl((t-t0)/0.15,0,1); X.translate(540,y+h/2); X.scale(0.88+0.12*k,0.88+0.12*k); X.translate(-540,-(y+h/2));
  shadow(60,18,'rgba(20,24,40,.22)'); rr(x,y,w,h,36); X.fillStyle='#FFFFFF'; X.fill(); noShadow();
  /* الهيدر */
  X.fillStyle='#F6F6F4'; X.save(); rr(x,y,w,h,36); X.clip(); X.fillRect(x,y,w,104); X.restore();
  X.strokeStyle='#ECECEA'; X.lineWidth=2; X.beginPath(); X.moveTo(x,y+104); X.lineTo(x+w,y+104); X.stroke();
  const ic=o.icon&&SK.img(o.icon); if(ic){ const B=SK.contain(ic,x+w-62,y+52,50,50); X.drawImage(ic,B.x,B.y,B.w,B.h); }
  X.direction='rtl'; X.textAlign='right'; X.textBaseline='middle'; X.font='600 44px "Rubik", sans-serif'; X.fillStyle='#1F1F1F'; X.fillText(o.title||'',x+w-110,y+54);
  /* خانة الكتابة تحت */
  const iy=y+h-130, sent=o.sendAt!=null&&t>=o.sendAt;
  rr(x+30,iy,w-60,100,50); X.fillStyle='#F4F4F2'; X.fill();
  const typed=(!sent&&o.ask)?SK.typed(t,o.ask):'';
  X.font='400 42px "Rubik", sans-serif'; X.fillStyle=typed?'#1F1F1F':'#9A9A96'; X.save(); X.beginPath(); X.rect(x+140,iy,w-180,100); X.clip();
  const tl=typed||'اكتب رسالة…'; X.textAlign='right'; const tw0=X.measureText(tl).width, tx0=Math.max(x+w-70, x+150+tw0); X.fillText(tl,typed?Math.min(x+w-70,tx0):x+w-70,iy+52); X.restore();
  if(typed&&Math.floor(t*2.4)%2===0){ X.fillStyle=ACC; X.fillRect(Math.max(x+146,x+w-70-tw0-8),iy+28,4,48); }
  /* زر الإرسال: بينضغط على sendAt */
  const pr=sent?Math.sin(Math.PI*cl((t-o.sendAt)/0.2,0,1)):0, bR=34*(1-0.18*pr), bx=x+90, by=iy+50;
  X.beginPath(); X.arc(bx,by,bR,0,7); X.fillStyle=typed||sent?ACC:'#D6D6D2'; X.fill();
  X.strokeStyle='#fff'; X.lineWidth=6; X.lineCap='round'; X.beginPath(); X.moveTo(bx,by+14); X.lineTo(bx,by-14); X.moveTo(bx-12,by-2); X.lineTo(bx,by-14); X.lineTo(bx+12,by-2); X.stroke();
  /* الرسايل */
  let my=y+150;
  if(sent){ const q=o.ask.map(w=>w.t).join(' '), ke=E3(cl((t-o.sendAt)/0.35,0,1));
    X.font='400 46px "Rubik", sans-serif'; const L=_wrap(q,620), bw=Math.max(...L.map(l=>X.measureText(l).width))+64, bh=L.length*64+44;
    const bxL=x+40, byT=my+(1-ke)*(iy-my-bh);
    X.save(); X.globalAlpha*=ke; rr(bxL,byT,bw,bh,30); X.fillStyle=ACC; X.fill(); X.fillStyle='#fff'; X.textAlign='right';
    L.forEach((l,i)=>X.fillText(l,bxL+bw-32,byT+54+i*64)); X.restore(); my+=bh+40; }
  if(o.thinkAt!=null&&t>=o.thinkAt&&(o.answerAt==null||t<o.answerAt)){ const kt=E3(cl((t-o.thinkAt)/0.25,0,1)); const bw=170, bx2=x+w-40-bw;
    X.save(); X.globalAlpha*=kt; rr(bx2,my,bw,90,30); X.fillStyle='#F1F1EF'; X.fill();
    for(let i=0;i<3;i++){ const ph=Math.sin((t-o.thinkAt)*9-i*0.9); X.beginPath(); X.arc(bx2+bw-50-i*36,my+45-Math.max(0,ph)*9,10,0,7); X.fillStyle='#8E8E8A'; X.fill(); } X.restore(); }
  if(o.answerAt!=null&&t>=o.answerAt){ const ws=o.answer.split(' '), n=Math.max(1,Math.ceil(ws.length*cl((t-o.answerAt)/(o.answerDur||1.2),0,1)));
    X.font='400 46px "Rubik", sans-serif'; const full=_wrap(o.answer,740), shown=_wrap(ws.slice(0,n).join(' '),740);
    const bw=Math.max(...full.map(l=>X.measureText(l).width))+64, bh=full.length*64+44, bx2=x+w-40-bw, ka=E3(cl((t-o.answerAt)/0.3,0,1));
    X.save(); X.globalAlpha*=ka; rr(bx2,my,bw,bh,30); X.fillStyle='#F1F1EF'; X.fill(); X.fillStyle='#1F1F1F'; X.textAlign='right';
    shown.forEach((l,i)=>X.fillText(l,bx2+bw-32,my+54+i*64)); X.restore(); }
  X.restore(); };


/* 👤 كرت فولو بهوية المستخدم (من brand.json ← profile) — بدون عدد متابعين
   SK.follow(t,{ inAt, tapAt, y:260 })  الكرت بيطلع ← حلقة الصورة بتنرسم ← الاسم بينكتب ← ضغطة على Follow ← Following ✓ + احتفال */
SK.follow=(t,o)=>{ const B=SK.B||{}, Pf=B.profile||{}, P=SK.PAL; if(t<o.inAt) return;
  const lt=t-o.inAt, y=o.y??240, w=900, h=470, x=90, k=back(cl(lt/0.45,0,1));
  const dark=P.midnight||'#162A2C', cream=P.cream||'#F4EFE6', green=P.green||ACC, sky=P.sky||'#D6E0E2', storm=P.storm||'#686867';
  X.save(); X.globalAlpha=cl(lt/0.18,0,1); X.translate(540,y+h/2+(1-k)*120); X.scale(0.9+0.1*k,0.9+0.1*k); X.translate(-540,-(y+h/2));
  shadow(60,20,'rgba(10,20,22,.30)'); rr(x,y,w,h,44); X.fillStyle=P.white||'#FEFCF6'; X.fill(); noShadow();
  /* الصورة كاملة بدايرة + حلقة بتنرسم */
  const ax=x+150, ay=y+150, R=96, im=SK.img(o.avatar||'avatar');
  const ka=E3(cl((lt-0.2)/0.6,0,1));
  X.save(); X.lineWidth=10; X.lineCap='round'; const g=X.createLinearGradient(ax-R,ay-R,ax+R,ay+R); g.addColorStop(0,green); g.addColorStop(0.5,sky); g.addColorStop(1,green);
  X.strokeStyle=g; X.beginPath(); X.arc(ax,ay,R+14,-Math.PI/2,-Math.PI/2+6.2832*ka); X.stroke(); X.restore();
  if(im){ const kp=back(cl((lt-0.1)/0.4,0,1)); X.save(); X.translate(ax,ay); X.scale(kp,kp); X.beginPath(); X.arc(0,0,R,0,7); X.clip(); X.drawImage(im,-R,-R,2*R,2*R); X.restore(); }
  /* الاسم والتعريف واليوزر */
  X.direction='ltr'; X.textAlign='left'; X.textBaseline='middle';
  const nm=Pf.name||'', nk=cl((lt-0.35)/0.45,0,1); X.font='700 54px "Rubik", sans-serif'; X.fillStyle=dark; X.fillText(nm.slice(0,Math.ceil(nm.length*nk)),x+290,y+105);
  X.globalAlpha*=1; const ft=cl((lt-0.7)/0.3,0,1);
  X.save(); X.globalAlpha*=ft; X.font='400 32px "Rubik", sans-serif'; X.fillStyle=storm; X.fillText(Pf.title||'',x+290,y+162);
  X.font='600 34px "Rubik", sans-serif'; X.fillStyle=green; X.fillText('@'+(Pf.handle||''),x+290,y+212); X.restore();
  /* زر Follow ← Following ✓ */
  const bx=x+40, by=y+h-140, bw=w-80, bh=100, tapped=o.tapAt!=null&&t>=o.tapAt, tp=tapped?cl((t-o.tapAt)/0.35,0,1):0, press=tapped?Math.sin(Math.PI*cl((t-o.tapAt)/0.2,0,1)):0;
  const kb=E3(cl((lt-0.8)/0.35,0,1)); X.save(); X.globalAlpha*=kb; X.translate(540,by+bh/2); X.scale(1-0.05*press,1-0.05*press); X.translate(-540,-(by+bh/2));
  rr(bx,by,bw,bh,26); X.fillStyle=tapped&&tp>0.5?sky:dark; X.fill();
  if(tapped){ X.save(); rr(bx,by,bw,bh,26); X.clip(); X.beginPath(); X.arc(o.tapX??540,by+bh/2,bw*E3(tp),0,7); X.fillStyle=rgba(sky,0.9*(1-tp*0.4)); X.fill(); X.restore(); }
  X.textAlign='center'; X.font='600 44px "Rubik", sans-serif'; X.fillStyle=tapped&&tp>0.5?dark:cream; X.fillText(tapped&&tp>0.5?'Following ✓':'Follow',540,by+bh/2+2);
  X.restore();
  /* إصبع بيضغط */
  if(o.tapAt!=null&&t>o.tapAt-0.45&&t<o.tapAt+0.5){ const q=cl((t-(o.tapAt-0.45))/0.45,0,1), fx=(o.tapX??540)+60*(1-q), fy=by+bh/2+40+80*(1-E3(q));
    X.save(); X.globalAlpha*=t<o.tapAt+0.3?1:cl((o.tapAt+0.5-t)/0.2,0,1); X.beginPath(); X.arc(fx,fy,30,0,7); X.fillStyle='rgba(255,255,255,.85)'; X.fill(); X.lineWidth=4; X.strokeStyle=dark; X.stroke(); X.restore(); }
  X.restore();
  /* احتفال بألوان الهوية */
  if(tapped){ const cols=[green,sky,cream,P.storm||'#686867']; for(let i=0;i<26;i++){ const a=i/26*6.2832+i*0.37, sp=320+((i*53)%160), q=cl((t-o.tapAt)/0.9,0,1), d=sp*E3(q);
    const px=540+Math.cos(a)*d, py=y+h-90+Math.sin(a)*d*0.7+300*q*q; X.save(); X.globalAlpha=1-q; X.translate(px,py); X.rotate(q*8+i); X.fillStyle=cols[i%4]; X.fillRect(-9,-5,18,10); X.restore(); } }
};

/* ═══ مكتبة الرسومات (تُستدعى داخل SK.panel) — كلها مقاسة من المرجع ═══ */

/* شعار/أيقونة تنبثق ثم تتمايل خفيف (مثل كاراكتر كلود يمشي) */
SK.logo=(lt,key,cx,cy,size,o={})=>{ const im=SK.img(key); if(!im) return; const k=back(cl(lt/0.32,0,1));
  const walk=o.walk?Math.sin(lt*9)*6:0, bob=o.walk?Math.abs(Math.sin(lt*9))*-6:0, B=SK.contain(im,cx+walk,cy+bob,size,size);
  X.save(); X.globalAlpha=cl(lt/0.12,0,1); X.translate(cx,cy); X.scale(k,k); X.translate(-cx,-cy); X.drawImage(im,B.x,B.y,B.w,B.h); X.restore(); };

/* كرت صورة/لقطة شاشة بظل ناعم، يطلع بشفافية من الرمادي (المرجع: يبدأ رمادي باهت ويتوضّح خلال 0.3ث) */
SK.drawShot=(sh,t)=>drawShot(sh,t);
SK.shot=(lt,key,cx,cy,maxW,maxH,o={})=>{ const im=SK.img(key); if(!im) return null; const B=SK.contain(im,cx,cy,maxW,maxH), a=SK.fade(lt,o.inDur||0.3);
  X.save(); X.globalAlpha=a; shadow(50,22,'rgba(0,0,0,.28)'); rr(B.x,B.y,B.w,B.h,o.r??14); X.fillStyle='#1b1b1b'; X.fill(); noShadow();
  X.save(); rr(B.x,B.y,B.w,B.h,o.r??14); X.clip(); X.drawImage(im,B.x,B.y,B.w,B.h);
  if(a<1){ X.fillStyle=rgba('#9a9a9a',(1-a)*0.9); X.fillRect(B.x,B.y,B.w,B.h); } X.restore(); X.restore(); return B; };

/* نافذة تيرمنال ماك — أسطر تنكتب (لما ما فيه تسجيل شاشة) */
SK.terminal=(lt,x,y,w,h,lines,o={})=>{ const a=SK.fade(lt,0.3); X.save(); X.globalAlpha=a; shadow(46,20,'rgba(0,0,0,.30)');
  rr(x,y,w,h,14); X.fillStyle=o.bg||'#14161A'; X.fill(); noShadow(); X.strokeStyle='rgba(255,255,255,.08)'; X.lineWidth=2; rr(x,y,w,h,14); X.stroke();
  ['#FF5F57','#FEBC2E','#28C840'].forEach((c,i)=>{ X.beginPath(); X.arc(x+26+i*22,y+22,7,0,7); X.fillStyle=c; X.fill(); });
  X.font='500 26px "IBM Plex Mono", Consolas, monospace'; X.textBaseline='top'; X.direction='ltr'; X.textAlign='left';
  let used=0; const cps=o.cps||60; lines.forEach((ln,i)=>{ const st=(o.start||0.25)+used/cps; used+=ln.t.length; const n=Math.floor(cl((lt-st)*cps,0,ln.t.length));
    X.fillStyle=ln.c||'#C9D1D9'; X.fillText(ln.t.slice(0,n),x+28,y+56+i*36); }); X.restore(); };

/* فوكس: الصورة تكبر نحو منطقة، والباقي يتغبّش، ومستطيل بلون التمييز حول المنطقة (المرجع: 9-10.5ث) */
SK.focus=(lt,key,cx,cy,maxW,maxH,f,o={})=>{ const im=SK.img(key); if(!im) return; const B=SK.contain(im,cx,cy,maxW,maxH);
  const k=E3(cl((lt-(o.at||0.4))/0.5,0,1)), z=1+(o.zoom||0.35)*k;
  const fx=B.x+f.x*B.w, fy=B.y+f.y*B.h, fw=f.w*B.w, fh=f.h*B.h, ox=fx+fw/2, oy=fy+fh/2;
  const tx=(cx-ox)*k, ty=(cy-oy)*k;
  const draw=(blur)=>{ X.save(); X.translate(cx+tx,cy+ty); X.scale(z,z); X.translate(-cx,-cy); if(blur) X.filter='blur('+(10*k)+'px)'; X.drawImage(im,B.x,B.y,B.w,B.h); X.restore(); };
  X.save(); X.globalAlpha=SK.fade(lt,0.25); draw(true);
  X.save(); X.translate(cx+tx,cy+ty); X.scale(z,z); X.translate(-cx,-cy); rr(fx,fy,fw,fh,10); X.clip(); X.drawImage(im,B.x,B.y,B.w,B.h); X.restore();
  X.save(); X.translate(cx+tx,cy+ty); X.scale(z,z); X.translate(-cx,-cy); X.globalAlpha*=k; X.strokeStyle=ACC; X.lineWidth=6/z; rr(fx-8,fy-8,fw+16,fh+16,16); X.stroke(); X.restore();
  X.restore(); };

/* أشرطة تتعبّى بالتتابع + رقم يعدّ (المرجع: Free-Tier Budget) */
SK.bars=(lt,x,y,w,title,total,rows,o={})=>{ const dark=o.dark!==false, a=SK.fade(lt,0.3), h=110+rows.length*56;
  X.save(); X.globalAlpha=a; shadow(40,18,'rgba(0,0,0,.35)'); rr(x,y,w,h,18); X.fillStyle=dark?'#161A21':'#FFFFFF'; X.fill(); noShadow();
  X.direction='rtl'; X.textAlign='right'; X.textBaseline='middle'; X.fillStyle=dark?'#fff':'#111'; X.font=SK.font(700,38); X.fillText(title,x+w-30,y+44);
  const k0=E3(cl((lt-0.2)/0.9,0,1)); X.textAlign='left'; X.font=SK.font(800,34); X.fillStyle=o.numColor||'#FF4F8B'; X.fillText(total(k0),x+30,y+44);
  const gg=X.createLinearGradient(x+w-30,0,x+30,0); gg.addColorStop(0,'#FF4F8B'); gg.addColorStop(1,'#9B5CFF');
  rr(x+30,y+80,(w-60),10,5); X.fillStyle='rgba(127,127,127,.25)'; X.fill(); rr(x+w-30-(w-60)*0.9*k0,y+80,(w-60)*0.9*k0,10,5); X.fillStyle=gg; X.fill();
  rows.forEach((r,i)=>{ const yy=y+130+i*56, k=E3(cl((lt-0.3-i*0.12)/0.6,0,1));
    X.textAlign='right'; X.font=SK.font(600,30); X.fillStyle=dark?'#E6E6E6':'#222'; X.fillText(r.label,x+w-30,yy);
    const bx=x+150, bw=w-150-260; rr(bx,yy-6,bw,12,6); X.fillStyle='rgba(127,127,127,.22)'; X.fill();
    const g2=X.createLinearGradient(bx+bw,0,bx,0); g2.addColorStop(0,r.c2||'#FF4F8B'); g2.addColorStop(1,r.c||'#9B5CFF');
    rr(bx+bw-bw*r.v*k,yy-6,bw*r.v*k,12,6); X.fillStyle=r.green?'#22C55E':g2; X.fill();
    X.textAlign='left'; X.font=SK.font(500,24); X.fillStyle=dark?'#9AA3AF':'#666'; X.fillText(r.note||'',x+30,yy); });
  X.restore(); };

/* كاروسيل تبديل: كروت تنزلق، الوسط بإطار تمييز، عنوان بنقاط متحركة ثم ✓ (المرجع: Switching model) */
SK.carousel=(lt,items,o={})=>{ const cy=o.y||470, step=o.every||0.45, n=items.length, pos=lt/step, done=o.doneAt!=null&&lt>=o.doneAt;
  const settled=done?(o.doneIndex!=null?o.doneIndex:Math.round(o.doneAt/step)):pos;
  X.save(); X.textAlign='center'; X.direction='rtl'; X.textBaseline='middle';
  X.font=SK.font(500,24); X.fillStyle='#8A8A8A'; X.fillText(o.kicker||'كلود كود · تبديل الموديل',540,cy-260);
  X.font=SK.font(600,50); X.fillStyle='#111'; X.fillText(done?(o.doneText||'✓ شغّال الحين'):(o.title||'جاري التبديل')+'.'.repeat(1+Math.floor(lt*3)%3),540,cy-200);
  for(let d=-3;d<=3;d++){ const idx=Math.floor(settled)+d, it=items[((idx%n)+n)%n], off=d-(done?0:(settled%1));
    const x=540-off*220, s=1-Math.min(1,Math.abs(off))*0.38, al=cl(1-Math.abs(off)*0.33,0,1); if(al<=0) continue;
    const cw=170*s, chh=200*s; X.save(); X.globalAlpha=al; shadow(30*s,12*s,'rgba(0,0,0,.12)'); rr(x-cw/2,cy-chh/2,cw,chh,22*s); X.fillStyle='#fff'; X.fill(); noShadow();
    if(Math.abs(off)<0.5){ X.strokeStyle=ACC; X.lineWidth=4; rr(x-cw/2-8,cy-chh/2-8,cw+16,chh+16,28); X.stroke(); }
    const im=SK.img(it.img); if(im){ const B=SK.contain(im,x,cy-18*s,90*s,90*s); X.drawImage(im,B.x,B.y,B.w,B.h); }
    X.font=SK.font(600,24*s); X.fillStyle='#222'; X.fillText(it.label,x,cy+62*s); X.restore(); }
  X.restore(); };

/* رقم/جملة ضخمة بتدرّج من لون التمييز للشفاف (المرجع: «UNLIMITED USAGE» و«↓90%↓») */
SK.bigGrad=(lt,text,cx,cy,size,o={})=>{ const k=E5(cl(lt/0.35,0,1)); X.save(); X.globalAlpha=k; X.direction='rtl'; X.textAlign='center'; X.textBaseline='middle';
  X.font=SK.font(900,size,o.italic); const g=X.createLinearGradient(0,cy-size*0.55,0,cy+size*0.55);
  const A_=o.color||SK.accT(SK._t||0), dk=SK.isDarkBg(SK.shotAt(SK._t||0)||{}); g.addColorStop(0,rgba(A_,o.topA??0.25)); g.addColorStop(0.55,A_); g.addColorStop(1,o.bottom||(dk?(SK.PAL.white||'#fff'):CLAY));
  X.fillStyle=g; X.fillText(text,cx,cy+(1-k)*30); X.restore(); };

/* تحذير: الخلفية تحمرّ تدريجياً + خط أحمر بالأسفل (المرجع: «لما يخلص الليمت») — بالشوت: tint:'#5A1410' */

/* دبوس «شوف التعليق المثبّت» فوق الكابشن الأخير */
SK.pin=(lt,cy=1330)=>{ const k=back(cl(lt/0.3,0,1)); X.save(); X.globalAlpha=cl(lt/0.15,0,1); X.translate(540,cy); X.scale(k,k);
  X.direction='rtl'; X.textAlign='center'; X.textBaseline='middle'; X.font=SK.font(500,64); shadow(18,3,'rgba(0,0,0,.6)'); X.fillStyle='#fff';
  X.fillText('📌 التعليق المثبّت',0,0); X.restore(); };
})();
