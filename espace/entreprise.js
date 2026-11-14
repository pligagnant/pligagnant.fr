/* Page « Mon entreprise » de l'espace client : profil (facultatif, adapté au métier) et pièces administratives. */
(function () {
  "use strict";
  var PG = window.PG, sb = PG.client, el = PG.el;
  var $ = function (id) { return document.getElementById(id); };
  var SEAU = "pieces";
  var ONGLETS = ["profil", "questionnaire", "pieces"];
  var etat = { d: null, onglet: "profil", liens: {}, liensLe: 0, modifie: false };

  // ------------------------------------------------------------------ ce que nous proposons selon le métier
  function plat(t) { return (t || "").toLowerCase().replace(/œ/g, "oe").normalize("NFD").replace(/[̀-ͯ]/g, "").trim(); }
  var METIERS = {
    "espaces verts": {
      qualifs: ["Qualipaysage", "Certiphyto", "CACES (engins, nacelle)", "Certificat arboriste-élagueur", "Gestion écologique, zéro phyto", "ISO 14001"],
      materiel: ["Tondeuses autoportées", "Débroussailleuses", "Broyeur de végétaux", "Nacelle", "Tracteur avec épareuse", "Camion benne", "Outillage électrique sur batterie"],
      ref: ["Ex. : Commune de Colmar", "Ex. : entretien des espaces verts des écoles", "Ex. : 45 000 € HT par an"],
      pres: "Ex. : équipe formée à la gestion différenciée, outillage électrique en centre-ville, intervention sous 24 h après une tempête…"
    },
    "nettoyage": {
      qualifs: ["Qualipropre", "ISO 9001", "ISO 14001", "MASE", "Produits écolabellisés", "Habilitation travail en hauteur"],
      materiel: ["Autolaveuses", "Monobrosses", "Aspirateurs dorsaux", "Injecteur-extracteur", "Nettoyeur haute pression", "Nacelle", "Véhicules utilitaires"],
      ref: ["Ex. : Mairie de Mulhouse", "Ex. : nettoyage des locaux administratifs", "Ex. : 30 000 € HT par an"],
      pres: "Ex. : chef d'équipe sur site, remplacement des absences sous 24 h, produits écolabellisés, contrôle qualité chaque mois…"
    },
    "second œuvre": {
      qualifs: ["Qualibat", "RGE", "Amiante sous-section 4", "Assurance décennale", "Handibat"],
      materiel: ["Échafaudages", "Machine à projeter", "Ponceuses", "Outillage électroportatif", "Véhicules utilitaires"],
      ref: ["Ex. : Commune de Sélestat", "Ex. : réfection des peintures de l'école", "Ex. : 25 000 € HT"],
      pres: "Ex. : travaux en site occupé, chantier propre chaque soir, interventions pendant les vacances scolaires…"
    },
    "gros œuvre et maçonnerie": {
      qualifs: ["Qualibat", "Amiante sous-section 4", "CACES", "Assurance décennale", "MASE"],
      materiel: ["Mini-pelle", "Grue", "Bétonnière", "Banches", "Échafaudages", "Camion benne"],
      ref: ["Ex. : Communauté de communes", "Ex. : extension du groupe scolaire", "Ex. : 180 000 € HT"],
      pres: "Ex. : équipe stable de compagnons, gestion des déchets de chantier, planning tenu sur les derniers chantiers…"
    },
    "vrd et voirie": {
      qualifs: ["Identification FNTP", "AIPR (proximité des réseaux)", "CACES", "Assurance décennale", "ISO 14001"],
      materiel: ["Pelle mécanique", "Mini-pelle", "Compacteur", "Finisseur", "Camion benne", "Raboteuse"],
      ref: ["Ex. : Département du Haut-Rhin", "Ex. : réfection de chaussée", "Ex. : 120 000 € HT"],
      pres: "Ex. : signalisation de chantier maîtrisée, maintien de la circulation, recyclage des enrobés…"
    },
    "maintenance et sécurité": {
      qualifs: ["APSAD", "Qualifelec", "Autorisation CNAPS", "SSIAP", "ISO 9001"],
      materiel: ["Véhicules d'intervention", "Appareils de mesure", "Nacelle", "Logiciel de suivi des interventions", "Astreinte 24 h sur 24"],
      ref: ["Ex. : Ville de Colmar", "Ex. : maintenance des alarmes incendie", "Ex. : 15 000 € HT par an"],
      pres: "Ex. : délai d'intervention garanti, astreinte, rapport après chaque visite…"
    },
    "électricité": {
      qualifs: ["Qualifelec", "RGE", "Habilitations électriques", "IRVE (bornes de recharge)", "Assurance décennale"],
      materiel: ["Nacelle", "Appareils de mesure", "Détecteur de réseaux", "Véhicules équipés"],
      ref: ["Ex. : Commune de Cernay", "Ex. : rénovation de l'éclairage du gymnase", "Ex. : 60 000 € HT"],
      pres: "Ex. : électriciens habilités, dépannage sous 4 h, passage à l'éclairage LED…"
    },
    "plomberie, chauffage et climatisation": {
      qualifs: ["Qualibat", "RGE (QualiPAC, Qualibois…)", "Attestation de capacité fluides frigorigènes", "Professionnel du gaz (PG)", "Assurance décennale"],
      materiel: ["Caméra d'inspection", "Hydrocureuse", "Poste à souder", "Analyseur de combustion", "Véhicules équipés"],
      ref: ["Ex. : Collège de Thann", "Ex. : remplacement de la chaufferie", "Ex. : 85 000 € HT"],
      pres: "Ex. : contrat d'entretien avec astreinte, suivi des consommations, pièces en stock…"
    },
    "couverture et étanchéité": {
      qualifs: ["Qualibat", "RGE", "Amiante sous-section 4", "Travail en hauteur", "Assurance décennale"],
      materiel: ["Échafaudages", "Nacelle", "Monte-matériaux", "Lignes de vie", "Véhicules"],
      ref: ["Ex. : Commune de Guebwiller", "Ex. : réfection de la toiture de la mairie", "Ex. : 70 000 € HT"],
      pres: "Ex. : sécurité en hauteur, bâchage le jour même en cas d'intempéries, garantie décennale…"
    }
  };
  var GENERIQUE = {
    qualifs: ["ISO 9001", "ISO 14001", "MASE", "Assurance décennale"],
    materiel: ["Véhicules utilitaires", "Outillage professionnel"],
    ref: ["Ex. : Commune de …", "Ex. : objet du marché", "Ex. : 40 000 € HT"],
    pres: "Ex. : ce que vos clients apprécient, votre réactivité, votre démarche environnementale…"
  };
  var CLES_BTP = ["second œuvre", "gros œuvre et maçonnerie", "vrd et voirie", "électricité", "plomberie, chauffage et climatisation", "couverture et étanchéité"];
  function cleMetier(m) {
    var p = plat(m);
    if (!p) return null;
    var cles = Object.keys(METIERS).sort(function (a, b) { return b.length - a.length; });
    for (var i = 0; i < cles.length; i++) { var k = plat(cles[i]); if (p === k || p.indexOf(k) >= 0) return cles[i]; }
    return null;
  }
  function guide() { return METIERS[cleMetier(etat.d.entreprise.metier)] || GENERIQUE; }
  function btp() {
    var c = cleMetier(etat.d.entreprise.metier);
    return c ? CLES_BTP.indexOf(c) >= 0 : /batiment|btp|macon|menuis|peint|platr|carrel|charpent|terrass|isolation|facade/.test(plat(etat.d.entreprise.metier));
  }

  var CAPACITES = [["", "Je ne sais pas"], ["moins_40k", "Jusqu'à 40 000 € HT"], ["40_90k", "De 40 000 à 90 000 € HT"],
                   ["90_250k", "De 90 000 à 250 000 € HT"], ["250k_1m", "De 250 000 € à 1 M€ HT"], ["plus_1m", "Plus de 1 M€ HT"]];
  var EXPERIENCE = [["jamais", "Jamais"], ["parfois", "Quelques fois"], ["souvent", "Souvent"]];

  // ------------------------------------------------------------------ pièces : types usuels
  var TYPES = {
    kbis: { nom: "Extrait Kbis", aide: "Les acheteurs demandent un extrait de moins de 3 mois. Téléchargeable sur le site d'Infogreffe.", mode: "emission", date: "Date de l'extrait", duree: 3 },
    urssaf: { nom: "Attestation de vigilance URSSAF", aide: "Valable 6 mois. Téléchargeable dans votre espace URSSAF.", mode: "emission", date: "Date de l'attestation", duree: 6 },
    fiscale: { nom: "Attestation de régularité fiscale", aide: "Téléchargeable dans votre espace professionnel des impôts.", mode: "fin" },
    rc_pro: { nom: "Attestation d'assurance responsabilité civile", aide: "Votre assureur vous la délivre ; elle indique sa période de validité.", mode: "fin" },
    decennale: { nom: "Attestation d'assurance décennale", aide: "Demandée pour les travaux de bâtiment ; elle indique sa période de validité.", mode: "fin" },
    conges: { nom: "Attestation de congés payés", aide: "Délivrée par votre caisse de congés payés du BTP.", mode: "fin" },
    qualification: { nom: "Certificats de qualification", aide: "Qualibat, Qualipaysage, Qualifelec, RGE, ISO… : un certificat par qualification.", mode: "fin", libelle: "Nom de la qualification", plusieurs: true },
    bilans: { nom: "Bilans ou comptes annuels", mode: "aucune", plusieurs: true },
    rib: { nom: "RIB", mode: "aucune" },
    references: { nom: "Attestations de bonne exécution", aide: "Signées par vos clients publics : elles appuient vos références.", mode: "aucune", plusieurs: true },
    autre: { nom: "Autre document", mode: "fin", libelle: "Nom du document", libelleRequis: true, plusieurs: true }
  };
  function usuelles() { return ["kbis", "urssaf", "fiscale", "rc_pro"].concat(btp() ? ["decennale", "conges"] : []).concat(["qualification"]); }
  function autresTypes() { return Object.keys(TYPES).filter(function (t) { return usuelles().indexOf(t) < 0; }); }
  var EXT = { "application/pdf": "pdf", "image/jpeg": "jpg", "image/png": "png", "image/heic": "heic", "image/heif": "heif", "image/webp": "webp" };
  var MIME = { pdf: "application/pdf", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", heic: "image/heic", heif: "image/heif", webp: "image/webp" };
  var MAX_OCTETS = 10 * 1024 * 1024;

  // ------------------------------------------------------------------ dates
  function jour() { return (etat.d && etat.d.aujourdhui) || PG.aujourdhuiIso(); }
  function dateTxt(d) { return PG.dateLongue(d, false); }
  function plusMois(d, n) { var x = PG.vers(d); if (!x) return null; x.setMonth(x.getMonth() + n); return PG.iso(x); }
  function etatDate(fin) {
    if (!fin) return "neutre";
    var n = PG.ecart(fin, jour());
    return n < 0 ? "expire" : n <= 30 ? "bientot" : "ok";
  }
  function texteValidite(p) {
    if (!p.date_fin) return p.date_document ? "du " + dateTxt(p.date_document) : "sans date de fin";
    var e = etatDate(p.date_fin);
    return e === "expire" ? "expiré le " + dateTxt(p.date_fin) : e === "bientot" ? "à renouveler avant le " + dateTxt(p.date_fin) : "valable jusqu'au " + dateTxt(p.date_fin);
  }
  function taille(o) { return !o ? "" : o < 1024 * 1024 ? Math.max(1, Math.round(o / 1024)) + " Ko" : (o / 1024 / 1024).toFixed(1).replace(".", ",") + " Mo"; }

  // ------------------------------------------------------------------ données
  function gratuit() { return etat.d.entreprise.formule === "veille"; }

  async function charger() {
    var r = await sb.rpc("client_entreprise");
    if (r.error) {
      if (PG.sessionExpiree(r.error)) { location.replace("/espace/?expire=1"); return false; }
      erreur(PG.messageErreur(r.error)); return false;
    }
    etat.d = r.data;
    await signer();
    return true;
  }
  // Liens d'ouverture des fichiers (valables une heure).
  async function signer() {
    etat.liens = {};
    var chemins = (etat.d.pieces || []).map(function (p) { return p.chemin; });
    if (!chemins.length) return;
    try {
      var r = await sb.storage.from(SEAU).createSignedUrls(chemins, 3600);
      (r.data || []).forEach(function (x) { if (x.signedUrl) etat.liens[x.path] = x.signedUrl; });
      etat.liensLe = Date.now();
    } catch (e) { /* les liens manqueront : la page reste utilisable */ }
  }

  async function appeler(fn, params, bouton) {
    PG.occupe(bouton, true);
    try {
      var r = await sb.rpc(fn, params);
      if (r.error) {
        if (PG.sessionExpiree(r.error)) { location.replace("/espace/?expire=1"); return null; }
        PG.toast(PG.messageErreur(r.error), { erreur: true });
        return null;
      }
      return r.data === null || r.data === undefined ? true : r.data;
    } catch (e) {
      PG.toast(PG.messageErreur(e), { erreur: true });
      return null;
    } finally { PG.occupe(bouton, false); }
  }

  // ------------------------------------------------------------------ rendu général
  function rendre() {
    var e = etat.d.entreprise;
    $("qui").textContent = e.nom; $("qui").title = etat.d.moi.email;
    var h = $("hello"); h.textContent = "";
    h.appendChild(el("div", { class: "hello-tete" }, [
      el("h1", { text: "Mon entreprise" }),
      el("p", { class: "sous", text: e.nom })
    ]));
    ONGLETS.forEach(function (o) {
      var b = $("o-" + o);
      b.setAttribute("aria-selected", String(etat.onglet === o));
      b.tabIndex = etat.onglet === o ? 0 : -1;
    });
    $("o-pieces").classList.toggle("verrou", gratuit());
    $("panneau").setAttribute("aria-labelledby", "o-" + etat.onglet);
    var p = $("panneau"); p.textContent = "";
    if (etat.onglet === "profil") rendreProfil(p);
    else if (etat.onglet === "questionnaire") window.PG_QUESTIONNAIRE.rendre(p, { etat: etat, appeler: appeler, cleMetier: cleMetier });
    else rendrePieces(p);
    $("corps").hidden = false;
  }
  function choisir(o, focus) {
    if (o === etat.onglet) return;
    if (etat.modifie && etat.onglet !== "pieces" && !confirm("Vos modifications ne sont pas enregistrées. Les abandonner ?")) return;
    etat.modifie = false;
    etat.onglet = o;
    if (location.hash.slice(1) !== o) history.replaceState(null, "", "#" + o);
    rendre();
    if (focus) $("o-" + o).focus();
    var y = $("corps").getBoundingClientRect().top + window.scrollY;
    if (window.scrollY > y) window.scrollTo(0, y);
  }

  // ------------------------------------------------------------------ profil
  function champ(label, input, aide) {
    var id = input.id || ("c" + Math.random().toString(36).slice(2, 8));
    input.id = id;
    return el("div", { class: "champ" }, [el("label", { for: id, text: label }), input, aide ? el("small", { text: aide }) : null]);
  }
  function nombre(valeur, max, placeholder) {
    return el("input", { type: "text", inputmode: "numeric", maxlength: String(max), value: valeur === undefined || valeur === null ? "" : String(valeur), placeholder: placeholder || "", autocomplete: "off" });
  }

  function rendreProfil(racine) {
    var p = etat.d.profil || {}, g = guide();
    racine.appendChild(el("p", { class: "ent-intro", text: "Facultatif. Ces informations nous aident à juger les consultations et à préparer vos mémoires." }));
    var f = el("form", { class: "formulaire", novalidate: true });

    var siret = el("input", { type: "text", inputmode: "numeric", maxlength: "17", value: p.siret || "", autocomplete: "off" });
    var ville = el("input", { type: "text", maxlength: "100", value: p.ville || etat.d.entreprise.ville || "", autocomplete: "address-level2" });
    var effectif = nombre(p.effectif, 5);
    var annee = nombre(p.annee_creation, 4);
    var ca = el("input", { type: "text", maxlength: "40", value: p.ca || "" });
    f.appendChild(el("h2", { text: "Entreprise" }));
    f.appendChild(el("div", { class: "ligne" }, [champ("SIRET", siret), champ("Ville", ville)]));
    f.appendChild(el("div", { class: "ligne courts" }, [champ("Effectif, vous compris", effectif), champ("Année de création", annee), champ("Chiffre d'affaires", ca)]));

    var capacite = el("select", {}, CAPACITES.map(function (c) { return el("option", { value: c[0], text: c[1] }); }));
    capacite.value = p.capacite || "";
    var rayon = nombre(p.rayon_km, 4);
    var exp = el("fieldset", { class: "radios" }, [el("legend", { text: "Avez-vous déjà répondu à des marchés publics ?" })]);
    EXPERIENCE.forEach(function (o) {
      var r = el("input", { type: "radio", name: "exp", value: o[0] });
      r.checked = p.marches_publics === o[0];
      exp.appendChild(el("label", {}, [r, o[1]]));
    });
    f.appendChild(el("h2", { text: "Marchés visés" }));
    f.appendChild(el("div", { class: "ligne" }, [champ("Montant de marché que vous pouvez prendre", capacite), champ("Distance maximale (km)", rayon)]));
    f.appendChild(exp);

    var choisies = (p.qualifications || []).slice();
    var coches = el("div", { class: "coches" });
    g.qualifs.forEach(function (q) {
      var c = el("input", { type: "checkbox", value: q });
      c.checked = choisies.indexOf(q) >= 0;
      coches.appendChild(el("label", {}, [c, q]));
    });
    var autresQual = el("input", { type: "text", maxlength: "400", value: choisies.filter(function (q) { return g.qualifs.indexOf(q) < 0; }).join(", "),
      placeholder: "Séparées par des virgules" });
    f.appendChild(el("h2", { text: "Qualifications" }));
    f.appendChild(coches);
    f.appendChild(champ("Autres", autresQual));

    var materiel = el("textarea", { maxlength: "1000", placeholder: "Ex. : " + g.materiel.slice(0, 3).join(", ").toLowerCase() + "…" });
    materiel.value = p.materiel || "";
    f.appendChild(el("h2", { text: "Matériel" }));
    f.appendChild(champ("Vos principaux engins et équipements", materiel));

    var refs = el("ol", { class: "refs" });
    var ajoutRef = el("button", { type: "button", class: "lien", text: "Ajouter une ligne" });
    function ligneRef(r) {
      r = r || {};
      function inp(k, max, cls, lab, ph) {
        return el("input", { type: "text", maxlength: String(max), value: r[k] ? String(r[k]) : "", "data-k": k, class: cls, "aria-label": lab, placeholder: ph || "" });
      }
      var li = el("li", { class: "ref" }, [
        inp("acheteur", 150, "r-acheteur", "Acheteur", "Acheteur"),
        inp("objet", 200, "r-objet", "Objet", "Objet"),
        inp("annee", 4, "r-annee", "Année", "Année"),
        inp("montant", 40, "r-montant", "Montant", "Montant")
      ]);
      li.querySelector(".r-annee").setAttribute("inputmode", "numeric");
      li.appendChild(el("button", { type: "button", class: "retirer", "aria-label": "Retirer cette ligne", title: "Retirer", text: "×", onclick: function () {
        li.remove(); etat.modifie = true; majAjout(); if (!refs.children.length) refs.appendChild(ligneRef());
      } }));
      return li;
    }
    function majAjout() { ajoutRef.hidden = refs.children.length >= 8; }
    var lignes = (p.references || []).slice();
    while (lignes.length < 2) lignes.push({});
    lignes.forEach(function (r) { refs.appendChild(ligneRef(r)); });
    ajoutRef.addEventListener("click", function () { var li = ligneRef(); refs.appendChild(li); majAjout(); li.querySelector("input").focus(); });
    majAjout();
    f.appendChild(el("h2", { text: "Références des trois dernières années" }));
    f.appendChild(el("div", { class: "refs-tete", "aria-hidden": "true" }, [el("span", { text: "Acheteur" }), el("span", { text: "Objet" }), el("span", { text: "Année" }), el("span", { text: "Montant" }), el("span")]));
    f.appendChild(refs);
    f.appendChild(ajoutRef);

    var pres = el("textarea", { maxlength: "1200", placeholder: g.pres });
    pres.value = p.presentation || "";
    f.appendChild(el("h2", { text: "Présentation" }));
    f.appendChild(champ("Ce qui vous distingue", pres));

    var msg = el("p", { class: "msg", role: "alert" });
    var ok = el("button", { type: "submit", class: "btn", text: "Enregistrer" });
    f.appendChild(el("div", { class: "fin-form" }, [ok,
      el("span", { class: "quand", text: etat.d.profil_maj ? "Enregistré le " + dateTxt(String(etat.d.profil_maj).slice(0, 10)) : "" }), msg]));
    f.addEventListener("input", function () { etat.modifie = true; });
    f.addEventListener("change", function () { etat.modifie = true; });

    f.addEventListener("submit", async function (ev) {
      ev.preventDefault();
      msg.textContent = "";
      var s = siret.value.replace(/\s/g, "");
      if (s && !/^\d{14}$/.test(s)) { msg.textContent = "Le SIRET doit comporter 14 chiffres."; siret.focus(); return; }
      if (annee.value.trim() && !/^\d{4}$/.test(annee.value.trim())) { msg.textContent = "Année de création : écrivez-la comme 2012."; annee.focus(); return; }
      if (effectif.value.trim() && !/^\d+$/.test(effectif.value.trim())) { msg.textContent = "Effectif : indiquez un nombre."; effectif.focus(); return; }
      if (rayon.value.trim() && !/^\d+$/.test(rayon.value.trim())) { msg.textContent = "Distance : indiquez un nombre de kilomètres."; rayon.focus(); return; }
      var lesRefs = [], refFautive = null;
      Array.prototype.forEach.call(refs.children, function (li) {
        var o = {};
        li.querySelectorAll("input[data-k]").forEach(function (i) { o[i.dataset.k] = i.value.trim(); });
        if (!o.acheteur && !o.objet && !o.annee && !o.montant) return;
        if (o.annee && !/^\d{4}$/.test(o.annee) && !refFautive) refFautive = li.querySelector("[data-k=annee]");
        lesRefs.push(o);
      });
      if (refFautive) { msg.textContent = "Références : écrivez l'année comme 2024."; refFautive.focus(); return; }
      var quals = Array.prototype.filter.call(coches.querySelectorAll("input"), function (c) { return c.checked; }).map(function (c) { return c.value; })
        .concat(autresQual.value.split(/[,;\n]+/).map(function (x) { return x.trim(); }).filter(Boolean));
      var expo = exp.querySelector("input:checked");
      var corps = { siret: s, ville: ville.value.trim(), annee_creation: annee.value.trim(), effectif: effectif.value.trim(), ca: ca.value.trim(),
        capacite: capacite.value, rayon_km: rayon.value.trim(), marches_publics: expo ? expo.value : "", qualifications: quals,
        materiel: materiel.value.trim(), references: lesRefs, presentation: pres.value.trim() };
      var r = await appeler("client_profil_enregistrer", { p: corps }, ok);
      if (!r) return;
      etat.d.profil = r; etat.d.profil_maj = new Date().toISOString();
      etat.modifie = false;
      PG.toast("Profil enregistré.");
      f.querySelector(".quand").textContent = "Enregistré aujourd'hui";
    });
    racine.appendChild(f);
  }

  // ------------------------------------------------------------------ pièces administratives
  function pieces() { return etat.d.pieces || []; }
  function dePieces(type) { return pieces().filter(function (p) { return p.type === type; }); }
  // État d'un type de pièce : la plus récente compte (pour les tests et l'accessibilité).
  function etatType(type) {
    var l = dePieces(type);
    if (!l.length) return "manque";
    if (TYPES[type].plusieurs) {
      var e = l.map(function (p) { return etatDate(p.date_fin); });
      return e.indexOf("expire") >= 0 ? "expire" : e.indexOf("bientot") >= 0 ? "bientot" : "ok";
    }
    if (l.some(function (p) { return !p.date_fin; })) return "ok";
    var x = etatDate(l.map(function (p) { return p.date_fin; }).sort().pop());
    return x === "neutre" ? "ok" : x;
  }

  // Une ligne par fichier : lien, validité, modifier, supprimer.
  function ligneFichier(p, titre) {
    var lien = etat.liens[p.chemin];
    var nom = titre || ((p.type === "qualification" || p.type === "autre") && p.libelle ? p.libelle : p.nom_fichier);
    var e = etatDate(p.date_fin);
    return el("p", { "data-id": p.id }, [
      lien ? el("a", { href: lien, target: "_blank", rel: "noopener", text: nom }) : el("b", { text: nom }),
      " · ",
      el("span", { class: e === "expire" ? "etat-expire" : e === "bientot" ? "etat-bientot" : "", text: texteValidite(p) }),
      " · ",
      el("button", { type: "button", class: "lien", text: "modifier", onclick: function () { fenModifier(p); } }),
      " · ",
      el("button", { type: "button", class: "lien", text: "supprimer", onclick: function (ev) { supprimer(ev.currentTarget, p); } })
    ]);
  }

  function lignePiece(type) {
    var t = TYPES[type], l = dePieces(type);
    var bouton = l.length && !t.plusieurs ? "Remplacer" : l.length ? "Ajouter" : "Ajouter";
    return el("li", { id: "t-" + type, "data-etat": etatType(type) }, [
      el("span", { class: "nom", text: t.nom }),
      el("button", { type: "button", class: "lien", text: bouton, "aria-label": bouton + " : " + t.nom, onclick: function () { fenPiece(type); } }),
      el("div", { class: "fichiers" }, l.length ? l.map(function (p) { return ligneFichier(p); }) : [el("p", { text: "Pas encore déposé" })])
    ]);
  }

  function rendrePieces(racine) {
    if (gratuit()) {
      racine.appendChild(el("div", { class: "panneau-verrou" }, [
        el("h3", { class: "verrou", text: "Pièces administratives" }),
        el("p", { text: "Kbis, attestations URSSAF et fiscale, assurances, qualifications : vous les déposez une fois et nous vous prévenons avant qu'elles expirent." }),
        el("p", { text: "Disponible dès votre premier mémoire confié à Pli Gagnant." }),
        el("div", { class: "v-actions" }, [el("a", { class: "btn petit", href: "/espace/tableau-de-bord/#opportunites", text: "Voir mes opportunités" })])
      ]));
      return;
    }
    racine.appendChild(el("p", { class: "ent-intro", text: "Facultatif. Rangez ici les pièces demandées à chaque candidature : nous vous prévenons un mois avant qu'elles expirent." }));
    var box = el("div", { class: "pieces" });
    box.appendChild(el("h2", { text: "Pièces de candidature" }));
    box.appendChild(el("ul", { class: "liste-pieces" }, usuelles().map(lignePiece)));
    box.appendChild(el("h2", { text: "Autres documents" }));
    var autres = pieces().filter(function (p) { return usuelles().indexOf(p.type) < 0; });
    box.appendChild(el("ul", { class: "liste-pieces", id: "t-autres" }, autres.length ? autres.map(function (p) {
      var titre = p.type === "autre" ? null : TYPES[p.type].nom;
      return el("li", { "data-etat": etatDate(p.date_fin) }, [el("div", { class: "fichiers" }, [ligneFichier(p, titre)])]);
    }) : [el("li", {}, [el("div", { class: "fichiers" }, [el("p", { text: "RIB, bilans, attestations de bonne exécution… Aucun pour l'instant." })])])]));
    box.appendChild(el("button", { type: "button", class: "btn petit blanc ajout", text: "Ajouter un document", onclick: function () { fenPiece(null); } }));
    box.appendChild(el("p", { class: "pied-pieces", text: "PDF ou photo, 10 Mo maximum. Vos documents ne sont visibles que par votre entreprise et par Pli Gagnant." }));
    racine.appendChild(box);
  }

  // Fenêtre (même présentation que celles du tableau de bord).
  function fenetre(titre, contenu, valider, texteValider) {
    var d = el("dialog", { class: "fen", "aria-labelledby": "fen-titre" });
    var f = el("form", { method: "dialog", novalidate: true });
    var msg = el("p", { class: "msg", role: "alert" });
    var ok = el("button", { type: "submit", class: "btn", text: texteValider || "Enregistrer" });
    f.appendChild(el("h2", { id: "fen-titre", text: titre }));
    contenu.forEach(function (n) { if (n) f.appendChild(n); });
    f.appendChild(msg);
    f.appendChild(el("div", { class: "boutons" }, [ok, el("button", { type: "button", class: "btn plain", text: "Annuler", onclick: function () { d.close(); } })]));
    d.appendChild(el("button", { type: "button", class: "fermer", "aria-label": "Fermer", text: "×", onclick: function () { d.close(); } }));
    d.appendChild(f);
    f.addEventListener("submit", async function (ev) {
      ev.preventDefault(); msg.textContent = "";
      if (await valider(f, msg, ok)) d.close();
    });
    d.addEventListener("close", function () { d.remove(); });
    document.body.appendChild(d);
    d.showModal();
    return d;
  }

  // Champs de date selon le type de pièce.
  function champsDates(type, p) {
    var t = TYPES[type] || {};
    var doc = el("input", { type: "date", max: jour(), value: (p && p.date_document) || "" });
    var fin = el("input", { type: "date", value: (p && p.date_fin) || "" });
    var info = el("small");
    var bloc;
    if (t.mode === "emission") {
      bloc = champ(t.date, doc);
      bloc.appendChild(info);
      var maj = function () { info.textContent = doc.value ? "À renouveler avant le " + dateTxt(plusMois(doc.value, t.duree)) + "." : "Valable " + t.duree + " mois."; };
      doc.addEventListener("input", maj); maj();
    } else if (t.mode === "fin") {
      bloc = champ("Valable jusqu'au (facultatif)", fin, "Nous vous prévenons un mois avant.");
    } else bloc = null;
    return { bloc: bloc, doc: doc, fin: fin, mode: t.mode };
  }

  function fenPiece(typeImpose) {
    var type = typeImpose;
    var selType = null;
    if (!type) {
      selType = el("select", {}, [el("option", { value: "", text: "Choisissez…" })].concat(autresTypes().map(function (k) { return el("option", { value: k, text: TYPES[k].nom }); })));
    }
    var zoneType = selType ? champ("Type de document", selType) : (TYPES[type].aide ? el("p", { class: "fichier-choisi", text: TYPES[type].aide }) : null);
    var libelle = el("input", { type: "text", maxlength: "120", placeholder: "ex. Qualipaysage, Qualibat 6111…" });
    var champLib = champ("Nom", libelle);
    var fichier = el("input", { type: "file", accept: "application/pdf,image/*" });
    var choisi = el("p", { class: "fichier-choisi", hidden: true });
    fichier.addEventListener("change", function () {
      var x = fichier.files && fichier.files[0];
      choisi.hidden = !x;
      if (x) choisi.textContent = x.name + " · " + taille(x.size);
    });
    var zoneDates = el("div");
    var dates = null;
    var remplacer = el("input", { type: "checkbox", checked: true });
    var champRemplacer = el("label", { class: "case" }, [remplacer, el("span", { text: "Supprimer l'ancien document" })]);
    function majType() {
      var t = TYPES[type];
      champLib.hidden = !t || !t.libelle;
      if (t && t.libelle) champLib.querySelector("label").textContent = t.libelle;
      zoneDates.textContent = "";
      dates = t ? champsDates(type, null) : null;
      if (dates && dates.bloc) zoneDates.appendChild(dates.bloc);
      champRemplacer.hidden = !t || t.plusieurs || !dePieces(type).length;
    }
    if (selType) selType.addEventListener("change", function () { type = selType.value || null; majType(); });
    var d = fenetre(type ? TYPES[type].nom : "Ajouter un document", [
      zoneType, champLib, champ("Fichier", fichier, "PDF ou photo, 10 Mo au plus."), choisi, zoneDates, champRemplacer
    ], async function (f, msg, ok) {
      if (!type) { msg.textContent = "Choisissez le type de document."; selType.focus(); return false; }
      var t = TYPES[type];
      if (t.libelleRequis && !libelle.value.trim()) { msg.textContent = "Donnez un nom à ce document."; libelle.focus(); return false; }
      var x = fichier.files && fichier.files[0];
      if (!x) { msg.textContent = "Choisissez le fichier."; fichier.focus(); return false; }
      var ext = (x.name.split(".").pop() || "").toLowerCase();
      var mime = MIME[ext] || (EXT[x.type] ? x.type : "");
      if (!mime) { msg.textContent = "Ce type de fichier n'est pas accepté : envoyez un PDF ou une photo (JPG, PNG)."; return false; }
      if (x.size > MAX_OCTETS) { msg.textContent = "Ce fichier fait " + taille(x.size) + " : 10 Mo au plus. Réduisez-le ou prenez une photo moins lourde."; return false; }
      if (dates.mode === "emission" && !dates.doc.value) { msg.textContent = "Indiquez la date du document."; dates.doc.focus(); return false; }
      if (dates.doc.value && dates.doc.value > jour()) { msg.textContent = "La date du document ne peut pas être dans le futur."; dates.doc.focus(); return false; }
      var chemin = etat.d.entreprise.id + "/" + identifiant() + "." + (EXT[mime] || ext);
      PG.occupe(ok, true, "Envoi du fichier…");
      var up;
      try { up = await sb.storage.from(SEAU).upload(chemin, x, { contentType: mime, upsert: false }); }
      catch (e) { up = { error: e }; }
      PG.occupe(ok, false);
      if (up.error) { msg.textContent = "Le fichier n'a pas pu être envoyé. Vérifiez votre connexion et réessayez."; return false; }
      var anciens = champRemplacer.hidden || !remplacer.checked ? [] : dePieces(type).map(function (p) { return p.id; });
      var r = await appeler("client_piece_ajouter", { p_type: type, p_libelle: libelle.value.trim() || null, p_chemin: chemin, p_nom_fichier: x.name,
        p_taille: x.size, p_mime: mime, p_date_document: dates.doc.value || null, p_date_fin: dates.mode === "fin" ? (dates.fin.value || null) : null, p_remplace: anciens }, ok);
      if (!r) { try { await sb.storage.from(SEAU).remove([chemin]); } catch (e) { /* ménage hebdomadaire */ } return false; }
      if (r.a_supprimer && r.a_supprimer.length) { try { await sb.storage.from(SEAU).remove(r.a_supprimer); } catch (e) { /* idem */ } }
      await recharger();
      PG.toast(anciens.length ? "Document remplacé." : "Document ajouté.");
      return true;
    }, "Enregistrer");
    majType();
    (selType || fichier).focus();
    return d;
  }

  function fenModifier(p) {
    var t = TYPES[p.type];
    var libelle = el("input", { type: "text", maxlength: "120", value: p.libelle || "" });
    var dates = champsDates(p.type, p);
    fenetre("Modifier : " + (t.libelle && p.libelle ? p.libelle : t.nom), [
      el("p", { class: "rappel", text: p.nom_fichier }),
      t.libelle ? champ(t.libelle, libelle) : null,
      dates.bloc,
      !dates.bloc ? el("p", { text: "Ce document n'a pas de date de validité. Pour changer de fichier, ajoutez le nouveau puis supprimez l'ancien." }) : null
    ], async function (f, msg, ok) {
      if (t.libelleRequis && !libelle.value.trim()) { msg.textContent = "Donnez un nom à ce document."; libelle.focus(); return false; }
      if (dates.mode === "emission" && !dates.doc.value) { msg.textContent = "Indiquez la date du document."; dates.doc.focus(); return false; }
      var r = await appeler("client_piece_modifier", { p_id: p.id, p_libelle: libelle.value.trim() || null, p_date_document: dates.doc.value || null,
        p_date_fin: dates.mode === "fin" ? (dates.fin.value || null) : null }, ok);
      if (!r) return false;
      await recharger();
      PG.toast("Enregistré.");
      return true;
    });
  }

  async function supprimer(bouton, p) {
    if (!bouton.dataset.confirme) {
      bouton.dataset.confirme = "1";
      bouton.textContent = "Confirmer la suppression";
      bouton.classList.remove("discret");
      return;
    }
    var chemin = await appeler("client_piece_supprimer", { p_id: p.id }, bouton);
    if (!chemin) return;
    try { await sb.storage.from(SEAU).remove([chemin]); } catch (e) { /* ménage hebdomadaire */ }
    await recharger();
    PG.toast("Document supprimé.");
  }

  async function recharger() {
    var y = window.scrollY;
    if (await charger()) { rendre(); window.scrollTo(0, y); }
  }

  function identifiant() {
    try { if (window.crypto && crypto.randomUUID) return crypto.randomUUID().replace(/-/g, ""); } catch (e) { /* ancien navigateur */ }
    var s = ""; for (var i = 0; i < 24; i++) s += Math.floor(Math.random() * 36).toString(36);
    return s;
  }

  // ------------------------------------------------------------------ erreurs et démarrage
  function erreur(texte) {
    var h = $("hello"); h.textContent = "";
    h.appendChild(el("h1", { text: "Cette page n'a pas pu s'ouvrir" }));
    h.appendChild(el("p", { class: "sous", text: texte }));
    h.appendChild(el("div", { class: "v-actions" }, [el("button", { type: "button", class: "btn petit", text: "Réessayer", onclick: function () { location.reload(); } })]));
  }

  async function demarrer() {
    var s = await sb.auth.getSession();
    if (!s.data || !s.data.session) { location.replace("/espace/"); return; }
    sb.auth.onAuthStateChange(function (ev) { if (ev === "SIGNED_OUT") location.replace("/espace/?deconnecte=1"); });
    $("b-deconnexion").addEventListener("click", async function () { await sb.auth.signOut(); location.replace("/espace/?deconnecte=1"); });
    ONGLETS.forEach(function (o) { $("o-" + o).addEventListener("click", function () { choisir(o); }); });
    $("onglets").addEventListener("keydown", function (ev) {
      if (ev.key === "ArrowRight" || ev.key === "ArrowLeft") {
        ev.preventDefault();
        var i = ONGLETS.indexOf(etat.onglet) + (ev.key === "ArrowRight" ? 1 : ONGLETS.length - 1);
        choisir(ONGLETS[i % ONGLETS.length], true);
      }
    });
    window.addEventListener("beforeunload", function (ev) { if (etat.modifie) { ev.preventDefault(); ev.returnValue = ""; } });
    if (!(await charger())) return;
    var h = location.hash.slice(1);
    etat.onglet = ONGLETS.indexOf(h) >= 0 ? h : "profil";
    rendre();
    window.addEventListener("hashchange", function () {
      var x = location.hash.slice(1);
      if (ONGLETS.indexOf(x) >= 0 && x !== etat.onglet) choisir(x);
    });
    // Liens des fichiers valables une heure : on les renouvelle au retour sur la page.
    document.addEventListener("visibilitychange", async function () {
      if (document.visibilityState === "visible" && etat.onglet === "pieces" && Date.now() - etat.liensLe > 50 * 60 * 1000 && !document.querySelector("dialog[open]")) {
        await recharger();
      }
    });
  }
  demarrer().catch(function (e) { erreur(PG.messageErreur(e)); });
})();
