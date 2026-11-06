const {chromium}=require('playwright');(async()=>{const b=await chromium.launch();
for(const [w,h,cs,t] of [[1280,800,'light','d'],[390,844,'dark','m']]){const c=await b.newContext({viewport:{width:w,height:h},colorScheme:cs,deviceScaleFactor:1.5});const p=await c.newPage();
const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
await p.goto('file:///home/claude/landing/react/index.html');await p.waitForTimeout(1200);
await p.evaluate(()=>scrollTo(0,document.documentElement.scrollHeight));await p.waitForTimeout(1500);
await p.screenshot({path:'leg_foot_'+t+'.png'});
await p.click('footer a:has-text("Mentions légales")');await p.waitForTimeout(2200);
console.log(t,await p.evaluate(()=>({h:document.querySelector('h1').textContent,hs:document.documentElement.scrollWidth>innerWidth,todos:document.querySelectorAll('mark.todo').length})));
await p.screenshot({path:'leg_m_'+t+'.png'});
await p.click('footer a:has-text("Politique")');await p.waitForTimeout(2200);
console.log(t,await p.evaluate(()=>document.querySelector('h1').textContent));
await p.screenshot({path:'leg_p_'+t+'.png',fullPage:true});
console.log(errs);await c.close()}
await b.close();})();
