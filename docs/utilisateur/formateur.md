# Formateur : cours et révisions

L'espace **Formateur → Cours** sert à créer des cours et à les faire évoluer. Il est ouvert aux formateurs et aux
administrateurs.

## Cours et révisions

- Le **cours** est la fiche : nom, description, image, catégories et groupes. Ces informations ne sont pas versionnées.
- Les **révisions** contiennent le contenu (les leçons). Un cours peut en avoir plusieurs au fil du temps, mais
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

Ouvrez un cours pour voir ses révisions. Chacune a un nom automatique du type `whispering_toucan`, qui ne change plus.

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
- **Publier** une révision alors qu'une autre est déjà publiée **déprécie** la première : une confirmation vous le dit.
- **Déprécier** une révision publiée retire le cours du catalogue tant qu'aucune autre n'est publiée : une confirmation
  est demandée.
- Pour corriger une révision publiée, on ne la modifie pas : **Cloner en brouillon** (ou **Restaurer en brouillon** pour une
  dépréciée) en crée une nouvelle à partir d'elle.
- Seul un brouillon peut être **supprimé** (il faut taper son nom pour confirmer).

Le menu **Actions** de chaque révision propose, selon son statut : **Éditer** (ou **Voir**), **Passer en relecture**,
**Lien de relecture**, **Publier**, **Repasser en brouillon**, **Cloner en brouillon** / **Restaurer en brouillon**,
**Déprécier** et **Supprimer**.

## Écrire le contenu

**Éditer** ouvre l'éditeur d'un brouillon :

- à gauche, la liste des **leçons** : **Ajouter une leçon**, monter, descendre ou supprimer une leçon ;
- à droite, le **titre** et le texte de la leçon, écrit en **Markdown** ; **Éditer** et **Aperçu** basculent entre le texte
  et son rendu ;
- **Insérer une image** envoie une image (PNG, JPEG, GIF ou WebP, 5 Mo maximum) et l'insère à l'endroit du curseur ;
- **Enregistrer** sauvegarde. Le navigateur vous prévient si vous quittez la page avec des modifications non enregistrées.

Si quelqu'un d'autre a modifié la révision entre-temps, l'enregistrement est refusé pour ne pas écraser son travail :
**Recharger** récupère sa version (vos modifications non enregistrées sont alors perdues).

Les révisions qui ne sont pas des brouillons s'ouvrent en lecture seule. Chaque révision garde la liste des personnes qui y
ont contribué.

## Faire relire une révision

1. Passez la révision en **Relecture**.
2. Ouvrez **Lien de relecture** et copiez le lien.
3. Envoyez-le : toute personne **connectée** qui a ce lien peut lire la révision, même sans avoir accès au cours.

Le lien cesse de fonctionner dès que la révision quitte la relecture (publiée, repassée en brouillon…) ; il n'a pas de
date d'expiration autrement. Vous pouvez à tout moment **Révoquer** le lien ou **Générer un nouveau lien**, ce qui
invalide l'ancien.

## Supprimer un cours

Il faut taper le nom du cours pour confirmer.

- Un cours **jamais publié** est supprimé avec ses révisions.
- Un cours **déjà publié** est **archivé** plutôt que supprimé, afin de conserver ce qui a été fait dessus : seul un
  administrateur peut le faire, et le cours n'est plus visible.

## Pas encore disponible

La gestion des parcours (entrée **Parcours** du menu formateur), les vidéos et les fichiers volumineux ne sont pas encore
disponibles.
