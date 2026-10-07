/* Fiches des structures. Pour en ajouter une : copier une fiche, changer les valeurs, créer la page <id>.html.
   Coordonnées réduites dans la maille cubique ; rayons et paramètre a en picomètres.
   teinte : anion (vert), cation (violet), metal (bleu), carbone (gris). */
(function(){
  // les quatre nœuds du réseau cfc, décalés de (dx,dy,dz)
  function cfc(sp,dx,dy,dz){dx=dx||0;dy=dy||0;dz=dz||0;
    return [[0,0,0],[.5,.5,0],[.5,0,.5],[0,.5,.5]].map(function(p){return [sp,(p[0]+dx)%1,(p[1]+dy)%1,(p[2]+dz)%1];});}

  window.POLY3D_STRUCTURES=[
    {id:'cc', nom:'Cubique centré', formule:'cc', groupe:'Im3̄m',
     resume:'Un atome à chaque sommet et un au centre du cube. Exemple : fer α.',
     a:287, especes:{M:{nom:'Fe',r:124,teinte:'metal'}},
     motif:[['M',0,0,0],['M',.5,.5,.5]],
     liaisons:[['M','M']],
     infos:'Z = 2 · coordinence 8 · compacité 0,68 · tangence selon la diagonale du cube'},

    {id:'cfc', nom:'Cubique à faces centrées', formule:'cfc', groupe:'Fm3̄m',
     resume:'Empilement compact ABCABC. Exemple : cuivre.',
     a:361, especes:{M:{nom:'Cu',r:128,teinte:'metal'}},
     motif:cfc('M'),
     polyedres:[{nom:'Site octaédrique',centre:[.5,.5,.5],sommets:'M'},{nom:'Site tétraédrique',centre:[.25,.25,.25],sommets:'M'}],
     infos:'Z = 4 · coordinence 12 · compacité 0,74 · 4 sites octaédriques, 8 tétraédriques'},

    {id:'cscl', nom:'Chlorure de césium', formule:'CsCl', groupe:'Pm3̄m',
     resume:'Réseau cubique simple de Cl⁻, Cs⁺ au centre du cube.',
     a:412, especes:{Cl:{nom:'Cl⁻',r:181,teinte:'anion'},Cs:{nom:'Cs⁺',r:174,teinte:'cation'}},
     motif:[['Cl',0,0,0],['Cs',.5,.5,.5]],
     liaisons:[['Cs','Cl']],
     polyedres:[{nom:'Cube CsCl₈',centre:[.5,.5,.5],sommets:'Cl'}],
     infos:'Z = 1 CsCl par maille · coordinence 8:8'},

    {id:'nacl', nom:'Chlorure de sodium', formule:'NaCl', groupe:'Fm3̄m',
     resume:'Réseau cfc de Cl⁻, Na⁺ dans tous les sites octaédriques.',
     a:564, especes:{Cl:{nom:'Cl⁻',r:181,teinte:'anion'},Na:{nom:'Na⁺',r:102,teinte:'cation'}},
     motif:cfc('Cl').concat(cfc('Na',.5,.5,.5)),
     liaisons:[['Na','Cl']],
     polyedres:[{nom:'Octaèdre NaCl₆',centre:[.5,.5,.5],sommets:'Cl'}],
     infos:'Z = 4 NaCl par maille · coordinence 6:6'},

    {id:'zns', nom:'Sulfure de zinc, blende', formule:'ZnS', groupe:'F4̄3m',
     resume:'Réseau cfc de S²⁻, Zn²⁺ dans un site tétraédrique sur deux.',
     a:541, especes:{S:{nom:'S²⁻',r:184,teinte:'anion'},Zn:{nom:'Zn²⁺',r:60,teinte:'cation'}},
     motif:cfc('S').concat(cfc('Zn',.25,.25,.25)),
     liaisons:[['Zn','S']],
     polyedres:[{nom:'Tétraèdre ZnS₄',centre:[.25,.25,.25],sommets:'S'}],
     infos:'Z = 4 ZnS par maille · coordinence 4:4'},

    {id:'caf2', nom:'Fluorine', formule:'CaF₂', groupe:'Fm3̄m',
     resume:'Réseau cfc de Ca²⁺, F⁻ dans tous les sites tétraédriques.',
     a:546, especes:{F:{nom:'F⁻',r:131,teinte:'anion'},Ca:{nom:'Ca²⁺',r:112,teinte:'cation'}},
     motif:cfc('Ca').concat(cfc('F',.25,.25,.25),cfc('F',.75,.75,.75)),
     liaisons:[['Ca','F']],
     polyedres:[{nom:'Tétraèdre FCa₄',centre:[.25,.25,.25],sommets:'Ca'}],
     infos:'Z = 4 CaF₂ par maille · coordinence 8:4'},

    {id:'diamant', nom:'Diamant', formule:'C', groupe:'Fd3̄m',
     resume:'Réseau cfc de carbone, plus un site tétraédrique sur deux occupé par du carbone.',
     a:357, especes:{C:{nom:'C',r:77,teinte:'carbone'}},
     motif:cfc('C').concat(cfc('C',.25,.25,.25)),
     liaisons:[['C','C']],
     polyedres:[{nom:'Tétraèdre CC₄',centre:[.25,.25,.25],sommets:'C'}],
     infos:'Z = 8 · coordinence 4 · compacité 0,34'}
  ];
})();
