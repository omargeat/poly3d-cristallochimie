/* Poly3D Cristallochimie : page labo, pour essayer les mouvements dynamiques sans toucher au scanner.
   Même principe que scanner.js, avec en plus le suivi : une fois la figure reconnue, on ne cherche plus que sa page,
   plusieurs fois par seconde, et la structure est placée sur la figure (position, taille, et angle de la feuille). */
(function(){
'use strict';
var video=document.getElementById('video'), msg=document.getElementById('msg'), start=document.getElementById('start'),
    etat=document.getElementById('etat'), viseur=document.getElementById('viseur'), accueil=document.querySelector('.app');
var NOMS={}; (window.POLY3D_STRUCTURES||[]).forEach(function(s){NOMS[s.id]=s.nom;});
// où se trouve la figure principale de chaque structure sur sa page : [x, y, largeur], en points (page de 720 × 540)
var FIG={1:{hc:[116,306,100]}, 2:{cfc:[144,254,150]}, 3:{cc:[126,262,144]}, 4:{hc:[324,158,180]}, 5:{cfc:[198,156,130]},
  6:{cscl:[140,156,108],nacl:[506,363,170]}, 7:{zns:[156,210,200],wurtzite:[474,210,168]}, 8:{caf2:[210,195,220]}, 9:{diamant:[174,120,250],graphite:[474,348,300]}};
var labo={suivre:true,tourner:true};                    // interrupteurs, conservés d'une structure à l'autre
var canvas=document.createElement('canvas'), ctx=canvas.getContext('2d',{willReadFrequently:true}), worker=null, busy=false, timer=null, geo=null;
var vue=null, courant=null, page=0, candidat=null, suite=0, echecs=0, dernier=0, cadence=0, tPrec=0, lecture=null;

function fail(text){start.hidden=false; start.firstElementChild.innerHTML='<p></p><a class="lien" href="index.html">Choisir dans la liste</a>'; start.querySelector('p').textContent=text; etat.hidden=true; viseur.hidden=true;}
function next(ms){clearTimeout(timer); timer=setTimeout(tick,ms);}

function tick(){
  if(busy||!video.videoWidth||(vue&&vue.touching())||document.hidden){next(200); return;}
  var vw=video.videoWidth, vh=video.videoHeight, k=480/Math.min(vw,vh), w=Math.round(Math.min(vw*k,1040)), h=Math.round(Math.min(vh*k,1040));
  canvas.width=w; canvas.height=h; ctx.drawImage(video,(vw-w/k)/2,(vh-h/k)/2,w/k,h/k,0,0,w,h);
  var d=ctx.getImageData(0,0,w,h), suivi=vue&&page&&echecs<2; geo={vw:vw,vh:vh,k:k,w:w,h:h}; busy=true;
  worker.postMessage({rgba:d.data,w:w,h:h,only:suivi?page:0,nmax:suivi?500:700},[d.data.buffer]);
}
function inv3(m){var a=m[0],b=m[1],c=m[2],d=m[3],e=m[4],f=m[5],g=m[6],h=m[7],i=m[8], A=e*i-f*h, B=f*g-d*i, C=d*h-e*g, det=a*A+b*B+c*C;
  return [A/det,(c*h-b*i)/det,(b*f-c*e)/det, B/det,(a*i-c*g)/det,(c*d-a*f)/det, C/det,(b*g-a*h)/det,(a*e-b*d)/det];}
// point de la page (en points) -> pixel de l'écran, en passant par l'image analysée puis par la vidéo affichée
function versEcran(Hi,px,py){var z=Hi[6]*px+Hi[7]*py+Hi[8], x=(Hi[0]*px+Hi[1]*py+Hi[2])/z, y=(Hi[3]*px+Hi[4]*py+Hi[5])/z;
  var u=(geo.vw-geo.w/geo.k)/2+x/geo.k, v=(geo.vh-geo.h/geo.k)/2+y/geo.k, sz=vue.size(), d=Math.max(sz[0]/geo.vw,sz[1]/geo.vh);
  return [(u-geo.vw/2)*d+sz[0]/2,(v-geo.vh/2)*d+sz[1]/2];}
function ancrer(r){var f=FIG[r.page]&&FIG[r.page][courant]; if(!f||!r.H||!labo.suivre){vue.setAnchor(null); return;}
  var Hi=inv3(r.H), c=versEcran(Hi,f[0],f[1]), a=versEcran(Hi,f[0]-f[2]/2,f[1]), b=versEcran(Hi,f[0]+f[2]/2,f[1]);
  var larg=Math.hypot(b[0]-a[0],b[1]-a[1]); if(!(larg>20&&larg<3000)){vue.setAnchor(null); return;}
  vue.setAnchor({x:c[0],y:c[1],s:larg*.62,r:labo.tourner?Math.atan2(b[1]-a[1],b[0]-a[0]):0});}
function show(id){
  var v=window.Poly3D&&window.Poly3D.open(id,{video:video,labo:labo}); if(!v){location.href=id+'.html'; return;}
  if(vue) vue.close(); else accueil.remove();
  vue=v; courant=id; lecture=document.createElement('div'); lecture.className='mesure labo-mesure'; vue.stage.appendChild(lecture);
  var p=video.play(); if(p&&p.catch) p.catch(function(){});
}
function onResult(e){var r=e.data, now=Date.now(); busy=false;
  if(r.id&&r.id===candidat) suite++; else {candidat=r.id; suite=r.id?1:0;}
  if(!vue){msg.className='msg'; msg.textContent=r.id?'Figure repérée, ne bougez plus…':'Recherche d\'une figure…';}
  if(candidat&&candidat!==courant&&suite>=2&&!(vue&&vue.touching())){show(candidat); page=r.page; candidat=null; suite=0;}
  if(vue){
    if(r.id===courant){page=r.page; echecs=0; dernier=now; ancrer(r); cadence=tPrec?.7*cadence+.3*(1000/(now-tPrec)):0; tPrec=now;}
    else {echecs++; tPrec=0; if(now-dernier>2500) vue.setAnchor(null);}      // figure perdue : la structure revient au centre
    lecture.textContent=(r.id===courant?'suivi '+cadence.toFixed(1).replace('.',',')+'/s · '+r.inliers+' pts · '+r.ms+' ms':'figure perdue');
  }
  next(vue&&echecs<2?40:(vue&&!candidat?450:150));
}
var lance=false;
function run(){
  if(lance) return; lance=true;
  if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){fail('Ce navigateur ne donne pas accès à la caméra.'); return;}
  navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720}}}).then(function(stream){
    video.srcObject=stream; start.hidden=true; etat.hidden=false; viseur.hidden=false;
    if(!worker){worker=new Worker('reco.js'); worker.onmessage=onResult; worker.onerror=function(){ if(!vue) fail('La reconnaissance n\'a pas pu démarrer.');};}
    var p=video.play(); if(p&&p.catch) p.catch(function(){});
    busy=false; next(0);
  }).catch(function(){lance=false; fail('La caméra n\'est pas accessible. Autorisez-la dans le navigateur, ou choisissez la structure dans la liste.');});
}
document.getElementById('go').addEventListener('click',run);
if(navigator.permissions&&navigator.permissions.query) navigator.permissions.query({name:'camera'}).then(function(s){ if(s.state==='granted') setTimeout(run,1500);}).catch(function(){});
window.poly3dLabo={etat:function(){return {courant:courant,page:page,cadence:cadence,echecs:echecs};}};
})();
