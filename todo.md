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

### Axe 3 — Parcours apprenant

**But :** qu'un apprenant ouvre un cours publié depuis le catalogue, s'inscrive, le lise jusqu'au bout, réussisse ses quiz et retrouve sa progression. Prérequis de la certification (axe 4).

**Où on en est :** le catalogue (`/courses`) liste les cours publiés, mais les cartes ne mènent nulle part ; aucune table d'inscription, de progression ni de tentative ; `QuizView` montre les bonnes réponses (réservé aux formateurs et relecteurs).

**Décisions** (confirmées par l'utilisateur) :

- **Révision figée** : l'inscription fige la révision publiée à cet instant, même une fois dépréciée. Un bandeau signale une version plus récente ; pas de migration automatique (backlog).
- **Inscription explicite** : bouton « Commencer » sur la page du cours.
- **Quiz de chapitre** : tentatives illimitées, nouveau tirage à chaque fois, corrigé complet après chaque tentative.
- **Examen final one-shot** : une seule tentative, score et réussite seulement, jamais de corrigé. L'échec donne le statut `failed` à l'inscription, tracé pour admin et formateur ; l'apprenant recommence depuis le début (nouvelle inscription, tout à refaire). Les inscriptions échouées restent en historique.
- Par défaut (modifiables) : recommencer s'inscrit sur la révision publiée courante ; un chapitre est terminé quand l'apprenant le valide et, si son quiz est bloquant, qu'une tentative est réussie ; un quiz bloquant verrouille le chapitre suivant ; l'examen final est verrouillé tant que les autres chapitres ne sont pas terminés ; une question est juste si les options cochées sont exactement les bonnes, score = % de questions justes, réussite si `score >= passRate` ; cours non certifiant `completed` quand tous les chapitres sont terminés ; une inscription `completed` ou `failed` est en lecture seule ; une seule inscription non échouée par (apprenant, cours) ; la visibilité est revérifiée à chaque lecture.

**Phase 1 — Lire et s'inscrire**

- [x] Schéma `packages/db/src/schema/learning.ts` (`enrollment`, `chapter_progress`, `quiz_attempt`) + migration `0010`. **Vérif.** : `pnpm db:generate` produit un SQL relu, `pnpm db:migrate` passe.
- [x] `toLearnerContent` (`packages/content`) : plus aucun `correct`, le quiz ne garde que ses réglages et la taille du pool. **Vérif.** : test unitaire (`JSON.stringify` sans `"correct"`).
- [x] Routes `GET /api/courses/:id`, `POST /api/courses/:id/enroll`, `GET /api/enrollments/:id`, `canReadAsset` pour la révision figée, événement `enrollment.start`. **Vérif.** : `curl` (inscription, doublon 409, autre utilisateur 404, image d'une révision dépréciée lisible par l'inscrit).
- [x] Web : carte cliquable, fiche `/courses/[id]`, lecteur `/learn/[enrollmentId]` sans état. **Vérif.** : `pnpm check-types`, pages chargées en `curl`.

**Phase 2 — Progression et verrouillage**

- [x] `progress.ts` (`chapterStates`, `canCompleteChapter`, `enrollmentOutcome`) + tests. **Vérif.** : `pnpm --filter @youlearn/content test`.
- [x] Route `complete`, états dans le lecteur, clôture d'un cours non certifiant. **Vérif.** : `curl` (chapitre verrouillé refusé, cours terminé).

**Phase 3 — Quiz**

- [x] `quiz-draw.ts` (tirage, questions sans `correct`, correction) + tests. **Vérif.** : tests unitaires.
- [x] Tentatives (démarrer ou reprendre, soumettre), examen final one-shot, échec, recommencer, événements `enrollment.complete` / `fail`. **Vérif.** : `curl` (même tirage à la reprise, double soumission 409, 2e examen 409, échec puis recommencer, pas de corrigé à l'examen final).
- [x] Web : `QuizRunner`, confirmation de l'examen final, écran d'échec. **Vérif.** : `pnpm check-types`, pages chargées en `curl`.

**Phase 4 — Mes sessions et traçabilité**

- [ ] `/my-sessions` : inscriptions, progression, reprise. **Vérif.** : `curl`.
- [ ] `GET /api/writer/courses/:id/enrollments` et page `writer/courses/[id]/learners` (statut, révision, score, tentatives). **Vérif.** : `curl` (formateur d'un autre groupe 403, admin ok).

**Terminé quand :** un apprenant ouvre un cours depuis le catalogue, le lit jusqu'au bout, réussit ses quiz et retrouve sa progression à son retour ; l'échec à l'examen final est tracé et on peut recommencer. Documentation (skills, roadmap) à jour.

Un plan dans ce fichier contient : un but, un « où on en est », des **Décisions** (chacune avec une recommandation, confirmée par l'utilisateur avant les tâches qui en dépendent), des tâches regroupées en phases (un commit par phase), chacune avec les fichiers touchés et une ligne **Vérif.**, et un bloc « Terminé quand ».
