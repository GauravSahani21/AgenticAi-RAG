const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
(async () => {
 const browser = await chromium.launch({channel:'msedge', headless:true});
 try {
 const page = await browser.newPage({viewport:{width:390,height:844}, reducedMotion:'reduce'});
 const errors=[]; page.on('pageerror', error=>errors.push(error.message));
 const user={id:'u1',name:'Test Student',role:'STUDENT',email:'test@example.edu'};
 const topics=['Embeddings','Vector Databases'].map((name,i)=>({id:'t'+i,subject_id:'s1',name,module:'Module 1',difficulty:'BEGINNER'}));
 const subjects=[{id:'s1',name:'Generative AI',code:'CS401',topics}];
 let fail=false, noSources=false;
 const requests=[];
 await page.addInitScript(({user})=>{localStorage.setItem('token','ui-test-token');localStorage.setItem('user',JSON.stringify(user));},{user});
 await page.route('**/api/**', async route=>{
  const path=new URL(route.request().url()).pathname;
  let data;
  if(path==='/api/auth/me') data=user;
  else if(path==='/api/student/overview') data={available_subjects:1,available_topics:2,user};
  else if(path==='/api/subjects') data=subjects;
  else if(path==='/api/assessment/states') data=[];
  else if(path==='/api/tutor/chat') {
   requests.push(route.request().postDataJSON());
   if(fail) return route.fulfill({status:503,json:{detail:'Test service unavailable'}});
   data={response:'Embeddings represent meaning using vectors.',session_id:'session-1',action:'EXPLAIN',strategy_label:'Explanation',grounded:!noSources,grounding_status:noSources?'General background':'Grounded',sources:noSources?[]:[{document:'embeddings-lecture-notes.txt',page:2,section:'Vector representations',snippet:'This is the complete retrieved passage. '.repeat(20)+'END OF EVIDENCE',similarity_score:0.85}]};
  } else return route.fulfill({status:404,json:{detail:'Unexpected test endpoint'}});
  return route.fulfill({json:data});
 });
 await page.goto(process.env.TEST_BASE_URL || 'http://127.0.0.1:5175/student');
 await page.getByRole('button',{name:'Interactive Tutor',exact:true}).click();
 const input=page.getByRole('textbox',{name:'Message to course tutor'});
 await input.fill('What is an embedding?');
 await page.getByRole('button',{name:'Send message',exact:true}).click();
 await page.getByText('Course evidence (1)',{exact:false}).waitFor();
 await page.getByText('Read retrieved passage',{exact:true}).click();
 await page.getByRole('blockquote').waitFor();
 assert.match(await page.getByRole('blockquote').innerText(),/END OF EVIDENCE/);
 assert.equal(await page.getByText('85% match',{exact:true}).count(),0);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'Tutor mobile overflow');
 if(process.env.TEST_SCREENSHOT) await page.screenshot({path:process.env.TEST_SCREENSHOT,fullPage:true});
 await page.getByLabel('Tutor topic').selectOption('t1');
 assert.equal(await page.getByText('Embeddings represent meaning using vectors.',{exact:true}).count(),0,'Old conversation cleared on topic change');
 await input.fill('Explain this topic');
 await page.getByRole('button',{name:'Send message',exact:true}).click();
 await page.getByText('Embeddings represent meaning using vectors.',{exact:true}).waitFor();
 assert.equal(requests.at(-1).topic_id,'t1');
 assert.equal(requests.at(-1).session_id,undefined,'New topic must not reuse old session');
 fail=true;
 await input.fill('Keep my failed question');
 await page.getByRole('button',{name:'Send message',exact:true}).click();
 await page.getByRole('alert').waitFor();
 assert.equal(await input.inputValue(),'Keep my failed question');
 fail=false; noSources=true;
 await page.getByRole('button',{name:'Send message',exact:true}).click();
 await page.getByText('No course passages were returned for this response.',{exact:false}).waitFor();
 assert.equal(await input.getAttribute('maxlength'),'2000');
 assert.deepEqual(errors,[]);
 console.log('PASS: complete evidence, metadata, honest grounding, mobile overflow, scope/session reset, failed draft recovery, no-source response, API input limit, no browser exceptions. Fixtures used.');
 } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exit(1)});
