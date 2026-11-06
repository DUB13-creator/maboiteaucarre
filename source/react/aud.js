const {chromium}=require('playwright');(async()=>{const b=await chromium.launch();
const w=+process.argv[2]||390;
const c=await b.newContext({viewport:{width:w,height:844},deviceScaleFactor:1.5});const p=await c.newPage();
await p.goto('file:///home/claude/landing/react/index.html');await p.waitForTimeout(1500);
const H=await p.evaluate(()=>document.documentElement.scrollHeight);
for(let y=0;y<H;y+=500){await p.evaluate(y=>scrollTo(0,y),y);await p.waitForTimeout(350)}
await p.evaluate(()=>scrollTo(0,0));await p.waitForTimeout(800);
const issues=await p.evaluate(()=>{const W=innerWidth,out=[];
document.querySelectorAll('#landing *').forEach(e=>{const r=e.getBoundingClientRect();if(!r.width||!r.height)return;const cs=getComputedStyle(e);if(cs.position==='fixed')return;
if(e.closest('.deco,.wipe,[aria-hidden=true]'))return;
if(r.right>W+1||r.left<-1){if(e.children.length===0||e.tagName==='BUTTON'||e.tagName==='A')out.push(['hors-écran',e.tagName,e.className&&e.className.toString().slice(0,30),(e.textContent||'').trim().slice(0,30),Math.round(r.left),Math.round(r.right)])}
if(e.scrollWidth>e.clientWidth+2&&cs.overflow!=='visible'&&cs.overflowX!=='visible'&&!['HTML','BODY'].includes(e.tagName))out.push(['tronqué',e.tagName,e.className.toString().slice(0,30),e.scrollWidth,e.clientWidth])});
return out.slice(0,40)});
console.log(w,H,JSON.stringify(issues,null,0));
await p.screenshot({path:`m${w}.png`,fullPage:true});
await b.close();})();
