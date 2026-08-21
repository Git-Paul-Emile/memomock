# 1. 👤 Gestion des utilisateurs

### 1. Inscription / connexion

Permettre aux différents utilisateurs de créer un compte et d'accéder à la plateforme.

Il faut notamment prévoir plusieurs types d'utilisateurs :

* étudiant ;
* encadreur ;
* professeur ;
* administrateur d'établissement.

L'inscription peut être différente selon le profil.

Par exemple, un étudiant invité par un encadreur via un code pourrait être automatiquement rattaché au bon projet, à la bonne classe, au bon niveau et à la bonne filière. 

---

### 2. Gestion des profils étudiants

L'étudiant dispose d'un profil contenant notamment :

* nom ;
* prénom ;
* email ;
* établissement ;
* niveau ;
* filière ;
* classe ;
* domaine d'étude.

Le profil permet également de retrouver les mémoires et projets auxquels l'étudiant est associé.

---

### 3. Gestion des profils encadreurs

L'encadreur possède un profil permettant notamment de définir :

* son domaine d'expertise ;
* les filières qu'il peut encadrer ;
* les types de mémoires qu'il accepte ;
* ses étudiants ;
* ses classes ;
* ses canevas ;
* ses critères de validation.

Cela devient particulièrement important si la plateforme propose la mise en relation étudiant/encadreur. 

---

### 4. Profil pédagogique de l'encadreur

C'est une fonctionnalité centrale.

L'encadreur doit pouvoir définir les règles pédagogiques qu'il souhaite appliquer à un type de mémoire.

Par exemple :

**Master → Informatique → Développement web**

Puis définir :

* structure attendue ;
* nombre de pages ;
* règles de présentation ;
* parties obligatoires ;
* critères de validation ;
* livrables attendus.

L'IA utilise ensuite ce profil pédagogique comme référence pour analyser le travail de l'étudiant. 

---

### 5. Gestion des rôles et permissions

Chaque utilisateur ne doit pas avoir accès aux mêmes fonctionnalités.

Par exemple :

**Étudiant**

* rédiger ;
* déposer ses livrables ;
* consulter les commentaires ;
* corriger son travail.

**Encadreur**

* créer des canevas ;
* définir les critères ;
* corriger ;
* commenter ;
* valider ;
* suivre ses étudiants.

**Établissement**

* gérer les classes ;
* gérer les filières ;
* affecter les enseignants ;
* gérer les étudiants.

---

# 2. 🏫 Gestion des établissements

### 6. Création d'établissements

Une école/université doit pouvoir créer son espace sur la plateforme.

Exemple :

> École Supérieure X

Cet espace regroupera ensuite :

* ses filières ;
* ses niveaux ;
* ses classes ;
* ses enseignants ;
* ses étudiants.

Cette fonctionnalité correspond au mode « établissement » évoqué dans les échanges. 

---

### 7. Gestion des filières

L'établissement doit pouvoir créer des filières :

* Informatique ;
* Management ;
* Finance ;
* Comptabilité ;
* Réseaux ;
* etc.

C'est important car **les règles d'un mémoire peuvent varier selon la filière**. 

---

### 8. Gestion des niveaux

Permettre de définir les niveaux :

* Licence ;
* Master ;
* etc.

Le niveau intervient dans le choix du canevas et des règles.

Par exemple :

> Master Informatique

n'aura pas nécessairement le même modèle que :

> Licence Management.

---

### 9. Création de classes

L'établissement ou l'encadreur peut créer une classe.

Exemple :

> Master Informatique — Promotion 2026

La classe devient un espace regroupant :

* étudiants ;
* encadreurs ;
* canevas ;
* projets ;
* règles ;
* suivi.



---

### 10. Création de groupes / sous-groupes

Une classe peut être divisée en groupes.

Exemple :

**Master Informatique**

* Groupe A
* Groupe B
* Groupe C

Les groupes peuvent avoir le même canevas tout en permettant un suivi séparé. 

---

### 11. Ajout d'encadreurs dans une classe

Une classe peut avoir plusieurs encadreurs.

Exemple :

> Master Informatique

* Professeur A → étudiants 1 à 10
* Professeur B → étudiants 11 à 20

Les encadreurs peuvent partager le même canevas et travailler dans le même environnement. 

---

### 12. Ajout d'étudiants dans une classe

Les étudiants doivent pouvoir être rattachés à une classe.

Plusieurs méthodes sont envisagées :

* invitation individuelle ;
* invitation par email ;
* code de classe ;
* import d'une liste d'emails.

Le code est particulièrement intéressant : l'étudiant entre le code et est automatiquement rattaché au bon espace. 

---

# 3. 📄 Gestion des mémoires

### 13. Création d'un projet de mémoire

L'encadreur doit pouvoir créer un **projet de mémoire**.

Exemple :

> Mémoire de Paul — Application de gestion immobilière

Le projet contient ensuite :

* le canevas ;
* les différentes parties ;
* les livrables ;
* les échéances ;
* les corrections ;
* les validations ;
* les documents.

L'idée du projet de mémoire est explicitement évoquée dans la transcription. 

---

### 14. Création d'un canevas / template

Le canevas définit **comment le mémoire doit être construit**.

Par exemple :

```text
Page de garde
Remerciements
Résumé
Abstract
Table des matières

Introduction
Chapitre 1
Chapitre 2
Méthodologie
Résultats
Conclusion
Bibliographie
Annexes
```

Mais il peut également contenir les règles de mise en forme.

Le canevas est présenté comme l'une des parties les plus complexes et importantes du projet. 

---

### 15. Modification d'un canevas

Un encadreur doit pouvoir modifier un canevas existant.

Par exemple :

> Ajouter une section « Étude comparative ».

ou :

> Supprimer le chapitre 4.

ou :

> Modifier les règles de pagination.

Cela évite de recréer un modèle depuis zéro.

---

### 16. Duplication / réutilisation d'un canevas

Un encadreur pourrait prendre :

> Canevas Master Informatique 2025

et créer :

> Canevas Master Informatique 2026

Puis modifier seulement les éléments nécessaires.

Cette idée vient du besoin de pouvoir réutiliser des modèles plutôt que recréer les mêmes critères pour chaque groupe. 

---

### 17. Association d'un canevas à une filière / niveau / classe

Un canevas doit pouvoir être associé à un contexte précis.

Exemple :

> Master + Informatique + Développement

→ Canevas A

Alors que :

> Master + Management

→ Canevas B.

C'est nécessaire parce que les mémoires peuvent être très différents selon les domaines. 

---

### 18. Définition de la structure du mémoire

L'encadreur définit les grandes parties du document.

Par exemple :

```text
Introduction
│
├── Contexte
├── Problématique
├── Objectifs
└── Annonce du plan
```

Puis :

```text
Chapitre 1
Chapitre 2
Chapitre 3
Conclusion
```

La plateforme utilise ensuite cette structure pour contrôler le document.

---

### 19. Définition des parties et chapitres

L'encadreur peut définir précisément :

* les chapitres ;
* les sections ;
* les sous-sections.

Il peut également définir les critères attendus pour chaque partie.

Exemple :

**Introduction**

Doit contenir :

* contexte ;
* problématique ;
* objectifs ;
* annonce du plan.

---

### 20. Définition des critères obligatoires

Un critère obligatoire signifie :

> Sans cet élément, la partie n'est pas considérée comme valide.

Exemple :

Introduction :

* problématique → obligatoire ;
* contexte → obligatoire ;
* annonce du plan → obligatoire.

L'IA peut donc déterminer :

> ❌ Introduction non conforme.

Cette logique de critères obligatoires est explicitement proposée dans les retours. 

---

### 21. Définition des critères optionnels

Certains éléments peuvent être recommandés sans être obligatoires.

Exemple :

> Ajouter une illustration.

Le système peut alors faire :

> ⚠️ Recommandation

au lieu de :

> ❌ Non conforme.

---

### 22. Définition des règles de mise en forme

L'encadreur peut définir :

* police ;
* taille ;
* interligne ;
* marges ;
* pagination ;
* styles de titres ;
* présentation ;
* etc.

Ces règles servent au contrôle automatique de l'IA. 

---

### 23. Importation d'un modèle de mémoire validé

L'encadreur peut fournir un ancien mémoire considéré comme une référence.

La plateforme peut alors l'utiliser comme **document de référence** en complément des règles configurées. 

---

### 24. Importation d'un guide de rédaction

L'encadreur ou l'établissement peut importer :

* guide de rédaction ;
* règlement ;
* document pédagogique ;
* consignes ;
* normes de l'établissement.

Ces documents servent de référence pour la configuration et éventuellement l'analyse IA.

---

### 25. Gestion des normes / modèles

La plateforme pourrait conserver plusieurs modèles.

Exemple :

* Norme 2019
* Norme 2025
* Norme 2026

Puis l'encadreur choisit celle applicable à son groupe ou à son étudiant.

Cette possibilité est explicitement évoquée dans les retours. 

---

# 4. 🤖 Intelligence artificielle

### 26. Vérification automatique des documents

Lorsqu'un étudiant dépose son document, l'IA effectue une première vérification avant que l'encadreur ne le reçoive.

C'est justement pour éviter que l'encadreur perde du temps sur les problèmes basiques. 

---

### 27. Vérification de la mise en forme

L'IA vérifie notamment :

* police ;
* taille ;
* interligne ;
* marges ;
* styles ;
* structure visuelle.

---

### 28. Vérification de la pagination

Elle vérifie si la pagination respecte les règles définies.

Exemple :

> Pagination attendue : en bas à droite.

Si ce n'est pas respecté :

> ❌ Pagination non conforme.

---

### 29. Vérification de la structure

L'IA vérifie que les parties attendues existent.

Exemple :

Le canevas demande :

* Introduction ;
* Chapitre 1 ;
* Chapitre 2 ;
* Conclusion.

Si le chapitre 2 manque :

> ❌ Chapitre 2 absent.

---

### 30. Vérification des critères du canevas

L'IA ne vérifie pas uniquement si une section existe.

Elle peut vérifier les critères définis pour cette section.

Par exemple :

> Introduction

doit contenir :

* contexte ;
* problématique ;
* objectifs.

Cela permet de passer d'un simple contrôle de structure à un contrôle plus pédagogique. 

---

### 31. Vérification des éléments obligatoires

L'IA vérifie que les éléments marqués comme obligatoires sont présents.

Exemple :

> Résumé obligatoire
> Abstract obligatoire
> Bibliographie obligatoire

Si l'un manque :

> ❌ Document incomplet.

---

### 32. Vérification de certaines citations / références

La transcription évoque également la vérification des citations et références comme éléments pouvant être contrôlés automatiquement.

L'objectif est de faire remonter les problèmes basiques avant que l'encadreur ne commence sa lecture. 

---

### 33. Analyse de cohérence du contenu

Une fonctionnalité envisagée est de permettre à l'IA d'aller plus loin que la forme et de vérifier la logique du contenu entre différentes parties.

Par exemple :

> Une problématique annoncée dans l'introduction correspond-elle au développement ?

Cette fonctionnalité est évoquée comme une possibilité et non comme une fonctionnalité déjà définie précisément. 

---

### 34. Calcul du score de conformité

Chaque partie peut recevoir un score.

Exemple :

```text
Introduction       90 %
Méthodologie       75 %
Mise en forme     100 %
Références         80 %

Score global       86 %
```

Le score peut servir à déterminer si le document peut être envoyé à l'encadreur.

---

### 35. Génération de suggestions de correction

L'IA peut expliquer les problèmes détectés.

Au lieu de dire simplement :

> ❌ Non conforme

elle peut dire :

> La pagination n'est pas conforme aux règles du canevas.

ou :

> La section « Problématique » semble absente.

---

### 36. Détection des éléments non conformes

L'étudiant doit pouvoir voir précisément ce qui pose problème.

Exemple :

```text
❌ Pagination
❌ Chapitre 2 absent
❌ Police incorrecte
⚠️ Référence manquante
✅ Structure générale
```

Cela permet à l'étudiant de corriger avant de solliciter l'encadreur.

---

### 37. Apprentissage à partir des corrections de l'encadreur

Lorsque l'IA se trompe ou qu'un encadreur applique une correction particulière, l'encadreur peut indiquer si cette correction doit devenir une règle générale.

L'objectif est que l'IA évolue avec l'utilisation. 

---

### 38. Création de nouvelles règles à partir des corrections

Exemple :

L'IA ne détecte pas correctement un problème.

L'encadreur corrige.

La plateforme demande :

> Cette règle doit-elle être appliquée aux prochains documents ?

L'encadreur répond :

> Oui.

La règle devient alors une nouvelle référence pour les prochaines analyses.

---

# 5. ✍️ Rédaction et collaboration

### 39. Espace de rédaction partagé

L'étudiant et l'encadreur travaillent dans un même espace.

L'étudiant rédige.

L'encadreur consulte et corrige.

Cela permet d'éviter de multiplier les échanges de fichiers. 

---

### 40. Prévisualisation du document

Permettre de voir à quoi ressemble le document final avant téléchargement.

L'encadreur peut ainsi vérifier le rendu général du mémoire. 

---

### 41. Correction du document par l'encadreur

L'encadreur peut intervenir directement sur le travail de l'étudiant.

Il ne se limite donc pas à dire :

> « Corrige ton chapitre 2. »

Il peut intervenir précisément sur les passages concernés.

---

### 42. Ajout de commentaires

L'encadreur sélectionne une partie et ajoute :

> « Cette partie doit être reformulée. »

L'étudiant reçoit le commentaire directement sur le document.

---

### 43. Surlignage de texte

L'encadreur peut surligner une partie pour attirer l'attention de l'étudiant.

---

### 44. Texte barré

L'encadreur peut barrer un élément qui doit être supprimé ou remplacé.

Ces mécanismes sont comparés à des outils de correction collaborative de type Google Docs. 

---

### 45. Suivi des modifications

La plateforme conserve les modifications afin de savoir :

> Qu'est-ce qui a été demandé ?

puis :

> Qu'est-ce que l'étudiant a réellement corrigé ?

---

### 46. Historique des corrections

Chaque correction peut être conservée.

Exemple :

```text
10 août
Encadreur :
"Reformuler cette partie"

11 août
Étudiant :
Modification effectuée

12 août
Encadreur :
Modification validée
```

---

### 47. Réponse aux commentaires

L'étudiant peut répondre à un commentaire.

Exemple :

> Encadreur : « Ajouter une justification. »

> Étudiant : « C'est ajouté dans le paragraphe suivant. »

Cela crée une véritable conversation autour de la correction.

---

### 48. Validation des corrections

Après correction, l'encadreur vérifie le résultat.

Il peut :

**Valider**

ou

**Demander une nouvelle modification.**

---

# 6. ✅ Validation

### 49. Soumission d'un document

L'étudiant dépose son travail sur la plateforme.

Avant l'envoi à l'encadreur :

**IA → contrôle → score → conformité**

Puis le document peut être transmis à l'encadreur si les conditions sont remplies.

---

### 50. Validation par partie / chapitre

L'encadreur peut valider progressivement :

> Introduction ✅

> Chapitre 1 ✅

> Chapitre 2 ⏳

> Conclusion ⏳

Cette approche est fortement ressortie des échanges. 

---

### 51. Refus d'une partie

L'encadreur peut indiquer :

> ❌ Chapitre 2 non validé.

avec une raison ou des commentaires.

---

### 52. Demande de modification

L'encadreur demande à l'étudiant de corriger.

Exemple :

> « Ajouter l'étude comparative des méthodes. »

L'étudiant effectue la modification puis soumet à nouveau.

---

### 53. Verrouillage d'une partie validée

Une fois :

> Chapitre 1 ✅

l'étudiant ne peut plus le modifier librement.

Cela permet de préserver les parties déjà validées.

Cette idée est explicitement proposée dans les retours. 

---

### 54. Déverrouillage par l'encadreur

Si une modification devient nécessaire sur une partie validée, seul l'encadreur peut l'autoriser.

---

### 55. Validation finale du mémoire

Une fois toutes les parties validées :

> **Mémoire validé**

L'encadreur peut alors autoriser le téléchargement de la version finale ou son passage à l'étape suivante.

---

# 7. 📦 Gestion des livrables

### 56. Définition des livrables attendus

L'encadreur peut définir ce que l'étudiant doit produire.

Exemple pour un étudiant informatique :

* cahier des charges ;
* étude de marché ;
* UX/UI ;
* identité visuelle ;
* conception ;
* application ;
* code.

L'encadreur peut donc créer la liste des livrables attendus dans le projet. 

---

### 57. Dépôt de livrables

L'étudiant peut déposer chaque livrable séparément.

Exemple :

> Cahier des charges.pdf

> Maquette.fig

> Logo.png

> Code.zip

---

### 58. Vérification des livrables

L'encadreur peut vérifier chaque livrable.

Il peut dire :

> ✅ Conforme

ou :

> ❌ À corriger.

---

### 59. Suivi de l'état des livrables

Chaque livrable peut avoir un statut :

* À faire ;
* En cours ;
* Soumis ;
* En correction ;
* Validé.

---

### 60. Dépôt de fichiers

L'étudiant doit pouvoir déposer différents types de fichiers nécessaires au projet.

---

### 61. Partage de liens vers une application / un site

Pour un projet informatique, l'étudiant peut fournir :

> URL de l'application

> URL GitHub

> URL de démonstration

L'encadreur peut directement consulter le résultat. 

---

### 62. Espace pour le code et les ressources techniques

Pour les mémoires informatiques, prévoir un espace spécifique permettant de partager :

* code ;
* dépôt Git ;
* documentation ;
* ressources ;
* liens ;
* applications.

Cette fonctionnalité est spécifiquement demandée dans les retours. 

---

# 8. 👥 Encadrement

### 63. Demande d'encadrement par un étudiant

L'étudiant peut venir sur la plateforme et dire :

> « J'ai besoin d'un encadreur pour mon mémoire. »

Il décrit son projet et son besoin.

---

### 64. Mise en relation étudiant / encadreur

La plateforme peut rechercher des encadreurs correspondant :

* à la filière ;
* au niveau ;
* au domaine ;
* au sujet ;
* aux compétences.

Puis proposer des correspondances.



---

### 65. Acceptation / refus d'une demande d'encadrement

L'encadreur reçoit la demande.

Il peut :

> Accepter

ou :

> Refuser.

---

### 66. Invitation directe d'un étudiant

Un encadreur peut également déjà connaître l'étudiant.

Il peut alors :

> Créer le projet → Générer une invitation → Envoyer à l'étudiant.

Cette fonctionnalité permet de ne pas dépendre du système de mise en relation.

---

### 67. Invitation par code

L'encadreur crée une classe ou un espace et obtient un code.

Exemple :

> MASTER-INFO-26

L'étudiant saisit le code et rejoint automatiquement le bon espace. 

---

### 68. Invitation par email

L'encadreur peut également saisir les emails des étudiants et leur envoyer automatiquement une invitation.

L'idée d'importer une liste d'emails est également évoquée. 

---

### 69. Affectation d'un étudiant à un encadreur

La plateforme doit savoir :

> Étudiant A → Encadreur B

afin que chaque encadreur retrouve uniquement les étudiants qu'il suit.

---

### 70. Gestion de plusieurs étudiants par un encadreur

Un encadreur peut suivre :

> 5, 10, 20, voire plusieurs dizaines d'étudiants.

Le tableau de bord doit donc permettre de les gérer facilement.

---

### 71. Gestion de plusieurs encadreurs pour une classe

Une même classe peut être suivie par plusieurs encadreurs.

La plateforme doit permettre de répartir les étudiants entre eux ou de leur permettre de travailler sur un même espace. 

---

# 9. 📅 Suivi et planning

### 72. Création d'un calendrier de suivi

Chaque étudiant doit avoir un calendrier de suivi.

Il indique :

* séances ;
* échéances ;
* livrables ;
* validations ;
* dates importantes.

---

### 73. Planification des séances

L'encadreur peut programmer les séances.

Exemple :

> Séance 1 — 12 août
> Séance 2 — 19 août
> Séance 3 — 26 août

---

### 74. Définition des disponibilités de l'encadreur

L'encadreur peut renseigner ses disponibilités.

Exemple :

> Lundi à vendredi
> 18h00 → 21h00

Le système peut utiliser ces informations pour proposer les créneaux.

---

### 75. Proposition automatique d'un planning par l'IA

L'IA peut prendre :

* date de début ;
* date de soutenance ;
* nombre de séances ;
* disponibilité de l'encadreur ;
* travail restant.

Puis proposer un planning.

Cette idée est explicitement évoquée dans les échanges. 

---

### 76. Définition des échéances

Chaque tâche ou livrable peut avoir une date limite.

Exemple :

> Cahier des charges → 20 août

> Maquette → 27 août

> Chapitre 1 → 5 septembre

---

### 77. Suivi de la date de soutenance

La date de soutenance doit être renseignée.

Elle permet ensuite de calculer le temps restant et d'organiser le suivi.

---

### 78. Suivi des retards

La plateforme doit détecter :

> Livrable en retard

> Séance non effectuée

> Partie non soumise

> Validation en attente.

---

### 79. Notifications / alertes

L'utilisateur reçoit des alertes concernant :

* échéances ;
* corrections ;
* nouveaux commentaires ;
* demandes de validation ;
* retards ;
* prochaines séances.

Le besoin d'alertes liées aux délais est explicitement mentionné. 

---

### 80. Proposition des tâches à réaliser pour chaque séance

L'IA ne ferait pas uniquement le calendrier.

Elle pourrait également proposer :

> **Séance 1 :** définition du sujet

> **Séance 2 :** cahier des charges

> **Séance 3 :** UX/UI

> **Séance 4 :** conception

> **Séances suivantes :** livrables

> **Dernières séances :** rédaction/relecture.

Cette logique correspond au processus de suivi décrit par l'encadreur. 

---

# 10. 📊 Tableaux de bord

### 81. Tableau de bord encadreur

Il doit donner une vue globale de son activité.

Par exemple :

```text
Mes étudiants : 15
En cours : 10
En retard : 3
Validés : 2

Livrables à corriger : 7
Documents à valider : 4
Séances cette semaine : 5
```

---

### 82. Tableau de bord étudiant

L'étudiant voit :

* son avancement ;
* ses livrables ;
* ses corrections ;
* ses commentaires ;
* ses échéances ;
* son score de conformité ;
* les prochaines étapes.

---

### 83. Suivi de la progression des étudiants

L'encadreur peut voir rapidement où chaque étudiant en est.

Exemple :

> Paul → 80 %

> Jean → 60 %

> Marie → 35 %

---

### 84. Suivi des mémoires en cours

Afficher tous les mémoires actuellement suivis par l'encadreur ou l'établissement.

---

### 85. Suivi des mémoires validés

Permettre de retrouver facilement les mémoires terminés et validés.

---

### 86. Visualisation des livrables en attente

L'encadreur voit par exemple :

> 5 cahiers des charges à vérifier

> 3 maquettes à valider

> 2 chapitres à corriger.

---

### 87. Visualisation des retards

Identifier immédiatement les étudiants qui n'ont pas respecté leurs échéances.

---

### 88. Suivi par classe / groupe

L'encadreur ou l'établissement peut filtrer :

> Master Informatique

puis :

> Groupe A

puis :

> Étudiants en retard.

Cela devient particulièrement utile lorsqu'un encadreur suit beaucoup d'étudiants. 

---

# 11. 📢 Communication

### 89. Commentaires sur les documents

L'encadreur peut commenter directement une partie du document.

---

### 90. Communication encadreur / étudiant

Créer un espace permettant les échanges liés au projet de mémoire.

---

### 91. Communication avec toute une classe

L'encadreur peut envoyer une information à tous les étudiants d'une classe.

---

### 92. Diffusion d'une consigne à plusieurs étudiants

Si une erreur revient chez plusieurs étudiants, l'encadreur peut envoyer une correction globale.

Exemple :

> « Tous les étudiants doivent corriger la pagination de leur document. »

Cette fonctionnalité répond directement à un problème mentionné dans les retours. 

---

### 93. Notifications de nouvelles corrections

Lorsqu'un encadreur ajoute une correction, l'étudiant doit être informé.

Exemple :

> 🔔 Nouvelle correction de votre encadreur.

---

# 12. 💼 Fonctionnalités business

### 94. Mode établissement

Une école peut utiliser la plateforme pour gérer ses mémoires.

Elle peut :

* créer ses filières ;
* créer ses classes ;
* ajouter les enseignants ;
* ajouter les étudiants ;
* définir ses canevas ;
* suivre les mémoires.

---

### 95. Mode encadreur indépendant

Un encadreur qui ne travaille pas officiellement pour une école peut utiliser la plateforme seul.

Il crée :

> Son compte → son canevas → ses critères → ses étudiants.

Cette possibilité est explicitement évoquée. 

---

### 96. Gestion de forfaits / abonnements

Cette fonctionnalité vient du **business model évoqué pendant la discussion**.

L'idée serait de pouvoir proposer différents forfaits, par exemple selon :

* nombre d'étudiants ;
* nombre de mémoires ;
* nombre d'encadreurs ;
* fonctionnalités disponibles.

Les tarifs précis ne sont pas définis dans les transcriptions, donc il ne faudrait pas les figer maintenant. 

---

### 97. Gestion de la mise en relation payante

Si la plateforme met en relation :

> Étudiant ↔ Encadreur

il faudra déterminer si l'étudiant paie pour obtenir un encadrement ou si l'encadreur/établissement paie.

**Attention :** le principe est évoqué, mais le modèle économique n'est pas arrêté dans les transcriptions. 

---

### 98. Gestion des encadreurs disponibles

Si le système de mise en relation est développé, il faudra pouvoir savoir :

* quels encadreurs sont disponibles ;
* leurs domaines ;
* les types de mémoires acceptés ;
* éventuellement leur charge actuelle.

Cela permettrait de proposer un encadreur correspondant au besoin de l'étudiant.
