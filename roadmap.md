# YouLearn — Feuille de route

## Vision

Une plateforme d'apprentissage où les **cours** (puis les **programmes**) sont rendus visibles aux bons utilisateurs grâce aux **groupes** que l'administrateur leur attribue. Les formateurs rédigent et font relire leurs cours, les apprenants les suivent, et un cours peut déboucher sur une **certification**. Personne ne s'inscrit seul : les comptes sont créés par les administrateurs.

Parcours cible :

```text
un formateur rédige un cours → il est relu et publié → un apprenant du bon groupe le suit → il réussit l'examen final → il obtient un certificat vérifiable
```

Le socle côté formateur est là ; ce qui manque pour boucler ce parcours, c'est tout le côté apprenant.

## Principes

- La visibilité passe par les groupes ; le groupe « Commun » est implicite et ne donne jamais de droit d'écriture.
- Le serveur fait foi : l'interface ne remplace jamais une vérification de droits, et les bonnes réponses d'un quiz n'atteignent jamais un apprenant (tirage et correction côté serveur).
- Une révision publiée ne change plus jamais ; corriger, c'est cloner en brouillon, relire, puis republier.
- Le contenu et ses règles vivent dans des paquets purs et testés (`@youlearn/content`) ; l'infrastructure (HTTP, base, stockage) reste en périphérie.
- Tout ce qui compte est journalisé (événements) et l'application ne supprime jamais un fichier pour de bon : elle le déplace vers le bucket « déprécié ».
- On n'ajoute de la complexité que lorsqu'un besoin réel la justifie.

## Vue d'ensemble

| # | Axe | Horizon | Statut |
| --- | --- | --- | --- |
| 1 | Socle du projet | Maintenant | Suivi du travail en cours de rédaction ; conteneurisation et CI avec releases à faire |
| 2 | Rédaction des cours | Fait | Révisions, éditeur, relecture, durées estimées et examen final disponibles côté formateur |
| 3 | Parcours apprenant | Ensuite | Catalogue seul : les cartes ne mènent encore nulle part |
| 4 | Certification | Plus tard | Dépend de l'axe 3 ; conception arrêtée, rien d'écrit |
| 5 | Programmes | Plus tard | Pas commencé |
| 6 | Médias et fichiers lourds | Plus tard | Images seulement ; vidéos YouTube et Vimeo en lien |

## 1. Socle du projet

**But :** pouvoir travailler à plusieurs, livrer et déployer sans effort.

Trois chantiers, dans cet ordre : un suivi du travail à trois niveaux (`roadmap.md` pour les grosses fonctionnalités, `todo.md` pour celle en cours, `backlog.md` pour les idées non planifiées), la conteneurisation (une image web, une image API, un compose complet avec les migrations), puis une CI qui publie des releases (release-please) et les images.

**Terminé quand :** un merge sur `main` ouvre une pull request de release, et la fusionner publie une version taguée et ses images, démarrables avec un seul `docker compose up`.

## 2. Rédaction des cours

**But :** un formateur écrit un cours, le fait relire et le publie en toute sécurité.

Disponible : cours et groupes, révisions (brouillon, relecture, publié, déprécié), éditeur de chapitres (texte Markdown, vidéos, quiz n parmi m), images, lien de relecture, comparaison de révisions. Ajouté sur la branche `feat/graduation` : durée estimée par chapitre (obligatoire pour passer en relecture, totalisée par révision) et cours certifiant avec un examen final obligatoire, toujours en dernier chapitre.

**Terminé quand :** la branche est fusionnée et la documentation formateur décrit les durées et la certification.

## 3. Parcours apprenant

**But :** qu'un apprenant puisse réellement suivre un cours publié.

Lecture d'une révision publiée depuis la carte du catalogue ; exécution des quiz (tirage de n questions sur m côté serveur, tentatives, correction, chapitre suivant verrouillé par un quiz bloquant) ; inscription à un cours et progression, rattachée à la révision suivie. C'est le prérequis de la certification.

**Terminé quand :** un apprenant ouvre un cours depuis le catalogue, le lit jusqu'au bout, réussit ses quiz et retrouve sa progression à son retour.

## 4. Certification

**But :** délivrer une preuve de réussite fiable et vérifiable.

Une table `certificate` conserve un instantané (apprenant, intitulé du cours, clé de révision, score, date, numéro unique) ; le PDF est généré à la demande avec pdf-lib à partir de cet instantané, avec un gabarit générique (logo et couleurs configurables) ; une page publique `/verify/<numéro>` confirme la validité, via le QR code du PDF, et permet une révocation. Open Badges et le stockage figé du PDF restent au backlog.

**Terminé quand :** un apprenant qui réussit l'examen final d'un cours certifiant télécharge son certificat, et n'importe qui peut en vérifier l'authenticité.

## 5. Programmes

**But :** regrouper des cours en parcours, avec la même visibilité par groupes.

Pas encore conçu : à cadrer une fois l'axe 3 en place (ordre des cours, prérequis, progression d'ensemble, lien avec la certification).

**Terminé quand :** un administrateur ou un formateur compose un programme et un apprenant le suit de bout en bout.

## 6. Médias et fichiers lourds

**But :** aller au-delà des images et des liens vidéo.

Vidéos hébergées par l'application, envoi de gros fichiers par URL présignée, et pièces jointes aux cours, en gardant la règle « on ne supprime jamais, on déprécie ».

**Terminé quand :** un formateur peut ajouter une vidéo ou un document volumineux sans passer par un service externe.

## Hors périmètre pour l'instant

Inscription libre des utilisateurs (les comptes restent créés par les administrateurs), paiement ou vente de cours, et déploiement multi-instance ou haute disponibilité. À reconsidérer si un besoin réel apparaît.
