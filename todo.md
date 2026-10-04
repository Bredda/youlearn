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

## Plan en cours

**But :** refondre la relecture d'une révision : une seule révision ouverte par cours, des relecteurs choisis parmi les utilisateurs (sans nouveau rôle), plus de lien secret, et des remarques ancrées sur le contenu, sans repasser sans cesse de « relecture » à « brouillon ».

**Où on en est :** rien n'est écrit. Aujourd'hui un cours peut avoir un brouillon et une révision en relecture en même temps ; la relecture passe par un lien secret (`previewToken`, `/review/[token]`) en lecture seule ; corriger impose de repasser en brouillon.

**Hors de ce plan :** le cycle de vie des inscriptions face à une nouvelle révision (migrer une inscription, refaire un chapitre). À cadrer après celui-ci ; seule dépendance connue : à la publication, il faudra peut-être capturer l'« impact » du changement (déduit de `diffContent` ou déclaré), sans qu'on s'en occupe maintenant.

### Décisions (confirmées avec l'utilisateur)

1. **Pas de rôle `reviewer`** : un relecteur est une affectation `revision_reviewer` (révision, utilisateur, instantané du nom, avis). Tout utilisateur actif peut être choisi (recherche par nom ou email), même hors des groupes du cours ; l'affectation donne l'accès à cette seule révision. Ceux qui ont au moins une affectation en cours voient le menu « Relectures ».
2. **Une seule révision ouverte par cours** : l'index unique porte sur `draft` et `preview` ensemble (plus un brouillon et une relecture simultanés). Créer ou cloner pendant qu'une révision est ouverte donne un 409 explicite. La migration doit d'abord traiter les cours qui ont déjà un brouillon et une relecture : **décision à prendre avant la phase 1** (par exemple garder la relecture et laisser le brouillon à l'équipe, qui le supprime ou le fusionne à la main avant la migration), à confirmer avec l'utilisateur.
3. **Contenu vivant** : la révision reste modifiable pendant la relecture, le statut ne bouge plus entre `preview` et `draft` (`preview` -> `draft` sert à « retirer de la relecture »). Un avis mémorise la `updatedAt` de la révision ; si le contenu change après, l'avis est **périmé**. Pas de « tours » figés pour l'instant.
4. **Remarques ancrées sur les ids stables** : une remarque cible la révision, un chapitre, un bloc ou une question, avec un extrait cité optionnel. Pas d'ancrage à la ligne ou au caractère. Chaque cible a un fil (réponses, statut ouvert ou traité). Les remarques vivent dans leur propre table, hors du `content` jsonb : le verrouillage optimiste de l'éditeur n'est pas touché. Un élément supprimé fait passer ses remarques dans une liste « éléments supprimés ».
5. **Publier est conseillé, pas bloqué** : s'il reste des remarques ouvertes ou des avis manquants ou périmés, la publication demande une confirmation (`409 CONFIRM_REQUIRED`, comme la dépréciation).
6. **Plus de lien de relecture** : suppression de `previewToken`, des routes `preview-link` et de `/review/[token]`. Les anciens types d'événements (`revision.new-link`, `revision.revoke-link`) gardent leur libellé dans `apps/web/lib/events.ts` pour les lignes déjà enregistrées.

### Phase 1 : une révision ouverte et des relecteurs

- [ ] Index unique « une révision `draft` ou `preview` par cours » (nouvelle migration, jamais d'édition d'une migration appliquée) et table `revision_reviewer`. Fichiers : `packages/db/src/schema/courses.ts`, `packages/types/src/index.ts`. **Vérif. :** `pnpm db:generate`, migration appliquée sur une base avec un brouillon et une relecture du même cours.
- [ ] Règles pures dans `apps/api/src/lib/revision-rules.ts` (une seule ouverte, avis périmé, état de relecture) avec tests. **Vérif. :** `pnpm --filter api test`.
- [ ] Création et clonage refusés (409) tant qu'une révision est ouverte ; passage en relecture avec une liste de relecteurs ; ajout et retrait de relecteurs. Fichiers : `lib/revisions.ts`, `routes/writer/revisions.ts`. **Vérif. :** `curl` avec cookie de session (409, affectations, droits).
- [ ] Événements `revision.reviewer-add`, `revision.reviewer-remove` (types + libellés web).

### Phase 2 : accès relecteur et fin du lien secret

- [ ] `GET /api/me/reviews` (mes relectures) et `GET /api/reviews/:revisionId` (contenu, base, avis du relecteur, remarques). `canReadAsset` s'appuie sur l'affectation, plus sur `?review=<token>`. Fichiers : `routes/review.ts`, `lib/assets.ts`, `routes/assets.ts`. **Vérif. :** un relecteur lit la révision et ses images, un autre utilisateur reçoit 404.
- [ ] Web : menu « Relectures » avec compteur, pages `/reviews` et `/reviews/[revisionId]` (reprend `review-viewer.tsx`), dialogue de choix des relecteurs à la place de `review-link-dialog.tsx`. **Vérif. :** types, Biome, pages chargées avec `curl` ; ce qui n'a pas été exercé à la main est dit.
- [ ] Suppression de `previewToken`, des routes `preview-link`, de `/review/[token]` et de `?review=` dans `lib/asset-url.ts` (migration). **Vérif. :** plus aucune référence (`grep`), `pnpm check-types`.

### Phase 3 : remarques et fils

- [ ] Table `review_comment` (révision, cible : type + `chapterId` + `itemId`, extrait cité, auteur et instantané du nom, parent du fil, statut, traitée par, dates). Routes pour créer, répondre, marquer traité ou rouvert (relecteurs affectés et éditeurs du cours). **Vérif. :** `curl`, droits et 404 hors affectation.
- [ ] Web, relecteur : bouton « Commenter » sur chaque titre de chapitre, bloc et question (extrait cité si du texte est sélectionné), fils dépliables. Composants dans `components/review/*` et `components/content/*`.
- [ ] Web, formateur : pastille de remarques ouvertes sur les mêmes éléments dans l'éditeur et panneau « Remarques » groupé par chapitre avec défilement vers l'élément et liste « éléments supprimés ». **Vérif. :** types, Biome, rendu des pages ; l'interaction dans le navigateur est à tester à la main.

### Phase 4 : avis et publication

- [ ] Avis par relecteur (« validé » ou « modifications demandées »), avis périmé quand `updatedAt` a changé depuis. Affichage de l'état de la relecture (avis, remarques ouvertes) sur la page de la révision.
- [ ] Publication : `409 CONFIRM_REQUIRED` s'il reste des remarques ouvertes ou des avis manquants ou périmés, avec le détail dans la confirmation. **Vérif. :** `curl` des deux cas, test des règles pures.
- [ ] Documentation : skill `youlearn-courses` (workflow, une révision ouverte, relecteurs, remarques), `roadmap.md`, entrée « Refonte de la relecture » du backlog supprimée.

### Terminé quand

Un formateur envoie la seule révision ouverte d'un cours en relecture en choisissant des utilisateurs ; ceux-ci la retrouvent dans « Relectures », commentent des blocs, des questions ou des chapitres ; le formateur corrige pendant la relecture, traite les fils et publie (avec confirmation s'il reste des points ouverts) sans jamais repasser par le brouillon ; il n'existe plus aucun lien de relecture. Toujours finir par `pnpm lint:ci`, `pnpm check-types` et `pnpm test`.
