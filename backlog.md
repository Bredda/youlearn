# Backlog

Sujets et idées **non planifiés** : ils ne font pas partie de la [feuille de route](roadmap.md) et ne sont pas dans le plan en cours ([todo.md](todo.md)). On n'y pioche pas sans demande. Quand un sujet devient une grosse fonctionnalité, il passe dans `roadmap.md` ; quand il est pris en charge, dans le plan de `todo.md`. Une entrée terminée ou abandonnée est supprimée. Une idée neuve est d'abord déposée dans « À trier », puis rangée dans la bonne section.

## Qualité et outillage

- Tests d'intégration des routes de l'API contre une base PostgreSQL jetable (service de la CI) : aujourd'hui seules les règles pures sont testées automatiquement ; les routes et les pages se vérifient à la main.
- Test de l'éditeur de révision : le reducer est testé, pas le composant ni la sauvegarde avec verrouillage optimiste.
- Rendre `API_URL` configurable à l'exécution pour l'image web : une route proxy lit l'environnement, plus d'adresse figée au build (voir décision 2 du plan « socle »).
- Alléger l'image web : le serveur Next valide tout l'environnement (base, stockage, secrets) parce qu'il importe `@youlearn/config` ; il ne devrait avoir besoin que de `API_URL` et `WEB_URL`.
- Alléger l'image API (504 Mo) : l'élagage de `next` et d'autres paquets inutiles se fait à la main dans `apps/api/Dockerfile` parce que pnpm résout les pairs optionnels de better-auth dans le graphe de l'API ; trouver la cause plutôt que supprimer les dossiers.
- Sauvegardes de PostgreSQL et du stockage S3, avec une procédure de restauration documentée.
- Procédure de purge du bucket « déprécié » : l'application ne supprime jamais, la purge est une décision d'exploitation qui n'est pas encore outillée.

## Rédaction des cours

- Proposer une durée estimée par chapitre : temps de lecture calculé sur le Markdown, durée des vidéos YouTube et Vimeo quand elle est connue.
- Synchroniser les lignes, et donc le défilement, entre le Markdown brut et son rendu quand on édite un bloc texte d'une révision (à explorer : faisabilité avec CodeMirror et le rendu actuel).
- Banque de questions partagée entre chapitres ou entre cours, au lieu d'un pool par quiz.
- Importer ou exporter un cours (par exemple en Markdown ou en archive), pour le sauvegarder ou le transférer.

## Catalogue et apprenants

- Trier le catalogue par durée et filtrer sur « Certifiant ».
- Nombre maximal de tentatives et délai entre deux tentatives pour un quiz ou un examen final.
- Date de validité optionnelle sur un cours (certifiant ou non) : passé ce délai, l'apprenant doit repasser le cours sur la révision alors publiée. À cadrer avec le parcours apprenant (progression rattachée à une révision) et avec la validité d'un certificat.
- Notifications aux apprenants : nouvelle révision d'un cours suivi, certificat obtenu.

## Certification

- Gabarit de certificat personnalisable par cours (logo, signature, texte), au-delà du gabarit générique.
- Stocker le PDF du certificat dans S3 au moment de la délivrance, comme preuve figée.
- Open Badges 3.0 ou Verifiable Credentials, pour un certificat portable (LinkedIn et autres).

## Interface et ergonomie

- Passe sur les retours à l'utilisateur : ajouter des toasts là où une action n'en donne pas encore.
- Cohérence des boutons de la page d'une révision selon son statut : pouvoir la promouvoir (relecture, publication...) directement depuis cette page, au lieu de revenir à la liste des révisions.

## IA générative

- Proposer un quiz généré à partir du contenu d'un chapitre, avec un prompt que l'utilisateur peut surcharger.
- Relecture assistée par IA d'une révision (propositions de corrections ou de remarques, à valider par le relecteur).

## Stabilisation avant la 1.0

Une phase à part avant de passer en 1.0 : revue complète d'optimisation, estimation de la dette technique, passe accessibilité, passe sécurité, extension de la couverture de tests. Elle produit une liste de correctifs priorisés, et la feuille de route est ajustée en conséquence (ce sujet passera alors dans `roadmap.md`).

## À trier

- Chapitre de type « glossaire », transverse au e-learning : des définitions réutilisables d'un chapitre à l'autre (et peut-être d'un cours à l'autre), à cadrer (où vit le glossaire, comment un chapitre y renvoie).
- Prise de notes de l'apprenant et marque-pages sur des passages d'un chapitre.
