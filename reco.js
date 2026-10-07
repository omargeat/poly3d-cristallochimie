/* Poly3D Cristallochimie : reconnaissance d'une page du poly dans une image de caméra.
   Méthode classique, sans bibliothèque : points d'intérêt (FAST), descripteurs binaires orientés (type ORB),
   appariement avec les pages de référence, puis vérification géométrique (homographie par RANSAC).
   Le même fichier sert dans le navigateur (dans un worker) et dans Node (pour préparer les références et tester). */
(function(root){
'use strict';
var LEVELS=8, FACTOR=1.2, BORDER=22, PATCH=15, FAST_T=20;

/* ---------- Images en niveaux de gris ---------- */
function resize(src,w,h,nw,nh){var out=new Uint8Array(nw*nh), sx=w/nw, sy=h/nh;
  for(var y=0;y<nh;y++){var fy=(y+.5)*sy-.5, y0=Math.max(0,Math.floor(fy)), y1=Math.min(h-1,y0+1), wy=Math.min(1,Math.max(0,fy-y0));
    for(var x=0;x<nw;x++){var fx=(x+.5)*sx-.5, x0=Math.max(0,Math.floor(fx)), x1=Math.min(w-1,x0+1), wx=Math.min(1,Math.max(0,fx-x0));
      out[y*nw+x]=(src[y0*w+x0]*(1-wx)+src[y0*w+x1]*wx)*(1-wy)+(src[y1*w+x0]*(1-wx)+src[y1*w+x1]*wx)*wy+.5;}}
  return out;}
var G=(function(){var k=[],s=0;for(var i=-3;i<=3;i++){var v=Math.exp(-i*i/8);k.push(v);s+=v;} return k.map(function(v){return v/s;});})();
function blur(src,w,h){var tmp=new Float32Array(w*h), out=new Uint8Array(w*h), x,y,i,a;
  for(y=0;y<h;y++)for(x=0;x<w;x++){a=0;for(i=-3;i<=3;i++){var xx=x+i; if(xx<0)xx=0; else if(xx>=w)xx=w-1; a+=src[y*w+xx]*G[i+3];} tmp[y*w+x]=a;}
  for(y=0;y<h;y++)for(x=0;x<w;x++){a=0;for(i=-3;i<=3;i++){var yy=y+i; if(yy<0)yy=0; else if(yy>=h)yy=h-1; a+=tmp[yy*w+x]*G[i+3];} out[y*w+x]=a+.5;}
  return out;}

/* ---------- Coins FAST-9 ---------- */
var CX=[0,1,2,3,3,3,2,1,0,-1,-2,-3,-3,-3,-2,-1], CY=[-3,-3,-2,-1,0,1,2,3,3,3,2,1,0,-1,-2,-3];
function fast(img,w,h){var score=new Int32Array(w*h), off=[], i, x, y, out=[];
  for(i=0;i<16;i++) off.push(CY[i]*w+CX[i]);
  for(y=BORDER;y<h-BORDER;y++)for(x=BORDER;x<w-BORDER;x++){var p=y*w+x, c=img[p], hi=c+FAST_T, lo=c-FAST_T;
    var a=img[p+off[0]], b=img[p+off[8]], d=img[p+off[4]], e=img[p+off[12]];
    var nb=(a>hi)+(b>hi)+(d>hi)+(e>hi), nd=(a<lo)+(b<lo)+(d<lo)+(e<lo); if(nb<2&&nd<2) continue;
    var run=0, best=0, sum=0, bsum=0, kind=0;
    for(i=0;i<25;i++){var v=img[p+off[i&15]], k=v>hi?1:(v<lo?2:0);
      if(k&&k===kind){run++; sum+=Math.abs(v-c);} else {kind=k; run=k?1:0; sum=k?Math.abs(v-c):0;}
      if(run>best){best=run; bsum=sum;}}
    if(best>=9) score[p]=bsum;}
  for(y=BORDER;y<h-BORDER;y++)for(x=BORDER;x<w-BORDER;x++){var q=y*w+x, s=score[q]; if(!s) continue;
    if(s<score[q-1]||s<=score[q+1]||s<score[q-w]||s<=score[q+w]||s<score[q-w-1]||s<=score[q+w+1]||s<score[q-w+1]||s<=score[q+w-1]) continue;
    out.push({x:x,y:y,s:s});}
  return out;}

/* ---------- Orientation et descripteur ---------- */
var UMAX=(function(){var u=[];for(var v=0;v<=PATCH;v++)u.push(Math.floor(Math.sqrt(PATCH*PATCH-v*v)));return u;})();
function angle(img,w,x,y){var m10=0,m01=0,u,v,p=y*w+x;
  for(u=-PATCH;u<=PATCH;u++) m10+=u*img[p+u];
  for(v=1;v<=PATCH;v++){var d=UMAX[v], rs=0; for(u=-d;u<=d;u++){var a=img[p+v*w+u], b=img[p-v*w+u]; rs+=a-b; m10+=u*(a+b);} m01+=v*rs;}
  return Math.atan2(m01,m10);}
// 256 paires de points de comparaison, tirées une fois pour toutes (générateur à graine fixe)
var PAIRS=(function(){var s=12345; function rnd(){s=(s*1103515245+12345)&0x7fffffff; return s/0x7fffffff;}
  function gauss(){var u=Math.max(1e-9,rnd()), v=rnd(), g=Math.sqrt(-2*Math.log(u))*Math.cos(6.2832*v)*5.2; return Math.max(-13,Math.min(13,g));}
  var p=new Float32Array(1024); for(var i=0;i<1024;i++) p[i]=gauss(); return p;})();
function describe(bl,w,x,y,ang,out,o){var c=Math.cos(ang), s=Math.sin(ang), p=y*w+x;
  for(var j=0;j<8;j++){var bits=0;
    for(var b=0;b<32;b++){var i=(j*32+b)*4, x1=PAIRS[i],y1=PAIRS[i+1],x2=PAIRS[i+2],y2=PAIRS[i+3];
      var a1=bl[p+Math.round(x1*s+y1*c)*w+Math.round(x1*c-y1*s)], a2=bl[p+Math.round(x2*s+y2*c)*w+Math.round(x2*c-y2*s)];
      if(a1<a2) bits|=(1<<b);}
    out[o+j]=bits>>>0;}}

/* ---------- Extraction : pyramide d'échelles, les meilleurs coins de chaque niveau ---------- */
function extract(gray,w,h,nmax){var pts=[], desc=[], f=1/FACTOR, n0=nmax*(1-f)/(1-Math.pow(f,LEVELS)), img=gray, lw=w, lh=h, sc=1;
  for(var l=0;l<LEVELS;l++){
    if(l){sc*=FACTOR; var nw=Math.round(w/sc), nh=Math.round(h/sc); if(nw<2*BORDER+8||nh<2*BORDER+8) break; img=resize(gray,w,h,nw,nh); lw=nw; lh=nh;}
    var k=fast(img,lw,lh); k.sort(function(a,b){return b.s-a.s;}); k=k.slice(0,Math.round(n0*Math.pow(f,l)));
    if(!k.length) continue; var bl=blur(img,lw,lh);
    k.forEach(function(p){var d=new Uint32Array(8); describe(bl,lw,p.x,p.y,angle(img,lw,p.x,p.y),d,0); pts.push(p.x*w/lw,p.y*h/lh); desc.push(d);});}
  var D=new Uint32Array(desc.length*8); desc.forEach(function(d,i){D.set(d,i*8);});
  return {n:desc.length,pts:new Float32Array(pts),desc:D};}

/* ---------- Appariement ---------- */
function pop(v){v=v-((v>>>1)&0x55555555); v=(v&0x33333333)+((v>>>2)&0x33333333); return (((v+(v>>>4))&0x0f0f0f0f)*0x01010101)>>>24;}
function matchSets(q,r){var out=[], qd=q.desc, rd=r.desc;
  for(var i=0;i<q.n;i++){var b1=999,b2=999,bi=-1,o=i*8;
    for(var j=0;j<r.n;j++){var p=j*8, d=pop(qd[o]^rd[p])+pop(qd[o+1]^rd[p+1])+pop(qd[o+2]^rd[p+2])+pop(qd[o+3]^rd[p+3]);
      if(d>=b2) continue; d+=pop(qd[o+4]^rd[p+4])+pop(qd[o+5]^rd[p+5])+pop(qd[o+6]^rd[p+6])+pop(qd[o+7]^rd[p+7]);
      if(d<b1){b2=b1;b1=d;bi=j;} else if(d<b2) b2=d;}
    if(bi>=0&&b1<.8*b2&&b1<80) out.push([q.pts[i*2],q.pts[i*2+1],r.pts[bi*2],r.pts[bi*2+1],b1,bi]);}
  // un point de référence ne sert qu'une fois : on garde son meilleur correspondant
  var best={}; out.forEach(function(m){var k=m[5]; if(!best[k]||m[4]<best[k][4]) best[k]=m;});
  return Object.keys(best).map(function(k){return best[k];});}

/* ---------- Homographie par RANSAC ---------- */
function solve(A,b){var n=b.length,i,j,k; // élimination de Gauss avec pivot partiel
  for(i=0;i<n;i++){var m=i; for(j=i+1;j<n;j++) if(Math.abs(A[j][i])>Math.abs(A[m][i])) m=j;
    if(Math.abs(A[m][i])<1e-10) return null; var t=A[i];A[i]=A[m];A[m]=t; var tb=b[i];b[i]=b[m];b[m]=tb;
    for(j=i+1;j<n;j++){var f=A[j][i]/A[i][i]; for(k=i;k<n;k++) A[j][k]-=f*A[i][k]; b[j]-=f*b[i];}}
  var x=new Array(n); for(i=n-1;i>=0;i--){var s=b[i]; for(k=i+1;k<n;k++) s-=A[i][k]*x[k]; x[i]=s/A[i][i];} return x;}
function homography(m){var A=[],b=[]; m.forEach(function(p){var x=p[0],y=p[1],u=p[2],v=p[3];
    A.push([x,y,1,0,0,0,-u*x,-u*y]); b.push(u); A.push([0,0,0,x,y,1,-v*x,-v*y]); b.push(v);});
  var hh=solve(A,b); return hh?hh.concat([1]):null;}
function apply(H,x,y){var d=H[6]*x+H[7]*y+H[8]; return [(H[0]*x+H[1]*y+H[2])/d,(H[3]*x+H[4]*y+H[5])/d];}
function ransac(m,iters,tol){var best=0,bestH=null,s=777,n=m.length; if(n<8) return {inliers:0,H:null};
  function rnd(){s=(s+0x6D2B79F5)|0; var z=Math.imul(s^(s>>>15),1|s); z=(z+Math.imul(z^(z>>>7),61|z))^z; return Math.floor(((z^(z>>>14))>>>0)/4294967296*n);}
  for(var it=0;it<iters;it++){var a=rnd(),b=rnd(),c=rnd(),d=rnd(); if(a===b||a===c||a===d||b===c||b===d||c===d) continue;
    var H=homography([m[a],m[b],m[c],m[d]]); if(!H) continue;
    // on écarte les transformations invraisemblables : image retournée, écrasée, ou perspective extrême
    var det=H[0]*H[4]-H[1]*H[3]; if(det<.2||det>12) continue;
    var fro=H[0]*H[0]+H[1]*H[1]+H[3]*H[3]+H[4]*H[4]; if(fro>5*det) continue;
    if(Math.abs(H[6])>1.5e-3||Math.abs(H[7])>1.5e-3) continue;
    var cnt=0, sx=0, sy=0, sxx=0, syy=0; for(var i=0;i<n;i++){var p=apply(H,m[i][0],m[i][1]), dx=p[0]-m[i][2], dy=p[1]-m[i][3];
      if(dx*dx+dy*dy<tol*tol){cnt++; sx+=m[i][2]; sy+=m[i][3]; sxx+=m[i][2]*m[i][2]; syy+=m[i][3]*m[i][3];}}
    if(cnt<=best) continue;
    // les points concordants doivent être répartis sur la page, pas tassés au même endroit
    if(Math.sqrt(sxx/cnt-sx*sx/cnt/cnt+syy/cnt-sy*sy/cnt/cnt)<45) continue;
    best=cnt; bestH=H;}
  return {inliers:best,H:bestH};}

/* ---------- Reconnaissance ----------
   refs : [{page, w, h, n, pts, desc, zones:[{id, x0,y0,x1,y1}]}]
   Renvoie la page reconnue, la structure dont la zone est la plus proche du centre de l'image, et les scores. */
function recognize(gray,w,h,refs,nmax){var q=extract(gray,w,h,nmax||700), res=refs.map(function(r){
    var m=matchSets(q,r), g=ransac(m,2000,5); return {ref:r,inliers:g.inliers,H:g.H,matches:m.length};});
  res.sort(function(a,b){return b.inliers-a.inliers;});
  var top=res[0], out={features:q.n,page:top.ref.page,inliers:top.inliers,second:res[1]?res[1].inliers:0,id:null};
  if(top.inliers<16) return out;
  // plusieurs pages peuvent être visibles à la fois : on retient celle que vise le centre de l'image
  function dist(z,c){var dx=Math.max(z.x0-c[0],0,c[0]-z.x1), dy=Math.max(z.y0-c[1],0,c[1]-z.y1); return Math.sqrt(dx*dx+dy*dy);}
  var cands=res.filter(function(r){return r.inliers>=16&&r.inliers>=.4*top.inliers;}).map(function(r){
    var c=apply(r.H,w/2,h/2); return {r:r,c:c,d:dist({x0:0,y0:0,x1:r.ref.w,y1:r.ref.h},c)};});
  var visibles=cands.map(function(k){return k.r;});
  cands=cands.filter(function(k){return k.d<120;}); if(!cands.length) return out;   // le centre de l'image doit viser la page, ou presque
  cands.sort(function(a,b){return (a.d-b.d)||(b.r.inliers-a.r.inliers);});
  var best=cands[0], others=res.filter(function(r){return visibles.indexOf(r)<0;});
  if(others.length&&best.r.inliers<2*others[0].inliers) return out;   // pas assez net par rapport aux pages non retenues
  out.page=best.r.ref.page; out.inliers=best.r.inliers; out.centre=best.c;
  var bd=Infinity; best.r.ref.zones.forEach(function(z){var d=dist(z,best.c); if(d<bd){bd=d;out.id=z.id;}});
  return out;}

/* ---------- Références sous forme compacte (base64) ---------- */
function b64(u8){if(typeof Buffer!=='undefined') return Buffer.from(u8.buffer,u8.byteOffset,u8.byteLength).toString('base64');
  var s='';for(var i=0;i<u8.length;i++)s+=String.fromCharCode(u8[i]);return btoa(s);}
function unb64(s){if(typeof Buffer!=='undefined'){var b=Buffer.from(s,'base64');return new Uint8Array(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength));}
  var bin=atob(s),u=new Uint8Array(bin.length);for(var i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);return u;}
function pack(f){return {n:f.n,pts:b64(new Uint8Array(new Uint16Array(Array.prototype.map.call(f.pts,function(v){return Math.round(v*8);})).buffer)),desc:b64(new Uint8Array(f.desc.buffer))};}
function unpack(p){var u16=new Uint16Array(unb64(p.pts).buffer), pts=new Float32Array(u16.length); for(var i=0;i<u16.length;i++) pts[i]=u16[i]/8;
  return {n:p.n,pts:pts,desc:new Uint32Array(unb64(p.desc).buffer)};}

var API={extract:extract,recognize:recognize,pack:pack,unpack:unpack,resize:resize,_debug:function(q,r){var m=matchSets(q,r),g=ransac(m,2000,5);return {matches:m.length,inliers:g.inliers};}};
if(typeof module!=='undefined'&&module.exports) module.exports=API; else root.Poly3DReco=API;

/* ---------- Dans un worker : reçoit des images, renvoie le résultat ---------- */
if(typeof importScripts==='function'){
  var REFS=null;
  root.onmessage=function(e){var d=e.data;
    if(!REFS){importScripts('reco-data.js?v=10'); REFS=root.POLY3D_RECO_DATA.map(function(r){var f=unpack(r); f.page=r.page; f.zones=r.zones; f.w=r.w; f.h=r.h; return f;});}
    var t=Date.now(), rgba=d.rgba, n=d.w*d.h, g=new Uint8Array(n);
    for(var i=0;i<n;i++) g[i]=(rgba[i*4]*77+rgba[i*4+1]*150+rgba[i*4+2]*29)>>8;
    var r=recognize(g,d.w,d.h,REFS,700); r.ms=Date.now()-t; root.postMessage(r);};
}
})(typeof self!=='undefined'?self:this);
