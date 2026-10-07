/* Poly3D Cristallochimie : page scanner. La caméra envoie des images au module de reconnaissance (reco.js, dans un worker).
   Quand plusieurs images de suite désignent la même structure, elle s'affiche en 3D par-dessus l'image de la caméra.
   La recherche continue ensuite : viser une autre figure du poly remplace la structure affichée. */
(function(){
'use strict';
var video=document.getElementById('video'), msg=document.getElementById('msg'), mesure=document.getElementById('mesure'),
    start=document.getElementById('start'), etat=document.getElementById('etat'), viseur=document.getElementById('viseur'), accueil=document.querySelector('.app');
var NOMS={}; (window.POLY3D_STRUCTURES||[]).forEach(function(s){NOMS[s.id]=s.nom;});
var canvas=document.createElement('canvas'), ctx=canvas.getContext('2d',{willReadFrequently:true}), worker=null, busy=false, timer=null;
var vue=null, courant=null, candidat=null, suite=0, debut=0;   // structure affichée, et reconnaissance en cours de confirmation

function fail(text){start.hidden=false; start.firstElementChild.innerHTML='<p></p><a class="lien" href="index.html">Choisir dans la liste</a>'; start.querySelector('p').textContent=text; etat.hidden=true; viseur.hidden=true;}
function next(ms){clearTimeout(timer); timer=setTimeout(tick,ms);}

function tick(){
  // pas d'analyse sans image, ni pendant que les doigts manipulent la structure
  if(busy||!video.videoWidth||(vue&&vue.touching())||document.hidden){next(300); return;}
  // image réduite : petit côté de 480 pixels, grand côté limité à 1040 (recadré au centre)
  var vw=video.videoWidth, vh=video.videoHeight, k=480/Math.min(vw,vh), w=Math.round(Math.min(vw*k,1040)), h=Math.round(Math.min(vh*k,1040));
  canvas.width=w; canvas.height=h; ctx.drawImage(video,(vw-w/k)/2,(vh-h/k)/2,w/k,h/k,0,0,w,h);
  var d=ctx.getImageData(0,0,w,h); busy=true; worker.postMessage({rgba:d.data,w:w,h:h},[d.data.buffer]);
}
function show(id){ // affiche la structure par-dessus la caméra ; la précédente, s'il y en a une, est retirée ensuite
  var v=window.Poly3D&&window.Poly3D.open(id,{video:video}); if(!v){location.href=id+'.html'; return;}
  if(vue) vue.close(); else accueil.remove();
  vue=v; courant=id; var p=video.play(); if(p&&p.catch) p.catch(function(){});
}
function onResult(e){var r=e.data; busy=false;
  if(r.id&&r.id===candidat) suite++; else {candidat=r.id; suite=r.id?1:0;}
  if(!vue){mesure.textContent=''; msg.className='msg'; if(!debut) debut=Date.now();
    // sans résultat au bout de quelques secondes, le plus souvent le téléphone est trop près de la feuille
    msg.textContent=r.id?'Figure repérée, ne bougez plus…':(Date.now()-debut>5000?'Reculez un peu : la moitié de la page doit être visible':'Recherche d\'une figure…');}
  // deux reconnaissances de suite sont demandées, pour afficher une structure comme pour en changer
  if(candidat&&candidat!==courant&&suite>=2&&!(vue&&vue.touching())){
    if(!vue){msg.className='msg ok'; msg.textContent=(NOMS[candidat]||candidat)+' reconnu';}
    show(candidat); candidat=null; suite=0;}
  next(vue&&!candidat?450:150);   // environ deux analyses par seconde une fois la structure affichée, plus vite pendant une confirmation
}
var lance=false;
function run(){
  if(lance) return; lance=true;
  if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){fail('Ce navigateur ne donne pas accès à la caméra.'); return;}
  navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720}}}).then(function(stream){
    video.srcObject=stream; start.hidden=true; etat.hidden=false; viseur.hidden=false;
    if(!worker){worker=new Worker('reco.js?v=10'); worker.onmessage=onResult; worker.onerror=function(){ if(!vue) fail('La reconnaissance n\'a pas pu démarrer.');};}
    var p=video.play(); if(p&&p.catch) p.catch(function(){});
    busy=false; next(0);
  }).catch(function(){lance=false; fail('La caméra n\'est pas accessible. Autorisez-la dans le navigateur, ou choisissez la structure dans la liste.');});
}
document.getElementById('go').addEventListener('click',run);
// caméra déjà autorisée : on démarre sans redemander, après avoir laissé le temps de lire le message
if(navigator.permissions&&navigator.permissions.query) navigator.permissions.query({name:'camera'}).then(function(s){ if(s.state==='granted') setTimeout(run,1500);}).catch(function(){});
})();
