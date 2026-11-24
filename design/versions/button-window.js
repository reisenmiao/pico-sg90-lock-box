// Rebuild only the two roof skins and the bore surfaces. The outside edge
// of each skin shares the four straight CAD edges on the fixed lid mesh.
function lidWithButtonHoles(frame, spec, centers) {
  const [x0, y0, x1, y1] = spec.box;
  const [left, front, right, back] = [x0+1, y0+1, x1-1, y1-1];
  const [bottom, top] = spec.z;
  const holes = centers.map(([x,y]) => ({x,y,r:4.75}));
  for (const [i,[x,y]] of centers.entries()) {
    if (Math.min(x-x0, x1-x, y-y0, y1-y) < 6.5)
      throw Error('B' + (i+1) + ' is outside the editable roof area.');
    if (centers.slice(0,i).some(([a,b]) => Math.hypot(x-a,y-b) < 12))
      throw Error('Space the button centres at least 12 mm apart.');
  }
  const round = v => Math.round(v*1e6)/1e6;
  const levels = new Set([front,back]);
  for (const hole of holes) {
    hole.arc = Array.from({length:25}, (_,i) => {
      const angle = (i-12)*Math.PI/24;
      const y = round(hole.y + hole.r*Math.sin(angle));
      levels.add(y);
      return [y, round(hole.r*Math.cos(angle))];
    });
  }
  function span(hole,y) {
    const arc = hole.arc;
    if (y < arc[0][0] || y > arc.at(-1)[0]) return null;
    const i = Math.max(1,arc.findIndex(p => p[0] >= y));
    const [a,b] = arc[i-1], [c,d] = arc[i];
    const dx = b+(d-b)*(y-a)/(c-a);
    return [round(hole.x-dx), round(hole.x+dx)];
  }
  const vertices=frame.vertices.slice(), faces=frame.faces.slice(), indices=new Map();
  frame.vertices.forEach((v,i)=>indices.set(v.join(','),i));
  function index(x,y,z) {
    const key = [x,y,z].join(',');
    if (!indices.has(key)) {
      indices.set(key, vertices.length);
      vertices.push([x,y,z]);
    }
    return indices.get(key);
  }
  function wall(a,b) {
    const lo=index(...a,bottom), hi=index(...b,bottom);
    const u=index(...a,top), v=index(...b,top);
    faces.push([lo,hi,v],[lo,v,u]);
  }
  const rows = [...levels].sort((a,b)=>a-b).map(y => {
    const spans = holes.map(h=>span(h,y));
    return {y, spans, cuts:[...new Set([left,right,...spans.filter(Boolean).flat()])].sort((a,b)=>a-b)};
  });
  for (let i=1;i<rows.length;i++) {
    const low=rows[i-1], high=rows[i];
    const active=holes.map((h,j)=>j).filter(j=>low.spans[j] && high.spans[j])
      .sort((a,b)=>holes[a].x-holes[b].x);
    let lo=left, hi=left;
    for (const j of [...active,-1]) {
      const endLo=j<0 ? right : low.spans[j][0], endHi=j<0 ? right : high.spans[j][0];
      const lower=low.cuts.filter(x=>x>=lo && x<=endLo).map(x=>[x,low.y]);
      const upper=high.cuts.filter(x=>x>=hi && x<=endHi).reverse().map(x=>[x,high.y]);
      const loop=lower.concat(upper);
      const cx=round((lo+hi+endLo+endHi)/4), cy=round((low.y+high.y)/2);
      const upperCenter=index(cx,cy,top), lowerCenter=index(cx,cy,bottom);
      for (let k=0;k<loop.length;k++) {
        const a=loop[k], b=loop[(k+1)%loop.length];
        faces.push([upperCenter,index(...a,top),index(...b,top)],
          [lowerCenter,index(...b,bottom),index(...a,bottom)]);
        if (a[1]!==b[1] && !(a[0]===b[0] && (a[0]===left || a[0]===right))) wall(a,b);
      }
      if (j>=0) [lo,hi]=[low.spans[j][1],high.spans[j][1]];
    }
  }
  function skin(a,b,c) {
    faces.push([index(...a,top),index(...b,top),index(...c,top)],
               [index(...c,bottom),index(...b,bottom),index(...a,bottom)]);
  }
  function border(a,b,inner) {
    skin(a,b,inner.at(-1));
    for (let i=inner.length-1;i>0;i--) skin(a,inner[i],inner[i-1]);
  }
  border([x0,y0],[x1,y0],[[left,front],[right,front]]);
  border([x1,y0],[x1,y1],rows.map(row=>[right,row.y]));
  border([x1,y1],[x0,y1],[[right,back],[left,back]]);
  border([x0,y1],[x0,y0],rows.map(row=>[left,row.y]).reverse());
  return {vertices,faces};
}

function downloadLiftOffLid(mesh) {
  const data=new DataView(new ArrayBuffer(84+50*mesh.faces.length));
  data.setUint32(80,mesh.faces.length,true);
  const roof=lockboxWindow.z[1];
  mesh.faces.forEach((face,i)=>{
    const points=face.map(j=>{
      const [x,y,z]=mesh.vertices[j];
      return [x,-y,roof-z];
    });
    const [a,b,c]=points, u=b.map((v,k)=>v-a[k]), v=c.map((n,k)=>n-a[k]);
    const n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
    const length=Math.hypot(...n);
    let offset=84+50*i;
    for (const value of [...n.map(k=>k/(length||1)),...points.flat()]) {
      data.setFloat32(offset,value,true);
      offset+=4;
    }
  });
  const link=document.createElement('a');
  link.href=URL.createObjectURL(new Blob([data.buffer],{type:'model/stl'}));
  link.download='Lift-Off-Lid.stl';
  link.click();
  setTimeout(()=>URL.revokeObjectURL(link.href),1000);
}
