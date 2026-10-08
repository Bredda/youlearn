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

Aucun. L'axe 7 (relecture) est écrit et fusionné (PR #16) ; ce qui reste à vérifier à la main est listé dans `roadmap.md`, et le prochain sujet, le cycle de vie des inscriptions face à une nouvelle révision, est à cadrer avant d'ouvrir un plan ici.

Un plan dans ce fichier contient : un but, un « où on en est », des **Décisions** (chacune avec une recommandation, confirmée par l'utilisateur avant les tâches qui en dépendent), des tâches regroupées en phases (un commit par phase), chacune avec les fichiers touchés et une ligne **Vérif.**, et un bloc « Terminé quand ».
