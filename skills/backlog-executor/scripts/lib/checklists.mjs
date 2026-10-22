// Bibliothèque des listes de contrôle de relecture : des questions sur la QUALITÉ des exigences (complètes, claires,
// cohérentes, mesurables), pas sur le code. Un relecteur les coche ; l'agent ne les coche jamais.
export const DOMAINS = {
  securite: { code: 'SEC', title: 'Sécurité', items: [
    'Les données manipulées sont-elles toutes classées (personnelle, santé, confidentielle, publique) ?',
    'Pour chaque action sensible, les exigences disent-elles qui a le droit de la faire ?',
    'Les exigences précisent-elles ce qui se passe après un échec d\'authentification ou une session expirée ?',
    'Les données sensibles exclues des journaux et des messages d\'erreur sont-elles nommées ?',
    'Les durées de conservation et la suppression des données sont-elles exigées ?',
    'Les exigences couvrent-elles la traçabilité des accès aux données de santé ?'] },
  accessibilite: { code: 'ACC', title: 'Accessibilité', items: [
    'Un niveau de conformité (RGAA, WCAG) est-il exigé, et pour quels parcours ?',
    'Chaque parcours critique est-il exigé utilisable au clavier et au lecteur d\'écran ?',
    'Les exigences précisent-elles les contrastes et la taille de texte minimale ?',
    'Les messages d\'erreur sont-ils exigés compréhensibles sans la couleur seule ?',
    'Les contenus non textuels (graphiques de glycémie, icônes) ont-ils une alternative exigée ?'] },
  ergonomie: { code: 'ERG', title: 'Ergonomie', items: [
    'Chaque message d\'erreur exigé dit-il quoi faire pour corriger ?',
    'Les états vides, de chargement et hors connexion sont-ils spécifiés ?',
    'Les contraintes d\'environnement d\'usage (une main, interruptions, lumière) se traduisent-elles en exigences ?',
    'Les termes affichés sont-ils ceux du glossaire, sans synonymes ?',
    'Les confirmations avant une action irréversible sont-elles exigées ?'] },
  'donnees-sante': { code: 'SAN', title: 'Données de santé', items: [
    'Les valeurs cliniques (unités, bornes, arrondis) sont-elles spécifiées sans ambiguïté ?',
    'Le comportement face à une valeur hors bornes ou incohérente est-il exigé ?',
    'Les textes à portée clinique sont-ils identifiés pour une validation par un professionnel de santé ?',
    'Les exigences disent-elles ce qui se passe si une donnée de santé est manquante ou ancienne ?',
    'Les règles d\'hébergement et de consentement applicables sont-elles reprises en exigences ?'] },
  performance: { code: 'PRF', title: 'Performance', items: [
    'Chaque exigence de performance a-t-elle une métrique, une cible et une condition de mesure ?',
    'Les volumes attendus (utilisateurs, données, pics) sont-ils chiffrés et sourcés ?',
    'Le comportement en cas de dépassement (dégradation, file d\'attente) est-il exigé ?',
    'Les temps de réponse sont-ils exigés pour les parcours critiques, pas en moyenne globale ?'] },
};
