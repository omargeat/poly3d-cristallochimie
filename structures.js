/* Fiches des structures. Pour en ajouter une : copier une fiche, changer les valeurs, créer la page <id>.html.
   Coordonnées réduites dans la maille ; rayons et paramètres a, c en picomètres.
   Maille cubique par défaut ; maille:{type:'hex',c:...} pour une maille hexagonale (a, a, c, 120°).
   Les rayons de ZnS et CaF₂ sont réduits de 3 à 4 % par rapport aux rayons ioniques tabulés, pour que cation et anion soient tangents.
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
     a:362, especes:{M:{nom:'Cu',r:128,teinte:'metal'}},
     motif:cfc('M'),
     polyedres:[{nom:'Site octaédrique',centre:[.5,.5,.5],sommets:'M'},{nom:'Site tétraédrique',centre:[.25,.25,.25],sommets:'M'}],
     infos:'Z = 4 · coordinence 12 · compacité 0,74 · 4 sites octaédriques, 8 tétraédriques'},

    {id:'hc', nom:'Hexagonal compact', formule:'hc', groupe:'P6₃/mmc',
     resume:'Empilement compact ABAB. Exemple : magnésium, avec le rapport c/a idéal.',
     a:321, maille:{type:'hex',c:524}, especes:{M:{nom:'Mg',r:160,teinte:'metal'}},
     motif:[['M',0,0,0],['M',1/3,2/3,.5]],
     polyedres:[{nom:'Site octaédrique',centre:[2/3,1/3,.25],sommets:'M'},{nom:'Site tétraédrique',centre:[1/3,2/3,.125],sommets:'M'}],
     infos:'Z = 2 (maille simple) · coordinence 12 · compacité 0,74 · c/a = 1,633'},

    {id:'cscl', nom:'Chlorure de césium', formule:'CsCl', groupe:'Pm3̄m',
     resume:'Réseau cubique simple de Cl⁻, Cs⁺ au centre du cube.',
     a:412, especes:{Cl:{nom:'Cl⁻',r:181,teinte:'anion'},Cs:{nom:'Cs⁺',r:174,teinte:'cation'}},
     motif:[['Cl',0,0,0],['Cs',.5,.5,.5]],
     liaisons:[['Cs','Cl']],
     polyedres:[{nom:'Cube CsCl₈',centre:[.5,.5,.5],sommets:'Cl'}],
     infos:'Z = 1 CsCl par maille · coordinence 8:8'},

    {id:'nacl', nom:'Chlorure de sodium', formule:'NaCl', groupe:'Fm3̄m',
     resume:'Réseau cfc de Cl⁻, Na⁺ dans tous les sites octaédriques.',
     a:564, especes:{Cl:{nom:'Cl⁻',r:181,teinte:'anion'},Na:{nom:'Na⁺',r:101,teinte:'cation'}},
     motif:cfc('Cl').concat(cfc('Na',.5,.5,.5)),
     liaisons:[['Na','Cl']],
     polyedres:[{nom:'Octaèdre NaCl₆',centre:[.5,.5,.5],sommets:'Cl'}],
     infos:'Z = 4 NaCl par maille · coordinence 6:6'},

    {id:'zns', nom:'Sulfure de zinc, blende', formule:'ZnS', groupe:'F4̄3m',
     resume:'Réseau cfc de S²⁻, Zn²⁺ dans un site tétraédrique sur deux.',
     a:541, especes:{S:{nom:'S²⁻',r:177,teinte:'anion'},Zn:{nom:'Zn²⁺',r:57,teinte:'cation'}},
     motif:cfc('S').concat(cfc('Zn',.25,.25,.25)),
     liaisons:[['Zn','S']],
     polyedres:[{nom:'Tétraèdre ZnS₄',centre:[.25,.25,.25],sommets:'S'}],
     infos:'Z = 4 ZnS par maille · coordinence 4:4'},

    {id:'wurtzite', nom:'Sulfure de zinc, wurtzite', formule:'ZnS', groupe:'P6₃mc',
     resume:'Réseau hc de S²⁻, Zn²⁺ dans un site tétraédrique sur deux.',
     a:382, maille:{type:'hex',c:626}, especes:{S:{nom:'S²⁻',r:177,teinte:'anion'},Zn:{nom:'Zn²⁺',r:57,teinte:'cation'}},
     motif:[['S',0,0,0],['S',1/3,2/3,.5],['Zn',0,0,.375],['Zn',1/3,2/3,.875]],
     liaisons:[['Zn','S']],
     polyedres:[{nom:'Tétraèdre ZnS₄',centre:[1/3,2/3,.875],sommets:'S'}],
     infos:'Z = 2 ZnS par maille · coordinence 4:4'},

    {id:'caf2', nom:'Fluorine', formule:'CaF₂', groupe:'Fm3̄m',
     resume:'Réseau cfc de Ca²⁺, F⁻ dans tous les sites tétraédriques.',
     a:546, especes:{F:{nom:'F⁻',r:127,teinte:'anion'},Ca:{nom:'Ca²⁺',r:109,teinte:'cation'}},
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
     infos:'Z = 8 · coordinence 4 · compacité 0,34'},

    {id:'graphite', nom:'Graphite', formule:'C', groupe:'P6₃/mmc',
     resume:'Feuillets hexagonaux de carbone empilés ABAB, liés entre eux par des forces de van der Waals.',
     a:246, maille:{type:'hex',c:680}, especes:{C:{nom:'C',r:71,teinte:'carbone'}},
     motif:[['C',0,0,0],['C',1/3,2/3,0],['C',0,0,.5],['C',2/3,1/3,.5]],
     liaisons:[['C','C']],
     region:{hexagone:1.34,aretes:'maille'},
     infos:'Z = 4 · C–C = 142 pm dans le feuillet · 340 pm entre feuillets'}
  ];
})();
