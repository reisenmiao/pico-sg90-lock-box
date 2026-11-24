// SG90 in case-centred XY coordinates, with the base at Z = 0 (millimetres).
function makeProjectServo({part,plate,box},kit){
  const shell=part('sg90','SG90 micro servo',kit);
  const detail=part('sg90-detail','SG90 fittings',kit);
  shell.opacity=.55;
  const blue='#164ac5',rim='#122e8c',nylon='#f9f7ec';
  const rgb=hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255);
  function quad(mesh,a,b,c,d,color){
    const i=mesh.vertices.length;
    mesh.vertices.push(a,b,c,d);mesh.faces.push([i,i+1,i+2],[i,i+2,i+3]);
    mesh.colors.push(color,color);
  }
  function disc(mesh,x,y,r,z,h,color){
    plate(mesh,'z',x-r,y-r,2*r,2*r,z,z+h,color,r);
  }
  // Skin each strip around its circular apertures, including the inside walls.
  function perforated(mesh,xs,halfWidth,holes,z,h,hex){
    const color=rgb(hex);
    for(const [x,r] of holes)for(let i=0;i<=16;i++)xs.push(x+r*Math.cos(i*Math.PI/16));
    xs.sort((a,b)=>a-b);
    function band(x0,x1,a0,b0,a1,b1){
      const a=[x0,a0,z],b=[x1,a1,z],c=[x1,b1,z],d=[x0,b0,z];
      const top=([x,y])=>[x,y,z+h];
      quad(mesh,a,d,c,b,color);quad(mesh,top(a),top(b),top(c),top(d),color);
      quad(mesh,a,b,top(b),top(a),color);quad(mesh,c,d,top(d),top(c),color);
    }
    for(let i=1;i<xs.length;i++){
      const a=xs[i-1],b=xs[i];if(b-a<1e-6)continue;
      const hole=holes.find(([x,r])=>Math.abs((a+b)/2-x)<r);
      const wa=halfWidth(a),wb=halfWidth(b);
      if(!hole){band(a,b,-wa,wa,-wb,wb);continue;}
      const [x,r]=hole,cut=t=>Math.sqrt(Math.max(0,r*r-(t-x)**2));
      band(a,b,-wa,-cut(a),-wb,-cut(b));band(a,b,cut(a),wa,cut(b),wb);
    }
    for(const x of [xs[0],xs.at(-1)]){
      const w=halfWidth(x);
      quad(mesh,[x,-w,z],[x,w,z],[x,w,z+h],[x,-w,z+h],color);
    }
  }
  // The listing dimensions span the mounting ears and the bare output shaft.
  plate(shell,'z',-11.5,-6,23,12,1.1,16.7,blue,.8);
  plate(shell,'z',-11.5,-6,23,12,16.8,23.5,'#2056cc',.8);
  plate(detail,'z',-11.4,-5.95,22.8,11.9,0,1.1,rim,.8);
  plate(detail,'z',-11.48,-6,22.96,12,16.55,16.85,rim,.7);
  for(const sign of [-1,1]){
    const x=sign*13.8;
    perforated(shell,[sign*11.35,sign*16],()=>5.9,[[x,1.05]],16.9,2.15,blue);
  }
  const shaft=5.5;
  disc(shell,shaft,0,5.65,23.45,4.15,blue);
  disc(shell,-.15,0,2.8,23.46,3.8,'#2047af');
  disc(detail,shaft,0,2.35,27.6,3.4,nylon);
  disc(detail,-5.5,0,4.35,3.1,12.8,'#9ea6b4');
  box(detail,.5,-4.7,3.5,8.5,1.1,10,'#42685a');
  for(const [x,r,z] of [[-5.5,3.1,18],[-1,3.4,19.4],[5.5,4.35,21]]){
    disc(detail,x,0,r,z,1.35,'#e3e1d8');
  }
  // Single arm: 21 mm end to end, 7 mm at the rounded hub, five linkage holes.
  const hubR=3.5,tipR=1.8,tip=shaft-(21-hubR-tipR);
  const outlineX=[];
  for(let i=0;i<=10;i++){
    outlineX.push(tip-tipR*Math.cos(i*Math.PI/20),shaft+hubR*Math.sin(i*Math.PI/20));
  }
  function hornWidth(x){
    if(x<tip)return Math.sqrt(Math.max(0,tipR**2-(x-tip)**2));
    if(x>shaft)return Math.sqrt(Math.max(0,hubR**2-(x-shaft)**2));
    return tipR+(hubR-tipR)*(x-tip)/(shaft-tip);
  }
  const horn=part('sg90-arm','SG90 single-arm horn',kit);
  disc(horn,shaft,0,3.2,28.55,2.5,nylon);
  perforated(horn,outlineX,hornWidth,[0,1,2,3,4].map(i=>[tip+i*2.45,.57]),31,1.45,nylon);
  disc(horn,shaft,0,1.55,32.45,.55,'#b5b7b8');
  box(horn,shaft-1,-.17,32.995,2,.34,.025,'#555966');
  box(horn,shaft-.17,-1,33,.34,2,.025,'#555966');

  // Case label on the long face. Block lettering stays attached when orbiting.
  box(detail,-8.4,-6.08,3,16.8,.1,11,'#161923');
  box(detail,-7.9,-6.15,6,15.8,.09,5.4,'#eee6c9');
  const glyphs=['111100111001111','111100101101111','111101111001111','111101101101111'];
  glyphs.forEach((glyph,j)=>{
    for(let i=0;i<15;i++)if(glyph[i]==='1'){
      box(detail,-5.6+j*3+(i%3)*.72,-6.2,6.8+(4-Math.floor(i/3))*.72,.73,.06,.73,'#242630');
    }
  });
}

function makeTimerControls({part, plate, box}, kit) {
  const lcd = part('lcd1602', 'I²C LCD1602 · 16×2', kit);
  // Face-up module, with its four-pin I²C backpack and contrast trimmer underneath.
  plate(lcd, 'z', -40, -18, 80, 36, 6, 7.6, '#24714e', 1.2);
  plate(lcd, 'z', -36, -13.5, 72, 26, 7.6, 14, '#252e30', 1);
  plate(lcd, 'z', -32.5, -8.5, 65, 16, 14, 14.2, '#b6c869', .55);
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 16; col++) {
      box(lcd, -30.4 + col * 3.84, -7 + row * 7, 14.2, 3.35, 6, .03, '#a9bb61');
    }
  }
  for (const x of [-37.5, 37.5]) for (const y of [-15.5, 15.5]) {
    plate(lcd, 'z', x - 1.5, y - 1.5, 3, 3, 7.6, 7.68, '#d2b777', 1.5);
    plate(lcd, 'z', x - .95, y - .95, 1.9, 1.9, 7.68, 7.71, '#333b37', .95);
  }
  box(lcd, -38, -.5, 4.1, 41, 17.5, 1.6, '#292d32');
  box(lcd, -21, 4, 2.3, 10, 6, 1.8, '#1e2125');
  box(lcd, -33, 3, 0, 7, 7, 4.1, '#376fb9');
  box(lcd, -31, 6, -.03, 3, .7, .04, '#c8cbd3');
  box(lcd, -39, 1, 1.5, 4, 10.2, 2.6, '#24292a');
  for (let i = 0; i < 4; i++) box(lcd, -44, 1.9 + 2.54*i, 2.45, 5, .65, .65, '#c9c7b7');
  for (let i = 0; i < 16; i++) {
    plate(lcd, 'z', -34 + 2.54*i, 14.5, 1.3, 1.3, 7.6, 7.9, '#cac9ab', .65);
  }

  const objects = [{id: lcd.name, name: lcd.title, position: [40, 39, 0], partIds: [lcd.name]}];
  const roles = ['Unit', 'Increase', 'Decrease', 'Start', 'Test unlock'];
  roles.forEach((role, i) => {
    const label = 'B' + (i + 1);
    const button = part('button-' + (i + 1), label + ' · ' + role, kit);
    // Project 2 top view, scaled against the breadboard's 2.54 mm grid.
    const bodyHalf = 5.6;
    plate(button, 'z', -bodyHalf, -bodyHalf, 2 * bodyHalf, 2 * bodyHalf, 0, 3.4, '#272326', 1.7);
    plate(button, 'z', -5, -5, 10, 10, 3.4, 4, '#ad1729', 5);
    plate(button, 'z', -4.55, -4.55, 9.1, 9.1, 4, 5.15, '#e6382b', 4.55);
    for (const side of [-1, 1]) for (const y of [-2.54, 2.54]) {
      const pinX = side * 6.35;
      const outerEdge = 6.35 + .15;
      box(button, side < 0 ? -outerEdge : bodyHalf, y - .24, .3, outerEdge - bodyHalf, .48, .32, '#bdbdbc');
      box(button, pinX - .15, y - .24, -2.5, .3, .48, 3.1, '#bdbdbc');
    }
    objects.push({
      id: button.name, name: button.title, shortLabel: label, mountReference: 'breadboard', partIds: [button.name],
      position: [-42, -(4 + i*6)*2.54, 6.02]
    });
  });
  return objects;
}

window.PRODUCT_DATA = (()=>{
  const parts=[];
  const geometry=kitGeometry(parts);
  kitBoards(geometry,'Pico starter kit');
  makeProjectServo(geometry,'Pico starter kit');
  const timerControls = makeTimerControls(geometry, 'Pico starter kit');

  const positions={breadboard:[-42,0,0],pico:[-42,25.4,6.02],sg90:[14,-30,0]};
  const names={breadboard:'Breadboard · 830 points',pico:'Raspberry Pi Pico',sg90:'SG90 micro servo'};
  const objects=[
    {id:'empty-object',name:'Electronics Assembly',position:[0,0,0],partIds:[]},
    {id:'breadboard',name:names.breadboard,position:positions.breadboard,partIds:['breadboard'],parent:'empty-object'},
    {id:'pico',name:names.pico,position:positions.pico,partIds:['pico'],parent:'empty-object'},
    {id:'sg90',name:names.sg90,position:positions.sg90,partIds:['sg90','sg90-detail','sg90-arm']},
    ...timerControls.map(control => ({...control, parent:'empty-object'}))
  ];
  for(const part of parts){
    // Only the shared mailbox boards need conversion from upright to face up.
    const upright=part.name==='breadboard'||part.name==='pico';
    const vertices=upright?part.vertices.map(([x,y,z])=>[x,z,-y]):part.vertices;
    const axes=[0,1,2].map(i=>vertices.map(v=>v[i]));
    const low=axes.map(a=>Math.min(...a)),high=axes.map(a=>Math.max(...a));
    const base=upright?[(low[0]+high[0])/2,(low[1]+high[1])/2,low[2]]:[0,0,0];
    const position=objects.find(object=>object.partIds.includes(part.name)).position;
    const shift=(v,i)=>v-base[i]+position[i];
    part.vertices=vertices.map(v=>v.map(shift));
    part.bounds=[...low.map(shift),...high.map(shift)];
    part.id=part.name;part.title=names[part.name]||part.title;
  }
  return {config:{version:'empty',title:'空白项目',description:'Main Object Hierarch',viewerOnly:true},
    scene:{name:'Main Object Hierarch',objects},parts,missing:[]};
})();
