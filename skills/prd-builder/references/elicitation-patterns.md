# Faire émerger ce qui ne se dit pas

Une partie importante du besoin n'est jamais formulée spontanément. Ce fichier donne les moyens de la faire apparaître : des filtres pour lire un discours, des questions pour préparer un entretien, et l'observation pour voir ce que personne ne décrit.

Sources : Constantinidis, ch. 8 (recueil) et ch. 10 (Kano) ; BABOK v3, 4.2 (Conduct Elicitation) et 10.31 (Observation).

---

## 1. Ce qu'un interlocuteur exprime quand on lui demande son besoin

Spontanément, il exprime presque toujours autre chose qu'un besoin :
- un **problème** qu'il subit ;
- **sa** solution à ce problème ;
- la façon de mettre cette solution en œuvre ;
- plus rarement, un vrai besoin.

Classe chaque extrait dans l'une de ces catégories avant d'en tirer un besoin candidat. Une solution devient une note, puis une remontée au besoin par des « pourquoi ? » portant sur la chose, jamais sur la personne : « pourquoi faut-il une case à cocher ? », pas « pourquoi voulez-vous cette case ? ».

---

## 2. Trois filtres pour lire des notes ou une transcription

Applique-les à chaque source analysée. Chaque occurrence devient soit une **relance** pour le prochain échange avec la même personne, soit une **zone d'ombre** si la réponse ne peut venir que d'ailleurs.

### Généralisations

| Signal | Exemple | Relance |
|---|---|---|
| Quantificateur absolu : tous, toujours, jamais, aucun, chaque fois | « Tout le personnel a un identifiant. » | « Tout le personnel ? Y a-t-il des exceptions ? » |
| Opérateur modal : il faut, on doit, on ne peut pas | « L'agent doit s'inscrire auprès de l'informatique. » | « Que se passe-t-il s'il ne le fait pas ? » |

Les généralisations cachent les **cas alternatifs et les exceptions**. Le script `lint.mjs` signale les quantificateurs absolus dans les besoins candidats et les exigences (règle L05) ; la lecture des modaux reste à faire par toi.

### Omissions

| Signal | Exemple | Relance |
|---|---|---|
| Objet ou action non précisé | « Je traite le dossier. » | « Quel dossier ? En quoi consiste le traitement ? » |
| Comparaison sans référence | « C'est plus rapide. » | « Plus rapide que quoi ? » |
| Acteur absent (« on », voix passive) | « On reçoit un code temporaire. » | « Qui reçoit ce code ? » |

### Distorsions

| Signal | Exemple | Relance |
|---|---|---|
| Lecture des pensées d'autrui | « Les secrétaires n'aiment pas l'outil. » | « Comment cela se manifeste-t-il ? » — et créer une zone `partie_prenante_non_entendue` |
| Lien de cause à effet affirmé | « Personne ne l'utilise parce qu'il est mal conçu. » | « En dehors de la conception, qu'est-ce qui freine l'usage ? » |

Ne transforme jamais un entretien en interrogatoire : l'interlocuteur a le droit d'être imprécis et de parler son jargon. Si une précision crispe, note la relance et cherche l'information ailleurs.

---

## 3. Les attendus implicites (Kano)

Le modèle de Kano distingue trois sortes de caractéristiques :
- **obligatoires** : leur absence provoque l'insatisfaction, leur présence ne satisfait pas particulièrement. Elles semblent si évidentes qu'elles ne sont **presque jamais citées en entretien** ;
- **proportionnelles** : plus il y en a, plus on est satisfait. Ce sont celles qu'on cite en premier ;
- **attractives** : leur absence ne gêne pas, leur présence ravit. On les obtient rarement en entretien, plutôt par la créativité ou l'observation.

Conséquence : un recueil fondé uniquement sur des entretiens laisse de côté les obligatoires. Pour chaque processus ou groupe de besoins, crée une zone d'ombre `attendu_implicite` quand aucune source ne couvre ce que le système ou le processus actuel fait « sans que personne n'y pense ». Moyens de la lever :
- la question directe : « qu'est-ce qui vous paraît tellement évident que vous ne m'en avez pas parlé ? » ;
- l'analyse de l'existant : ce que fait l'outil ou la procédure actuelle ; l'existant satisfait souvent des besoins jamais reconnus, qui disparaissent au changement si personne ne les a notés ;
- l'observation (section 5).

---

## 4. Questions à intégrer aux guides d'entretien

Choisis-en quelques-unes selon l'objectif ; ne les égrène pas.

**Besoins exprimés en négatif** — souvent plus faciles à formuler, et précieux pour entendre les personnes réticentes, qui sont fréquemment les plus inventives :
- « Qu'est-ce qui vous dérange le plus aujourd'hui ? »
- « Si une seule chose devait disparaître de votre quotidien, laquelle ? »
- « Que fait mal l'organisation ou l'outil actuel ? »

**Exceptions** :
- « Racontez-moi la dernière fois que ça ne s'est pas passé normalement. »
- « Que se passe-t-il si [l'événement attendu] n'a pas lieu ? »

**Priorités et critères de satisfaction** :
- « Si vous ne deviez garder que trois choses, lesquelles ? »
- « Comment saurez-vous que ça marche mieux ? »

**Confrontation sans mise en cause** :
- « Une autre personne a évoqué [besoin, anonymisé]. Qu'en pensez-vous ? » — l'interlocuteur a le droit d'être en désaccord.

**Clôture** :
- « Qu'aurions-nous oublié ? »
- « Qui d'autre devrais-je interroger ? »

### Le silence

Quand l'interlocuteur a fini de répondre, attends quelques secondes avant de relancer. Une question volontairement ouverte suivie d'un silence (« Et concernant la transmission des dossiers… ? ») produit souvent la réponse la plus précise de l'entretien. Indique-le dans le guide comme consigne pour l'intervieweur.

---

## 5. L'observation

Ce que les gens disent de leur travail diffère de ce qu'ils font. L'observation fait apparaître les contournements, les tâches informelles, les outils parallèles (fichiers personnels, post-it, messageries) et les attendus implicites.

**Préparer** (`<dossier de l'initiative>/observations/plan-<personne>.md`) :
- l'objectif : quelles zones d'ombre l'observation doit aider à lever ;
- qui observer, quelle activité, à quel moment (une période chargée et une période calme si possible) ;
- le mode : **passif** (on n'interrompt pas ; questions à la fin) ou **actif** (on demande « pourquoi faites-vous cela ? » pendant l'activité).

**Avant la séance**, à dire à la personne observée : l'objet de l'observation ; qu'on n'évalue pas sa performance individuelle ; qu'elle peut interrompre à tout moment.

**Pendant** : noter les étapes typiques et atypiques, le temps passé, les outils et informations utilisés, les contournements, les interruptions, ses propres questions.

**Après** : relire les notes avec la personne observée pour combler les trous ; enregistrer comme source de type `observation` et l'analyser comme toute source.

Limite : l'observation ne montre pas le travail intellectuel (raisonnement, décision). Elle complète l'entretien, elle ne le remplace pas.

---

## 6. Retour à la source

Après un entretien ou une observation, renvoie à la personne une synthèse courte de ce que tu as compris : besoins, irritants, verbatims retenus. Ce n'est pas une validation des exigences, c'est la vérification que l'information est juste avant de l'utiliser. Renseigne `feedback` sur la source (`envoyé`, puis `confirmé` ou `corrigé`). Un besoin candidat issu d'une source non confirmée peut être utilisé, mais signale-le au moment de le transformer en exigence.
