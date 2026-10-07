/* Poly3D Cristallochimie : page scanner. La caméra envoie environ deux images par seconde au module de reconnaissance
   (reco.js, dans un worker). Quand deux images de suite désignent la même structure, elle s'affiche en 3D
   par-dessus l'image de la caméra, à tourner au doigt. */
(function(){
'use strict';
var video=document.getElementById('video'), msg=document.getElementById('msg'), mesure=document.getElementById('mesure'),
    start=document.getElementById('start'), etat=document.getElementById('etat'), viseur=document.getElementById('viseur');
var NOMS={}; (window.POLY3D_STRUCTURES||[]).forEach(function(s){NOMS[s.id]=s.nom;});
var canvas=document.createElement('canvas'), ctx=canvas.getContext('2d',{willReadFrequently:true}), worker=null, busy=false, last=null, done=false, timer=null;

function fail(text){start.hidden=false; start.firstElementChild.innerHTML='<p></p><a class="lien" href="index.html">Choisir dans la liste</a>'; start.querySelector('p').textContent=text; etat.hidden=true; viseur.hidden=true;}

function tick(){
  if(done||busy||!video.videoWidth){timer=setTimeout(tick,200); return;}
  // image réduite : petit côté de 480 pixels, grand côté limité à 1040 (recadré au centre)
  var vw=video.videoWidth, vh=video.videoHeight, k=480/Math.min(vw,vh), w=Math.round(Math.min(vw*k,1040)), h=Math.round(Math.min(vh*k,1040));
  canvas.width=w; canvas.height=h; ctx.drawImage(video,(vw-w/k)/2,(vh-h/k)/2,w/k,h/k,0,0,w,h);
  var d=ctx.getImageData(0,0,w,h); busy=true; worker.postMessage({rgba:d.data,w:w,h:h},[d.data.buffer]);
}
function onResult(e){var r=e.data; busy=false; if(done) return;
  mesure.textContent=r.inliers+' points concordants · '+r.ms+' ms';
  if(r.id&&r.id===last){done=true; msg.className='msg ok'; msg.textContent=(NOMS[r.id]||r.id)+' reconnu';
    setTimeout(function(){ // la visionneuse remplace le scanner et récupère l'image de la caméra comme fond
      worker.terminate(); worker=null; var old=document.querySelector('.app');
      if(window.Poly3D&&window.Poly3D.open(r.id,{video:video})){old.remove(); var p=video.play(); if(p&&p.catch) p.catch(function(){});}
      else location.href=r.id+'.html';},600); return;}
  last=r.id; msg.className='msg'; msg.textContent=r.id?'Figure repérée, ne bougez plus…':'Recherche d\'une figure…';
  timer=setTimeout(tick,120);
}
function run(){
  if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){fail('Ce navigateur ne donne pas accès à la caméra.'); return;}
  navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720}}}).then(function(stream){
    video.srcObject=stream; start.hidden=true; etat.hidden=false; viseur.hidden=false;
    if(!worker){worker=new Worker('reco.js'); worker.onmessage=onResult; worker.onerror=function(){fail('La reconnaissance n\'a pas pu démarrer.');};}
    var p=video.play(); if(p&&p.catch) p.catch(function(){});
    done=false; busy=false; last=null; clearTimeout(timer); tick();
  }).catch(function(){fail('La caméra n\'est pas accessible. Autorisez-la dans le navigateur, ou choisissez la structure dans la liste.');});
}
document.getElementById('go').addEventListener('click',run);
// caméra déjà autorisée (retour depuis une structure) : on démarre sans redemander
if(navigator.permissions&&navigator.permissions.query) navigator.permissions.query({name:'camera'}).then(function(s){ if(s.state==='granted') run();}).catch(function(){});
})();
