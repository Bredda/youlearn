# Formateur : cours et révisions

L'espace **Formateur → Cours** sert à créer des cours et à les faire évoluer. Il est ouvert aux formateurs et aux
administrateurs.

## Cours et révisions

- Le **cours** est la fiche : nom, description, image, catégories et groupes. Ces informations ne sont pas versionnées.
- Les **révisions** contiennent le contenu (des chapitres, eux-mêmes faits de textes, de vidéos et d'un quiz). Un cours peut en avoir plusieurs au fil du temps, mais
  chacune passe par des **statuts** et une révision publiée ne change plus (voir [le cycle de vie](#cycle-de-vie-dune-révision)).

## Ce que vous pouvez modifier

Un administrateur gère tous les cours. Un formateur gère les cours qui partagent au moins un de **ses** groupes, et ne peut
ajouter ou retirer que ses propres groupes sur un cours : les groupes d'autres équipes, et **Commun**, restent tels quels.
Seul un administrateur peut rattacher un cours à **Commun**.

## Créer un cours

**Cours → Nouveau cours** :

| Champ | À savoir |
|---|---|
| **Nom** | obligatoire |
| **Slug** | identifiant dans l'adresse du cours, unique. Généré à partir du nom si vous le laissez vide. Figé dès que le cours a été publié. |
| **Description** | texte libre |
| **Image** | PNG, JPEG, GIF ou WebP, 5 Mo maximum (disponible une fois le cours créé, via **Modifier**) |
| **Catégories** | mots-clés libres séparés par des virgules ; ils servent à filtrer le catalogue |
| **Groupes** | au moins un : ils décident de **qui voit** le cours |

Le bouton **Nouveau cours** est désactivé si vous n'appartenez à aucun groupe : demandez à un administrateur de vous en
attribuer un.

La liste des cours se cherche (nom ou slug) et se filtre par statut, groupe et catégorie. Le menu **Actions** de chaque ligne
permet d'**Ouvrir**, **Modifier** ou **Supprimer** le cours.

## Cycle de vie d'une révision

Ouvrez un cours pour voir ses révisions, de la plus récemment modifiée à la plus ancienne. Chacune a un nom automatique du type `whispering_toucan`, qui ne change plus ; cliquer sur ce nom ouvre la révision (en édition pour un brouillon, en lecture sinon).

| Statut | Signification | Modifiable ? |
|---|---|---|
| **Brouillon** | en cours d'écriture | oui |
| **Relecture** | prête à être relue, accessible par un lien | non |
| **Publiée** | celle que voient les apprenants | non |
| **Dépréciée** | ancienne version, conservée dans l'historique | non |

```
Brouillon → Relecture → Publiée → Dépréciée
     ↑___________|
   (Repasser en brouillon)
```

Règles :

- Un cours a **au plus un brouillon, une relecture et une publiée** en même temps (et autant de dépréciées que nécessaire).
  Tant qu'un brouillon existe, **Nouvelle révision** est désactivé.
- Toute nouvelle révision (y compris un clone) demande son **but** : un texte obligatoire qui dit ce que la révision change
  ou apporte. Il apparaît dans la liste des révisions, dans l'éditeur, dans la comparaison et pour les relecteurs.
- **Publier** une révision alors qu'une autre est déjà publiée **déprécie** la première : une confirmation vous le dit et
  vous demande l'**impact** de la publication sur les apprenants déjà en cours (voir
  [Publier une nouvelle révision d'un cours déjà publié](#publier-une-nouvelle-révision-dun-cours-déjà-publié)).
- **Déprécier** une révision publiée retire le cours du catalogue tant qu'aucune autre n'est publiée : une confirmation
  est demandée.
- Pour corriger une révision publiée, on ne la modifie pas : **Cloner en brouillon** (ou **Restaurer en brouillon** pour une
  dépréciée) en crée une nouvelle à partir d'elle.
- Seul un brouillon peut être **supprimé** (il faut taper son nom pour confirmer).

Le menu **Actions** de chaque révision propose, selon son statut : **Éditer** (ou **Voir**), **Passer en relecture**,
**Lien de relecture**, **Publier**, **Repasser en brouillon**, **Cloner en brouillon** / **Restaurer en brouillon**,
**Déprécier** et **Supprimer**, ainsi que **Comparer** (voir [Comparer des révisions](#comparer-des-révisions)).

Une révision en **relecture** peut aussi être publiée depuis sa propre page (bouton **Publier**, avec la même confirmation
quand une autre révision est déjà publiée).

Dans la liste des cours, la colonne **Révisions** indique « Aucune révision » pour un cours qui vient d'être créé.

## Publier une nouvelle révision d'un cours déjà publié

Des apprenants peuvent être en train de suivre la révision publiée. La fenêtre de confirmation de **Publier** vous
demande donc ce que la publication change pour eux. Pour une **première publication**, il n'y a rien à choisir : personne
ne peut être sur une révision précédente.

La fenêtre contient :

- **La relecture n'est pas terminée** (en rouge, si c'est le cas) : la liste de ce qui reste (remarques ouvertes,
  relecteurs sans avis, avis périmés ou demandant des modifications). Il faut activer **Je publie malgré une relecture
  non terminée** pour pouvoir confirmer.
- **Impact sur les apprenants en cours** : le nombre d'apprenants en cours sur le cours, puis un choix obligatoire (aucun
  n'est présélectionné) :

| Impact | À choisir pour | Ce qui arrive aux apprenants en cours |
|---|---|---|
| **Mineur : correction ou ajustement** | une coquille, une reformulation, un lien corrigé | ils passent **automatiquement** à la nouvelle révision, sans rien refaire, et en sont informés |
| **Majeur : contenu ou quiz modifiés** | un changement de fond : contenu, quiz, chapitres ajoutés ou retirés | chacun **choisit** de passer à la nouvelle révision ou de terminer l'ancienne |

Comment cela se passe pour l'apprenant :

- **Passer à la nouvelle révision** conserve les chapitres terminés et les quiz réussis des chapitres **inchangés**. Sont à
  refaire les chapitres dont le **contenu** (texte, vidéo) ou le **quiz** (réglages, questions, réponses, explications) a
  changé, et les chapitres ajoutés ; ceux que vous avez retirés disparaissent. Un simple changement de titre, de durée ou
  d'ordre ne fait rien refaire.
- Un impact **mineur** ne fait **rien refaire**, même si le texte d'un chapitre a changé : choisissez **Majeur** dès qu'un
  apprenant doit revoir quelque chose.
- Si **plusieurs révisions** sont publiées pendant qu'un apprenant est absent, il n'a qu'**une seule** proposition : les
  mineures l'ont déjà fait passer dessus au fur et à mesure, et dès qu'une majeure est dans la série, il garde la main
  pour toute la distance (les chapitres à refaire sont la différence entre sa révision et la dernière).
- Une inscription **terminée** ou **en échec** n'est jamais déplacée.

Votre choix est enregistré avec la révision et inscrit dans le **journal** (Changement de statut, « impact majeur » ou
« impact mineur »). Chaque passage d'un apprenant à une révision plus récente y figure aussi (**Mise à jour du cours**).

## Suivre les apprenants d'un cours

L'onglet **Apprenants** d'un cours liste les personnes inscrites, leur statut, la **Révision** qu'elles suivent, leur
progression et leur score à l'examen final.

- Un badge rouge **Pas à jour** signale un apprenant encore **en cours** sur une révision plus ancienne que la publiée :
  il n'est pas encore passé dessus.
- Le filtre **Toutes les révisions** → **Pas à jour** ne garde que ces apprenants (il se combine avec la recherche et le
  statut, et **Réinitialiser** l'enlève).
- Le détail d'un apprenant (menu **Actions** → **Voir le détail**) ajoute une section **Révisions suivies** quand il est passé d'une révision
  à une autre : de laquelle à laquelle, la date, si c'était **automatique** (publication mineure) ou **choisi par
  l'apprenant**, et combien de chapitres ont dû être refaits.

## Écrire le contenu

**Éditer** ouvre l'éditeur d'un brouillon. Un cours est fait de **chapitres** ; un chapitre est fait de **blocs** placés dans
l'ordre voulu et, s'il le faut, d'un **quiz** qui le conclut.

- À gauche, la liste des **chapitres** : **Ajouter un chapitre**, les réordonner en les faisant glisser par la poignée (au
  clavier : poignée, Espace, flèches, Espace) ou les supprimer (avec confirmation).
- À droite, le **titre** du chapitre puis ses blocs. **Ajouter un texte**, **Ajouter une vidéo** ou **Ajouter un quiz**.
  Les blocs se réordonnent et se suppriment comme les chapitres.
- **Bloc de texte** : écrit en **Markdown** dans un éditeur avec barre d'outils (gras, italique, titre, code, lien, liste,
  citation, image) et raccourcis `Ctrl+B` / `Ctrl+I`. L'**aperçu** s'affiche à côté et se met à jour pendant la frappe
  (sur petit écran : onglets **Édition** / **Aperçu**). Les blocs de code sont colorés et ont un bouton **Copier**; les
  tableaux et listes de tâches sont pris en charge. **Insérer une image** (ou coller / déposer une image) envoie une
  image (PNG, JPEG, GIF ou WebP, 5 Mo maximum) et l'insère à l'endroit du curseur.
- **Bloc vidéo** : collez un lien **YouTube** ou **Vimeo** (https) et donnez un titre. La vidéo est intégrée, pas
  hébergée par la plateforme ; tout autre lien est refusé.
- **Quiz** de fin de chapitre : un ensemble de questions (**choix unique** ou **choix multiple**, 2 à 10 réponses, énoncé et
  explication en Markdown). Vous réglez :
  - **Questions tirées** : l'apprenant n'aura que *n* questions, tirées au hasard parmi les *m* du quiz (*n* ≤ *m*, vous
    pouvez mettre *n* = *m*) ;
  - **Quiz bloquant** : l'apprenant devra atteindre le **taux de réussite** indiqué pour accéder au **chapitre suivant**.
- **Enregistrer** sauvegarde : le bouton reste affiché en bas de l'écran pendant que vous écrivez, et une notification confirme l'enregistrement. Un encart signale les points à corriger (titre vide, lien vidéo non reconnu, quiz sans bonne
  réponse…) : tant qu'il en reste, l'enregistrement est refusé. Le navigateur vous prévient si vous quittez la page avec des
  modifications non enregistrées.

Si quelqu'un d'autre a modifié la révision entre-temps, l'enregistrement est refusé pour ne pas écraser son travail :
**Recharger** récupère sa version. Une copie de votre travail est gardée dans votre navigateur : après le rechargement,
**Restaurer** la remet dans l'éditeur (elle remplace alors le contenu affiché).

Les révisions qui ne sont pas des brouillons s'ouvrent en lecture seule. Chaque révision garde la liste des personnes qui y
ont contribué.

### Voir ce qui change pendant l'écriture

Quand la révision a été clonée d'une autre, l'éditeur la compare en direct à celle-ci :

- des pastilles **Ajouté**, **Modifié** et **Déplacé** apparaissent sur les chapitres ;
- l'interrupteur **Voir les modifications depuis …** affiche, chapitre par chapitre, tout ce qui a changé (textes, vidéos,
  réglages du quiz, questions, bonne réponse modifiée, images remplacées) ;
- dans un bloc de texte, **Différences avec …** montre les lignes ajoutées et retirées directement dans l'éditeur.

## Comparer des révisions

**Actions → Comparer** (ou le bouton **Comparer** de l'éditeur) ouvre une page qui montre ce qui change entre **deux
révisions quelconques** du cours, quel que soit leur statut (les dépréciées comprises). Choisissez la **base** (avant) et la
**révision** (après) ; par défaut, la révision est comparée à celle dont elle a été clonée. Cette page est réservée aux
personnes qui peuvent modifier le cours. Un lien en haut de page ramène à la révision que vous éditiez.

## Faire relire une révision

1. Passez la révision en **Relecture**.
2. Ouvrez **Lien de relecture** et copiez le lien.
3. Envoyez-le : toute personne **connectée** qui a ce lien peut lire la révision, même sans avoir accès au cours.

Le relecteur voit le **but** de la révision et, si elle a été clonée d'une révision publiée ou dépréciée, peut activer
**Voir les modifications depuis …** (désactivé par défaut) pour ne relire que ce qui a changé. Il ne voit jamais le travail
non publié d'une autre révision.

Le lien cesse de fonctionner dès que la révision quitte la relecture (publiée, repassée en brouillon…) ; il n'a pas de
date d'expiration autrement. Vous pouvez à tout moment **Révoquer** le lien ou **Générer un nouveau lien**, ce qui
invalide l'ancien.

## Supprimer un cours

Il faut taper le nom du cours pour confirmer.

- Un cours **jamais publié** est supprimé avec ses révisions.
- Un cours **déjà publié** est **archivé** plutôt que supprimé, afin de conserver ce qui a été fait dessus : seul un
  administrateur peut le faire, et le cours n'est plus visible.

## Pas encore disponible

La gestion des parcours (entrée **Parcours** du menu formateur), l'hébergement de vidéos (seuls les liens YouTube et Vimeo
sont intégrés) et les fichiers volumineux ne sont pas encore disponibles.
