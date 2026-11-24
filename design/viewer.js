'use strict';
const $=id=>document.getElementById(id),CFG=window.CONFIG,STROKE=CFG.boltStroke;
$('bolt').max=STROKE;$('hinge').max=CFG.openingMax;
let selected=PARTS[0],angle=0,bolt=STROKE,playing=false,time=0,last=0;
let shellTransparent=CFG.driveType!=='slider',shellOpacity=.18;
const SLIDER=CFG.driveType==='slider';
const portraitLayout=CFG.layoutRevision==='InvertedPerf29';
let fitRequest=0, fitLoad, fitAssembly;
const fitButtons=new Map();
const fitDownload='../output/cad/slider15/Slider15-FIT0302-ePaper.FCStd';
const mechanismNames=new Set(['MountScrew3','MountScrew4','CamSetScrew','MotorCradle','MotorFaceScrew1','MotorFaceScrew2','MotorBody','MotorGearbox','MotorOutputShaft','DriveCam','EccentricPin','LockHead','LockGuideTrack','LockTrackScrew1','LockTrackScrew2','LockGuideInsert1','LockGuideInsert2','LockSlider','SliderGuide1','SliderGuide2','LockKeeper','LockKeeperScrew1','LockKeeperScrew2','CamMagnet','PositionSensor1','PositionSensor2']);
if(CFG.layoutRevision==='InvertedPerf29')mechanismNames.add('MotorShim');
const shellNames=new Set(['RearShellFit','LidShellFit','ElectronicsCarrier','InnerCoverPanel','LockHousing']);
// Bounding corners conservatively enclose every vertex under our rigid transforms.
// Camera fitting does not need to walk the full tessellated model on every drag.
function fitVertices(p){if(!p.fitCorners){const b=p.bounds;p.fitCorners=[];for(const x of [b[0],b[3]])for(const y of [b[1],b[4]])for(const z of [b[2],b[5]])p.fitCorners.push([x,y,z]);}return p.fitCorners;}
const storageKey='phone-lock-prompts-'+CFG.version+'-v1';let drafts={};let storageOK=true;
try{drafts=JSON.parse(localStorage.getItem(storageKey)||'{}');if(!drafts||Array.isArray(drafts)||typeof drafts!=='object')drafts={};}catch(e){storageOK=false;drafts={};}
// Keep user drafts accessible when CAD objects are revised.
for(const [oldName,newName] of [['RearShellPocket','RearShellFit'],['LidShellPocket','LidShellFit'],['PhoneReference_80x166x12','PhoneReference_iPhone17Pro']])if(typeof drafts[oldName]==='string' && !(newName in drafts))drafts[newName]=drafts[oldName];
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function save(){drafts[selected.name]=$('prompt').value;try{localStorage.setItem(storageKey,JSON.stringify(drafts));storageOK=true;}catch(e){storageOK=false;}$('saveStatus').textContent=storageOK?'Draft saved in this browser':'Browser storage unavailable — download your drafts';}
function download(name,text,type='text/plain'){const u=URL.createObjectURL(new Blob([text],{type})),a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);}
const treeOpen=new Map();
function partCategory(p){
 const n=p.name;
 if(n==='ElectronicsCarrier')return '外壳与支撑';
 if(/PhoneReference/.test(n))return '手机参考模型';
 if(/Ear|PinA|Hinge/.test(n))return '铰链与转轴';
 if(/^Display(Header|HATHeader)/.test(n)&&CFG.wiringRevision)return '电路与供电';
 if(/^(Display|Button)/.test(n))return '电路与供电';
 if(/^(Electronics|Controller|MainPCB|Battery|MotorWire|MotorConnector|SensorConnector|MainDisplay)/.test(n))return '电路与供电';
 if(/^(LockMotor|Motor)/.test(n))return '电机与安装座';
 if(CFG.version==='slider15'&&/^MountScrew[34]$/.test(n))return '锁止与传动';
 if(/^(Lock|DriveCam|CamSetScrew|Eccentric|Slider|CamMagnet|PositionSensor)/.test(n))return '锁止与传动';
 if(/Screw|Mount/.test(n))return '紧固件';
 return '外壳与支撑';
}
const partLabels={LockHead:'锁头滑块',LockGuideTrack:'封闭导槽',LockTrackScrew1:'导槽螺丝 1',LockTrackScrew2:'导槽螺丝 2',LockGuideInsert1:'支架铜螺母 1',LockGuideInsert2:'支架铜螺母 2',SliderGuide1:'加强导座 1',SliderGuide2:'加强导座 2',LockKeeperScrew1:'锁扣内侧螺丝 1',LockKeeperScrew2:'锁扣内侧螺丝 2',HingePinGuard:'防退件',HingeGuardInsert1:'防退螺母 1',HingeGuardInsert2:'防退螺母 2',HingeGuardScrew1:'防退螺丝 1',HingeGuardScrew2:'防退螺丝 2',LowerHingeBracket:'下铰链座',UpperHingeBracket:'上铰链座',LowerHingeInsert1:'下铰链铜螺母 1',LowerHingeInsert2:'下铰链铜螺母 2',UpperHingeInsert1:'上铰链铜螺母 1',UpperHingeInsert2:'上铰链铜螺母 2',LowerHingeScrew1:'下铰链沉头螺丝 1',LowerHingeScrew2:'下铰链沉头螺丝 2',UpperHingeScrew1:'上铰链沉头螺丝 1',UpperHingeScrew2:'上铰链沉头螺丝 2',RearShellFit:'下壳',LidShellFit:'上壳',InnerCoverPanel:'内盖板',ClearWindow:'透明观察窗',LockKeeper:'锁扣座',LockBolt:'固定锁销',LockRotaryLatch:'旋转锁盘',LockSlider:'滑动锁舌',DriveCam:'偏心轮',EccentricPin:'偏心销',MainPCB:'主电路板',DisplayPCB:'屏幕电路板',DisplayReference:'数字显示屏',DisplayBezel:'屏幕面框',MotorBody:'电机',MotorGearbox:'减速箱',MotorOutputShaft:'电机输出轴',MotorCradle:'电机支架',PhoneReference_iPhone17Pro:'iPhone 17 Pro 参考模型'};
function partLabel(p){
 if(CFG.layoutRevision==='InvertedPerf29'&&(p.purchasedModule||p.name==='ClearWindow'))return p.title;
 if(p.componentVertexRanges||p.name==='LidShellFit'&&p.title.includes('integral')||p.name==='DriveCam'&&p.title.includes('integral'))return p.title;
 if(['Waveshare13890','Waveshare14657'].includes(CFG.displayModule)&&/^(Display|Button)/.test(p.name))return p.title;return partLabels[p.name]||p.title;}
function assemblyName(p){
 if(p.group==='HingeBridge'||/Ear|PinA|Hinge/.test(p.name))return '铰链';
 return p.group==='FrontCover'?'上壳':'下壳';
}
function electronicsPath(p){
 const n=p.name;
 if(CFG.layoutRevision==='InvertedPerf29'){
  if(n.startsWith('Display'))return '2.9″ 三色墨水屏／纵装';
  if(n.startsWith('Battery'))return 'EEMB 电池与固定';
  if(n==='ElectronicsPerfboard')return '洞洞板与固定';
 }
 if(/^ElectronicsOLED|^Display(Header|HATHeader)/.test(n))return 'OLED 接线/'+(p.wiringGroup||(CFG.displayModule==='Waveshare14657'?'四芯插头':'40针接口'));
 if(/^(Display|Button)/.test(n))return CFG.displayModule==='Waveshare14657'?'屏幕':'屏幕与按键';
 if(p.portLocations)return 'Pico 主控';
 if(/^ElectronicsPico/.test(n))return 'Pico 主控/'+(/Pad/.test(n)?'焊盘':'模块');
 if(/^ElectronicsUSBService/.test(n))return 'Pico 主控/外部调试接口';
 if(/^ElectronicsRTC/.test(n))return 'RTC 时钟';
 if(/^ElectronicsCharger/.test(n))return 'USB-C 充电';
 if(p.purchasedModule==='AkygaAKY0638')return '锂电池与保护/Akyga AKY0638 整套电池';
 if(/^BatteryAdapter/.test(n))return '锂电池与保护/SYP 转 PH2 接线';
 if(/^Battery/.test(n))return '锂电池与保护/固定与测温';
 if(/^Electronics(MotorDriver|Driver)/.test(n))return '电机驱动';
 if(/^ElectronicsWire/.test(n))return (CFG.carrierRevision?'正面接线/':'顶板布线/')+(p.wiringGroup||'电源');
 if(/^Electronics(InlineFuse|BlockingDiode|DiodeBand|ProtectionLeads)/.test(n))return '电源保护';
 if(/^ElectronicsOutputPlug/.test(n))return 'USB-C 充电/OUT 接线';
 if(/^ElectronicsMotorTerminal/.test(n))return '电机接线';
 if(/^Electronics(Carrier|Retainer)/.test(n))return '托盘与固定';
 if(/Reserve/.test(n))return '配电焊接区';
 return '其它线束';
}
function selectStructure(key,title){
 const [assembly,category,...sub]=key.split('/');
 const parts=key==='product'?PARTS:PARTS.filter(p=>assemblyName(p)===assembly&&(!category||partCategory(p)===category)&&(!sub.length||(electronicsPath(p)+'/').startsWith(sub.join('/')+'/')));
 const item={name:'assembly:'+key,title:key==='product'?'手机壳':[assembly,category,...sub].filter(Boolean).join(' / '),id:'总成',parts,
 status:'结构组合 · '+parts.length+' 个部件',role:'按原装配位置组合显示全部下属部件。',
 dimensions:'包含 '+parts.length+' 个部件',interfaces:'保留各部件之间的相对位置，可旋转和缩放查看。',
 design:parts.map(partLabel).join('、'),checks:'用于结构检查；不代表实体布尔合并或加工认证。',
 prompt:'版本：'+CFG.title+'\n结构：'+key+'\n包含部件：'+parts.map(p=>p.name).join('、')+'\n希望修改：\n约束与尺寸：'};
 select(item);
}

function list(){
 const q=$('search').value.trim().toLowerCase(),groups=new Map();let count=0;
 for(const p of PARTS){const assembly=assemblyName(p),category=partCategory(p);
 if(q&&![p.name,p.title,p.id,partLabel(p),assembly,category,electronicsPath(p)].join(' ').toLowerCase().includes(q))continue;
 if(!groups.has(assembly))groups.set(assembly,new Map());const categories=groups.get(assembly);
 if(!categories.has(category))categories.set(category,[]);categories.get(category).push(p);count++;}
 function branch(title,key,children,total,depth){
 const group=document.createElement('div'),row=document.createElement('div'),toggle=document.createElement('button'),label=document.createElement('button'),body=document.createElement('div');
 const stateKey=q?'search:'+q+':'+key:key,open=treeOpen.has(stateKey)?treeOpen.get(stateKey):(q?true:depth<=1),active=selected.name==='assembly:'+key;
 group.className='part-group';row.className='tree-row'+(active?' active':'');body.className='tree-children';body.hidden=!open;
 toggle.className='tree-toggle';toggle.textContent=open?'▾':'▸';toggle.setAttribute('aria-label',(open?'收起 ':'展开 ')+title);toggle.setAttribute('aria-expanded',String(open));toggle.onclick=()=>{treeOpen.set(stateKey,!open);list();};
 label.className='tree-label';label.setAttribute('aria-pressed',String(active));label.innerHTML=esc(title)+`<span>${total} 个部件</span>`;label.title='选择并显示整个结构';label.onclick=()=>selectStructure(key,title);
 row.replaceChildren(toggle,label);body.replaceChildren(...children);group.replaceChildren(row,body);return group;
 }

 const roots=[];
 for(const assembly of ['上壳','铰链','下壳']){if(!groups.has(assembly))continue;const categories=groups.get(assembly),branches=[];let total=0;
 function leaf(p){const row=document.createElement('div'),spacer=document.createElement('span'),b=document.createElement('button');row.className='tree-row'+(p===selected?' active':'');spacer.className='tree-spacer';b.className='tree-label';b.setAttribute('aria-pressed',String(p===selected));b.title=p.name;b.innerHTML=esc(partLabel(p))+`<span>${esc(p.id+' · '+p.name)}</span>`;b.onclick=()=>select(p);row.replaceChildren(spacer,b);return row;}
 function detailTree(parts,prefix,level){const children=[],buckets=new Map();for(const p of parts){const name=electronicsPath(p).split('/')[level];if(!name){children.push(leaf(p));continue;}if(!buckets.has(name))buckets.set(name,[]);buckets.get(name).push(p);}for(const [name,members] of buckets)children.push(branch(name,prefix+'/'+name,detailTree(members,prefix+'/'+name,level+1),members.length,level+3));return children;}
 for(const [category,parts] of categories){total+=parts.length;const key=assembly+'/'+category;const buttons=category==='电路与供电'?detailTree(parts,key,0):parts.map(leaf);branches.push(branch(category,key,buttons,parts.length,2));}

 roots.push(branch(assembly,assembly,branches,total,1));}
 const position=$('parts').scrollTop;$('parts').replaceChildren(...(roots.length?[branch('手机壳','product',roots,count,0)]:[]));$('parts').scrollTop=position;
 $('count').textContent=`${count} / ${PARTS.length} 个部件`;
}

function select(p){selected=p;list();$('doc').innerHTML=`<span class="pill">${esc(p.status)}</span><h2>${esc(p.title)}</h2><p>${esc(p.id+' / '+p.name)}</p>`+[['功能','role'],['名义尺寸','dimensions'],['连接与间隙','interfaces'],[p.parts?'包含部件':'待完善设计','design'],['待验证项目','checks']].map(([title,key])=>`<h3>${title}</h3><p>${esc(p[key])}</p>`).join('');$('promptPart').textContent=p.id+' / '+p.title;$('prompt').value=typeof drafts[p.name]==='string'?drafts[p.name]:p.prompt;$('saveStatus').textContent=storageOK?(p.name in drafts?'已恢复本地备注':'编辑后自动保存在本浏览器'):'Browser storage unavailable — download your drafts';view('isolated');draw();window.updateCraft?.(p);}
$('search').oninput=list;$('prompt').oninput=save;
$('copy').onclick=async()=>{try{await navigator.clipboard.writeText($('prompt').value);$('saveStatus').textContent='Prompt copied — paste it into the chat';}catch(e){$('prompt').focus();$('prompt').select();$('saveStatus').textContent='Press Ctrl+C to copy the selected prompt';}};
$('download').onclick=()=>download(selected.name.replace(/[\\/:*?"<>|]/g,'-')+'-prompt.txt',$('prompt').value);
$('allDrafts').onclick=()=>{save();download('phone-lock-prompts.json',JSON.stringify({version:1,exported:new Date().toISOString(),drafts},null,2),'application/json');};
$('template').onclick=()=>{if(confirm('Replace this part’s draft with the starter prompt?')){$('prompt').value=selected.prompt;save();}};
$('missing').innerHTML=MISSING.map(([t,s])=>`<p><strong>${esc(t)}</strong><br>${esc(s)}</p>`).join('');
function rotate(p,a,z){let t=a*Math.PI/180,x=p[0]-CFG.hingeX,d=p[2]-z;return[CFG.hingeX+x*Math.cos(t)-d*Math.sin(t),p[1],z+x*Math.sin(t)+d*Math.cos(t)];}
const KEYHOLE=['HeadedKeyhole-Y-v1','SidewallKeyhole-Y8-v2','ClosedSidewall-XY-v3','InwardRegular-XY-v4'].includes(CFG.lockRevision);
const LOCK_TRAVEL=CFG.lockTravel||3;
function sliderRetraction(s){return LOCK_TRAVEL/2*(1-Math.cos(Math.PI*s));}
function drivePoint(p,part,s){if(SLIDER){const v=p.slice(),t=Math.max(0,Math.min(1,s));
 if(part.motionRole==='head2'){const dy=sliderRetraction(t);v[1]-=dy;v[0]-=2.3*(1-Math.max(0,Math.min(1,(LOCK_TRAVEL-dy)/.8)));}
 if(part.motionRole==='slider')v[KEYHOLE?1:0]-=sliderRetraction(t);
 if(part.motionRole==='cam'){const a=Math.PI*t,z=v[2]-(CFG.camAxisZ||19);
  if(KEYHOLE){const y=v[1]-CFG.camY;v[1]=CFG.camY+y*Math.cos(a)+z*Math.sin(a);v[2]=(CFG.camAxisZ||19)-y*Math.sin(a)+z*Math.cos(a);}
  else{const x=v[0]-22;v[0]=22+x*Math.cos(a)+z*Math.sin(a);v[2]=(CFG.camAxisZ||19)-x*Math.sin(a)+z*Math.cos(a);}
 }return v;}let v=p.slice(),t=Math.max(0,s-CFG.releaseTravel),role=part.motionRole||'fixed';
 if(role==='bolt'){v[1]+=Math.min(t,CFG.boltSlide);v[2]+=Math.max(0,t-CFG.boltSlide);}
 if(role==='cam')v[1]+=t;
 if(['motor','gear_a','gear_b'].includes(role)){const axes={motor:[CFG.motorX,CFG.motorY,4860],gear_a:[CFG.gearAX,CFG.gearAY,-1620],gear_b:[CFG.gearBX,CFG.gearBY,540]},[cx,cy,deg]=axes[role],a=deg*Math.min(1,t)*Math.PI/180,x=v[0]-cx,y=v[1]-cy;v[0]=cx+x*Math.cos(a)-y*Math.sin(a);v[1]=cy+x*Math.sin(a)+y*Math.cos(a);}
 if(role==='rotor'){const a=-Math.PI*Math.min(1,t),x=v[0]-CFG.rotorX,y=v[1]-CFG.rotorY;v[0]=CFG.rotorX+x*Math.cos(a)-y*Math.sin(a);v[1]=CFG.rotorY+x*Math.sin(a)+y*Math.cos(a);}
 if(role==='screw'){const a=2*Math.PI*t/CFG.screwPitch,x=v[0]-CFG.screwAxisX,z=v[2]-CFG.screwAxisZ;v[0]=CFG.screwAxisX+x*Math.cos(a)-z*Math.sin(a);v[2]=CFG.screwAxisZ+x*Math.sin(a)+z*Math.cos(a);}
 return v;}
function world(p,part,a=angle,s=bolt){let v=drivePoint(p,part,s);a=Math.max(0,Math.min(CFG.openingMax,a));if(part.group==='FrontCover')v=rotate(v,a*CFG.rotationRatio,CFG.axisB);if(part.group!=='FixedCase')v=rotate(v,a*CFG.rotationRatio,CFG.axisA);return v;}
// Per-part selection styles keep purchased materials readable. Weld duplicate
// face vertices before extracting creases, so triangulation diagonals stay hidden.
const highlightCache=new WeakMap();
function highlightStyle(part){
 const n=part.name;
 if(/Wire|Harness|Lead/.test(n))return {type:'wire',color:[.95,.48,.08],width:2.6,crease:.15};
 if(/Screw|Pin|Insert|Shaft|Bolt/.test(n))return {type:'hardware',color:[.72,.35,.94],width:2,crease:.5};
 if(/PCB|Pico|Driver|Charger|OLED|Display/.test(n))return {type:'electronics',color:[0,.68,.82],width:1.8,crease:.7};
 if(/Battery/.test(n))return {type:'battery',color:[.10,.65,.48],width:2,crease:.7};
 return {type:'structure',color:[.08,.52,.95],width:2,crease:.86};
}
function highlightGeometry(part){
 if(highlightCache.has(part))return highlightCache.get(part);
 const weld=new Map(),ids=part.vertices.map(v=>{const k=v.map(x=>Math.round(x*10000)).join(',');if(!weld.has(k))weld.set(k,weld.size);return weld.get(k);});
 const edges=new Map(),normals=[];
 part.faces.forEach((f,fi)=>{const a=part.vertices[f[0]],b=part.vertices[f[1]],c=part.vertices[f[2]],u=b.map((x,i)=>x-a[i]),v=c.map((x,i)=>x-a[i]),n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]],len=Math.hypot(...n)||1;normals.push(n.map(x=>x/len));
  for(let j=0;j<3;j++){const a=f[j],b=f[(j+1)%3],ia=ids[a],ib=ids[b];if(ia===ib)continue;const key=ia<ib?ia+':'+ib:ib+':'+ia;if(!edges.has(key))edges.set(key,{a,b,faces:[]});edges.get(key).faces.push(fi);}
 });
 const style=highlightStyle(part),result={style,edges:[...edges.values()].map(e=>({...e,sharp:e.faces.length!==2||normals[e.faces[0]].reduce((sum,x,i)=>sum+x*normals[e.faces[1]][i],0)<style.crease}))};
 highlightCache.set(part,result);return result;
}
const CAD_VIEWS={front:{label:'Front',direction:[0,-1,0]},back:{label:'Back',direction:[0,1,0]},left:{label:'Left',direction:[-1,0,0]},right:{label:'Right',direction:[1,0,0]},top:{label:'Top',direction:[0,0,1]},bottom:{label:'Bottom',direction:[0,0,-1]}};
function setCadView(view,direction){const [x,y,z]=direction,len=Math.hypot(x,y,z);view.yaw=Math.abs(x)+Math.abs(y)<1e-9?0:Math.atan2(-x,-y);view.tilt=Math.asin(z/len);view.fit();}
function orbitCadView(view,dx,dy,sensitivity){
 // Wrap angles rather than clamping at the top/bottom poles.
 const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
 view.yaw=wrap(view.yaw+dx*sensitivity);
 view.tilt=wrap(view.tilt+dy*sensitivity);
}
class ViewCube{
 constructor(view){
  this.view=view;this.host=document.createElement('div');this.host.className='cad-viewcube';this.host.setAttribute('aria-label','View cube');
  this.host.innerHTML='<svg viewBox="0 0 112 104" role="group" aria-label="Click a face to change view"></svg><div class="cube-tools"><button type="button" aria-label="Rotate view left 90 degrees">↶</button><button type="button" aria-label="Isometric view">◇</button><button type="button" aria-label="Rotate view right 90 degrees">↷</button></div><div class="cube-directions" role="group" aria-label="Standard views">'+Object.entries(CAD_VIEWS).map(([k,v])=>'<button type="button" data-direction="'+k+'" aria-label="'+v.label+' view" aria-pressed="false">'+v.label+'</button>').join('')+'</div>';
  view.canvas.parentElement.style.position='relative';view.canvas.parentElement.appendChild(this.host);this.svg=this.host.querySelector('svg');
  const buttons=this.host.querySelectorAll('.cube-tools button');buttons[0].onclick=()=>{view.yaw-=Math.PI/2;view.fit();};buttons[1].onclick=()=>setCadView(view,[1,-1,1]);buttons[2].onclick=()=>{view.yaw+=Math.PI/2;view.fit();};
  this.host.querySelectorAll('[data-direction]').forEach(button=>{button.onclick=()=>setCadView(view,CAD_VIEWS[button.dataset.direction].direction);});
  let drag=null,moved=false,face=null;this.svg.onpointerdown=e=>{face=e.target.closest('[data-view]')?.getAttribute('data-view');drag=[e.clientX,e.clientY];moved=false;this.svg.setPointerCapture(e.pointerId);};
  this.svg.onpointermove=e=>{if(!drag)return;const dx=e.clientX-drag[0],dy=e.clientY-drag[1];if(Math.abs(dx)+Math.abs(dy)>2)moved=true;orbitCadView(view,dx,dy,.012);drag=[e.clientX,e.clientY];view.fit(false);};
  this.svg.onpointerup=e=>{drag=null;if(!moved&&CAD_VIEWS[face])setCadView(view,CAD_VIEWS[face].direction);if(moved){this.blockClick=true;setTimeout(()=>this.blockClick=false,0);}};this.svg.onpointercancel=()=>{drag=null;};
 }
 update(){
  const signature=this.view.kind+':'+this.view.yaw+':'+this.view.tilt;if(signature===this.signature)return;this.signature=signature;
  const v=this.view,ns='http://www.w3.org/2000/svg',make=(tag,attrs)=>{const el=document.createElementNS(ns,tag);for(const [k,val]of Object.entries(attrs))el.setAttribute(k,val);return el;};
  const faces=[['front',[[-1,-1,-1],[1,-1,-1],[1,-1,1],[-1,-1,1]]],['back',[[1,1,-1],[-1,1,-1],[-1,1,1],[1,1,1]]],['left',[[-1,1,-1],[-1,-1,-1],[-1,-1,1],[-1,1,1]]],['right',[[1,-1,-1],[1,1,-1],[1,1,1],[1,-1,1]]],['top',[[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]]],['bottom',[[-1,1,-1],[1,1,-1],[1,-1,-1],[-1,-1,-1]]]];
  const nodes=[];
  for(const [key,coords]of faces){const def=CAD_VIEWS[key],depth=v.project(def.direction)[2];if(depth<.001)continue;const pts=coords.map(p=>v.project(p)),group=make('g',{role:'button',tabindex:0,'aria-label':def.label+' view','data-view':key,class:'cube-face'});const poly=make('polygon',{points:pts.map(p=>(56+p[0]*25)+','+(49-p[1]*25)).join(' '),fill:depth>.99?'#d5e8f1':depth>.6?'#eef5f8':'#dfe8ec'});const text=make('text',{x:56+pts.reduce((a,p)=>a+p[0],0)*6.25,y:53-pts.reduce((a,p)=>a+p[1],0)*6.25,'text-anchor':'middle'});text.textContent=def.label;group.append(poly,text);group.onclick=()=>{if(!this.blockClick)setCadView(v,def.direction);};group.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();setCadView(v,def.direction);}};nodes.push(group);}
  this.svg.replaceChildren(...nodes);
  const current=Object.entries(CAD_VIEWS).find(([,d])=>v.project(d.direction)[2]>.9999);this.host.querySelectorAll('[data-direction]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.direction===current?.[0])));
 }
}

// Keep board labels on the original board/pouch when its connector or flying lead extends farther.
const componentBoundsCache=new WeakMap();
function componentBounds(part,name){
 const range=part.componentVertexRanges?.[name];
 if(!range)return part.bounds;
 let cache=componentBoundsCache.get(part);
 if(!cache){cache=new Map();componentBoundsCache.set(part,cache);}
 if(!cache.has(name)){
  const [start,count]=range,b=[Infinity,Infinity,Infinity,-Infinity,-Infinity,-Infinity];
  for(let i=start;i<start+count;i++)for(let axis=0;axis<3;axis++){
   const x=part.vertices[i][axis];b[axis]=Math.min(b[axis],x);b[axis+3]=Math.max(b[axis+3],x);
  }
  cache.set(name,b);
 }
 return cache.get(name);
}
const electronicsNames={ElectronicsCarrier:'电路底板',ElectronicsPicoPCB:'Pico 主控板',ElectronicsMotorDriver:'DRV8838 电机驱动板',ElectronicsChargerPCB:'USB-C 充电板',DisplayOLED14657:'Waveshare 0.91″ OLED',BatteryLiPo:'AKY0638 锂电池',MotorBody:'Pololu 992 减速电机',ElectronicsInlineFuse:'F1 保险丝（包络）',ElectronicsBlockingDiode:'D1 防倒灌二极管',PositionSensor1:'位置传感器 1（预留）',PositionSensor2:'位置传感器 2（预留）',BatteryNTC:'电池温度探头'};
class ElectronicsLabels{
 constructor(view){this.view=view;this.host=document.createElement('div');this.host.className='electronics-labels';this.host.hidden=true;this.svg=document.createElementNS('http://www.w3.org/2000/svg','svg');this.select=document.createElement('select');this.select.setAttribute('aria-label','查看电路部件名称');this.host.append(this.svg,this.select);view.canvas.parentElement.append(this.host);this.select.onchange=()=>{this.signature=null;view.draw();};}
 update(){const v=this.view;this.host.hidden=v.kind!=='electronics';if(this.host.hidden)return;const parts=v.visible(),w=v.canvas.clientWidth,h=v.canvas.clientHeight;if(!w||!h)return;
 if(this.parts!==parts.map(p=>p.name).join('|')){this.parts=parts.map(p=>p.name).join('|');this.select.replaceChildren();const all=document.createElement('option');all.value='';all.textContent='部件名称 · 总览';this.select.append(all);for(const p of parts){const o=document.createElement('option');o.value=p.name;o.textContent=CFG.layoutRevision==='InvertedPerf29'?partLabel(p):electronicsNames[p.name]||partLabel(p);this.select.append(o);}}
 const sig=[v.yaw,v.tilt,v.zoom,...v.center,v.baseScale,w,h,this.select.value].join(':');if(sig===this.signature)return;this.signature=sig;
 const targets=this.select.value?parts.filter(p=>p.name===this.select.value):parts.filter(p=>electronicsNames[p.name]);
 const make=(tag,attrs)=>{const e=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const[k,val]of Object.entries(attrs))e.setAttribute(k,val);return e;};
 this.svg.setAttribute('viewBox','0 0 '+w+' '+h);this.svg.replaceChildren();
 const shortNames={ElectronicsCarrier:'电路底板',ElectronicsPicoPCB:'Pico',ElectronicsMotorDriver:'DRV8838',ElectronicsChargerPCB:'USB-C 充电板',DisplayOLED14657:'OLED 0.91″',BatteryLiPo:'AKY0638',MotorBody:'Pololu 992',ElectronicsInlineFuse:'F1 保险丝',ElectronicsBlockingDiode:'D1 二极管',PositionSensor1:'传感器 1',PositionSensor2:'传感器 2',BatteryNTC:'温度探头'};
 for(const p of targets){const b=componentBounds(p,p.name),flip=CFG.orientationRevision==='InwardFaces-v1',z=p.name==='ElectronicsCarrier'?23.55:flip?b[2]-.04:b[5]+.04,x=p.name==='ElectronicsCarrier'?19:(b[0]+b[3])/2,y=p.name==='ElectronicsCarrier'?-65:(b[1]+b[4])/2,scale=v.baseScale*v.zoom;
 const project=q=>{const r=v.project(v.point(q,p));return [(r[0]-v.center[0])*scale+w/2,h/2-(r[1]-v.center[1])*scale,r[2]];};
 const o=project([x,y,z]),a=project([x+(flip?-1:1),y,z]),d=project([x,y-1,z]),normal=project([x,y,z+(flip?-1:1)]);if(normal[2]-o[2]<.08)continue;
 const portrait=CFG.layoutRevision==='InvertedPerf29',full=portrait?partLabel(p):electronicsNames[p.name]||partLabel(p),text=portrait?full.split(' · ')[0]:shortNames[p.name]||full;
 const chars=[...text].reduce((n,c)=>n+(c.charCodeAt(0)>255?1:.58),0),size=Math.min(13,Math.max(6,(b[3]-b[0])*.84*scale/Math.max(chars,1)));
 const sx=(a[0]-o[0])/scale,sy=(a[1]-o[1])/scale,tx=(d[0]-o[0])/scale,ty=(d[1]-o[1])/scale;
 const group=make('g',{transform:'matrix('+[sx,sy,tx,ty,o[0],o[1]].join(' ')+')'});
 const width=chars*size+6;group.append(make('rect',{x:-width/2,y:-size*.68,width,height:size*1.4,rx:2,fill:'#152d25dd'}));
 const label=make('text',{x:0,y:0,'text-anchor':'middle','dominant-baseline':'central','font-size':size,'font-weight':600,fill:'#ffffff'});label.textContent=text;const title=make('title',{});title.textContent=full;group.append(label,title);this.svg.append(group);
 }

 }
}

class ModelView{
 constructor(id,kind,tag){this.canvas=$(id);this.kind=kind;this.tag=$(tag);this.yaw=-.45;this.tilt=.85;this.zoom=1;this.center=[0,0];this.depth=0;this.baseScale=1;this.drag=null;this.gl=kind==='print'?null:this.canvas.getContext('webgl',{antialias:true});
 const gl=this.gl;if(gl){const shader=(type,src)=>{const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;};const prog=gl.createProgram();gl.attachShader(prog,shader(gl.VERTEX_SHADER,'attribute vec3 position;attribute vec3 color;varying vec3 col;void main(){gl_Position=vec4(position,1.0);col=color;}'));gl.attachShader(prog,shader(gl.FRAGMENT_SHADER,'precision mediump float;varying vec3 col;uniform float opacity;void main(){gl_FragColor=vec4(col,opacity);}'));gl.linkProgram(prog);if(!gl.getProgramParameter(prog,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(prog));gl.useProgram(prog);this.opacityUniform=gl.getUniformLocation(prog,'opacity');gl.uniform1f(this.opacityUniform,1);this.buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);for(const[n,o]of[['position',0],['color',12]]){let a=gl.getAttribLocation(prog,n);gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,3,gl.FLOAT,false,24,o);}gl.enable(gl.DEPTH_TEST);}
 const c=this.canvas;c.onpointerdown=e=>{this.drag=[e.clientX,e.clientY];c.setPointerCapture(e.pointerId);};c.onpointermove=e=>{if(!this.drag)return;orbitCadView(this,e.clientX-this.drag[0],e.clientY-this.drag[1],.008);this.drag=[e.clientX,e.clientY];if(!this.pendingFit){this.pendingFit=true;requestAnimationFrame(()=>{this.pendingFit=false;this.fit(false);});}};c.onpointerup=c.onpointercancel=()=>this.drag=null;c.addEventListener('wheel',e=>{e.preventDefault();this.zoom=Math.max(.3,Math.min(6,this.zoom*Math.exp(-e.deltaY*.001)));this.draw();},{passive:false});new ResizeObserver(()=>this.fit(false)).observe(c);if(c.parentElement && kind!=='print'){this.navigation=new ViewCube(this);this.labels=new ElectronicsLabels(this);}
 }
 visible(){
  if(this.kind==='window')return PARTS.filter(p=>p.name==='LidShellFit'||p.name==='ClearWindow'||p.name.startsWith('Display'));
  if(this.kind==='board')return PARTS.filter(p=>/^(Electronics|Display|PerfMountScrew)/.test(p.name));
  if(this.studyParts)return this.studyParts;if(SLIDER&&['lock','gears'].includes(this.kind))return PARTS.filter(p=>mechanismNames.has(p.name));if(this.kind==='electronics')return PARTS.filter(p=>/^(Electronics|Display|Controller|Battery|MotorWire|Sensor|PositionSensor)/.test(p.name)||['MainPCB','MotorBody','MotorGearbox','LockMotorCan','LockMotorShaft'].includes(p.name));return this.kind==='full'?PARTS:this.kind==='gears'?PARTS.filter(p=>p.name.startsWith('Lock')&&!['LockHousing','LockGearCarrierPlate','LockMotorCan','LockMotorFrontCap','LockMotorRearCap'].includes(p.name)):this.kind==='lock'?PARTS.filter(p=>p.name.startsWith('Lock')):this.kind==='electronics'?PARTS.filter(p=>p.name.startsWith('Electronics')||['LockMotorCan','LockMotorShaft'].includes(p.name)):(selected.parts||[selected]);}
 point(v,p,a=angle,s=bolt){
  if(this.usesPlacementDraft && p.layoutOffset)v=[v[0]+p.layoutOffset[0],v[1]+p.layoutOffset[1],v[2]];
  const q=this.kind==='trial'?drivePoint(v,p,s):['isolated','window','board','print'].includes(this.kind)?v:['lock','electronics','gears'].includes(this.kind)?world(v,p,0,s):world(v,p,a,s);
  return this.kind==='electronics'&&CFG.orientationRevision==='InwardFaces-v1'?[-q[0],q[1],-q[2]]:q;
 }
 project(v){let[x,y,z]=v,a=x*Math.cos(this.yaw)-y*Math.sin(this.yaw),b=x*Math.sin(this.yaw)+y*Math.cos(this.yaw);return[a,b*Math.sin(this.tilt)+z*Math.cos(this.tilt),-b*Math.cos(this.tilt)+z*Math.sin(this.tilt)];}
 fit(resetZoom=true){if(resetZoom)this.zoom=1;const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];const poses=this.kind==='full'&&!this.closedFraming?[0,45,90,135,180]:[0];for(const a of poses)for(const s of [0,STROKE])for(const p of this.visible())for(const v of fitVertices(p)){const q=this.project(this.point(v,p,a,s));for(let i=0;i<3;i++){min[i]=Math.min(min[i],q[i]);max[i]=Math.max(max[i],q[i]);}}this.center=min.map((v,i)=>(v+max[i])/2);this.baseScale=.78*Math.min(this.canvas.clientWidth/Math.max(1,max[0]-min[0]),this.canvas.clientHeight/Math.max(1,max[1]-min[1]));this.draw();}
 reset(){if(portraitLayout&&['window','board','full'].includes(this.kind)){this.yaw=-.10;this.tilt=1.34;this.fit();return;}this.yaw=['lock','gears'].includes(this.kind)?-.35:-.45;this.tilt=['lock','gears'].includes(this.kind)?1.05:.85;this.fit();}
 draw(){this.navigation?.update();this.labels?.update();this.tag.textContent=!this.gl?'静态预览 · WebGL 不可用':this.kind==='window'?'上盖外侧 · 透明窗':this.kind==='board'?'洞洞板 · 元件面':this.studyParts?(this.studyTitle||'Slider15 · FIT0302 / e-Paper'):this.kind==='full'?(shellTransparent?'FULL PRODUCT · TRANSPARENT SHELL':'整机 · 轮廓高亮为当前选择'):this.kind==='gears'?(SLIDER?'ECCENTRIC CAM · '+LOCK_TRAVEL+' mm SLIDER':'27:1 · THREE-STAGE GEAR DRIVE'):this.kind==='lock'?'LOCK · OPEN SURFACE VIEW':this.kind==='electronics'?'PCB · MOTOR · WIRING ALLOCATIONS':(selected.parts?selected.title+' · '+selected.parts.length+' 个部件':selected.id+' · '+selected.name);if(!this.gl){
  const poster=portraitLayout&&(this.kind==='board'?'board':['window','full'].includes(this.kind)?'window':'');
  if(this.canvas.dataset){
   if(poster)this.canvas.dataset.poster=poster;
   else delete this.canvas.dataset.poster;
  }
  this.tag.textContent=poster?'静态预览 · '+(poster==='board'?'洞洞板元件面':'上盖透明窗'):'3D 视图需要 WebGL';
  return;
 }
 if(this.canvas.dataset?.poster)delete this.canvas.dataset.poster;
 const gl=this.gl,c=this.canvas,w=c.clientWidth,h=c.clientHeight,d=Math.min(devicePixelRatio||1,2);if(!w||!h)return;if(c.width!==Math.round(w*d)||c.height!==Math.round(h*d)){c.width=Math.round(w*d);c.height=Math.round(h*d);}gl.viewport(0,0,c.width,c.height);gl.clearColor(.902,.922,.886,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);const verts=[],translucent=[],selectionEdges=[],scale=this.baseScale*this.zoom;gl.depthMask(true);gl.disable(gl.BLEND);gl.uniform1f(this.opacityUniform,1);
 for(const part of this.visible()){const customOpacity=CFG.layoutRevision==='InvertedPerf29'&&part.name==='ClearWindow' ? .22 : this.studyParts && part.name==='DisplayInnerLens' ? .22 : this.studyParts && part.name==='DisplayRoofSection' ? .20 : this.partOpacity?.(part);const transparent=customOpacity!==undefined?customOpacity<.999:(shellTransparent&&part.name==='ElectronicsCarrier')||this.transparentPart?.(part)||(this.kind==='full'&&((shellTransparent&&shellNames.has(part.name))||part.name==='ClearWindow'));const p=part.vertices.map(v=>this.project(this.point(v,part)));let rgb=part.kind==='phone'?[.16,.22,.2]:part.kind==='bolt'?[.95,.52,.12]:part.group==='FrontCover'?[.67,.72,.62]:part.group==='HingeBridge'?[.35,.52,.57]:[.40,.56,.47];if(part.kind==='display')rgb=[.26,.44,.34];if(['cam','rotor'].includes(part.motionRole))rgb=[.25,.6,.75];if(part.motionRole==='gear_a')rgb=[.87,.65,.24];if(part.motionRole==='gear_b')rgb=[.68,.42,.2];if(part.motionRole==='motor')rgb=[.73,.44,.25];if(part.motionRole==='bolt')rgb=[.95,.52,.12];if(part.name.includes('Reference')&&part.name.startsWith('Lock'))rgb=[.5,.43,.64];if(part.name==='ElectronicsPCB')rgb=[.1,.55,.3];if(part.name.includes('WirePlus'))rgb=[.85,.13,.1];if(part.name.includes('WireMinus'))rgb=[.13,.16,.19];if(part.name==='ElectronicsBatteryReference')rgb=[.3,.42,.62];if(part.name.startsWith('Electronics')&&part.name.includes('Connector'))rgb=[.85,.85,.75];if(['ElectronicsMCU','ElectronicsMotorDriver','ElectronicsPower'].includes(part.name))rgb=[.16,.18,.2];for(const [faceIndex,f] of part.faces.entries()){if(part.colors?.[faceIndex])rgb=part.colors[faceIndex];if(this.kind==='lock'&&['LockHousing','LockKeeper'].includes(part.name)&&f.every(i=>part.vertices[i][0]<CFG.lockX-.001))continue;const t=f.map(i=>p[i]),u=t[1].map((x,i)=>x-t[0][i]),v=t[2].map((x,i)=>x-t[0][i]),n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]],l=Math.hypot(...n)||1,light=.52+.48*Math.abs((n[0]*.3+n[1]*.4+n[2]*.85)/l);const dest=transparent?[]:verts;for(const q of t)dest.push((q[0]-this.center[0])*scale*2/w,(q[1]-this.center[1])*scale*2/h,-(q[2]-this.center[2])/1200,...rgb.map(x=>x*light));if(transparent)translucent.push({depth:(t[0][2]+t[1][2]+t[2][2])/3,data:dest,opacity:customOpacity??this.previewOpacity??shellOpacity});}
 if(this.kind==='full'&&(part===selected||selected.parts?.includes(part))){
  const hg=highlightGeometry(part),facing=part.faces.map(f=>{const a=p[f[0]],b=p[f[1]],c=p[f[2]];return (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);});
  if(hg.style.type==='wire'&&part.routePoints?.length){const pts=part.routePoints.map(v=>this.project(this.point(v,part)));for(let i=1;i<pts.length;i++)selectionEdges.push([pts[i-1],pts[i],hg.style]);}
  else for(const e of hg.edges){const silhouette=e.faces.length===2&&facing[e.faces[0]]*facing[e.faces[1]]<0;if((hg.style.type!=='wire'&&e.sharp)||silhouette||e.faces.length===1)selectionEdges.push([p[e.a],p[e.b],hg.style]);}
 }
 }
 gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(verts),gl.DYNAMIC_DRAW);gl.drawArrays(gl.TRIANGLES,0,verts.length/6);
 this.lastDraw={opaqueTriangles:verts.length/18,transparentTriangles:translucent.length};
 if(translucent.length){
   translucent.sort((a,b)=>a.depth-b.depth);const glass=new Float32Array(translucent.length*18);translucent.forEach((t,i)=>glass.set(t.data,i*18));
   gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(false);gl.uniform1f(this.opacityUniform,this.previewOpacity??shellOpacity);
   gl.bufferData(gl.ARRAY_BUFFER,glass,gl.DYNAMIC_DRAW);for(let start=0;start<translucent.length;){let end=start+1;while(end<translucent.length&&translucent[end].opacity===translucent[start].opacity)end++;
   gl.uniform1f(this.opacityUniform,translucent[start].opacity);gl.drawArrays(gl.TRIANGLES,start*3,(end-start)*3);start=end;}
   gl.depthMask(true);gl.disable(gl.BLEND);gl.uniform1f(this.opacityUniform,1);
 }
 if(selectionEdges.length){
  const lines=[];
  for(const [a,b,style] of selectionEdges){const dx=(b[0]-a[0])*scale,dy=(b[1]-a[1])*scale,len=Math.hypot(dx,dy);if(len<.2)continue;const ox=-dy/len*style.width/2,oy=dx/len*style.width/2;
   const v=(q,x,y)=>[(q[0]-this.center[0])*scale*2/w+x*2/w,(q[1]-this.center[1])*scale*2/h+y*2/h,-(q[2]-this.center[2])/1200-.000035,...style.color];
   const aa=v(a,ox,oy),ab=v(a,-ox,-oy),ba=v(b,ox,oy),bb=v(b,-ox,-oy);lines.push(...aa,...ab,...ba,...ba,...ab,...bb);
  }
  gl.depthMask(false);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(lines),gl.DYNAMIC_DRAW);gl.drawArrays(gl.TRIANGLES,0,lines.length/6);gl.depthMask(true);
 }

 }
}
const productView=CFG.viewerOnly?null:new ModelView('viewer','full','viewtag'),partView=CFG.viewerOnly?null:new ModelView('partViewer','isolated','partViewtag');
if(productView)productView.usesPlacementDraft=partView.usesPlacementDraft=portraitLayout;
function draw(){productView.draw();partView.draw();}
function view(m){window.closePlacementEditor?.();clearFitStudy();
 if(portraitLayout){
  const board=m==='board',windowView=m==='window';
  $('screenView').classList.toggle('active',windowView);
  if(board||windowView){
   partView.kind=m;
   for(const id of ['isolate','lockview','gearsView','electronicsView'])$(id).classList.toggle('active',board&&id==='electronicsView');
   $('detailTitle').textContent=board?'矩形洞洞板布局':'上盖透明窗';
   $('detailHint').textContent=board?'元件朝窗，焊面朝手机 · 四角螺丝固定':'有效显示区四边各留 0.50 mm · 窗片从内侧安装';
   partView.reset();
   return;
  }
 }
 partView.kind=['lock','electronics','gears'].includes(m)?m:'isolated';for(const [id,k] of [['lockview','lock'],['electronicsView','electronics'],['gearsView','gears'],['isolate','isolated']])$(id).classList.toggle('active',partView.kind===k);$('detailTitle').textContent=m==='gears'?(SLIDER?'偏心轮与滑动锁舌 · '+LOCK_TRAVEL+' mm行程':'27:1 齿轮传动 · 剖开外罩'):m==='lock'?'锁机构':m==='electronics'?'电路板与接线':(selected.parts?selected.title+' · '+selected.parts.length+' 个部件':'所选部件');$('detailHint').textContent=m==='gears'?(SLIDER?(KEYHOLE?'合盖 → 横向导入封闭大孔 → 沿侧壁向摄像头锁定':'电机 → 偏心轮180° → 锁舌移动3 mm'):'电机 → 12:36 → 12:36 → 12:36 → 圆盘180° · 外罩与上支板隐藏'):m==='lock'?(SLIDER?'固定锁扣与滑动锁舌；断电保持待验证':'电机13.5圈 → 圆盘180° · 下锁柱固定'):m==='electronics'?'PCB → H-bridge → motor · paired wiring':(selected.parts?'完整结构组合 · 保留装配位置 · 拖动旋转，滚轮缩放':'静态检查 · 拖动旋转，滚轮缩放');partView.reset();if(m==='electronics')$('detailTitle').textContent='电路板与接线 · 元件面';}
$('gearsView').onclick=()=>view('gears');

function state(){
 angle=Math.max(0,Math.min(CFG.openingMax,angle));bolt=Math.max(0,Math.min(STROKE,bolt));
 if(angle>0)bolt=STROKE;
 if(portraitLayout && productView.closedFraming!==(angle===0&&!playing)){
  productView.closedFraming=angle===0&&!playing;
  productView.fit(false);
 }
 $('hinge').value=angle;$('bolt').value=bolt;$('angleLabel').textContent=Math.round(angle)+'°';
 $('boltLabel').textContent=SLIDER?(sliderRetraction(bolt)).toFixed(2)+' / '+LOCK_TRAVEL+' mm':Math.round(180*bolt)+' / 180°';
 $('hinge').disabled=bolt<.999;$('bolt').disabled=angle>.001;$('engage').disabled=angle>.001;
 $('openFlat').disabled=$('alignment').disabled=bolt<.999;
 const lock=bolt<.001?'已锁定':bolt<.999?'解锁机构运动中':'已解锁';
 $('status').textContent=CFG.title+' · '+lock+' · 开盖 '+Math.round(angle)+'° · '+(SLIDER?'锁舌退回 '+(sliderRetraction(bolt)).toFixed(2)+' mm':'圆盘 '+Math.round(180*bolt)+'° · 电机 '+(13.5*bolt).toFixed(2)+'圈 · 27:1');
 if(angle>=179.99)$('status').textContent+=' · '+CFG.alignment;
 $('play').textContent=playing?'暂停':'播放 / 继续';draw();
}
function bindShellControls(assembly, detail){
 const toggle=$('transparentShell'),slider=$('shellOpacity'),label=$('shellOpacityLabel');
 function sync(){
  toggle.classList.toggle('active',shellTransparent);
  toggle.setAttribute('aria-pressed',String(shellTransparent));
  toggle.textContent='外壳透明：'+(shellTransparent?'开':'关');
  slider.disabled=!shellTransparent;
  $('opacityControl').hidden=!shellTransparent;
  slider.value=Math.round(shellOpacity*100);
  label.textContent=slider.value+'%';
 }
 toggle.onclick=()=>{
  shellTransparent=!shellTransparent;
  sync();assembly.draw();detail?.draw();
 };
 slider.oninput=()=>{
  shellOpacity=Number(slider.value)/100;
  label.textContent=slider.value+'%';assembly.draw();
 };
 sync();
}
function stop(){playing=false;state();}
$('electronicsView').onclick=()=>view(portraitLayout?'board':'electronics');$('lockview').onclick=()=>view('lock');$('isolate').onclick=()=>view('isolated');$('fit').onclick=()=>productView.fit();$('reset').onclick=()=>productView.reset();$('partFit').onclick=()=>partView.fit();$('partReset').onclick=()=>partView.reset();
// Read the user's new value before rendering; stop() would restore the old value.
$('hinge').oninput=()=>{const value=+$('hinge').value;playing=false;time=0;if(bolt>=STROKE-.001)angle=value;state();};$('bolt').oninput=()=>{const value=+$('bolt').value;playing=false;time=0;if(angle<.001)bolt=value;state();};
for(const id of ['hinge','bolt'])$(id).onpointerdown=()=>{playing=false;$('play').textContent='播放';};
$('openFlat').onclick=()=>{if(bolt<.999)return;playing=false;time=0;angle=CFG.openingMax;state();};$('alignment').onclick=()=>{if(bolt<.999)return;playing=false;time=0;bolt=STROKE;angle=CFG.openingMax;productView.yaw=0;productView.tilt=0;productView.fit();state();};
$('closed').onclick=()=>{stop();time=0;angle=0;state();};$('unlock').onclick=()=>{stop();time=0;bolt=STROKE;state();};$('engage').onclick=()=>{stop();time=0;if(angle===0)bolt=0;state();};
$('animation').onchange=()=>{stop();time=0;};$('play').onclick=()=>{if(playing){stop();return;}if($('animation').value==='lock'){angle=0;if(!partView.studyParts)view('gears');}playing=true;last=performance.now();state();};
function frame(now){if(playing&&(!window.activeWorkspaceTab||window.activeWorkspaceTab==='model')&&now-last>=50){time+=Math.min((now-last)/1000,.1)*Number($('speed').value||1);let t=time%16,s=u=>.5-.5*Math.cos(Math.PI*Math.max(0,Math.min(1,u))),m=$('animation').value;if(m==='lock'){angle=0;bolt=STROKE/2-STROKE/2*Math.cos((time%8)*Math.PI/4);}else if(t<2){angle=0;bolt=m==='cycle'?STROKE*s(t/2):STROKE;}else if(t<7){angle=CFG.openingMax*s((t-2)/5);bolt=STROKE;}else if(t<8){angle=CFG.openingMax;bolt=STROKE;}else if(t<13){angle=CFG.openingMax*(1-s((t-8)/5));bolt=STROKE;}else{angle=0;bolt=m==='cycle'?STROKE*(1-s((t-13)/2)):STROKE;}state();last=now;}if(!playing)last=now;requestAnimationFrame(frame);}
if(!CFG.viewerOnly){
bindShellControls(productView,partView);selectStructure('product','手机壳');
if(portraitLayout){
 $('screenView').hidden=false;$('screenView').onclick=()=>view('window');
 $('electronicsView').textContent='洞洞板布局';
 productView.closedFraming=true;
 productView.reset();view('board');
}else productView.fit();
state();requestAnimationFrame(frame);
}


// Slider lock and drive shortcuts share the same geometry; expose one entry.
if(SLIDER){$('gearsView').hidden=true;$('lockview').textContent='锁止与传动';}

function clearFitStudy(){
 fitRequest++;
 if(!partView.studyParts)return;
 productView.studyParts=partView.studyParts=null;
 partView.studyTitle='';
 for(const button of fitButtons.values())button.classList.toggle('active',false);
 $('versionSummary').textContent=CFG.description;
 $('nativeModel').href=CFG.nativePath;
 $('nativeModel').textContent='下载当前版本 FreeCAD';
 productView.fit(false);
}

async function showFitStudy(mode){
 const request=++fitRequest;
 if(!fitLoad){
  fitLoad=new Promise((resolve,reject)=>{
   const tag=document.createElement('script');
   tag.src='versions/slider15-fit0302.js?v=fit0302-1';
   tag.onload=resolve;
   tag.onerror=()=>{tag.remove();reject(new Error('试装数据加载失败，请再点一次。'));};
   document.body.appendChild(tag);
  }).catch(error=>{fitLoad=null;throw error;});
 }
 try{await fitLoad;}catch(error){if(request===fitRequest)$('detailHint').textContent=error.message;return;}
 if(request!==fitRequest)return;
 const study=window.SLIDER15_FIT, meshes=study.meshes;
 if(!fitAssembly){
  for(const mesh of Object.values(meshes))mesh.colors=Array(mesh.faces.length).fill(mesh.color);
  const inherited=PARTS.filter(p=>!meshes[p.name]&&!p.name.startsWith('Display')&&!p.name.startsWith('ElectronicsOLED'));
  fitAssembly=inherited.concat(Object.values(meshes).filter(p=>!p.name.endsWith('RoofSection')));
 }
 const motor=mode==='motor';
 productView.studyParts=fitAssembly;
 partView.studyParts=motor
  ?fitAssembly.filter(p=>mechanismNames.has(p.name)||p.name==='MotorShim').concat(meshes.MotorRoofSection)
  :Object.values(meshes).filter(p=>p.name.startsWith('Display'));
 partView.kind='trial';
 partView.studyTitle=motor?'FIT0302 · 支架与偏心轮':'1.54″ 墨水屏 · 内装透明窗';
 $('detailTitle').textContent=partView.studyTitle;
 $('detailHint').textContent=motor?'拖动锁舌滑块查看 8 mm 行程。顶板剖片显示电机上方 0.30 mm 净空。':'拖动旋转查看驱动板、压片和接头预留。玻璃至透明窗名义间隙 0.40 mm。';
 for(const id of ['isolate','lockview','electronicsView','gearsView'])$(id).classList.toggle('active',false);
 for(const [key,button] of fitButtons)button.classList.toggle('active',mode===key);
 $('versionSummary').textContent='FIT0302 + Waveshare 12955 (1.54″ SPI) · Slider15 · 15 mm';
 $('nativeModel').href=fitDownload;
 $('nativeModel').textContent='下载试装总成 FreeCAD';
 partView.yaw=motor?-.6:-.25;
 partView.tilt=motor ? .48 : 1.15;
 partView.fit();productView.fit(false);
}
if(SLIDER && CFG.layoutRevision!=='InvertedPerf29' && $('lockview').parentElement){
 for(const [mode,label] of [['motor','FIT0302 试装'],['display','墨水屏试装']]){
  const button=document.createElement('button');button.textContent=label;
  button.onclick=()=>showFitStudy(mode);fitButtons.set(mode,button);
  $('lockview').parentElement.append(button);
 }
 document.querySelector('.workspace-tabs')?.addEventListener('click',()=>{
  if(window.activeWorkspaceTab!=='model' && (fitLoad||partView.studyParts))view('isolated');
 });
}

// Both starter-kit scenes also support software rendering.
class KitModelView extends ModelView {
    partOpacity(){return 1;}
    draw(){
      if(this.gl){super.draw();return;}
      // Render the same selectable meshes on browsers without WebGL.
      const c=this.canvas,ctx=c.getContext('2d'),w=c.clientWidth,h=c.clientHeight;
      if(!ctx||!w||!h)return;
      this.navigation?.update();
      const ratio=Math.min(devicePixelRatio||1,2);
      c.width=Math.round(w*ratio);c.height=Math.round(h*ratio);ctx.scale(ratio,ratio);
      ctx.fillStyle='#e6ebe2';ctx.fillRect(0,0,w,h);
      const scale=this.baseScale*this.zoom,faces=[];
      for(const part of this.visible()){
        const opacity=this.partOpacity(part);
        const points=part.vertices.map(v=>this.project(this.point(v,part)));
        part.faces.forEach(([i,j,k],idx)=>{
          const a=points[i],b=points[j],d=points[k];
          const u=b.map((n,l)=>n-a[l]),v=d.map((n,l)=>n-a[l]);
          const normal=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
          const light=.60+.40*Math.abs((normal[0]*.3+normal[1]*.4+normal[2]*.85)/(Math.hypot(...normal)||1));
          const highlight=this.kind==='full'&&selected.parts?.includes(part);
          const color=part.colors[idx].map((n,i)=>Math.round((highlight ? .6*n+.4*[.05,.65,.88][i] : n)*light*255));
          faces.push({pts:[a,b,d],z:a[2]+b[2]+d[2],color:'rgb('+color.join(',')+')',opacity});
        });
      }
      for(const f of faces.sort((a,b)=>a.z-b.z)){
        ctx.globalAlpha=f.opacity;
        ctx.beginPath();f.pts.forEach(([x,y],i)=>ctx[i?'lineTo':'moveTo'](w/2+(x-this.center[0])*scale,h/2-(y-this.center[1])*scale));
        ctx.closePath();ctx.fillStyle=ctx.strokeStyle=f.color;ctx.lineWidth=.45;ctx.fill();ctx.stroke();
      }
    }
}
