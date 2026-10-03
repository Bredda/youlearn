# Backlog

Sujets et idées **non planifiés** : ils ne font pas partie de la [feuille de route](roadmap.md) et ne sont pas dans le plan en cours ([todo.md](todo.md)). On n'y pioche pas sans demande. Quand un sujet devient une grosse fonctionnalité, il passe dans `roadmap.md` ; quand il est pris en charge, dans le plan de `todo.md`. Une entrée terminée ou abandonnée est supprimée.

## Qualité et outillage

- Tests d'intégration des routes de l'API contre une base PostgreSQL jetable (service de la CI) : aujourd'hui seules les règles pures sont testées automatiquement ; les routes et les pages se vérifient à la main.
- Test de l'éditeur de révision : le reducer est testé, pas le composant ni la sauvegarde avec verrouillage optimiste.
- Rendre `API_URL` configurable à l'exécution pour l'image web : une route proxy lit l'environnement, plus d'adresse figée au build (voir décision 2 du plan « socle »).
- Sauvegardes de PostgreSQL et du stockage S3, avec une procédure de restauration documentée.
- Procédure de purge du bucket « déprécié » : l'application ne supprime jamais, la purge est une décision d'exploitation qui n'est pas encore outillée.

## Rédaction des cours

- Proposer une durée estimée par chapitre : temps de lecture calculé sur le Markdown, durée des vidéos YouTube et Vimeo quand elle est connue.
- Commentaires du relecteur sur le lien de relecture, qui est aujourd'hui en lecture seule.
- Banque de questions partagée entre chapitres ou entre cours, au lieu d'un pool par quiz.
- Importer ou exporter un cours (par exemple en Markdown ou en archive), pour le sauvegarder ou le transférer.

## Catalogue et apprenants

- Trier le catalogue par durée et filtrer sur « Certifiant ».
- Nombre maximal de tentatives et délai entre deux tentatives pour un quiz ou un examen final.
- Notifications aux apprenants : nouvelle révision d'un cours suivi, certificat obtenu.

## Certification

- Gabarit de certificat personnalisable par cours (logo, signature, texte), au-delà du gabarit générique.
- Stocker le PDF du certificat dans S3 au moment de la délivrance, comme preuve figée.
- Open Badges 3.0 ou Verifiable Credentials, pour un certificat portable (LinkedIn et autres).
