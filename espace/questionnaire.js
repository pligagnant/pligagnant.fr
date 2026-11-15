/* Questionnaires de l'espace client : définitions, état (à remplir, commencé, envoyé) et liste de l'onglet « Questionnaire ».
   Les identifiants des questions (a1, ev3, c7, va1…) sont ceux du questionnaire de référence : ne pas les renuméroter.
   La page qui affiche un questionnaire à remplir est dans repondre.js. */
(function () {
  "use strict";
  var PG = window.PG, el = PG.el;

  // Questions sur l'entreprise, regroupées plus bas par thème (a3, a11, a12 et a13 ne sont plus posées :
  // chiffre d'affaires, certificats, assurances et références sont dans le profil, les pièces ou la candidature).
  var Q = {
    a1: ["Qui dirige l'entreprise, depuis quand, et quel est son parcours ?", "Deux lignes suffisent. Indiquez aussi l'adresse du dépôt s'il diffère du siège."],
    a2: ["Combien de personnes sur le terrain, à l'encadrement, en apprentissage ?"],
    a4: ["Comment l'entreprise a commencé, et ce qui a changé depuis", "Trois lignes."],
    a5: ["Vos chefs d'équipe et responsables", "Pour chacun : nom, fonction, année d'arrivée, diplôme, habilitations et permis avec leur date de validité, ce qu'il ou elle fait le mieux."],
    a6: ["Qui répond quand un client appelle ? Qui décide en cas d'urgence ? Qui remplace qui pendant les congés ?"],
    a7: ["Formations suivies par l'équipe depuis deux ans", "Intitulé, année, nombre de personnes."],
    a8: ["Votre matériel et vos véhicules", "Type, marque, modèle, année, nombre, acheté ou loué. Qui l'entretient, à quel rythme ?"],
    a9: ["Ce que vous avez acheté ou remplacé depuis deux ans, et pourquoi"],
    a10: ["En cas de panne en plein chantier, que faites-vous ?", "Un exemple récent, si vous en avez un."],
    a14: ["Avez-vous déjà perdu un marché en ayant reçu vos notes ?", "Si oui, envoyez-nous la lettre : elle nous est très utile."],
    a15: ["Photos de chantiers, d'équipes, de matériel, logo", "Dites-nous ce que vous avez ; envoyez-les à contact@pligagnant.fr."],
    a16: ["Une journée type d'une équipe, du départ du dépôt au retour"],
    a17: ["Comment vérifiez-vous qu'un travail est bien fait ?", "Qui contrôle, avec quel document ?"],
    a18: ["Comment tenez-vous le client au courant, et à quelle fréquence ?", "Appel, courriel, compte rendu, application."],
    a19: ["Le dernier problème sérieux sur un chantier", "Ce qui s'est passé, ce que vous avez fait, en combien de temps."],
    a20: ["Sécurité", "Qui s'en occupe, quels équipements sont fournis, date du document unique, ce que vous avez changé après le dernier accident ou presque-accident."],
    a21: ["Déchets : où vont-ils, et comment gardez-vous la trace ?", "Nom et commune des déchetteries, plateformes, repreneurs."],
    a22: ["Environnement : ce que vous faites réellement", "Véhicules, produits, eau, bruit, matériel électrique. Des chiffres si vous en avez."],
    a23: ["Apprentis, insertion, handicap", "Combien de personnes, avec quelles structures, combien d'heures."],
    a24: ["Vos sous-traitants habituels", "Nom, activité, depuis quand vous travaillez ensemble."],
    a25: ["Que disent vos clients quand ils vous recommandent ? Que faites-vous mieux que vos concurrents locaux ?"],
    a26: ["Avez-vous un ancien mémoire technique ?", "Même imparfait : envoyez-le à contact@pligagnant.fr."],
    // Pour la veille : peu de questions, générales (lues par la veille, voir prive.reponses_veille).
    va1: ["Les prestations que vous faites", "Le plus précis possible. Ex. : tonte, taille de haies, élagage jusqu'à 15 m."],
    va2: ["Ce que vous ne faites pas, ou ne voulez plus faire", "Nous écartons les appels d'offres qui portent surtout là-dessus."],
    va3: ["Les contrats qui vous intéressent le plus", "Entretien à l'année ou chantiers ponctuels, petits ou gros montants…"],
    vc1: ["Pour quels acheteurs publics avez-vous déjà travaillé ?", "Communes, bailleurs, collèges, hôpitaux… même en sous-traitance."],
    vc2: ["Vos marchés publics en cours, et quand ils se terminent", "Nous surveillons leur remise en concurrence."],
    vc3: ["Les acheteurs que vous visez en priorité"],
    vd1: ["Vos périodes chargées dans l'année", "Pour savoir si un démarrage tombe mal."],
    vd2: ["Répondre à plusieurs (groupement) ou en sous-traitance : cela vous intéresse ?", "Avec qui, pour quoi."],
    vd3: ["Autre chose à savoir pour bien choisir vos appels d'offres ?"]
  };
  var VEILLE = [
    { id: "prestations", titre: "Vos prestations", q: ["va1", "va2", "va3"] },
    { id: "clients", titre: "Vos clients", q: ["vc1", "vc2", "vc3"] },
    { id: "organisation", titre: "Votre organisation", q: ["vd1", "vd2", "vd3"] }
  ];
  var MEMOIRE = [
    { id: "equipe", titre: "L'entreprise et l'équipe", q: ["a1", "a2", "a4", "a5", "a6", "a7"] },
    { id: "materiel", titre: "Le matériel", q: ["a8", "a9", "a10"] },
    { id: "methode", titre: "Votre façon de travailler", q: ["a16", "a17", "a18", "a19"] },
    { id: "engagements", titre: "Sécurité, environnement, social", q: ["a20", "a21", "a22", "a23", "a24"] },
    { id: "atouts", titre: "Vos atouts et vos documents", q: ["a25", "a14", "a15", "a26"] }
  ];

  var B = {
    ev: { nom: "Espaces verts", q: [
      ["ev1", "Tonte : matériel par type de surface, hauteur de coupe, mulching ou ramassage, nombre de passages par an"],
      ["ev2", "Taille, élagage, abattage : qui grimpe, avec quels diplômes ? Nacelle en propre ou louée ?"],
      ["ev3", "Désherbage sans produits phytosanitaires : techniques, matériel, résultat attendu"],
      ["ev4", "Titulaires du certificat phytosanitaire dans l'équipe", "Noms et dates de validité, s'il y en a."],
      ["ev5", "Déchets verts : broyage sur place, compostage, plateforme", "Nom, commune, distance."],
      ["ev6", "Matériel électrique ou à batterie : lequel, quelle part du parc ?"],
      ["ev7", "Gestion différenciée, fauche tardive, faune, arrosage économe : ce que vous pratiquez déjà, et où"],
      ["ev8", "Travail en présence du public ou en bord de route : comment balisez-vous ?"],
      ["ev9", "Astreinte tempête, déneigement, salage : avec quels moyens et quel délai ?"],
      ["ev10", "Fleurissement et plantations : fournisseurs, origine des végétaux, garantie de reprise"]
    ]},
    ne: { nom: "Nettoyage et propreté", q: [
      ["ne1", "Qui encadre un site ?", "Nom, fonction, passages sur place par semaine, nombre de sites suivis."],
      ["ne2", "Un agent est absent : qui est prévenu, en combien de temps le remplaçant est-il sur place, d'où vient-il ?"],
      ["ne3", "Reprise du personnel en place lors d'un nouveau marché : comment l'organisez-vous ?"],
      ["ne4", "Méthodes et matériel par type de local", "Bureaux, sanitaires, sols, vitres. Marque, modèle, nombre."],
      ["ne5", "Vos produits", "Marque, usage, écolabel. Envoyez les fiches techniques et les fiches de données de sécurité."],
      ["ne6", "Consommables sanitaires : fournisseur, références, rythme de réapprovisionnement"],
      ["ne7", "Contrôle qualité : grille, qui contrôle, à quelle fréquence, que devient le résultat ?", "Outil numérique ?"],
      ["ne8", "Horaires : en journée ou décalés ? Ce que vous proposez, et pourquoi"],
      ["ne9", "Arrivée d'un nouvel agent sur un site : visite, consignes, formation, durée"],
      ["ne10", "Clés, badges, alarmes, confidentialité : vos règles"],
      ["ne11", "Prestations ponctuelles (remise en état, vitrerie en hauteur, urgence) : délai et moyens"]
    ]},
    so: { nom: "Bâtiment et second œuvre", q: [
      ["so1", "Ce que vous réalisez vous-même ; ce que vous sous-traitez, et à qui"],
      ["so2", "Qualifications par activité", "Numéros et dates de validité."],
      ["so3", "Fournisseurs et marques habituels ; les produits que vous proposez le plus souvent, et pourquoi"],
      ["so4", "Préparation d'un chantier : visite, relevés, plans, échantillons, délai d'approvisionnement"],
      ["so5", "Site occupé : protection des lieux, information des occupants, nettoyage en fin de journée", "Un exemple."],
      ["so6", "Coordination avec les autres lots : qui assiste aux réunions de chantier ?"],
      ["so7", "Autocontrôle : quelles fiches, pour quels ouvrages ?", "Envoyez un exemple rempli."],
      ["so8", "Réserves et année de garantie : délai de levée, qui intervient, comment le client vous joint"],
      ["so9", "Bâtiment ancien : formation amiante et plomb dans l'équipe ?"],
      ["so10", "Tri des déchets de chantier : bennes, repreneurs, bordereaux"],
      ["so11", "Combien de chantiers menez-vous de front ? Taille du plus gros chantier terminé"]
    ]},
    vr: { nom: "VRD et voirie", q: [
      ["vr1", "Engins en propre ; ce que vous louez, et chez qui", "Type, marque, tonnage, année."],
      ["vr2", "Conducteurs d'engins : noms, autorisations de conduite, ancienneté"],
      ["vr3", "Travaux près des réseaux : qui est formé, comment se passent les déclarations et le marquage au sol ?"],
      ["vr4", "Fournisseurs de granulats, d'enrobés, de tuyaux", "Noms, communes."],
      ["vr5", "Terres et déblais : réemploi sur place, lieux de dépôt, suivi"],
      ["vr6", "Contrôles : compactage, portance, étanchéité, passage caméra", "En interne, ou par quel laboratoire ?"],
      ["vr7", "Circulation et riverains : signalisation, alternat, accès, information"],
      ["vr8", "Plans d'exécution et de récolement : qui les fait, avec quel matériel de relevé ?"],
      ["vr9", "Intempéries : comment protégez-vous le chantier et rattrapez-vous le planning ?"],
      ["vr10", "Phasage type d'un chantier comparable", "Durées et effectif par phase."],
      ["vr11", "Propreté des voies, poussière, bruit : ce que vous faites"]
    ]},
    ms: { nom: "Maintenance et sécurité", q: [
      ["ms1", "Vos activités exactes", "Extincteurs, robinets d'incendie, désenfumage, alarme et détection, éclairage de sécurité, portes coupe-feu, gardiennage, formation."],
      ["ms2", "Certifications et agréments de l'entreprise ; cartes professionnelles ou diplômes des intervenants", "Numéros et dates de validité."],
      ["ms3", "Techniciens ou agents : nombre, secteur couvert, point de départ, stock dans le véhicule"],
      ["ms4", "Délais réels : intervention urgente, intervention normale, remise du rapport", "Astreinte jour et nuit ? Numéro unique ?"],
      ["ms5", "Rapport de vérification : papier ou numérique ? Accès en ligne pour le client ?", "Envoyez un modèle rempli."],
      ["ms6", "Registre de sécurité : comment le mettez-vous à jour ?"],
      ["ms7", "Planification des visites sur plusieurs sites : qui prévient, combien de temps avant ?"],
      ["ms8", "Appareils réformés et déchets : filière et preuve"],
      ["ms9", "Pièces et appareils de remplacement : marques, stock, délai"],
      ["ms10", "Veille réglementaire : comment prévenez-vous le client d'un changement ou d'une non-conformité ?"],
      ["ms11", "Gardiennage : recrutement, formation, tenue, contrôle des rondes, remplacement, encadrement de nuit"],
      ["ms12", "Formation : formateurs, matériel pédagogique, taille des groupes, évaluation, attestations"]
    ]}
  };
  var VOLET_DE = { "espaces verts": "ev", "nettoyage": "ne", "vrd et voirie": "vr", "maintenance et sécurité": "ms",
    "second œuvre": "so", "gros œuvre et maçonnerie": "so", "électricité": "so", "plomberie, chauffage et climatisation": "so", "couverture et étanchéité": "so" };

  var C = [
    ["c1", "Avez-vous visité le site ? Qu'avez-vous remarqué ?", "Accès, stationnement, horaires, public, état actuel, points difficiles."],
    ["c2", "Connaissez-vous cet acheteur ou ce site ?", "Déjà travaillé pour lui ? Êtes-vous le titulaire actuel ?"],
    ["c3", "Qui sera responsable du marché, et qui sera sur place ?", "Noms, nombre de personnes, heures ou jours prévus."],
    ["c4", "Quel matériel précis irez-vous y mettre ?"],
    ["c5", "D'où partiront les équipes ? Temps de trajet jusqu'au site"],
    ["c6", "Quand pouvez-vous démarrer ? Que ferez-vous le premier mois ?"],
    ["c7", "Délais et fréquences sur lesquels vous êtes prêt à vous engager par écrit", "Ce qui est écrit dans le mémoire vous engage."],
    ["c8", "Ce que vous proposez en plus du cahier des charges", "Seulement ce qui est bien compté dans votre prix."],
    ["c9", "Vos trois références les plus proches de ce marché"],
    ["c10", "Sous-traitance ou groupement prévu ? Avec qui, pour quoi ?"],
    ["c11", "Variantes ou prestations supplémentaires : y répondez-vous ?"],
    ["c12", "Qu'est-ce qui vous inquiète dans ce dossier ? Qu'est-ce qui fera la différence ?"],
    ["c13", "Où en est votre offre de prix ?", "Envoyez-nous le bordereau ou le détail rempli : le mémoire doit dire la même chose."],
    ["c14", "Pour chaque prestation de votre prix : combien de personnes, combien d'heures ou de passages ?", "Les chiffres qui vous ont servi à calculer votre prix. L'acheteur les compare à sa propre estimation et peut vous les redemander."],
    ["c15", "Vos chiffres pour l'environnement sur ce marché", "Part de produits écolabellisés, matériel électrique, distance du dépôt et des fournisseurs, part des déchets valorisés et où. Un critère environnemental est désormais noté dans chaque marché."]
  ];


  function plat(t) { return (t || "").toLowerCase().replace(/œ/g, "oe").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim(); }
  // Volet métier : celui déjà commencé, sinon celui du métier de l'entreprise.
  function voletDe(d, faites) {
    var deja = Object.keys(B).filter(function (k) { return B[k].q.some(function (q) { return faites[q[0]]; }); })[0];
    if (deja) return deja;
    var m = plat(d.entreprise && d.entreprise.metier);
    if (!m) return null;
    var cles = Object.keys(VOLET_DE).sort(function (a, b) { return b.length - a.length; });
    for (var i = 0; i < cles.length; i++) { var k = plat(cles[i]); if (m === k || m.indexOf(k) >= 0) return VOLET_DE[cles[i]]; }
    return null;
  }
  function questionsDe(ids) { return ids.map(function (k) { return [k, Q[k][0], Q[k][1]]; }); }
  function repondues(d) { // questions déjà répondues (données complètes de client_entreprise ou seulement les clés de client_tableau)
    var o = {};
    if (d.questionnaire) Object.keys(d.questionnaire).forEach(function (k) { if (d.questionnaire[k]) o[k] = true; });
    else (d.questionnaire_cles || []).forEach(function (k) { o[k] = true; });
    return o;
  }
  function compter(qs, faites) { return qs.filter(function (q) { return faites[q[0]]; }).length; }

  // Tous les questionnaires proposés à cette entreprise, dans l'ordre de la liste.
  function liste(d) {
    var faites = repondues(d), etats = d.questionnaires_etat || {}, L = [];
    function entreprise(t, groupe) {
      var qs = t.q ? questionsDe(t.q) : t.questions;
      L.push({ id: t.id, groupe: groupe, titre: t.titre, questions: qs, nbRep: compter(qs, faites),
               envoye: (etats[t.id] || {}).envoye || null, lien: "/espace/questionnaire/?q=" + t.id, volet: t.volet || null });
    }
    (d.marches || []).forEach(function (m) {
      var qs = m.questions || {}, rep = qs.rep || {};
      var questions = (qs.sup || []).map(function (s) { return [s.id, s.q]; }).concat(C);
      L.push({ id: "m-" + m.id, marche: m, groupe: "memoire", titre: m.acheteur, sous: m.objet, questions: questions,
               nbRep: questions.filter(function (q) { return rep[q[0]]; }).length, envoye: qs.envoye || null,
               dateLimite: m.date_limite || null, lien: "/espace/questionnaire/?m=" + m.id, sup: (qs.sup || []).length });
    });
    if (d.entreprise && d.entreprise.formule !== "veille") {
      MEMOIRE.forEach(function (t) { entreprise(t, "memoire"); });
      var v = voletDe(d, faites);
      if (v) entreprise({ id: "metier", titre: "Votre métier : " + B[v].nom.toLowerCase(), questions: B[v].q, volet: v }, "memoire");
    }
    VEILLE.forEach(function (t) { entreprise(t, "veille"); });
    return L;
  }
  function etatDe(q) { return q.envoye ? "envoye" : q.nbRep ? "commence" : "a_remplir"; }
  function texteEtat(q) {
    return q.envoye ? "Envoyé le " + PG.dateCourte(String(q.envoye).slice(0, 10)) : q.nbRep ? "Commencé" : "À remplir";
  }
  function texteBouton(q) { return q.envoye ? "Modifier" : q.nbRep ? "Continuer" : "Y répondre"; }

  // Onglet « Questionnaire » de Mon entreprise : sujet, nombre de questions, état, et un bouton par questionnaire.
  function rendreListe(racine, d) {
    var L = liste(d);
    racine.appendChild(el("p", { class: "ent-intro", text: "Vos réponses nous servent à choisir vos appels d'offres et à écrire vos mémoires." }));
    [["memoire", "Pour vos mémoires"], ["veille", "Pour votre veille"]].forEach(function (g) {
      var qs = L.filter(function (q) { return q.groupe === g[0]; });
      if (!qs.length) return;
      var ul = el("ul", { class: "q-liste" });
      qs.forEach(function (q) {
        var e = etatDe(q);
        ul.appendChild(el("li", { class: "q-ligne q-" + e }, [
          el("div", { class: "q-txt" }, [
            el("b", { text: q.titre }),
            q.sous ? el("span", { class: "q-sous", text: q.sous }) : null,
            el("span", { class: "q-meta" }, [PG.pluriel(q.questions.length, "question", "questions") + " · ", el("span", { class: "q-etat", text: texteEtat(q) })])
          ]),
          el("a", { class: "btn petit" + (e === "envoye" ? " blanc" : ""), href: q.lien, text: texteBouton(q), "aria-label": texteBouton(q) + " : " + q.titre })
        ]));
      });
      racine.appendChild(el("section", { class: "partie" }, [el("h2", { text: g[1] }), ul]));
    });
    if (d.entreprise && d.entreprise.formule === "veille") {
      racine.appendChild(el("p", { class: "aide", text: "Les questionnaires pour vos mémoires arrivent quand vous nous confiez un appel d'offres." }));
    }
  }

  window.PG_QUESTIONNAIRE = { Q: Q, B: B, C: C, VEILLE: VEILLE, MEMOIRE: MEMOIRE, liste: liste, etatDe: etatDe, texteEtat: texteEtat, rendreListe: rendreListe };
})();
