# Poly3D Cristallochimie

Visionneuse 3D des structures cristallines du cours de cristallochimie de L2 (Aix-Marseille Université).
Elle fonctionne dans le navigateur d'un téléphone, d'une tablette ou d'un ordinateur, sans installation.

Site : https://omargeat.github.io/poly3d-cristallochimie/

## Organisation

- `structures.js` : les fiches des structures (réseau, positions, rayons). C'est le seul fichier à modifier pour corriger une valeur.
- `poly3d.js` : le moteur commun (dessin, projections, cotes, gestes). Aucune bibliothèque externe.
- `poly3d.css` : la mise en page commune.
- `index.html` : la page d'accueil, qui liste les fiches.
- `<id>.html` : une page par structure, qui ne contient que le nom de la fiche à afficher.

## Ajouter une structure

1. Ajouter une fiche dans `structures.js`.
2. Copier une page existante (par exemple `nacl.html`) sous le nom `<id>.html` et y changer `data-structure`.
