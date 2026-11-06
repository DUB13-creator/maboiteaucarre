const {chromium}=require('playwright');(async()=>{const b=await chromium.launch();
const c=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:1.5});const p=await c.newPage();
await p.goto('file:///home/claude/landing/react/index.html');await p.waitForTimeout(1200);
await p.click('.hero .btn');await p.waitForTimeout(2500);
for(let i=0;i<6;i++){await p.locator('.opt').nth(1).click();await p.waitForTimeout(1500)}
await p.waitForTimeout(2500);
await p.fill('input[name=prenom]','Test');await p.fill('input[name=activite]','Menuisier');await p.fill('input[name=telephone]','0612345678');
await p.evaluate(()=>document.querySelector('.consent-link').scrollIntoView({block:'center'}));await p.waitForTimeout(800);
await p.click('.consent-link');await p.waitForTimeout(900);
await p.screenshot({path:'dlg.png'});
console.log(await p.evaluate(()=>({open:document.querySelector('dialog.policy').open})));
await p.click('dialog .btn');await p.waitForTimeout(500);
console.log(await p.evaluate(()=>({open:document.querySelector('dialog.policy').open,prenom:document.querySelector('input[name=prenom]').value})));
await b.close();})();
