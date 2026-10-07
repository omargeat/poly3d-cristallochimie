/* Prépare reco-data.js : les points de repère de chaque page du poly, pour la reconnaissance par caméra.
   Usage : node tools/build-reco.js <dossier des pages en PNG, 72 points par pouce : p-01.png, p-02.png…>
   (pages obtenues avec : pdftoppm -r 72 -gray -png poly.pdf dossier/p)
   zones : sur chaque page, le rectangle de chaque structure, en points (page de 720 × 540). */
const sharp=require(process.env.SHARP||'sharp'), fs=require('fs'), path=require('path'), R=require('../reco.js');
const PAGES={
  1:[{id:'hc',x0:0,y0:0,x1:720,y1:540}],
  2:[{id:'cfc',x0:0,y0:0,x1:720,y1:540}],
  3:[{id:'cc',x0:0,y0:0,x1:720,y1:540}],
  4:[{id:'hc',x0:0,y0:0,x1:720,y1:540}],
  5:[{id:'cfc',x0:0,y0:0,x1:720,y1:540}],
  6:[{id:'cscl',x0:0,y0:0,x1:720,y1:232},{id:'nacl',x0:0,y0:232,x1:720,y1:540}],
  7:[{id:'zns',x0:0,y0:0,x1:340,y1:540},{id:'wurtzite',x0:340,y0:0,x1:720,y1:540}],
  8:[{id:'caf2',x0:0,y0:0,x1:720,y1:540}],
  9:[{id:'diamant',x0:0,y0:0,x1:315,y1:540},{id:'graphite',x0:315,y0:0,x1:720,y1:540}]
};
(async()=>{const dir=process.argv[2], out=[];
  for(const p of Object.keys(PAGES)){
    const {data,info}=await sharp(path.join(dir,'p-'+String(p).padStart(2,'0')+'.png')).greyscale().raw().toBuffer({resolveWithObject:true});
    const f=R.extract(new Uint8Array(data),info.width,info.height,+(process.env.NREF||1200)), r=R.pack(f); r.page=+p; r.w=info.width; r.h=info.height; r.zones=PAGES[p]; out.push(r);
    if(process.env.VERBOSE) console.log('page',p,info.width+'x'+info.height,f.n,'points');}
  fs.writeFileSync(path.join(__dirname,'..','reco-data.js'),'/* Fichier produit par tools/build-reco.js : ne pas modifier à la main. */\nself.POLY3D_RECO_DATA='+JSON.stringify(out)+';\n');
})();
