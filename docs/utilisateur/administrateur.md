# Administrateur

La section **Administration** du menu est réservée aux administrateurs. Elle regroupe les utilisateurs, les groupes et le
journal des événements. Les administrateurs ont aussi la main sur tous les cours (voir [Formateur](formateur.md)).

## Utilisateurs

**Administration → Utilisateurs** liste les comptes, avec recherche, filtres, tri et pagination.

- **Nouvel utilisateur** crée un compte : nom, adresse email, mot de passe, rôles et groupes. Vous communiquez ensuite
  l'adresse et le mot de passe à la personne. Si l'installation limite les domaines d'adresse autorisés, une adresse
  d'un autre domaine est refusée.
- Le menu **Actions** de chaque ligne permet de **Modifier** le compte (nom, email, rôles, groupes), de **Changer le mot de
  passe**, de **Bannir** (le compte ne peut plus se connecter) ou **Débannir**, et de **Supprimer**. Supprimer demande de
  taper l'adresse email du compte.

Les rôles sont **Utilisateur**, **Formateur** et **Admin**, et peuvent se cumuler ([détail des rôles](prise-en-main.md#rôles)).
Pour qu'un formateur puisse créer des cours, il doit appartenir à au moins un groupe.

## Groupes

**Administration → Groupes** liste les groupes avec leur nombre de membres.

- **Nouveau groupe** crée un groupe ; le menu **Actions** permet de le renommer ou de le supprimer (il faut taper son nom).
- Un groupe **utilisé par un cours** ne peut pas être supprimé : retirez-le d'abord des cours concernés.
- Supprimer un groupe retire ses membres du groupe.
- Le groupe **Commun**, marqué **Système**, existe toujours : il regroupe tous les utilisateurs sans qu'on ait à les y
  placer. On ne peut ni le renommer ni le supprimer, et il n'apparaît pas dans le formulaire des utilisateurs. Seuls les
  administrateurs peuvent y rattacher un cours.

À la première installation, des groupes de départ peuvent être créés automatiquement ; ils se gèrent ensuite uniquement
depuis cette page.

## Événements

**Administration → Événements** est le journal des actions importantes : qui a fait quoi, et quand (création,
modification ou suppression de comptes, de groupes, de cours, changements de statut des révisions, liens de relecture…).
On peut le rechercher et le filtrer par fonctionnalité ou par type d'événement. Les enregistrements ne contiennent jamais de
mot de passe.

## Fichiers

La plateforme ne supprime jamais un fichier (image de cours, image de leçon) : un fichier devenu inutile est déplacé dans un
espace de stockage « déprécié », qu'il appartient à l'exploitation de vider si l'on veut récupérer de la place.
