/* مثال: ستايل paper-reel-style كامل (ورق، شرائح، كرت وجه، تقسيمة، موشن احترافي، شات، بحث، تيرمنال، فولو).
   مثال حقيقي لتصميم ريل 38 ثانية: انسخ منه الأنماط (مش المحتوى). الأوقات مربوطة بكلام فيديو معيّن، فعدّلها على كلامك. */
/* SK.brand({...}) — new_project.py بيكتبه تلقائياً من هويتك (brand.json) */
SK.preload({ claude:'assets/logos/claude.svg', gemini:'assets/logos/googlegemini.svg', deepseek:'assets/logos/deepseek.svg',
  perplexity:'assets/logos/perplexity.svg', site:'assets/site.png' });
SK.shots([
 {s:0,     e:2.24,  kind:'face',  zoom:1.12},
 {s:2.24,  e:3.92,  kind:'full',  bg:'paper', grid:true, tr:'blob', nocap:true},
 {s:3.92,  e:5.67,  kind:'full',  bg:'green', tr:'whip', nocap:true},
 {s:5.67,  e:8.68,  kind:'card',  bg:'cream', tr:'leak', logos:['claude','gemini','deepseek','perplexity'], zoom:1.3, fy:820, capY:1250, maxWords:3},
 {s:8.68,  e:11.85, kind:'full',  bg:'dark', tr:'zoom', capY:1470},
 {s:11.85, e:13.94, kind:'split', bg:'paper', grid:true, tr:'leak'},
 {s:13.94, e:15.57, kind:'face',  zoom:1.16, tr:'whip'},
 {s:15.57, e:17.82, kind:'split', bg:'paper', grid:true, tr:'blob'},
 {s:17.82, e:25.40, kind:'split', bg:'paper', grid:true, tr:'zoom'},
 {s:25.40, e:28.52, kind:'full',  bg:'green', tr:'whip', nocap:true},
 {s:28.52, e:32.28, kind:'full',  bg:'paper', grid:true, tr:'leak', capY:1560},
 {s:32.28, e:35.54, kind:'face',  zoom:1.14, tr:'blob', nocap:true},
 {s:35.54, e:99,    kind:'face',  still:true, tr:'leak'}]);
SK.preload({ avatar:'assets/brand/avatar.jpg', guide:'assets/guide.png' });
SK.SPLIT.shift=400; SK.SPLIT.headY=650;
const W_=(w,f)=>{ const x=SK.wordT(w,f||0); return x?x.s:0; };
const C_={ green:'#5E6C5B', cream:'#F4EFE6', white:'#FEFCF6', sky:'#D6E0E2', storm:'#686867', mid:'#162A2C' };
const ease3=k=>1-Math.pow(1-k,3), eioP=k=>k<.5?4*k*k*k:1-Math.pow(-2*k+2,3)/2, clp=(v,a,b)=>Math.max(a,Math.min(b,v));
const prD=(t,a,d)=>clp((t-a)/d,0,1);
const fake=(txt,a,b)=>{ const ws=txt.split(' '), d=(b-a)/ws.length; return ws.map((t,i)=>({t,s:a+i*d,e:a+(i+1)*d})); };


/* 2 — «بجملة وحدة»: عنوان + تيرمنال بتنكتب فيه الجملة الوحدة فعلاً */
SK.panel(2.24,3.92,(lt)=>{ const t=2.24+lt; SK.headline(t,{at:2.3, l1:'مونتاج كامل بالـ AI', l2:'بجملة وحدة بس', at2:W_('بجملة'), y:330, size:80});
  SK.terminal(t-2.45,110,620,860,300,[{t:'> claude',c:'#D6E0E2'},{t:''},{t:'> montage this video in paper-reel style'}],{cps:42,start:0.2,bg:'#162A2C'});
  SK.dotDrop(t,{at:W_('بس،',2)+0.05, x:540, y:1050, r:20}); });
/* 3 — «مع موديل كلود Opus 5.5 الجديد»: شريحة ملوّنة والنص بينزلق */
SK.panel(3.92,5.67,(lt)=>{ const t=3.92+lt; SK.slideText(t,{at:3.95, l1:'مع موديل كلود الجديد', l2:'Opus 5.5', y:900, color:'#F4EFE6', color2:'#D6E0E2', s2:130}); });
/* 5 — 🎬 موشن احترافي: «يعني صار تقدر تعمل موشن جرافيك أو أي أنيميشن بتتخيله» (5 نبضات على الكلمات) */
SK.panel(8.68,11.85,(lt)=>{ const t=8.68+lt, tM=W_('موشن'), tG=W_('جرافيك'), tA=W_('أو'), tN=W_('أنيميشن'), tI=W_('بتتخيله'), cx=540, cy=760;
  const out=prD(t,tI+0.15,0.45);                                  /* النبضة 5: كلشي بيتجمع بالنص */
  X.save(); const zo=1-0.85*eioP(out); X.translate(cx,cy); X.scale(zo,zo); X.rotate(out*0.6); X.translate(-cx,-cy); X.globalAlpha=1-out*0.9;
  /* النبضة 1: شبكة دقيقة بتنرسم من النص + حلقات HUD */
  const gk=ease3(prD(t,8.68,0.6)); X.strokeStyle='rgba(214,224,226,0.09)'; X.lineWidth=1.5;
  for(let i=-8;i<=8;i++){ const d=i*70; X.beginPath(); X.moveTo(cx+d,cy-640*gk); X.lineTo(cx+d,cy+640*gk); X.stroke(); X.beginPath(); X.moveTo(cx-540*gk,cy+d); X.lineTo(cx+540*gk,cy+d); X.stroke(); }
  [[340,0.35,[4,18]],[300,-0.6,[40,14]],[255,0.9,[2,10]]].forEach(([r,sp,dash],i)=>{ const k=ease3(prD(t,8.8+i*0.12,0.6)); if(k<=0) return;
    X.save(); X.setLineDash(dash); X.lineDashOffset=-t*60*sp; X.strokeStyle=i===1?C_.green:'rgba(214,224,226,.45)'; X.lineWidth=i===1?6:3;
    X.beginPath(); X.arc(cx,cy,r,-Math.PI/2+t*sp,-Math.PI/2+t*sp+6.2832*k); X.stroke(); X.restore(); });
  const dk=ease3(prD(t,9.0,0.7)); X.save(); X.strokeStyle=C_.cream; X.lineWidth=8; X.lineCap='round'; X.beginPath(); X.arc(cx,cy,205,-Math.PI/2,-Math.PI/2+6.2832*dk); X.stroke(); X.restore();
  /* النبضة 2: «موشن» — مربع بيتحوّل لدايرة + جزيئات + الكلمة بتنكشف بقناع */
  const mk=prD(t,tM-0.05,0.5); if(mk>0){ const m=eioP(mk), sz=150+40*Math.sin(Math.PI*m);
    X.save(); X.translate(cx,cy); X.rotate(Math.PI/4*(1-m)+t*0.4); rr(-sz,-sz,2*sz,2*sz,sz*m); X.fillStyle=C_.green; X.globalAlpha*=0.9; X.fill(); X.restore();
    for(let i=0;i<34;i++){ const a=i/34*6.2832+i*0.21, q=prD(t,tM,0.9), d=(170+((i*37)%120))*ease3(q)+40; if(q<=0||q>=1) continue;
      X.save(); X.globalAlpha*=1-q; X.fillStyle=i%3?C_.sky:C_.cream; X.beginPath(); X.arc(cx+Math.cos(a)*d*1.6,cy+Math.sin(a)*d*1.6,6*(1-q)+2,0,7); X.fill();
      X.strokeStyle=X.fillStyle; X.lineWidth=2; X.globalAlpha*=0.5; X.beginPath(); X.moveTo(cx+Math.cos(a)*d*1.1,cy+Math.sin(a)*d*1.1); X.lineTo(cx+Math.cos(a)*d*1.6,cy+Math.sin(a)*d*1.6); X.stroke(); X.restore(); }
    X.save(); X.beginPath(); X.rect(0,cy-150,W,170); X.clip(); X.font='800 150px "Rubik"'; X.direction='rtl'; X.textAlign='center'; X.textBaseline='alphabetic'; X.fillStyle=C_.white;
    X.fillText('موشن',cx,cy+10+150*(1-ease3(prD(t,tM,0.35)))); X.restore(); }
  /* النبضة 3: «جرافيك» — بتنسحب مع ضبابية حركة + خط بينرسم تحتها */
  const gk2=prD(t,tG,0.4); if(gk2>0){ const e=ease3(gk2), dx=(1-e)*-420; X.save(); X.font='600 92px "Rubik"'; X.direction='rtl'; X.textAlign='center'; X.textBaseline='middle';
    for(let j=3;j>=0;j--){ X.globalAlpha=(j?0.12:1)*clp(e*1.4,0,1); X.fillStyle=C_.sky; X.fillText('جرافيك',cx+dx-j*24*(1-e),cy+95); }
    X.globalAlpha=1; const uw=330*ease3(prD(t,tG+0.15,0.35)); X.fillStyle=C_.green; rr(cx-uw/2,cy+150,uw,10,5); X.fill(); X.restore(); }
  /* النبضة 4: «أو أي أنيميشن» — طابة على مسار منحني بتمدد وتنضغط + تايملاين بمفاتيح */
  const ak=prD(t,tA,0.3); if(ak>0){ const P0=[170,1120],P1=[360,860],P2=[720,860],P3=[910,1120], pk=ease3(prD(t,tA,0.5));
    X.save(); X.strokeStyle='rgba(214,224,226,.55)'; X.setLineDash([6,14]); X.lineWidth=4; X.beginPath(); X.moveTo(...P0);
    const N=40; for(let i=1;i<=N*pk;i++){ const u=i/N, a=1-u; X.lineTo(a*a*a*P0[0]+3*a*a*u*P1[0]+3*a*u*u*P2[0]+u*u*u*P3[0], a*a*a*P0[1]+3*a*a*u*P1[1]+3*a*u*u*P2[1]+u*u*u*P3[1]); } X.stroke(); X.restore();
    const u=(((t-tA)*0.9)%1+1)%1, a=1-u, bx=a*a*a*P0[0]+3*a*a*u*P1[0]+3*a*u*u*P2[0]+u*u*u*P3[0], by=a*a*a*P0[1]+3*a*a*u*P1[1]+3*a*u*u*P2[1]+u*u*u*P3[1];
    const sq=Math.max(0,1-Math.min(u,1-u)*8); X.save(); X.globalAlpha*=ease3(ak); X.translate(bx,by); X.scale(1+0.35*sq,1-0.3*sq); X.beginPath(); X.arc(0,0,34,0,7); X.fillStyle=C_.cream; X.fill(); X.restore();
    /* تايملاين */
    const ty=1250, tk=ease3(prD(t,tA,0.35)); X.save(); X.globalAlpha*=tk; X.fillStyle='rgba(214,224,226,.18)'; rr(140,ty-8,800*tk,16,8); X.fill();
    [tA,W_('أي'),tN,tN+0.3,tI].forEach((kt,i)=>{ const kk=back(prD(t,kt,0.3)); if(kk<=0) return; const kx=160+i*190; X.save(); X.translate(kx,ty); X.rotate(Math.PI/4); X.scale(kk,kk); X.fillStyle=i%2?C_.sky:C_.green; X.fillRect(-14,-14,28,28); X.restore(); });
    const ph=160+760*clp((t-tA)/(tI+0.3-tA),0,1); X.fillStyle=C_.cream; X.fillRect(ph-2,ty-40,4,80); X.restore();
    if(t>=tN){ X.save(); X.font='500 64px "Rubik"'; X.direction='rtl'; X.textAlign='center'; X.textBaseline='middle'; X.globalAlpha*=ease3(prD(t,tN,0.3)); X.fillStyle=C_.sky; X.fillText('+ أنيميشن',cx,cy-330+30*(1-ease3(prD(t,tN,0.3)))); X.restore(); } }
  X.restore();
  /* النبضة 5: نجمة لامعة بالنص */
  if(out>0){ const sk=back(prD(t,tI+0.2,0.35)), fade=1-prD(t,11.55,0.3); X.save(); X.globalAlpha=fade; X.translate(cx,cy); X.rotate(t*1.5); X.scale(sk,sk); X.fillStyle=C_.cream;
    X.beginPath(); for(let i=0;i<8;i++){ const r=i%2?28:120, a=i/8*6.2832; X.lineTo(Math.cos(a)*r,Math.sin(a)*r); } X.closePath(); X.fill(); X.restore(); } });

/* 6 — «بمجرد إنك بتوصفه وبيسوّيلك ياه»: شات حقيقي */
SK.panel(11.85,13.94,(lt)=>{ const t=11.85+lt; SK.chat(t,{ inAt:11.85, title:'Claude', icon:'claude', y:180, h:620,
  ask:fake('اعملي شريط بحث بيتحرك على كلامي',11.99,12.9), sendAt:12.95, thinkAt:13.0, answer:'✓ جاهز 🎬', answerAt:W_('وبيسوّيلك')+0.15, answerDur:0.3 }); });

/* 8 — «أمثلة حيّة بتتوافق مع كلامك»: فقاعة كلامه ← سهم ← شريط جوجل */
SK.panel(15.57,17.82,(lt)=>{ const t=15.57+lt; SK.headline(t,{at:15.6, l1:'أمثلة حيّة', l2:'بتتوافق مع كلامك', at2:W_('كلامك'), y:260, size:78});
  const k1=back(clp((t-W_('بتتوافق'))/0.35,0,1)), k2=back(clp((t-W_('كلامك'))/0.35,0,1)), k3=back(clp((t-W_('بدون'))/0.35,0,1));
  if(k1>0){ X.save(); X.globalAlpha=Math.min(1,k1); X.translate(300,600); X.scale(k1,k1); X.shadowColor='rgba(0,0,0,.12)'; X.shadowBlur=30; X.shadowOffsetY=10; rr(-210,-90,420,180,40); X.fillStyle=C_.white; X.fill(); X.shadowColor='transparent';
    X.fillStyle=C_.mid; X.font='500 44px "Rubik"'; X.textAlign='center'; X.textBaseline='middle'; X.direction='rtl'; X.fillText('«رحت لجوجل…»',0,0); X.restore(); }
  if(k2>0){ X.save(); X.globalAlpha=Math.min(1,k2); X.strokeStyle=C_.green; X.lineWidth=10; X.lineCap='round'; X.beginPath(); X.moveTo(530,600); X.lineTo(530+80*k2,600); X.stroke(); X.beginPath(); X.moveTo(598,570); X.lineTo(623,600); X.lineTo(598,630); X.stroke(); X.restore(); }
  if(k3>0){ X.save(); X.globalAlpha=Math.min(1,k3); X.translate(830,600); X.scale(k3,k3); X.shadowColor='rgba(0,0,0,.12)'; X.shadowBlur=30; X.shadowOffsetY=10; rr(-165,-60,330,120,60); X.fillStyle=C_.white; X.fill(); X.shadowColor='transparent';
    X.strokeStyle='#4285F4'; X.lineWidth=5; X.beginPath(); X.arc(100,-6,20,0,7); X.stroke(); X.beginPath(); X.moveTo(114,8); X.lineTo(130,24); X.stroke();
    X.fillStyle='#202124'; X.font='500 36px "Rubik"'; X.textAlign='center'; X.textBaseline='middle'; X.fillText('Google',-20,0); X.restore(); } });
/* 9 — شريط بحث جوجل على كلامه، على الورق */
SK.panel(17.82,25.40,(lt)=>{ const t=17.82+lt, q=SK.span('سعر','الشهري،');
  SK.search(t,{ y:300, inAt:W_('لجوجل'), query:q, searchAt:q[q.length-1].e+0.15,
    result:{ at:W_('والنتيجة'), icon:'claude', url:'claude.com › pricing', title:'Claude Pro — الاشتراك الشهري',
      price:{ from:0, to:20, prefix:'$', suffix:'شهرياً', at:W_('سعر',24), dur:0.5 } } }); });
/* 10 — «بس كلود مش رح يعملّك أي شغلة… بدون ما تعلّمه»: شريحة */
SK.panel(25.40,28.52,(lt)=>{ const t=25.40+lt;
  SK.slideText(t,{at:25.45, l1:'بس كلود مش رح يعملّك', y:820, color:'#F4EFE6', s1:70});
  SK.slideText(t,{at:W_('بدون'), l1:'', l2:'بدون ما تعلّمه', y:900, color2:'#D6E0E2', s2:120}); });
/* 11 — «سوّيتها سكيل… مع طريقة تثبيتها»: تيرمنال تثبيت حقيقي */
SK.panel(28.52,32.28,(lt)=>{ const t=28.52+lt; SK.headline(t,{at:W_('سوّيتها')-0.05, l1:'سوّيتها سكيل', l2:'مع طريقة تثبيتها', at2:W_('طريقة'), y:280, size:84});
  SK.terminal(t-28.7,110,560,860,560,[{t:'$ unzip paper-reel-style.zip',c:'#D6E0E2'},{t:'$ cp -r paper-reel-style ~/.claude/skills/'},{t:''},{t:'> /skills',c:'#D6E0E2'},{t:'  ✓ split-reel-style'},{t:'  ✓ paper-reel-style'},{t:''},{t:'✓ skill installed — جاهز',c:'#9FD3A8'}],{cps:60,start:0.3,bg:'#162A2C'}); });
/* 12 — «مجاني لأول عشرة… وبيعلّقوا بكلمة»: الدعوة فوق الراس (السقف الفاضي) — ⛔ ما في نص على الوجه */
SK.panel(32.28,35.54,(lt)=>{ const t=32.28+lt;
  SK.slideText(t,{at:W_('مجاني'), l1:'مجاناً لأول 10', l2:'', y:290, color:'#FFFFFF', s1:60, stroke:'#000'});
  if(t>=W_('وبيعلّقوا')){ const k=back(Math.min(1,(t-W_('وبيعلّقوا'))/0.35)); X.save(); X.translate(540,330); X.scale(k,k);
    X.font='800 84px "Rubik"'; X.textAlign='center'; X.textBaseline='middle'; X.lineJoin='round';
    X.direction='rtl'; X.strokeStyle='#000'; X.lineWidth=7; X.strokeText('علّق',105,0); X.fillStyle='#FFFFFF'; X.fillText('علّق',105,0);
    X.direction='ltr'; X.strokeText('edit',-80,0); X.fillStyle='#FFE14D'; X.fillText('edit',-80,0); X.restore();
    SK.chevrons(t,{at:W_('وبيعلّقوا')+0.2, y:410, color:'#FFE14D'}); } });
/* 13 — فولو بكرت البروفايل على الورق */
SK.panel(35.54,99,(lt)=>{ const t=35.54+lt; SK.follow(t,{ inAt:W_('كرم')-0.1, tapAt:W_('فتنساش')+0.25, y:160 }); });
