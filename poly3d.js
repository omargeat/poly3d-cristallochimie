/* Poly3D Cristallochimie : moteur commun.
   Lit la fiche désignée par <body data-structure="...">, construit la page et dessine la maille.
   Le scanner l'appelle aussi avec Poly3D.open(id,{video:...}) pour dessiner la structure par-dessus l'image de la caméra.
   Aucune bibliothèque externe : le dessin est fait sur un canvas 2D, les atomes triés du plus loin au plus proche. */
(function(){
'use strict';
var ALL=window.POLY3D_STRUCTURES||[];

function viewer(S,opt){
opt=opt||{};
var HEX=S.maille&&S.maille.type==='hex', CA=HEX?S.maille.c/S.a:1;
// coordonnées réduites -> cartésiennes, en unités de a
function cart(f){return HEX?[f[0]-f[1]/2,f[1]*Math.sqrt(3)/2,f[2]*CA]:[f[0],f[1],f[2]];}
// vues : rangée [uvw] regardée de face, « up » vers le haut de l'écran, période = longueur de la rangée
var FREE=HEX?{n:[.5,-1,.45],up:[0,0,1]}:{n:[1,.5,.4],up:[0,0,1]};
var AXES=HEX?[{id:'001',uvw:[0,0,1],up:[0,1,0],period:'c'},{id:'100',uvw:[1,0,0],up:[0,0,1],period:'a'},{id:'120',uvw:[1,2,0],up:[0,0,1],period:'a√3'}]
            :[{id:'001',uvw:[0,0,1],up:[-1,0,0],period:'a'},{id:'110',uvw:[1,1,0],up:[0,0,1],period:'a√2'},{id:'111',uvw:[1,1,1],up:[0,0,1],period:'a√3'}];
var VIEWS={free:FREE}; AXES.forEach(function(v){v.d=cart(v.uvw); v.n=v.d; VIEWS[v.id]=v;});
// vue élargie proposée par un bouton : celle de la fiche, sinon le prisme hexagonal (maille triple)
var LARGE=S.etendu||(HEX?{nom:'Prisme hexagonal',hexagone:1,aretes:'prisme'}:null);
var state={view:'free',model:'eclate',cotes:true,poly:-1,persp:true,zoom:1,prisme:false};
var DIST=5, EPS=1e-6, TOL=.02;

/* ---------- Construction de la page ---------- */
if(!opt.video) document.title='Poly3D '+S.formule;
function h(tag,attrs,html){var e=document.createElement(tag); for(var k in attrs) e.setAttribute(k,attrs[k]); if(html!=null) e.innerHTML=html; return e;}
var app=h('div',{'class':'app'});
var header=h('header',{},'<a class="back" href="index.html">← Toutes les structures</a><h1></h1><p class="sub"></p>');
header.querySelector('h1').textContent=S.nom;
header.querySelector('h1').appendChild(h('small',{})).textContent=S.formule+' · '+S.groupe;
header.querySelector('.sub').textContent=S.resume;
if(opt.video) header.querySelector('.sub').textContent+=' Visez une autre figure pour changer de structure.';
var stage=h('div',{'class':'stage'},'<canvas aria-label="Maille en trois dimensions"></canvas><div class="labels"></div><div class="legend"></div><div class="caption"></div>');
var canvas=stage.querySelector('canvas'), ctx=canvas.getContext('2d'), labelsEl=stage.querySelector('.labels'), captionEl=stage.querySelector('.caption');
Object.keys(S.especes).forEach(function(sp){var e=S.especes[sp], d=h('div',{},'<i></i><span></span> <span class="num"></span>');
  d.querySelector('i').style.background='var(--'+e.teinte+')'; d.children[1].textContent=e.nom; d.children[2].textContent=e.r+' pm';
  stage.querySelector('.legend').appendChild(d);});
var panel=h('section',{'class':'panel','aria-label':'Commandes'},
  '<div class="row"><span>Vue</span><div class="seg" id="views">'+
    '<button id="v-free" data-view="free">3D</button>'+AXES.map(function(v){return '<button id="v-'+v.id+'" class="idx" data-view="'+v.id+'">['+v.id+']</button>';}).join('')+'</div></div>'+
  '<div class="row"><span>Modèle</span><div class="seg" id="models">'+
    '<button id="m-eclate" data-model="eclate">Éclaté</button><button id="m-compact" data-model="compact">Compact</button></div></div>'+
  '<div class="row"><span>Afficher</span><div class="opts" id="opts"><button id="o-cotes">Cotes</button></div></div>'+
  '<p class="facts"></p>'+
  '<p class="help">Glisser pour tourner, molette ou pincement pour zoomer, pivoter deux doigts pour tourner dans le plan de l\'écran. Les boutons [uvw] donnent la projection exacte selon cette rangée, sans perspective.</p>');
var opts=panel.querySelector('#opts');
(S.polyedres||[]).forEach(function(p,i){var b=h('button',{id:'o-poly'+i,'data-poly':i}); b.textContent=p.nom; opts.appendChild(b);});
if(LARGE) opts.appendChild(h('button',{id:'o-prisme'})).textContent=LARGE.nom;
opts.appendChild(h('button',{id:'o-persp'},'Perspective'));
if(opt.video){ // structure dessinée par-dessus l'image de la caméra
  stage.classList.add('ar'); stage.insertBefore(opt.video,canvas);
  panel.insertBefore(h('p',{'class':'facts'},'<a href="'+S.id+'.html">Ouvrir la fiche seule, sans la caméra</a>'),panel.querySelector('.help'));
}
panel.querySelector('.facts').textContent='a = '+S.a+' pm · '+(HEX?'c = '+S.maille.c+' pm · ':'')+S.infos;
app.appendChild(header); app.appendChild(stage); app.appendChild(panel); document.body.appendChild(app);

/* ---------- Vecteurs, quaternions ---------- */
function sub(a,b){return [a[0]-b[0],a[1]-b[1],a[2]-b[2]];}
function dot(a,b){return a[0]*b[0]+a[1]*b[1]+a[2]*b[2];}
function cross(a,b){return [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];}
function len(a){return Math.sqrt(dot(a,a));}
function norm(a){var l=len(a);return [a[0]/l,a[1]/l,a[2]/l];}
function lerp(a,b,t){return [a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t];}
function qMul(a,b){return [a[3]*b[0]+a[0]*b[3]+a[1]*b[2]-a[2]*b[1], a[3]*b[1]-a[0]*b[2]+a[1]*b[3]+a[2]*b[0],
  a[3]*b[2]+a[0]*b[1]-a[1]*b[0]+a[2]*b[3], a[3]*b[3]-a[0]*b[0]-a[1]*b[1]-a[2]*b[2]];}
function qNorm(q){var l=Math.sqrt(q[0]*q[0]+q[1]*q[1]+q[2]*q[2]+q[3]*q[3]);return [q[0]/l,q[1]/l,q[2]/l,q[3]/l];}
function qSlerp(a,b,t){var c=a[0]*b[0]+a[1]*b[1]+a[2]*b[2]+a[3]*b[3]; if(c<0){b=[-b[0],-b[1],-b[2],-b[3]];c=-c;}
  if(c>.9995) return qNorm([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t,a[3]+(b[3]-a[3])*t]);
  var th=Math.acos(c), s=Math.sin(th), u=Math.sin((1-t)*th)/s, v=Math.sin(t*th)/s;
  return [a[0]*u+b[0]*v,a[1]*u+b[1]*v,a[2]*u+b[2]*v,a[3]*u+b[3]*v];}
function mFromQ(q){var x=q[0],y=q[1],z=q[2],w=q[3];
  return [1-2*(y*y+z*z),2*(x*y-z*w),2*(x*z+y*w), 2*(x*y+z*w),1-2*(x*x+z*z),2*(y*z-x*w), 2*(x*z-y*w),2*(y*z+x*w),1-2*(x*x+y*y)];}
function qFromM(m){var t=m[0]+m[4]+m[8],s;
  if(t>0){s=Math.sqrt(t+1)*2;return [(m[7]-m[5])/s,(m[2]-m[6])/s,(m[3]-m[1])/s,s/4];}
  if(m[0]>m[4]&&m[0]>m[8]){s=Math.sqrt(1+m[0]-m[4]-m[8])*2;return [s/4,(m[1]+m[3])/s,(m[2]+m[6])/s,(m[7]-m[5])/s];}
  if(m[4]>m[8]){s=Math.sqrt(1+m[4]-m[0]-m[8])*2;return [(m[1]+m[3])/s,s/4,(m[5]+m[7])/s,(m[2]-m[6])/s];}
  s=Math.sqrt(1+m[8]-m[0]-m[4])*2;return [(m[2]+m[6])/s,(m[5]+m[7])/s,s/4,(m[3]-m[1])/s];}
// orientation qui amène la rangée n face à l'observateur, « up » vers le haut de l'écran
function quatFor(view){var v=VIEWS[view], n=norm(v.n), up=v.up, k=dot(up,n);
  up=norm([up[0]-n[0]*k,up[1]-n[1]*k,up[2]-n[2]*k]); var r=cross(up,n);
  return qNorm(qFromM([r[0],r[1],r[2],up[0],up[1],up[2],n[0],n[1],n[2]]));}

/* ---------- Géométrie tirée de la fiche ---------- */
// toutes les positions du cristal au voisinage de la maille (motif + translations du réseau)
var cristal=[];
S.motif.forEach(function(m){for(var i=-3;i<=3;i++)for(var j=-3;j<=3;j++)for(var k=-2;k<=2;k++){var f=[m[1]+i,m[2]+j,m[3]+k]; cristal.push({sp:m[0],f:f,c:cart(f)});}});
function inHex(c,k){var s=Math.sqrt(3)/2; return [[.5,s],[-.5,s],[1,0]].every(function(u){var n=[u[1],-u[0]]; return Math.abs(c[0]*n[0]+c[1]*n[1])<=s*k+1e-4;});}
var atoms, ghosts, links, edges, polys, axes, Rgeo, axisEls=['x','y','z'].map(function(n){var el=h('div',{'class':'axis'}); el.textContent=n; return labelsEl.appendChild(el);});
function build(){
  var reg=state.prisme?LARGE:{aretes:'maille'}, k=reg.hexagone||0;
  var O=cart(k?[0,0,.5]:[.5,.5,.5]);                         // centre du dessin
  function at(c){return sub(c,O);}
  // atomes dessinés : ceux de la région, y compris ceux partagés sur ses sommets, arêtes et faces
  atoms=cristal.filter(function(a){return k?(a.f[2]>-EPS&&a.f[2]<1+EPS&&inHex(a.c,k)):a.f.every(function(x){return x>-EPS&&x<1+EPS;});})
    .map(function(a){return {sp:a.sp,f:a.f,c:a.c,p:at(a.c)};});
  // liaisons : premiers voisins entre les espèces indiquées
  links=[];
  (S.liaisons||[]).forEach(function(pair){var best=Infinity, L=[];
    atoms.forEach(function(A,i){ if(A.sp!==pair[0]) return; atoms.forEach(function(B,j){ if(B.sp!==pair[1]||i===j) return;
      if(pair[0]===pair[1]&&j<i) return; var d=len(sub(A.c,B.c)); if(d<EPS) return; L.push({a:A,b:B,d:d}); best=Math.min(best,d);});});
    links=links.concat(L.filter(function(l){return l.d<best*(1+TOL);}));});
  // arêtes de la maille ou du prisme, avec les atomes posés dessus (pour interrompre le trait à leur surface)
  var E=[];
  if(reg.aretes==='prisme'){var hx=[[1,0],[1,1],[0,1],[-1,0],[-1,-1],[0,-1]];
    hx.forEach(function(v,i){var w=hx[(i+1)%6]; E.push([[v[0],v[1],0],[v[0],v[1],1]],[[v[0],v[1],0],[w[0],w[1],0]],[[v[0],v[1],1],[w[0],w[1],1]]);});}
  else [0,1,2].forEach(function(ax){[0,1].forEach(function(u){[0,1].forEach(function(v){var o=[0,0,0]; o[(ax+1)%3]=u; o[(ax+2)%3]=v; var e=o.slice(); e[ax]=1; E.push([o,e]);});});});
  edges=E.map(function(e){var A=cart(e[0]), B=cart(e[1]), d=sub(B,A), L=len(d), on=[];
    atoms.forEach(function(a){var w=sub(a.c,A), t=dot(w,d)/(L*L); if(t<-EPS||t>1+EPS) return;
      if(len(sub(w,[d[0]*t,d[1]*t,d[2]*t]))<1e-4) on.push({t:t,sp:a.sp});});
    return {a:at(A),b:at(B),L:L,on:on};});
  // polyèdres de coordination : enveloppe convexe des plus proches voisins du centre, pris dans tout le cristal
  ghosts=[];
  polys=(S.polyedres||[]).map(function(p,pi){var C=cart(p.centre), best=Infinity;
    var cand=cristal.filter(function(a){return a.sp===p.sommets&&len(sub(a.c,C))>EPS;});
    cand.forEach(function(a){best=Math.min(best,len(sub(a.c,C)));});
    var near=cand.filter(function(a){return len(sub(a.c,C))<best*(1+TOL);}), V=near.map(function(a){return at(a.c);});
    near.forEach(function(a){ if(!atoms.some(function(b){return len(sub(a.c,b.c))<1e-4;})) ghosts.push({sp:a.sp,p:at(a.c),poly:pi});});
    var faces=[], done={}, eset={}, PE=[];
    for(var i=0;i<V.length;i++)for(var j=i+1;j<V.length;j++)for(var k2=j+1;k2<V.length;k2++){
      var n=cross(sub(V[j],V[i]),sub(V[k2],V[i])); if(len(n)<1e-9) continue; n=norm(n);
      var pos=0,neg=0,on=[]; V.forEach(function(v,m){var d=dot(sub(v,V[i]),n); if(d>1e-3)pos++; else if(d<-1e-3)neg++; else on.push(m);});
      if(pos&&neg) continue; var key=on.join(','); if(done[key]) continue; done[key]=1;
      var c=[0,0,0]; on.forEach(function(m){c[0]+=V[m][0]/on.length;c[1]+=V[m][1]/on.length;c[2]+=V[m][2]/on.length;});
      var u=norm(sub(V[on[0]],c)), w=cross(n,u);
      on.sort(function(a,b){function ang(m){var d=sub(V[m],c);return Math.atan2(dot(d,w),dot(d,u));} return ang(a)-ang(b);});
      faces.push(on);
      on.forEach(function(m,qi){var m2=on[(qi+1)%on.length], ek=Math.min(m,m2)+'-'+Math.max(m,m2); if(!eset[ek]){eset[ek]=1;PE.push([m,m2]);}});
    }
    return {V:V,faces:faces,E:PE,sp:p.sommets};});
  // axes x, y, z : dans le prolongement des vecteurs de base
  axes=[[1,0,0],[0,1,0],[0,0,1]].map(function(f,i){var c=cart(f), u=norm(c), s=at(c), a=atoms.filter(function(t){return len(sub(t.c,c))<1e-4;})[0];
    return {s:s,e:[s[0]+u[0]*.3,s[1]+u[1]*.3,s[2]+u[2]*.3],sp:a?a.sp:null,el:axisEls[i]};});
  Rgeo=0; atoms.forEach(function(a){Rgeo=Math.max(Rgeo,len(a.p));}); edges.forEach(function(e){Rgeo=Math.max(Rgeo,len(e.a),len(e.b));});
  if(window.poly3d){window.poly3d.atoms=atoms; window.poly3d.links=links; window.poly3d.polys=polys; window.poly3d.ghosts=ghosts;}
}
build();

/* ---------- Couleurs du thème ---------- */
var col={};
function css(n){return getComputedStyle(stage).getPropertyValue(n).trim();}
function rgb(hx){hx=hx.replace('#','');return [parseInt(hx.substr(0,2),16),parseInt(hx.substr(2,2),16),parseInt(hx.substr(4,2),16)];}
function mix(c,t,k){return 'rgb('+c.map(function(v,i){return Math.round(v+(t[i]-v)*k);}).join(',')+')';}
function applyTheme(){Object.keys(S.especes).forEach(function(sp){var c=rgb(css('--'+S.especes[sp].teinte));
    col[sp]={hi:mix(c,[255,255,255],.62),mid:mix(c,[0,0,0],0),lo:mix(c,[0,0,0],.38),rim:mix(c,[0,0,0],.55)};});
  col.edge=css('--edge'); col.bond=css('--bond'); col.poly=css('--poly'); draw();}

/* ---------- Projection : orthographique exacte, ou perspective en vue libre ---------- */
var q=quatFor('free'), W=1, H=1, dpr=1, anim=null;
function projector(){var M=mFromQ(q), pers=state.view==='free'&&state.persp, s=Math.min(W,H)/2/fit()*state.zoom, cx=W/2, cy=H/2;
  return function(p){var z=M[6]*p[0]+M[7]*p[1]+M[8]*p[2], f=(pers?DIST/(DIST-z):1)*s;
    return {x:cx+(M[0]*p[0]+M[1]*p[1]+M[2]*p[2])*f, y:cy-(M[3]*p[0]+M[4]*p[1]+M[5]*p[2])*f, z:z, f:f};};}
// demi-largeur à faire tenir dans la vue : rayon de la région dessinée plus le plus gros atome
function fit(){var m=0; Object.keys(S.especes).forEach(function(sp){m=Math.max(m,radius(sp));}); return (Rgeo+m+.06)*1.06;}
// rayon dessiné, en unités de a : rayon réel en modèle compact, réduit en modèle éclaté
function radius(sp){var r=S.especes[sp].r/S.a; return state.model==='compact'?r:.06+.2*r;}

function render(){
  ctx.setTransform(dpr,0,0,dpr,0,0); ctx.clearRect(0,0,W,H);
  var proj=projector(), items=[];
  // trait de a à b, raccourci de ra et rb aux extrémités, découpé en petits morceaux pour un tri en profondeur correct
  function seg(a,b,ra,rb,kind){var L=len(sub(b,a)); if(L-ra-rb<1e-3) return null;
    var t0=ra/L, t1=1-rb/L, n=Math.max(1,Math.ceil((t1-t0)*L/.25)), last=null;
    for(var i=0;i<n;i++){var A=proj(lerp(a,b,t0+(t1-t0)*i/n)), B=proj(lerp(a,b,t0+(t1-t0)*(i+1)/n));
      last={k:kind,A:A,B:B,z:(A.z+B.z)/2}; items.push(last);} return last;}
  atoms.concat(ghosts.filter(function(g){return g.poly===state.poly;})).forEach(function(at){var s=proj(at.p); items.push({k:'atom',sp:at.sp,x:s.x,y:s.y,z:s.z,r:radius(at.sp)*s.f});});
  edges.forEach(function(e){var cuts=e.on.map(function(o){var r=radius(o.sp)/e.L;return [o.t-r,o.t+r];}).sort(function(a,b){return a[0]-b[0];}), t=0;
    cuts.concat([[1,1]]).forEach(function(c){ if(c[0]>t+1e-3) seg(lerp(e.a,e.b,t),lerp(e.a,e.b,Math.min(1,c[0])),0,0,'edge'); t=Math.max(t,c[1]);});});
  if(state.model==='eclate') links.forEach(function(l){seg(l.a.p,l.b.p,radius(l.a.sp),radius(l.b.sp),'bond');});
  axes.forEach(function(ax){var it=seg(ax.s,ax.e,ax.sp?radius(ax.sp):0,0,'edge'); if(it) it.arrow=true;});
  if(state.poly>=0){var po=polys[state.poly], r=radius(po.sp);
    po.E.forEach(function(e){seg(po.V[e[0]],po.V[e[1]],r,r,'poly');});
    po.faces.forEach(function(f){var p=f.map(function(m){return proj(po.V[m]);}), z=0; p.forEach(function(v){z+=v.z/p.length;}); items.push({k:'face',p:p,z:z});});}
  items.sort(function(a,b){return a.z-b.z;});
  items.forEach(function(it){
    if(it.k==='atom'){var c=col[it.sp], g=ctx.createRadialGradient(it.x-it.r*.35,it.y-it.r*.4,it.r*.05,it.x,it.y,it.r);
      g.addColorStop(0,c.hi); g.addColorStop(.55,c.mid); g.addColorStop(1,c.lo);
      ctx.beginPath(); ctx.arc(it.x,it.y,it.r,0,6.2832); ctx.fillStyle=g; ctx.fill();
      ctx.lineWidth=.8; ctx.strokeStyle=c.rim; ctx.stroke();}
    else if(it.k==='face'){ctx.beginPath(); it.p.forEach(function(v,i){ if(i) ctx.lineTo(v.x,v.y); else ctx.moveTo(v.x,v.y);});
      ctx.closePath(); ctx.globalAlpha=.24; ctx.fillStyle=col.poly; ctx.fill(); ctx.globalAlpha=1;}
    else{ctx.beginPath(); ctx.moveTo(it.A.x,it.A.y); ctx.lineTo(it.B.x,it.B.y);
      ctx.lineWidth=it.k==='bond'?Math.max(1.5,.017*(it.A.f+it.B.f)/2):it.k==='poly'?2:1.3;
      ctx.strokeStyle=col[it.k]; ctx.lineCap=it.k==='bond'?'butt':'round'; ctx.stroke();
      if(it.arrow){var dx=it.B.x-it.A.x, dy=it.B.y-it.A.y, L=Math.hypot(dx,dy); if(L>3){dx/=L;dy/=L;
        ctx.beginPath(); ctx.moveTo(it.B.x+dx*7,it.B.y+dy*7); ctx.lineTo(it.B.x-dy*3.2,it.B.y+dx*3.2); ctx.lineTo(it.B.x+dy*3.2,it.B.y-dx*3.2);
        ctx.closePath(); ctx.fillStyle=col.edge; ctx.fill();}}}
  });
  drawCotes(proj); drawAxes(proj); caption();
}

/* ---------- Cotes : hauteur de chaque atome le long de l'axe de projection, en fraction de la période ---------- */
var FR={'1/2':'½','1/3':'⅓','2/3':'⅔','1/4':'¼','3/4':'¾','1/6':'⅙','5/6':'⅚','1/8':'⅛','3/8':'⅜','5/8':'⅝','7/8':'⅞'};
function gcd(a,b){return b?gcd(b,a%b):a;}
function frac(n){var g=gcd(n,24)||24,k=n/g+'/'+24/g; return n===0?'0':n===24?'1':(FR[k]||k);}
function cote24(c,d){var v=dot(c,d)/dot(d,d); if(v<-1e-4||v>1+1e-4) v-=Math.floor(v+1e-4); return Math.round(v*24);}
var pool=[];
function drawCotes(proj){
  var show=state.cotes&&state.view!=='free'&&!anim, used=0;
  if(show){var n=VIEWS[state.view].d, groups={};
    atoms.forEach(function(at){var s=proj(at.p), key=Math.round(s.x*4)+','+Math.round(s.y*4),
        g=groups[key]||(groups[key]={x:s.x,y:s.y,by:{}}), z=cote24(at.c,n), L=g.by[at.sp]||(g.by[at.sp]=[]);
      if(L.indexOf(z)<0) L.push(z);});
    var petit=Object.keys(groups).length>16; // étiquettes plus petites quand elles sont nombreuses
    Object.keys(groups).forEach(function(k){var g=groups[k], el=pool[used]||(pool[used]=labelsEl.appendChild(h('div',{'class':'cote'})));
      used++; el.hidden=false; el.textContent=''; el.style.fontSize=petit?'11px':'';
      Object.keys(S.especes).forEach(function(sp){ if(!g.by[sp]) return; var s=h('span',{}); s.style.color='var(--'+S.especes[sp].teinte+'-ink)';
        s.textContent=g.by[sp].sort(function(a,b){return a-b;}).map(frac).join(';'); el.appendChild(s);});
      el.style.left=g.x+'px'; el.style.top=g.y+'px';});}
  for(var i=used;i<pool.length;i++) pool[i].hidden=true;
}
function drawAxes(proj){axes.forEach(function(ax){var a=proj(ax.s), b=proj(ax.e), dx=b.x-a.x, dy=b.y-a.y, L=Math.hypot(dx,dy);
  ax.el.hidden=L<12; if(L>=12){ax.el.style.left=(b.x+dx/L*17)+'px'; ax.el.style.top=(b.y+dy/L*17)+'px';}});}
function caption(){var v=VIEWS[state.view];
  if(state.view==='free') captionEl.textContent=state.persp?'Vue libre en perspective':'Vue libre sans perspective';
  else captionEl.innerHTML='Projection selon <b>['+state.view+']</b>'+(state.cotes?' · cotes en fraction de <b>'+v.period+'</b>':'');}

var pending=false;
function draw(){ if(pending) return; pending=true; requestAnimationFrame(function(){pending=false; render();});}
function resize(){W=stage.clientWidth||1; H=stage.clientHeight||1; dpr=Math.min(window.devicePixelRatio||1,3);
  canvas.width=Math.round(W*dpr); canvas.height=Math.round(H*dpr); draw();}

/* ---------- Changement de vue ---------- */
var reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
function goTo(view){var q1=quatFor(view); if(reduce){q=q1;anim=null;draw();return;}
  anim={q0:q,q1:q1,t0:performance.now()}; requestAnimationFrame(tick);}
function tick(now){ if(!anim) return; var t=Math.min(1,(now-anim.t0)/420), e=t*t*(3-2*t);
  q=qSlerp(anim.q0,anim.q1,e); if(t>=1){q=anim.q1;anim=null;} else requestAnimationFrame(tick); draw();}

/* ---------- Commandes ---------- */
function press(el,on){el.setAttribute('aria-pressed',on?'true':'false');}
function sync(){
  panel.querySelectorAll('#views button').forEach(function(b){press(b,b.getAttribute('data-view')===state.view);});
  panel.querySelectorAll('#models button').forEach(function(b){press(b,b.getAttribute('data-model')===state.model);});
  panel.querySelectorAll('[data-poly]').forEach(function(b){press(b,+b.getAttribute('data-poly')===state.poly);});
  var oc=panel.querySelector('#o-cotes'), op=panel.querySelector('#o-persp');
  press(oc,state.cotes&&state.view!=='free'); oc.disabled=state.view==='free';
  press(op,state.persp&&state.view==='free'); op.disabled=state.view!=='free';
  var opr=panel.querySelector('#o-prisme'); if(opr) press(opr,state.prisme); draw();}
panel.addEventListener('click',function(e){var b=e.target.closest('button'); if(!b||b.disabled) return;
  if(b.hasAttribute('data-view')){state.view=b.getAttribute('data-view'); if(state.view==='free') state.persp=true; goTo(state.view);}
  else if(b.hasAttribute('data-model')) state.model=b.getAttribute('data-model');
  else if(b.hasAttribute('data-poly')){var i=+b.getAttribute('data-poly'); state.poly=state.poly===i?-1:i;}
  else if(b.id==='o-cotes') state.cotes=!state.cotes;
  else if(b.id==='o-persp') state.persp=!state.persp;
  else if(b.id==='o-prisme'){state.prisme=!state.prisme; build();}
  sync();});

/* ---------- Gestes : glisser = tourner, pincer ou molette = zoomer ---------- */
var pts={}, pinch=0, twist=0;
function count(){return Object.keys(pts).length;}
function spread(){var k=Object.keys(pts);return Math.hypot(pts[k[0]].x-pts[k[1]].x,pts[k[0]].y-pts[k[1]].y);}
function slant(){var k=Object.keys(pts);return Math.atan2(pts[k[1]].y-pts[k[0]].y,pts[k[1]].x-pts[k[0]].x);}
stage.addEventListener('pointerdown',function(e){pts[e.pointerId]={x:e.clientX,y:e.clientY};
  try{stage.setPointerCapture(e.pointerId);}catch(_){ } stage.classList.add('dragging'); if(count()===2){pinch=spread(); twist=slant();}});
stage.addEventListener('pointermove',function(e){var p=pts[e.pointerId]; if(!p) return;
  var dx=e.clientX-p.x, dy=e.clientY-p.y; p.x=e.clientX; p.y=e.clientY;
  if(count()===2){ // deux doigts : l'écart règle le zoom, le pivotement fait tourner autour de l'axe de visée
    var s=spread(), a=slant(), da=a-twist; if(da>Math.PI) da-=2*Math.PI; else if(da<-Math.PI) da+=2*Math.PI;
    if(pinch>0){anim=null; q=qNorm(qMul([0,0,Math.sin(-da/2),Math.cos(-da/2)],q)); setZoom(state.zoom*s/pinch);}
    pinch=s; twist=a; return;}
  if(count()!==1||(!dx&&!dy)) return;
  if(state.view!=='free'){state.view='free';state.persp=false;sync();} // on quitte l'axe en restant sans perspective
  anim=null; var l=Math.hypot(dx,dy), hf=l*.004, sn=Math.sin(hf)/l;
  q=qNorm(qMul([dy*sn,dx*sn,0,Math.cos(hf)],q)); draw();});
function up(e){delete pts[e.pointerId]; pinch=0; if(!count()) stage.classList.remove('dragging');}
stage.addEventListener('pointerup',up); stage.addEventListener('pointercancel',up);
stage.addEventListener('wheel',function(e){e.preventDefault(); setZoom(state.zoom*Math.exp(-e.deltaY*.0015));},{passive:false});
function setZoom(z){state.zoom=Math.max(.5,Math.min(5,z)); draw();}

/* ---------- Démarrage ---------- */
var ro=null; if(window.ResizeObserver){ro=new ResizeObserver(resize); ro.observe(stage);} else window.addEventListener('resize',resize);
if(window.matchMedia) matchMedia('(prefers-color-scheme: dark)').addEventListener('change',applyTheme);
resize(); applyTheme(); sync();
window.poly3d={state:state,atoms:atoms,links:links,polys:polys,ghosts:ghosts,project:function(p){return projector()(p);}}; // pour les contrôles
return {el:app,touching:function(){return count()>0;},close:function(){ if(ro) ro.disconnect(); app.remove();}};
}

/* ---------- Démarrage selon la page ---------- */
function find(id){return ALL.filter(function(s){return s.id===id;})[0];}
window.Poly3D={open:function(id,opt){var S=find(id); return S?viewer(S,opt):null;}};
var id=document.body.getAttribute('data-structure'), liste=document.getElementById('liste');
if(id){ if(!window.Poly3D.open(id)) document.body.textContent='Structure inconnue : '+id; }
else if(liste){ // page d'accueil : une rubrique par famille, dans l'ordre du poly ; une structure sans famille va dans « Autres »
  var fams=(window.POLY3D_FAMILLES||[]).slice(), vus={}; fams.forEach(function(f){f.ids.forEach(function(k){vus[k]=1;});});
  var reste=ALL.filter(function(s){return !vus[s.id];}).map(function(s){return s.id;}); if(reste.length) fams.push({nom:fams.length?'Autres structures':'',ids:reste});
  fams.forEach(function(f){
    if(f.nom){var h2=document.createElement('h2'); h2.textContent=f.nom; liste.appendChild(h2);}
    var ul=document.createElement('ul'); liste.appendChild(ul);
    f.ids.forEach(function(k){var s=find(k); if(!s) return; var li=document.createElement('li'), a=document.createElement('a');
      a.href=s.id+'.html'; a.textContent=s.nom; var c=document.createElement('code'); c.textContent=s.formule; a.appendChild(c);
      var sm=document.createElement('small'); sm.textContent=s.resume; a.appendChild(sm); li.appendChild(a); ul.appendChild(li);});});
}
})();
