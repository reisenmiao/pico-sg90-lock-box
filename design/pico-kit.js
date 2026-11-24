// Mesh builders for the Pico starter kit, in the mailbox assembly coordinates.
function kitGeometry(parts){
  function part(name, title, group) {
    const p = {name, title, group, vertices:[], faces:[], colors:[]};
    parts.push(p);
    return p;
  }
  function prism(p, outline, from, to, axis, hex) {
    const n = outline.length, start = p.vertices.length;
    const rgb = [1,3,5].map(i => parseInt(hex.slice(i,i+2),16)/255);
    for (const d of [from,to]) for (const [a,b] of outline)
      p.vertices.push(axis==='y' ? [a,d,b] : axis==='x' ? [d,a,b] : [a,b,d]);
    function triangle(a,b,c) {p.faces.push([start+a,start+b,start+c]);p.colors.push(rgb);}
    for (let i=1;i<n-1;i++) {triangle(0,i+1,i);triangle(n,n+i,n+i+1);}
    for (let i=0;i<n;i++) {const j=(i+1)%n;triangle(i,j,n+j);triangle(i,n+j,n+i);}
  }
  // Rounded rectangular face extruded along its normal.
  function plate(p, axis, x, y, w, h, lo, hi, color, r=0) {
    const outline=[];
    if (!r) outline.push([x,y],[x+w,y],[x+w,y+h],[x,y+h]);
    else {
      r=Math.min(r,w/2,h/2);
      for(const [cx,cy,base] of [[x+w-r,y+r,-90],[x+w-r,y+h-r,0],[x+r,y+h-r,90],[x+r,y+r,180]]){
        for(let i=0;i<=4;i++){const a=(base+i*22.5)*Math.PI/180;outline.push([cx+r*Math.cos(a),cy+r*Math.sin(a)]);}
      }
    }
    prism(p,outline,lo,hi,axis,color);
  }
  function box(p,x,y,z,w,d,h,color) {plate(p,'z',x,y,w,d,z,z+h,color);}
  return {part,plate,box};
}
function kitServo({part,plate,box},kit){
  const ivory='#f1e8ce';
  const servo=part('sg90','SG90 微型舵机',kit);
  plate(servo,'y',44,146,21,23,-21,-9,'#3978ac',2);
  box(servo,42,-19,148,25,8,3,'#4e8ec1');
  plate(servo,'y',49,146,10,10,-25,-21,'#e6dccc',4);
  const horn=part('horn','SG90 舵臂锁舌',kit);
  plate(horn,'y',39,148,17,5,-29,-25,ivory,2);
}
function kitBoards({part,plate,box},kit){
  const amber='#d69c53';
  const bread=part('breadboard','830 孔面包板',kit);
  // Estimate the 165 x 53 mm outline from the kit photo using 2.54 mm pitch.
  const pitch=2.54, cx=-3, cz=121.5;
  plate(bread,'y',cx-26.5,cz-82.5,53,165,34,40,'#f2f1ed',1);
  function marking(x,z,width,length,color){
    const i=bread.vertices.length,y=33.98;
    bread.vertices.push([x-width/2,y,z-length/2],[x+width/2,y,z-length/2],
      [x+width/2,y,z+length/2],[x-width/2,y,z+length/2]);
    bread.faces.push([i,i+1,i+2],[i,i+2,i+3]);bread.colors.push(color,color);
  }
  const socket=[.29,.28,.26];
  marking(cx,cz,2.4,163,[.78,.78,.76]);
  for(const side of [-1,1]){
    for(let bank=0;bank<5;bank++){
      const x=cx+side*(1.5+bank)*pitch;
      for(let row=0;row<63;row++)marking(x,cz+(row-31)*pitch,1.05,1.05,socket);
    }
    for(const rail of [-1,1]){
      const x=cx+side*22+rail*pitch/2;
      marking(x+rail*1.8,cz,.34,164,rail<0?[.32,.46,.71]:[.76,.36,.31]);
      for(let group=0;group<10;group++)for(let hole=0;hole<5;hole++){
        const index=group*6+hole+(group>=5?1:0);
        marking(x,cz+(index-29.5)*pitch,1.05,1.05,socket);
      }
    }
  }
  const pico=part('pico','Raspberry Pi Pico',kit);
  plate(pico,'y',-15,140,21,51,31,33.5,'#287451',1.6);
  box(pico,-11,29.4,160,8,1.6,8,'#303f39');
  // Micro-USB receptacle: the mating mouth opens toward the end of the PCB (+Z).
  const metal = '#b7c4bc';
  box(pico,-9,27,185,9,.45,7,metal);
  box(pico,-9,30.55,185,9,.45,7,metal);
  for (const x of [-9,-.45]) box(pico,x,27.45,185,.45,3.1,7,metal);
  box(pico,-8.55,27.45,185,8.1,3.1,.6,'#282d2d');
  box(pico,-7.6,29.2,185.6,6.2,.55,5.6,'#55595b');
  for(let i=0;i<20;i++)for(const x of [-14,4])box(pico,x,30.7,141+2.48*i,1.1,.4,1.2,amber);
}
