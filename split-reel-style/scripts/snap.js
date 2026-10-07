/* snap.js — يصوّر موقع أو صفحة HTML محلية لصورة PNG (للقطات الشاشة لما المستخدم ما عنده)
   node snap.js <out.png> <url|file.html> [عرض=1440] [طول=900] [انتظار_ms=2500] [scale=1]
   مثال: node snap.js assets/stitch.png https://stitch.withgoogle.com 1440 900 4000 */
const path=require('path'), fs=require('fs');
let pup; for(const p of [path.join(__dirname,'..','node_modules','puppeteer-core'),'puppeteer-core']){ try{ pup=require(p); break; }catch(e){} }
if(!pup){ console.error('❌ puppeteer-core مو مثبّت: cd split-reel-style && npm install'); process.exit(2); }
function chrome(){ const LA=process.env.LOCALAPPDATA||'', PF=process.env.ProgramFiles||'C:/Program Files', P86=process.env['ProgramFiles(x86)']||'C:/Program Files (x86)';
  for(const c of [process.env.CHROME_PATH,PF+'/Google/Chrome/Application/chrome.exe',P86+'/Google/Chrome/Application/chrome.exe',LA+'/Google/Chrome/Application/chrome.exe',
    PF+'/Microsoft/Edge/Application/msedge.exe',P86+'/Microsoft/Edge/Application/msedge.exe','/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'])
    if(c&&fs.existsSync(c)) return c; throw new Error('ما لقيت كروم'); }
(async()=>{ const [out,src,w='1440',h='900',wait='2500',sc='1']=process.argv.slice(2);
  const [fp,qs]=src.split('?'), url=/^https?:/.test(src)?src:'file:///'+path.resolve(fp).replace(/\\/g,'/')+(qs?'?'+qs:'');
  const b=await pup.launch({executablePath:chrome(),headless:'new',args:['--no-sandbox','--allow-file-access-from-files','--force-color-profile=srgb']});
  const p=await b.newPage(); await p.setViewport({width:+w,height:+h,deviceScaleFactor:+sc});
  try{ await p.goto(url,{waitUntil:'networkidle2',timeout:90000}); }catch(e){ console.log('⚠️ ما خلص التحميل كامل — بصوّر اللي ظاهر'); }
  await new Promise(r=>setTimeout(r,+wait)); await p.screenshot({path:out}); await b.close(); console.log('✅',out); })();
