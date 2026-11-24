// Organize the existing tools without duplicating their controls or state.
(()=>{
 const $=id=>document.getElementById(id),middle=document.querySelector('.middle');
 const sidebar=document.querySelector('aside'),directoryToggle=document.createElement('button');
 const english = document.documentElement.lang === 'en';
 const showParts = english ? 'Show parts' : '部件目录 · 展开', hideParts = english ? 'Hide parts' : '部件目录 · 收起';
 directoryToggle.id='directoryToggle';directoryToggle.textContent=showParts;directoryToggle.setAttribute('aria-expanded','false');directoryToggle.setAttribute('aria-controls','parts');
 directoryToggle.onclick=()=>{const open=sidebar.classList.toggle('directory-open');directoryToggle.setAttribute('aria-expanded',String(open));directoryToggle.textContent=open?hideParts:showParts;};sidebar.prepend(directoryToggle);
 const views=document.querySelector('.viewports'),motion=views.nextElementSibling,notice=motion.nextElementSibling;
 const nav=document.createElement('nav');nav.className='workspace-tabs';nav.setAttribute('aria-label','工作区');nav.setAttribute('role','tablist');
 const panels={};
 for(const [id,title] of [['model','模型查看'],['process','制作流程'],['info','部件资料'],['notes','修改备注']]){
  const panel=document.createElement('section');panel.id='workspace-'+id;panel.className='workspace-panel';panel.setAttribute('role','tabpanel');panel.setAttribute('aria-labelledby','tab-'+id);panels[id]=panel;
  const b=document.createElement('button');b.id='tab-'+id;b.textContent=title;b.setAttribute('role','tab');b.setAttribute('aria-controls',panel.id);
  b.onclick=()=>activate(id);b.onkeydown=e=>{const all=[...nav.children],i=all.indexOf(b);let n;if(e.key==='ArrowRight')n=(i+1)%all.length;if(e.key==='ArrowLeft')n=(i+all.length-1)%all.length;if(e.key==='Home')n=0;if(e.key==='End')n=all.length-1;if(n!==undefined){e.preventDefault();all[n].click();all[n].focus();}};
  nav.append(b);middle.append(panel);
 }
 middle.prepend(nav);
 const detail=$('detailTitle').closest('.viewerPanel');
 const shortcuts=$('isolate').parentElement;
 shortcuts.classList.add('view-shortcuts');
 shortcuts.setAttribute('role','group');
 shortcuts.setAttribute('aria-label',english ? 'Model views and tools' : '模型视图与工具');
 document.querySelector('.workspace-bar').insertBefore(shortcuts,$('nativeModel'));
 panels.model.append(views,motion,notice);
 // Keep playback next to the assembly when the two viewers stack.
 const stacked=window.matchMedia('(max-width:1100px)');
 function placeMotionControls(){
  if(stacked.matches) views.firstElementChild.after(motion);
  else views.after(motion);
 }
 stacked.addEventListener('change',placeMotionControls);
 placeMotionControls();
 const selector=$('craftPart').parentElement;selector.className='process-selector';panels.process.append(selector,$('craftPanel'));
 panels.info.append($('doc'));const board=document.querySelector('.board');panels.notes.append(board);board.append($('allDrafts'));
 const pending=board.querySelector('details');panels.info.append(pending);
 // Fit is included in reset; keep a single visible camera action in each viewport.
 $('fit').hidden=true;$('partFit').hidden=true;
 $('craftRestart').textContent='重播';
 function syncShortcuts(){
  const model=window.activeWorkspaceTab==='model';
  for(const button of shortcuts.querySelectorAll('button')){
   if(['partFit','partReset'].includes(button.id))continue;
   const wiring=button.id==='openSlider15Wiring';
   const active=wiring ? window.activeWorkspaceTab==='process'&&$('processMode')?.value==='wiring'
    : model&&button.classList.contains('active');
   button.setAttribute('aria-pressed',String(active));
  }
 }
 window.syncViewShortcuts=syncShortcuts;
 new MutationObserver(syncShortcuts).observe(shortcuts,{childList:true,subtree:true,attributes:true,attributeFilter:['class','aria-expanded']});
 shortcuts.addEventListener('click',event=>{
  const button=event.target.closest('button');
  if(!button||button.id==='openSlider15Wiring')return;
  if(window.activeWorkspaceTab!=='model')activate('model');
  if(button.id==='partReset'&&$('editPlacement')?.getAttribute('aria-expanded')==='true')view('board');
  if(stacked.matches)requestAnimationFrame(()=>{
   panels.model.scrollTop+=detail.getBoundingClientRect().top-panels.model.getBoundingClientRect().top;
  });
 },true);
 function activate(id){
  if(id!=='model'&&$('editPlacement')?.getAttribute('aria-expanded')==='true')view('board');
  window.activeWorkspaceTab=id;
  for(const [key,p] of Object.entries(panels)){
   p.hidden=key!==id;
   const b=$('tab-'+key);b.classList.toggle('active',key===id);b.setAttribute('aria-selected',String(key===id));b.tabIndex=key===id?0:-1;
  }
  syncShortcuts();
  if(id==='process')window.ensureProcessAssets?.();
 }
 activate('model');

 const projectNav=document.querySelector('.project-nav');
 const projectLinks=Array.from(projectNav.querySelectorAll('a'));
 function showProjectSection(){
  const current=projectLinks.find(link=>link.hash===location.hash) || projectLinks[0];
  for(const link of projectLinks){
   const selected=link===current;
   if(selected) link.setAttribute('aria-current','page');
   else link.removeAttribute('aria-current');
   $(link.hash.slice(1)).hidden=!selected;
  }
 }
 window.addEventListener('hashchange',showProjectSection);
 showProjectSection();
})();
