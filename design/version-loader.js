'use strict';
const versions=Object.fromEntries(Array.from(document.getElementById('productVersion').options,o=>[o.value,o.text]));
const query=new URLSearchParams(location.search);
if(query.get('version')==='pico-box'){
 const url=new URL(location.href);
 url.searchParams.set('version','empty');query.set('version','empty');
 history.replaceState(null,'',url);
}
const version=Object.hasOwn(versions,query.get('version'))?query.get('version'):document.getElementById('productVersion').options[0].value;
const picker=document.getElementById('productVersion');
picker.value=version;
if(version==='timer-mailbox')document.getElementById('model').classList.add('mailbox-workspace');
const hierarchyView = ['empty','pico-lockbox'].includes(version);
if(hierarchyView)document.getElementById('model').classList.add('empty-workspace');
if(version==='pico-lockbox') document.getElementById('model').classList.add('lockbox-workspace');
if(version==='slider15'){
 document.getElementById('viewer').dataset.poster='window';
 document.getElementById('partViewer').dataset.poster='board';
}
picker.onchange=()=>{
 const url=new URL(location.href);
 url.searchParams.set('version',picker.value);
 location.assign(url.href);
};
const englishPage = document.documentElement.lang === 'en';
document.getElementById('versionSummary').textContent=(englishPage ? 'Loading ' : '正在加载 ')+versions[version]+'…';
const script=document.createElement('script');script.src='versions/'+version+'.js?v=rect-window-29';
script.onerror=()=>{document.getElementById('versionSummary').textContent=englishPage ? 'Could not load the model. Reload to try again.' : '模型加载失败，请检查 versions 文件夹是否完整。';};
let rearPrintLoading;
window.ensureRearPrint=()=>{
 if(version!=='slider15')return Promise.resolve();
 if(!rearPrintLoading)rearPrintLoading=new Promise((resolve,reject)=>{
  const layers=document.createElement('script');layers.src='versions/rearshell-print-layers.js?v=assembly-units-20261117';
  layers.onerror=()=>reject(new Error('打印数据加载失败'));
  layers.onload=()=>{const detailed=document.createElement('script');detailed.src='rearshell-print.js?v=assembly-units-20261117';detailed.onload=resolve;detailed.onerror=()=>reject(new Error('打印动画加载失败'));document.body.appendChild(detailed);};document.body.appendChild(layers);
 }).catch(error=>{rearPrintLoading=null;throw error;});
 return rearPrintLoading;
};
script.onload=()=>{
 window.CONFIG=PRODUCT_DATA.config;window.PARTS=PRODUCT_DATA.parts;window.MISSING=PRODUCT_DATA.missing;
 document.title=CONFIG.title+' | Phone Lock';
 document.getElementById('versionSummary').textContent=CONFIG.description;
 if(CONFIG.nativePath)document.getElementById('nativeModel').href=CONFIG.nativePath;
 document.getElementById('gearsView').textContent=CONFIG.driveType==='slider'?'偏心轮与滑动锁舌':'齿轮传动';
 const viewer=document.createElement('script');viewer.src='viewer.js?v=rect-window-29';
 viewer.onload=()=>{
  if(CONFIG.viewerOnly){
   const mailbox=document.createElement('script');mailbox.src=hierarchyView?'main-view.js':'mailbox-view.js';
   mailbox.onerror=()=>{document.querySelector('.viewerPanel h2').textContent=englishPage ? 'Could not load the 3D viewer.' : '定时投递箱视图加载失败';};
   document.body.appendChild(mailbox);return;
  }
  if (CONFIG.layoutRevision === 'InvertedPerf29') {
   mountPlacementEditor();
   if (query.get('view') === 'layout') {
    document.getElementById('editPlacement').click();
    if (matchMedia('(max-width:1100px)').matches)
     requestAnimationFrame(()=>document.getElementById('detailTitle').scrollIntoView({block:'start'}));
   }
  }
  const assembly=document.createElement('script');assembly.src='assembly.js?v=rect-window-29';assembly.onload=()=>{const motor=document.createElement('script');motor.async=false;motor.src='motor-assembly.js?v=rect-window-29';document.body.appendChild(motor);const guide=document.createElement('script');guide.async=false;guide.src='manufacturing.js?v=slider15-wiring';guide.onload=()=>{window.ensureProcessAssets?.();};guide.onerror=()=>{document.getElementById('craftTitle').textContent='Process guide could not load — check manufacturing.js';};document.body.appendChild(guide);};document.body.appendChild(assembly);};
 viewer.onerror=()=>{document.getElementById('status').textContent=englishPage ? 'Could not load the viewer controls. Reload to try again.' : '控制程序加载失败，请刷新页面。';};
 document.body.appendChild(viewer);
};
async function loadModel() {
 if (version === 'pico-lockbox') {
  for (const file of ['empty', 'pico-lockbox-mechanics', 'button-window']) {
   await new Promise((resolve,reject) => {
    const dependency = document.createElement('script');
    dependency.src = 'versions/' + file + '.js';
    dependency.onload = resolve;
    dependency.onerror = reject;
    document.body.appendChild(dependency);
   });
  }
 }
 document.body.appendChild(script);
}
loadModel().catch(script.onerror);



