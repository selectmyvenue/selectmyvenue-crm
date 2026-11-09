const {JSDOM}=require('jsdom');
// jsdom does not implement browser scrolling; keep navigation assertions deterministic.

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'dashboard.html'),'utf8');
const script=fs.readFileSync(path.join(root,'smv-business-os.js'),'utf8');
const css=fs.readFileSync(path.join(root,'smv-business-os.css'),'utf8');
assert(html.includes('smv-business-os.css')&&html.includes('smv-business-os.js'),'dashboard loads Business OS assets');
assert(css.includes('@media(max-width:600px)'),'hub has a narrow-phone layout');
const dom=new JSDOM(html,{url:'https://crm.selectmyvenue.com/dashboard.html',runScripts:'outside-only',pretendToBeVisual:true});
dom.window.HTMLElement.prototype.scrollIntoView=function(){};
const w=dom.window,d=w.document;
w.eval(script);d.dispatchEvent(new w.Event('DOMContentLoaded'));
assert.equal(d.querySelectorAll('#smvBusinessOS').length,0,'no oversized Business OS dashboard on the lead homepage');
const hub=d.getElementById('smvBusinessOSHub');
assert(hub,'feature hub mounts');
assert(hub.hidden,'feature hub stays off the homepage by default');
assert(d.getElementById('smvAccountBusinessOSBtn'),'Account menu exposes Business OS');
assert.equal(hub.querySelectorAll('.smv-hub-card').length,9,'all nine distinct feature destinations are present');
d.getElementById('smvAccountBusinessOSBtn').click();
assert.equal(hub.hidden,false,'Account menu Business OS button opens the hub');
assert.equal(d.querySelector('.crm-main').hidden,true,'opening the hub hides the lead workspace without removing it');
hub.querySelector('[data-hub-action="home"]').click();
assert.equal(hub.hidden,true,'back action closes the hub');
assert.equal(d.querySelector('.crm-main').hidden,false,'back action restores Customer Enquiries');
const mobileMenu=d.createElement('div');mobileMenu.id='smvMobileMoreMenu';mobileMenu.className='smv-mobile-more-menu';mobileMenu.innerHTML='<button data-smv-more="venues">Venues</button>';d.body.appendChild(mobileMenu);
d.defaultView.MutationObserver; 
// The mutation observer adds a phone-menu entry when the mobile More menu is created.
returnPromise();
function returnPromise(){return new Promise(resolve=>w.requestAnimationFrame(()=>{assert(mobileMenu.querySelector('[data-smv-more="business-os"]'),'phone More menu exposes Business OS');mobileMenu.querySelector('[data-smv-more="business-os"]').click();assert.equal(hub.hidden,false,'phone More menu opens Business OS');console.log('PASS Business OS hub: lead-first homepage, desktop launcher, all feature cards, return navigation and mobile More access');resolve();}));}
