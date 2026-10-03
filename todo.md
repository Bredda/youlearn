# Todo

Plan de travail de la fonctionnalité en cours. La stratégie et les horizons sont dans [roadmap.md](roadmap.md) ; les idées non planifiées sont dans [backlog.md](backlog.md) ; ce fichier est le découpage exécutable.

## Mode d'emploi

- Travailler le **Plan en cours** de haut en bas, un commit par phase. Ne pas piocher dans le backlog sauf demande.
- Une tâche n'est faite que lorsque sa ligne **Vérif.** passe. Cocher la case dans le même changement.
- Les tâches marquées `(décision à prendre)` dépendent d'une entrée de **Décisions**. La confirmer avec l'utilisateur avant d'implémenter ; sans réponse, appliquer la recommandation et le dire.
- Ne pas cocher une tâche qu'on n'a pas pu vérifier : dire ce qui manque.
- Si le plan s'avère faux, le corriger d'abord, puis continuer. Quand le plan est terminé, le remplacer par « Aucun », mettre à jour le statut dans `roadmap.md` et la documentation concernée.
- Toujours finir par `pnpm lint:ci`, `pnpm check-types` et `pnpm test`.

Un plan contient : un but, un « où on en est », des **Décisions** (chacune avec une recommandation, confirmée avant les tâches qui en dépendent), des tâches regroupées en phases (un commit par phase), chacune avec les fichiers touchés et une ligne **Vérif.**, et un bloc « Terminé quand ».

---

## Plan en cours : socle du projet

**But :** mettre en place le suivi du travail, la conteneurisation et une CI qui publie des releases (roadmap, axe 1).

### Où on en est

- `roadmap.md` et `todo.md` sont rédigés pour YouLearn ; `backlog.md` est créé.
- Il n'y a ni Dockerfile ni image : `docker/compose.yml` ne lance que PostgreSQL et le stockage S3 pour le développement.
- Le web lit `API_URL` à la **construction** (les `rewrites` de `apps/web/next.config.ts` sont figés dans le build) ; l'API est empaquetée par tsdown, ses dépendances tierces restent externes.
- Les migrations s'appliquent avec `pnpm db:migrate` (drizzle-kit, une dépendance de développement) : rien ne sait les lancer dans une image de production.
- `.github/workflows/ci.yml` vérifie lint, types et tests sur `main`, `dev` et les pull requests. Aucune release, aucun tag ; le `package.json` racine n'a pas de `version`.
- La branche `feat/graduation` (durées et examen final) est fusionnée dans `main` (#4).

### Décisions

Toutes confirmées avec l'utilisateur ; l'ajustement de la 6 est noté dedans.

1. **Nombre d'images.** Recommandation : deux images, `youlearn-web` et `youlearn-api`, en multi-étapes, plutôt qu'une seule. Elles n'ont ni le même cycle de vie ni les mêmes dépendances. L'image web utilise `output: "standalone"` de Next (avec `outputFileTracingRoot` pour le monorepo) ; l'image API embarque ses dépendances de production via `pnpm deploy --filter api --prod`.
2. **`API_URL` du web.** Recommandation : le garder figé à la construction, avec un argument de build dont la valeur par défaut est `http://api:3001` (le nom du service dans le compose), et le documenter. Rendre l'adresse configurable à l'exécution (une route proxy qui lit l'environnement) va au backlog tant qu'un second environnement ne l'impose pas.
3. **Migrations en production.** Recommandation : un service compose `migrate` à usage unique, basé sur l'image API, qui s'exécute avant `api` (`depends_on` avec `service_completed_successfully`). Pas de migration au démarrage de l'API : elle se ferait en concurrence dès qu'il y a plusieurs instances. Il faut donc un petit script de migration utilisant le migrateur de drizzle-orm, empaqueté dans l'image, car drizzle-kit n'y est pas.
4. **Registre.** Recommandation : GitHub Container Registry (`ghcr.io/bredda/youlearn-web` et `youlearn-api`), publication uniquement à la création d'une release, avec les tags `x.y.z`, `x.y` et `latest`.
5. **Versionnage.** Recommandation : une seule version pour tout le monorepo (le produit), `release-type: node` en mode manifeste sur le paquet racine, tags `vX.Y.Z`, `CHANGELOG.md` généré à partir des Conventional Commits déjà utilisés, démarrage en `0.1.0` avec `bump-minor-pre-major`. Les paquets internes ne sont pas publiés, ils n'ont pas à être versionnés séparément.
6. **Jeton de release-please.** Un PAT stocké en secret du dépôt sous le nom `RELEASE_PLEASE_TOKEN` (créé par l'utilisateur) : sans lui, les événements créés avec `GITHUB_TOKEN` ne déclenchent pas d'autres workflows, donc la CI ne tournerait pas sur la pull request de release. `main` est protégée (vérifications obligatoires, fusion en squash uniquement) ; la publication des images a lieu dans le même workflow, sur la sortie `release_created`.

### Phase A — Suivi du travail

- [x] `roadmap.md`, `todo.md` et `backlog.md` rédigés en français pour YouLearn. Fichiers : `roadmap.md`, `todo.md`, `backlog.md`. **Vérif. :** les trois fichiers existent et leurs liens relatifs pointent vers un fichier existant.
- [x] Mentionner le mode de suivi dans les instructions des agents. Fichier : `AGENTS.md` (section « Suivi du travail »). **Vérif. :** la section nomme les trois fichiers et leur rôle.
- [x] Mettre à jour le statut du projet dans `README.md` (tableau « Project status ») : durées et examen final disponibles côté formateur. **Vérif. :** le tableau correspond à `roadmap.md`.

### Phase B — Conteneurisation

- [x] `.dockerignore` à la racine (node_modules, .next, dist, .env, .git). **Vérif. :** `docker build` n'envoie pas `.env` (vérifier avec le contexte listé).
- [x] `apps/api/Dockerfile` multi-étapes (installation, build tsdown, déploiement des dépendances de production, image finale non root). **Vérif. :** `docker build -f apps/api/Dockerfile .` réussit et l'image répond sur `/health`.
- [x] `apps/web/Dockerfile` multi-étapes avec `output: "standalone"` (décision 1) et `API_URL` en argument de build (décision 2). Fichiers : `apps/web/Dockerfile`, `apps/web/next.config.ts`. **Vérif. :** `docker build` réussit, l'image démarre, `/` redirige vers la connexion et `/api/me` atteint l'API.
- [x] Script de migration empaquetable (décision 3). Fichiers : `packages/db/src/migrate.ts` (`runMigrations`), `apps/api/src/migrate.ts`, `apps/api/tsdown.config.ts` (seconde entrée), `apps/api/Dockerfile`. **Vérif. :** sur une base vide, le conteneur `migrate` applique toutes les migrations puis s'arrête avec le code 0 ; relancé, il ne change rien.
- [x] `docker/compose.prod.yml` : base, stockage, `migrate`, `api`, `web`, volumes nommés et vérifications de santé. Fichiers : `docker/compose.prod.yml`, `.env.example`, `package.json` (`stack:up`, `stack:down`). **Vérif. :** `docker compose -f docker/compose.prod.yml up` depuis un clone propre, puis connexion de l'administrateur sur le port 3000 et envoi d'une image de couverture.
- [x] Documenter le lancement conteneurisé. Fichier : `README.md`. **Vérif. :** les commandes du README, copiées telles quelles, fonctionnent.

### Phase C — CI et releases

- [ ] Vérification de construction des deux images sur les pull requests, sans publication. Fichier : `.github/workflows/ci.yml`. **Vérif. :** actionlint passe en local ; le job tourne au premier push (à constater sur GitHub).
- [ ] Workflow release-please (décisions 5 et 6). Fichiers : `.github/workflows/release.yml`, `release-please-config.json`, `.release-please-manifest.json`, `package.json` (`version`). **Vérif. :** actionlint passe, les deux fichiers JSON sont valides ; la pull request de release n'apparaît qu'après un premier merge sur GitHub.
- [ ] Publication des images sur GHCR à la création d'une release (décision 4). Fichier : `.github/workflows/release.yml`. **Vérif. :** actionlint passe ; la première publication ne se constate que sur GitHub.
- [ ] Documenter le processus de release (Conventional Commits, pull request de release, déploiement d'une version). Fichiers : `README.md`, `AGENTS.md`. **Vérif. :** un nouveau contributeur peut suivre la procédure sans question.

### Terminé quand

Le suivi à trois fichiers est en place et référencé dans `AGENTS.md`, `docker compose -f docker/compose.prod.yml up` démarre l'application complète sur une machine vierge avec les migrations appliquées, et le workflow de release est écrit et validé en local. Ce qui ne se prouve que sur GitHub (première exécution de la CI, première pull request de release, première publication des images) est listé dans la pull request qui porte le plan. Alors remplacer ce plan par « Aucun » et passer l'axe 1 de `roadmap.md` à « Fait ».
