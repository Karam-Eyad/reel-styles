/* ═══ paper-style.js — ستايل «ورق المربعات» (بهوية المستخدم من brand.json) ═══
   بيتحمّل **بعد** split-style.js (نفس المحرّك):
     <script src="split-style.js"></script><script src="paper-style.js"></script><script src="shots.js"></script>
   بيضيف:
     خلفية ورق بنقاط شبكة       → أي لقطة {grid:true} (أو bg:'paper')
     نوع لقطة 'card'             → وجهه جوّا كرت مدوّر على الورق + دايرة إطار + غيمة + صف شعارات أدوات + شريط جانبي
     انتقالات                   → 'blob' (بقعة سائلة بتصغر لنقطة) · 'leak' (تسريب ضوء دافي)  + كل انتقالات split-style
     رسومات                     → SK.headline · SK.orbit · SK.tilt (لقطة شاشة مايلة 3D بتنزل) · SK.chevrons · SK.dotDrop · SK.slideText
   كل الألوان من SK.PAL (brand.json): paper=cream · ink=midnight · accent=green · accent2=sky. */
(function(){
const E3=k=>1-Math.pow(1-k,3), EIO=k=>k<.5?4*k*k*k:1-Math.pow(-2*k+2,3)/2, CL=(v,a,b)=>Math.max(a,Math.min(b,v));
const P=()=>SK.PAL, ACC_=()=>(SK.B&&SK.B.accent)||ACC, ACC2_=()=>(SK.PAL.sky||'#D6E0E2'), INK_=()=>(SK.PAL.ink||'#162A2C');
SK.PAL.paper=SK.PAL.paper||null;

/* ── ورق بنقاط شبكة ── */
SK.gridDraw=(sh,t)=>{ X.save(); X.fillStyle=rgba(INK_(),0.22); const g=sh.gridSize||34;
  for(let y=g/2;y<H;y+=g) for(let x=g/2;x<W;x+=g){ X.fillRect(x-2,y-2,4,4); } X.restore(); };

/* ── غيمة صغيرة (زينة متل المرجع) ── */
SK.cloud=(x,y,s,a=1)=>{ X.save(); X.globalAlpha*=a; X.fillStyle='#FFFFFF'; X.shadowColor='rgba(0,0,0,.10)'; X.shadowBlur=18; X.shadowOffsetY=6;
  X.beginPath(); [[0,0,1],[-0.7,0.25,0.75],[0.75,0.25,0.75],[-0.25,-0.35,0.8],[0.4,-0.25,0.7]].forEach(([dx,dy,r])=>{ X.moveTo(x+dx*s+r*s,y+dy*s); X.arc(x+dx*s,y+dy*s,r*s,0,7); }); X.fill(); X.restore(); };

/* ═══ نوع لقطة 'card': الوجه بكرت مدوّر على الورق ═══
   {kind:'card', bg:'cream', logos:['claude','gemini','deepseek','perplexity'], bar:true, cloud:true} */
SK.KINDS.card=(sh,t,lt)=>{ const bg=P()[sh.bg]||P().cream||'#F4EFE6';
  X.fillStyle=bg; X.fillRect(0,0,W,H); SK.gridDraw(sh,t);
  const ein=E3(CL(lt/0.45,0,1)), x=200, y=330+(1-ein)*80, w=680, h=760, r=56;
  /* دايرة إطار كبيرة ورا الكرت */
  X.save(); X.strokeStyle=rgba(INK_(),0.55); X.lineWidth=3; X.beginPath(); X.arc(540,y+h*0.52,470,-Math.PI/2,-Math.PI/2+6.2832*E3(CL(lt/0.7,0,1))); X.stroke(); X.restore();
  /* الكرت + الفيديو جوّاه (الوجه بالنص) */
  X.save(); X.shadowColor='rgba(0,0,0,.18)'; X.shadowBlur=40; X.shadowOffsetY=16; rr(x,y,w,h,r); X.fillStyle='#000'; X.fill(); X.restore();
  X.save(); rr(x,y,w,h,r); X.clip(); const z=sh.zoom||1.25, fy=sh.fy||760, sc=z*w/W; X.translate(x+w/2,y+h*0.42); X.scale(sc,sc); X.translate(-540,-fy); X.drawImage(VF,0,0,W,H); X.restore();
  if(sh.cloud!==false){ const cf=Math.sin(t*1.2)*6; SK.cloud(x-10,y+40+cf,46,ein); SK.cloud(x+w+20,y+h-60-cf,34,ein*0.9); }
  /* صف الشعارات */
  const L=sh.logos||[]; L.forEach((k,i)=>{ const kk=back(CL((lt-0.25-i*0.08)/0.35,0,1)); if(kk<=0) return; const n=L.length, bx=540+(i-(n-1)/2)*150, by=1380;
    X.save(); X.translate(bx,by); X.scale(kk,kk); X.shadowColor='rgba(0,0,0,.12)'; X.shadowBlur=16; X.shadowOffsetY=6; rr(-54,-54,108,108,26); X.fillStyle='#FFFFFF'; X.fill(); X.shadowColor='transparent';
    const im=SK.img(k); if(im){ const B=SK.contain(im,0,0,64,64); X.drawImage(im,B.x,B.y,B.w,B.h); } X.restore(); });
  /* شريط جانبي طويل */
  if(sh.bar!==false){ const bk=E3(CL((lt-0.1)/0.5,0,1)); X.fillStyle=ACC_(); X.fillRect(930,1920-620*bk,44,620*bk); }
};

/* ═══ انتقال 'blob': اللقطة القديمة بتنحصر ببقعة حافتها متموّجة بتصغر لنقطة، وحواليها حلقة بلون التمييز ═══ */
SK.TRD.blob=0.55; SK.TRD.leak=0.4;
function blobPath(cx,cy,r,t){ X.beginPath(); const N=48; for(let i=0;i<=N;i++){ const a=i/N*6.2832, w=1+0.06*Math.sin(a*5+t*9)+0.04*Math.sin(a*9-t*13); const rr_=r*w; i?X.lineTo(cx+Math.cos(a)*rr_,cy+Math.sin(a)*rr_):X.moveTo(cx+Math.cos(a)*rr_,cy+Math.sin(a)*rr_); } X.closePath(); }
SK.TRANS.blob=(pv,sh,t,k,draw)=>{ const cx=540, cy=820, r=1250*Math.pow(1-k,2.2);
  draw(sh,t);
  if(r<2) return;
  X.save(); blobPath(cx,cy,r+70*(1-k)+18,t); X.fillStyle=ACC_(); X.fill(); X.restore();          /* الحلقة */
  X.save(); blobPath(cx,cy,r,t); X.clip(); X.translate(cx,cy); const z=0.7+0.3*(r/1250); X.scale(z,z); X.translate(-cx,-cy); draw(pv,t); X.restore(); };

/* ═══ انتقال 'leak': قطع + تسريب ضوء دافي بيمسح الشاشة ═══ */
SK.TOPFX.leak=(sh,t,k)=>{ const a=Math.sin(Math.PI*k), x=-300+1700*k; X.save(); X.globalCompositeOperation='screen';
  const g=X.createRadialGradient(x,700,40,x,700,1100); g.addColorStop(0,'rgba(255,190,90,'+(0.95*a)+')'); g.addColorStop(0.45,'rgba(255,90,120,'+(0.6*a)+')'); g.addColorStop(1,'rgba(255,60,120,0)');
  X.fillStyle=g; X.fillRect(0,0,W,H); X.restore(); };

/* ═══ عنوان بلونين + زاوية L بتنرسم (متل «تتعامل مع الذكاء الاصطناعي / بطريقة مختلفة تماماً») ═══
   SK.headline(t,{at, l1, l2, at2, y:300, size:84}) */
SK.headline=(t,o)=>{ if(t<o.at) return; const y=o.y??300, s=o.size??84, lt=t-o.at, R=W-110;
  const lk=E3(CL(lt/0.4,0,1)); X.save(); X.strokeStyle=ACC_(); X.lineWidth=5; X.lineCap='round';
  X.beginPath(); X.moveTo(R+30,y-s*0.9); X.lineTo(R+30-260*lk,y-s*0.9); X.stroke(); X.beginPath(); X.moveTo(R+30,y-s*0.9); X.lineTo(R+30,y-s*0.9+(s*2.6)*lk); X.stroke(); X.restore();
  const dr=(txt,yy,sz,col,w8,k)=>{ if(k<=0) return; X.save(); X.beginPath(); X.rect(0,yy-sz,W,sz*1.5); X.clip(); X.font=w8+' '+sz+'px "Rubik"'; X.direction='rtl'; X.textAlign='right'; X.textBaseline='alphabetic'; X.fillStyle=col; X.fillText(txt,R,yy+sz*0.35+(1-E3(k))*sz*1.1); X.restore(); };
  dr(o.l1,y,s,ACC_(),700,CL((lt-0.15)/0.4,0,1));
  if(o.l2) dr(o.l2,y+s*1.25,s*0.82,INK_(),600,CL((t-(o.at2??o.at+0.45))/0.4,0,1)); };

/* ═══ مدار: صورة بالنص فوق قرص ملوّن، ودوايرين بتنرسم وعليهم نقاط بتلف ═══
   SK.orbit(t,{at, cx:540, cy:900, img:'claude', size:240}) */
SK.orbit=(t,o)=>{ if(t<o.at) return; const lt=t-o.at, cx=o.cx??540, cy=o.cy??900, s=o.size??240;
  const dk=back(CL((lt-0.15)/0.4,0,1)); if(dk>0){ X.save(); X.beginPath(); X.arc(cx,cy,s*0.62*dk,0,7); X.fillStyle=o.disc||ACC2_(); X.fill(); X.restore(); }
  [[s*0.95,ACC_(),0.6],[s*1.25,INK_(),-0.35]].forEach(([r,c,sp],i)=>{ const k=E3(CL((lt-0.3-i*0.15)/0.6,0,1)); if(k<=0) return;
    X.save(); X.strokeStyle=c; X.lineWidth=i?2.5:4; X.beginPath(); X.arc(cx,cy,r,-Math.PI/2,-Math.PI/2+6.2832*k); X.stroke();
    for(let j=0;j<(i?4:3);j++){ const a=t*sp+j*6.2832/(i?4:3); X.beginPath(); X.arc(cx+Math.cos(a)*r,cy+Math.sin(a)*r,i?7:9,0,7); X.fillStyle=i?INK_():ACC_(); X.globalAlpha=k; X.fill(); } X.restore(); });
  const ik=back(CL(lt/0.45,0,1)); const im=o.img&&SK.img(o.img); if(im&&ik>0){ X.save(); X.translate(cx,cy); X.scale(ik,ik); X.rotate(Math.sin(t*1.4)*0.06); const B=SK.contain(im,0,0,s*0.8,s*0.8); X.drawImage(im,B.x,B.y,B.w,B.h); X.restore(); } };

/* ═══ لقطة شاشة مايلة 3D بتنزل (scroll) — منظور مزيّف بشرائح عمودية ═══
   SK.tilt(t,{at, img:'site', cx:540, cy:860, w:1000, h:1300, angle:0.35, scroll:0.5 (من الصورة), dur:3}) */
SK.tilt=(t,o)=>{ if(t<o.at) return; const im=SK.img(o.img); if(!im) return; const lt=t-o.at, k=E3(CL(lt/0.5,0,1));
  const w=o.w??980, h=o.h??1250, cx=o.cx??540, cy=(o.cy??880)+(1-k)*200, ang=o.angle??0.32, N=36, iw=im.naturalWidth, ih=im.naturalHeight;
  const viewH=Math.min(ih, iw*h/w), sc=Math.min(1,(o.scroll??0.4)*E3(CL(lt/(o.dur||3),0,1))), sy=(ih-viewH)*sc;
  X.save(); X.globalAlpha=k; X.translate(cx,cy); X.rotate(-0.12*ang);
  for(let i=0;i<N;i++){ const u0=i/N, u1=(i+1)/N, d0=1-ang*(0.5-u0)*0.9, d1=1-ang*(0.5-u1)*0.9;   /* الجنب اليمين أقرب (أكبر) */
    const x0=-w/2+w*u0, x1=-w/2+w*u1+1, hh=h*(d0+d1)/2;
    X.drawImage(im, iw*u0, sy, iw/N+1, viewH, x0, -hh/2, x1-x0, hh); }
  X.restore();
  /* ظل تحتها */
  X.save(); X.globalAlpha=0.18*k; X.fillStyle='#000'; X.beginPath(); X.ellipse(cx,cy+h*0.56,w*0.42,30,0,0,7); X.fill(); X.restore(); };


/* (فقاعة الوجه PiP مش مدعومة بهالستايل) */
SK.withPip=list=>list.map(s=>{ const {pip,...r}=s; return r; });

/* ═══ نص بينزلق من الجنب مع ضبابية حركة (شرائح ملوّنة كاملة) ═══
   SK.slideText(t,{at, l1, l2, y:900, color, color2}) */
SK.slideText=(t,o)=>{ if(t<o.at) return; const lt=t-o.at;
  const one=(txt,yy,sz,col,w8,st)=>{ const k=E3(CL((lt-st)/0.45,0,1)); if(k<=0) return; const dx=(1-k)*-520; X.save(); X.font=w8+' '+sz+'px "Rubik"'; X.direction='rtl'; X.textAlign='center'; X.textBaseline='middle';
    for(let j=3;j>=0;j--){ X.globalAlpha=(j?0.14:1)*CL(k*1.5,0,1); if(!j&&o.stroke){ X.lineJoin='round'; X.strokeStyle=o.stroke; X.lineWidth=o.strokeW||7; X.strokeText(txt,540+dx,yy); } X.fillStyle=col; X.fillText(txt,540+dx-j*30*(1-k),yy); } X.restore(); };   /* o.stroke: إطار لما النص فوق فيديو */
  one(o.l1,(o.y??900)-70,(o.s1??64),o.color||'#FFFFFF',500,0); if(o.l2) one(o.l2,(o.y??900)+40,(o.s2??96),o.color2||'#FFE14D',800,0.15); };

/* ═══ أسهم ⌄⌄⌄ بتنبض لتحت (دعوة بالآخر) ═══ */
SK.chevrons=(t,o)=>{ if(t<o.at) return; const cx=o.cx??540, y=o.y??1250;
  for(let i=0;i<3;i++){ const ph=((t-o.at)*2.2-i*0.25)%1, a=Math.max(0.25,1-Math.abs(ph-0.5)*1.6), k=back(CL((t-o.at-i*0.1)/0.3,0,1));
    X.save(); X.globalAlpha=a*Math.min(1,k); X.strokeStyle=o.color||'#FFFFFF'; X.lineWidth=16; X.lineJoin='round'; X.lineCap='round';
    X.beginPath(); X.moveTo(cx-60,y+i*56); X.lineTo(cx,y+i*56+44); X.lineTo(cx+60,y+i*56); X.stroke(); X.restore(); } };

/* ═══ نقطة بتنزل وبترتد (متل «عشان كده •») ═══ */
SK.dotDrop=(t,o)=>{ if(t<o.at) return; const lt=t-o.at, y0=o.y??1050, f=Math.min(1,lt/0.45), y=y0-260*(1-f)*(1-f)+(f>=1?-Math.abs(Math.sin((lt-0.45)*9))*40*Math.exp(-(lt-0.45)*5):0);
  X.save(); X.beginPath(); X.arc(o.x??540,y,o.r??22,0,7); X.fillStyle=ACC_(); X.fill(); X.restore(); };
})();
