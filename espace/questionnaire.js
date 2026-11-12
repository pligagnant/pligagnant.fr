/* Onglet « Questionnaire » de la page Mon entreprise : ce dont nous avons besoin pour rédiger un mémoire.
   Les identifiants (a1, ev3, c7…) sont ceux du questionnaire de référence : ne pas les renuméroter. */
(function () {
  "use strict";
  var PG = window.PG, el = PG.el;

  var A = [
    ["Votre entreprise", [
      ["a1", "Qui dirige l'entreprise, depuis quand, et quel est son parcours ?", "Deux lignes suffisent. Indiquez aussi l'adresse du dépôt s'il diffère du siège."],
      ["a2", "Combien de personnes sur le terrain, à l'encadrement, en apprentissage ?"],
      ["a3", "Chiffre d'affaires des trois dernières années, et part faite avec des clients publics"],
      ["a4", "Comment l'entreprise a commencé, et ce qui a changé depuis", "Trois lignes."]
    ]],
    ["Les personnes", [
      ["a5", "Vos chefs d'équipe et responsables", "Pour chacun : nom, fonction, année d'arrivée, diplôme, habilitations et permis avec leur date de validité, ce qu'il ou elle fait le mieux."],
      ["a6", "Qui répond quand un client appelle ? Qui décide en cas d'urgence ? Qui remplace qui pendant les congés ?"],
      ["a7", "Formations suivies par l'équipe depuis deux ans", "Intitulé, année, nombre de personnes."]
    ]],
    ["Le matériel", [
      ["a8", "Votre matériel et vos véhicules", "Type, marque, modèle, année, nombre, acheté ou loué. Qui l'entretient, à quel rythme ?"],
      ["a9", "Ce que vous avez acheté ou remplacé depuis deux ans, et pourquoi"],
      ["a10", "En cas de panne en plein chantier, que faites-vous ?", "Un exemple récent, si vous en avez un."]
    ]],
    ["Les preuves", [
      ["a11", "Qualifications, certifications, labels, agréments", "Lesquels, numéro, date de fin de validité. Déposez les certificats dans « Pièces administratives »."],
      ["a12", "Assurances : assureur, numéro de contrat, montants garantis"],
      ["a13", "Vos références récentes, en détail", "Dix au plus. Client, lieu, années, nature exacte du travail, quantités (surfaces, linéaires, nombre de sites, heures), montant annuel, nom et téléphone d'une personne qui peut témoigner."],
      ["a14", "Avez-vous déjà perdu un marché en ayant reçu vos notes ?", "Si oui, envoyez-nous la lettre : elle nous est très utile."],
      ["a15", "Photos de chantiers, d'équipes, de matériel, logo", "Dites-nous ce que vous avez ; envoyez-les à contact@pligagnant.fr."]
    ]],
    ["Votre façon de travailler", [
      ["a16", "Une journée type d'une équipe, du départ du dépôt au retour"],
      ["a17", "Comment vérifiez-vous qu'un travail est bien fait ?", "Qui contrôle, avec quel document ?"],
      ["a18", "Comment tenez-vous le client au courant, et à quelle fréquence ?", "Appel, courriel, compte rendu, application."],
      ["a19", "Le dernier problème sérieux sur un chantier", "Ce qui s'est passé, ce que vous avez fait, en combien de temps."],
      ["a20", "Sécurité", "Qui s'en occupe, quels équipements sont fournis, date du document unique, ce que vous avez changé après le dernier accident ou presque-accident."],
      ["a21", "Déchets : où vont-ils, et comment gardez-vous la trace ?", "Nom et commune des déchetteries, plateformes, repreneurs."],
      ["a22", "Environnement : ce que vous faites réellement", "Véhicules, produits, eau, bruit, matériel électrique. Des chiffres si vous en avez."],
      ["a23", "Apprentis, insertion, handicap", "Combien de personnes, avec quelles structures, combien d'heures."],
      ["a24", "Vos sous-traitants habituels", "Nom, activité, depuis quand vous travaillez ensemble."],
      ["a25", "Que disent vos clients quand ils vous recommandent ? Que faites-vous mieux que vos concurrents locaux ?"],
      ["a26", "Avez-vous un ancien mémoire technique ?", "Même imparfait : envoyez-le à contact@pligagnant.fr."]
    ]]
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
    ["c13", "Où en est votre offre de prix ?", "Envoyez-nous le bordereau ou le détail rempli : le mémoire doit dire la même chose."]
  ];

  function question(q, valeurs) {
    var id = "q-" + q[0] + "-" + Math.random().toString(36).slice(2, 6);
    var t = el("textarea", { id: id, maxlength: "4000", rows: "3", "data-q": q[0] });
    t.value = valeurs[q[0]] || "";
    return el("div", { class: "champ" }, [el("label", { for: id, text: q[1] }), t, q[2] ? el("small", { text: q[2] }) : null]);
  }
  function lire(form) {
    var o = {};
    form.querySelectorAll("textarea[data-q]").forEach(function (t) { o[t.dataset.q] = t.value.trim(); });
    return o;
  }
  function compte(o) { return Object.keys(o).filter(function (k) { return o[k]; }).length; }

  function rendreMarche(racine, m, ctx) {
    var qs = m.questions || {}, rep = qs.rep || {}, sup = qs.sup || [];
    var f = el("form", { class: "bloc q-marche", novalidate: true });
    f.appendChild(el("h2", { text: m.acheteur }));
    f.appendChild(el("p", { class: "aide", text: m.objet + (m.date_limite ? " · à remettre le " + PG.dateLongue(m.date_limite, false) : "") }));
    if (sup.length) {
      f.appendChild(el("h3", { text: "Nos questions sur ce dossier" }));
      sup.forEach(function (s) { f.appendChild(question([s.id, s.q], rep)); });
      f.appendChild(el("h3", { text: "Pour tout marché" }));
    }
    C.forEach(function (q) { f.appendChild(question(q, rep)); });
    var ok = el("button", { type: "submit", class: "btn", text: "Enregistrer mes réponses pour ce marché" });
    f.appendChild(el("div", { class: "q-bas" }, [ok]));
    f.addEventListener("input", function () { ctx.etat.modifie = true; });
    f.addEventListener("submit", async function (ev) {
      ev.preventDefault();
      var r = await ctx.appeler("client_questions_marche", { p_id: m.id, p: lire(f) }, ok);
      if (!r) return;
      m.questions = r; ctx.etat.modifie = false;
      PG.toast("Réponses enregistrées. Merci : nous les reprenons dans votre mémoire.");
    });
    racine.appendChild(f);
  }

  function rendre(racine, ctx) {
    var d = ctx.etat.d, stock = d.questionnaire || {}, marches = d.marches || [];
    racine.appendChild(el("p", { class: "ent-intro" }, [el("b", { text: "Ce questionnaire sert à écrire vos mémoires. " }),
      "Plus vos réponses sont concrètes (des noms, des chiffres, des exemples), plus le mémoire vous ressemble. Répondez comme au téléphone, sans faire de phrases. Vous pouvez enregistrer et revenir plus tard ; une question sans réponse sera signalée dans le mémoire pour que vous la complétiez."]));

    if (marches.length) {
      racine.appendChild(el("h2", { class: "q-titre", text: marches.length > 1 ? "Vos mémoires en cours" : "Votre mémoire en cours" }));
      var zone = el("div", { class: "profil" });
      marches.forEach(function (m) { rendreMarche(zone, m, ctx); });
      racine.appendChild(zone);
    }

    racine.appendChild(el("h2", { class: "q-titre", text: "Votre entreprise et votre métier" }));
    racine.appendChild(el("p", { class: "ent-intro", text: "À remplir une seule fois : nous le reprenons pour chacun de vos mémoires." }));
    var f = el("form", { class: "profil", novalidate: true });
    A.forEach(function (bloc) {
      f.appendChild(el("section", { class: "bloc" }, [el("h2", { text: bloc[0] })].concat(bloc[1].map(function (q) { return question(q, stock); }))));
    });

    var choix = el("select", { id: "q-metier" }, Object.keys(B).map(function (k) { return el("option", { value: k, text: B[k].nom }); }));
    var devine = VOLET_DE[ctx.cleMetier(d.entreprise.metier) || ""];
    var deja = Object.keys(B).filter(function (k) { return B[k].q.some(function (q) { return stock[q[0]]; }); })[0];
    choix.value = deja || devine || "so";
    var corpsMetier = el("div", { class: "q-metier" });
    var saisie = {};
    function rendreMetier() {
      corpsMetier.textContent = "";
      B[choix.value].q.forEach(function (q) { corpsMetier.appendChild(question(q, Object.assign({}, stock, saisie))); });
    }
    choix.addEventListener("change", function () { Object.assign(saisie, lire(corpsMetier)); rendreMetier(); });
    rendreMetier();
    f.appendChild(el("section", { class: "bloc" }, [el("h2", { text: "Votre métier" }),
      el("div", { class: "champ" }, [el("label", { for: "q-metier", text: "Questions adaptées à" }), choix]), corpsMetier]));

    var msg = el("p", { class: "msg", role: "alert" });
    var ok = el("button", { type: "submit", class: "btn", text: "Enregistrer mes réponses" });
    var quand = el("span", { class: "quand", text: d.questionnaire_maj ? compte(stock) + " réponses enregistrées, la dernière fois le " + PG.dateLongue(String(d.questionnaire_maj).slice(0, 10), false) : "" });
    f.appendChild(el("div", { class: "enregistrer" }, [ok, quand, msg]));
    f.addEventListener("input", function () { ctx.etat.modifie = true; });
    f.addEventListener("submit", async function (ev) {
      ev.preventDefault();
      // On garde les réponses déjà données pour un autre métier, on remplace tout ce qui est à l'écran.
      var corps = Object.assign({}, stock, saisie, lire(f));
      var r = await ctx.appeler("client_questionnaire_enregistrer", { p: corps }, ok);
      if (!r) return;
      d.questionnaire = stock = r; saisie = {}; d.questionnaire_maj = new Date().toISOString();
      ctx.etat.modifie = false;
      quand.textContent = compte(r) + " réponses enregistrées aujourd'hui";
      PG.toast("Réponses enregistrées. Merci.");
    });
    racine.appendChild(f);
  }

  window.PG_QUESTIONNAIRE = { rendre: rendre, A: A, B: B, C: C };
})();
