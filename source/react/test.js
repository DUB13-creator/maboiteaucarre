const {chromium}=require('playwright');
(async()=>{
const b=await chromium.launch();
for(const reduced of [false,true]){
  const ctx=await b.newContext({viewport:{width:1280,height:800},reducedMotion:reduced?'reduce':'no-preference'});
  const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>m.type()==='error'&&errs.push(m.text()));
  let posted=null; await p.route('https://api.web3forms.com/submit', r=>{posted=r.request().postDataJSON(); r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({success:true})});});
  await p.goto('file:///home/claude/landing/react/index.html'); 
  await p.waitForTimeout(150);
  const early=await p.evaluate(()=>({h1:getComputedStyle(document.querySelector('.hero h1')).opacity, tr:getComputedStyle(document.querySelector('.hero h1')).transform}));
  await p.waitForTimeout(2600);
  const late=await p.evaluate(()=>({h1:getComputedStyle(document.querySelector('.hero h1')).opacity,count:document.querySelector('[data-count]').textContent,words:document.querySelectorAll('#srh .sr-w').length}));
  // scroll
  for(let y=0;y<9000;y+=500){await p.mouse.wheel(0,500);await p.waitForTimeout(120)}
  await p.waitForTimeout(800);
  const cells=await p.evaluate(()=>[...document.querySelectorAll('.cell,.offer,.faq details')].map(e=>+getComputedStyle(e).opacity).filter(o=>o<0.99).length);
  console.log(reduced?'REDUCE':'NORMAL',JSON.stringify({early,late,faintAfterScroll:cells}),errs);
  await p.evaluate(()=>scrollTo(0,0)); await p.waitForTimeout(500);
  if(!reduced){await p.screenshot({path:'s-top.png'});}
  // quiz
  await p.click('.hero .btn');
  for(let i=0;i<6;i++){await p.waitForSelector('#qtitle'); await p.waitForTimeout(350); await p.click('.opt >> nth=1'); await p.waitForTimeout(500);}
  await p.waitForSelector('#rtitle'); 
  console.log('result:',await p.textContent('#rtitle'), await p.textContent('.score'));
  await p.fill('#f-name','Test'); await p.fill('#f-nom','Dupont'); await p.fill('#f-mail','test@exemple.fr'); await p.fill('#f-job','Plombier'); await p.fill('#f-tel','0601020304'); await p.check('#f-ok');
  await p.click('button[type=submit]'); await p.waitForSelector('#tt'); await p.waitForTimeout(300);
  console.log('posted:',JSON.stringify(posted));console.log('thanks:',await p.textContent('#tt'),'|',await p.textContent('#thanks .sub'), errs);
  if(!reduced) await p.screenshot({path:'s-thanks.png'});
  await ctx.close();
}
// mobile
const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:1});
const p=await ctx.newPage(); await p.goto('file:///home/claude/landing/react/index.html'); await p.waitForTimeout(2500);
await p.screenshot({path:'s-mobile.png'});
console.log('hscroll',await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth));
await b.close();})();
