/* Tableau de bord de l'espace client Pli Gagnant. */
(function () {
  "use strict";
  var PG = window.PG, sb = PG.client, el = PG.el;

  var ONGLETS = [
    { id: "opportunites", nom: "Opportunités" },
    { id: "preparation", nom: "En préparation" },
    { id: "deposes", nom: "Déposés" },
    { id: "historique", nom: "Historique" }
  ];
  var AVIS = { tenter: "À tenter", regarder: "À regarder de près", passer: "À laisser passer" };
  var STATUTS = { opportunite: "À étudier", ecartee: "Écarté", en_preparation: "En préparation", abandonne: "Abandonné",
                  depose: "Déposé", gagne: "Gagné", perdu: "Perdu", sans_suite: "Sans suite" };
  var ETAPES = [["demande", "Demande reçue"], ["dossier_recu", "Dossier reçu"], ["en_redaction", "Rédaction"], ["livre", "Mémoire livré"]];
  var FILTRES = [["tous", "Tous"], ["gagne", "Gagnés"], ["perdu", "Perdus"], ["sans_suite", "Sans suite"], ["abandonne", "Abandonnés"], ["ecartee", "Écartés"]];

  var etat = { d: null, onglet: "opportunites", filtre: "tous", visitePrec: null, charge: 0 };
  var $ = function (id) { return document.getElementById(id); };

  // ------------------------------------------------------------------ données
  function jour() { return (etat.d && etat.d.aujourdhui) || PG.aujourdhuiIso(); }
  function liste() { return (etat.d && etat.d.consultations) || []; }
  function passee(c) { return c.date_limite && PG.ecart(c.date_limite, jour()) < 0; }
  function rangAvis(c) { return c.avis === "tenter" ? 0 : c.avis === "regarder" ? 1 : c.avis === "passer" ? 3 : 2; }
  function parDate(a, b) {
    var x = a.date_limite || "9999", y = b.date_limite || "9999";
    return x < y ? -1 : x > y ? 1 : 0;
  }
  function groupes() {
    var L = liste();
    var opp = L.filter(function (c) { return c.statut === "opportunite" && !passee(c); });
    return {
      opportunites: opp.filter(function (c) { return c.avis !== "passer"; }).sort(function (a, b) { return rangAvis(a) - rangAvis(b) || parDate(a, b); }),
      deconseillees: opp.filter(function (c) { return c.avis === "passer"; }).sort(parDate),
      preparation: L.filter(function (c) { return c.statut === "en_preparation"; }).sort(parDate),
      deposes: L.filter(function (c) { return c.statut === "depose"; }).sort(function (a, b) { return (b.date_depot || "") < (a.date_depot || "") ? -1 : 1; }),
      historique: L.filter(function (c) { return ["gagne", "perdu", "sans_suite", "abandonne", "ecartee"].indexOf(c.statut) >= 0; })
        .sort(function (a, b) { return (b.statut_maj || "") < (a.statut_maj || "") ? -1 : 1; })
    };
  }
  function estNouveau(c) {
    return !!(etat.visitePrec && c.created_at && c.created_at > etat.visitePrec && c.source === "veille");
  }
  function evenementsDe(c) {
    return ((etat.d && etat.d.evenements) || []).filter(function (e) { return e.consultation_id === c.id; });
  }
  function remplacer(c) {
    var L = liste();
    for (var i = 0; i < L.length; i++) if (L[i].id === c.id) { L[i] = c; return; }
    L.push(c);
  }

  async function charger(visite) {
    var r = await sb.rpc("client_tableau", { p_visite: !!visite });
    if (r.error) {
      if (PG.sessionExpiree(r.error)) { location.replace("/espace/?expire=1"); return false; }
      afficherErreur(PG.messageErreur(r.error));
      return false;
    }
    if (!r.data) { afficherSansEntreprise(); return false; }
    etat.d = r.data; etat.charge = Date.now();
    if (visite) {
      etat.visitePrec = r.data.visite_precedente || null;
      PG.ecrireSession("pg-visite-prec", etat.visitePrec || "");
    }
    return true;
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

  async function changerStatut(c, statut, opts, bouton) {
    opts = opts || {};
    var avant = c.statut;
    var r = await appeler("client_changer_statut", { p_id: c.id, p_statut: statut, p_date: opts.date || null,
                                                    p_montant: opts.montant || null, p_note: opts.note || null }, bouton);
    if (!r) return false;
    remplacer(r);
    ajouterEvenement(c.id, "statut", { vers: statut });
    rendre();
    var textes = { en_preparation: "Ajouté à vos appels d'offres en préparation.", ecartee: "Retiré de vos opportunités.",
                   depose: "Dépôt enregistré. Bonne chance !", gagne: "Bravo pour ce marché !", perdu: "Résultat enregistré.",
                   sans_suite: "Résultat enregistré.", abandonne: "Marqué comme abandonné.", opportunite: "Remis dans vos opportunités." };
    if (opts.annulable) {
      PG.toast(textes[statut] || "Enregistré.", { action: "Annuler", surAction: function () { changerStatut(r, avant); } });
    } else {
      PG.toast(textes[statut] || "Enregistré.");
    }
    return true;
  }
  function ajouterEvenement(id, type, detail) {
    if (!etat.d) return;
    etat.d.evenements = [{ consultation_id: id, type: type, par: "client", detail: detail, le: new Date().toISOString() }].concat(etat.d.evenements || []);
  }

  // ------------------------------------------------------------------ rendu
  function rendre() {
    var d = etat.d, g = groupes();
    $("qui").textContent = d.entreprise.nom;
    $("qui").title = d.moi.email;
    rendreHello(d, g);
    rendreOnglets(g);
    rendreGuide();
    rendrePanneau(g);
    $("corps").hidden = false;
  }

  function rendreHello(d, g) {
    var e = d.entreprise, h = $("hello");
    h.textContent = "";
    var sous = [];
    if (e.veille_active && e.metier) sous.push("Veille " + e.metier + (e.zone ? " dans " + e.zone : ""));
    if (e.veille_maj) sous.push("mise à jour le " + PG.dateLongue(e.veille_maj));
    if (e.veille_prochaine) sous.push("prochaine le " + PG.dateLongue(e.veille_prochaine));
    h.appendChild(el("p", { class: "kicker", text: "Espace client" }));
    h.appendChild(el("h1", { text: e.nom }));
    if (sous.length) h.appendChild(el("p", { class: "sous", text: sous.join(" · ") }));

    var tenter = g.opportunites.filter(function (c) { return c.avis === "tenter"; }).length;
    var nouveaux = g.opportunites.concat(g.deconseillees).filter(estNouveau).length;
    var prochaine = g.preparation.filter(function (c) { return c.date_limite && !passee(c); })[0];
    var enRetard = g.preparation.filter(passee).length;
    var resultats = g.historique.filter(function (c) { return ["gagne", "perdu", "sans_suite"].indexOf(c.statut) >= 0; });
    var gagnes = resultats.filter(function (c) { return c.statut === "gagne"; }).length;
    var tuiles = [
      ["opportunites", g.opportunites.length, g.opportunites.length > 1 ? "Opportunités" : "Opportunité",
        nouveaux ? nouveaux + (nouveaux > 1 ? " nouvelles" : " nouvelle") + " depuis votre visite" : tenter ? "dont " + tenter + " à tenter" : "à étudier", !!nouveaux],
      ["preparation", g.preparation.length, "En préparation",
        enRetard ? enRetard + " à confirmer" : prochaine ? "prochaine limite : " + PG.dateCourte(prochaine.date_limite) : "aucune date limite proche",
        !!enRetard || (prochaine && PG.ecart(prochaine.date_limite, jour()) <= 3)],
      ["deposes", g.deposes.length, g.deposes.length > 1 ? "Déposés" : "Déposé", "en attente du résultat", false],
      ["historique", gagnes, gagnes > 1 ? "Gagnés" : "Gagné",
        resultats.length ? "sur " + resultats.length + " résultat" + (resultats.length > 1 ? "s" : "") + " connu" + (resultats.length > 1 ? "s" : "") : "aucun résultat pour l'instant", false]
    ];
    var grille = el("div", { class: "esp-stats" });
    tuiles.forEach(function (t) {
      grille.appendChild(el("button", { type: "button", class: "tuile", "aria-current": etat.onglet === t[0] ? "true" : "false",
        onclick: function () { choisirOnglet(t[0], true); } }, [
        el("span", { class: "n", text: String(t[1]) }),
        el("span", { class: "t", text: t[2] }),
        el("span", { class: "d" + (t[4] ? " chaud" : ""), text: t[3] })
      ]));
    });
    h.appendChild(grille);
  }

  function rendreOnglets(g) {
    var o = $("onglets");
    o.textContent = "";
    ONGLETS.forEach(function (t) {
      var n = t.id === "opportunites" ? g.opportunites.length : g[t.id].length;
      o.appendChild(el("button", { type: "button", role: "tab", id: "o-" + t.id, "aria-controls": "panneau",
        "aria-selected": etat.onglet === t.id ? "true" : "false", tabindex: etat.onglet === t.id ? "0" : "-1",
        onclick: function () { choisirOnglet(t.id); } }, [t.nom, el("span", { class: "c", text: String(n) })]));
    });
    $("panneau").setAttribute("aria-labelledby", "o-" + etat.onglet);
  }
  $("onglets").addEventListener("keydown", function (ev) {
    if (ev.key !== "ArrowRight" && ev.key !== "ArrowLeft") return;
    var i = ONGLETS.findIndex(function (t) { return t.id === etat.onglet; });
    i = (i + (ev.key === "ArrowRight" ? 1 : ONGLETS.length - 1)) % ONGLETS.length;
    choisirOnglet(ONGLETS[i].id);
    $("o-" + ONGLETS[i].id).focus();
  });

  function choisirOnglet(id, defiler) {
    etat.onglet = id;
    if (location.hash !== "#" + id) history.replaceState(null, "", "#" + id);
    PG.ecrireStock("pg-onglet", id);
    rendre();
    if (defiler) $("onglets").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function rendreGuide() {
    var zone = $("guide");
    zone.textContent = "";
    var bienvenue = new URLSearchParams(location.search).get("bienvenue");
    if (PG.lireStock("pg-guide-ferme", "") === "1" && !bienvenue) return;
    if (!bienvenue && etat.visitePrec) return;
    var g = el("section", { class: "guide", "aria-label": "Comment ça marche" }, [
      el("div", { class: "haut" }, [
        el("h2", { class: "", text: bienvenue ? "Bienvenue dans votre espace" : "Comment ça marche" }),
        el("button", { type: "button", class: "lien discret", text: "Masquer", onclick: function () {
          PG.ecrireStock("pg-guide-ferme", "1"); history.replaceState(null, "", location.pathname + location.hash); zone.textContent = ""; } })
      ]),
      el("ol", {}, [
        el("li", {}, [el("b", { text: "Opportunités" }), " : les consultations que nous repérons pour vous, avec notre avis. Cliquez sur « Je vais y répondre » pour celles qui vous intéressent."]),
        el("li", {}, [el("b", { text: "En préparation" }), " : vos réponses en cours, avec la date limite. Si nous rédigeons votre mémoire, vous suivez ici son avancement."]),
        el("li", {}, [el("b", { text: "Déposés" }), " : indiquez le résultat quand vous l'avez. Votre historique garde la trace de tout, gagné ou perdu."])
      ]),
      el("p", { class: "rappel", text: "Un appel d'offres trouvé ailleurs ? Ajoutez-le avec le bouton « Ajouter un appel d'offres » pour tout suivre au même endroit." })
    ]);
    zone.appendChild(g);
  }

  function rendrePanneau(g) {
    var p = $("panneau");
    p.textContent = "";
    var o = etat.onglet;
    if (o === "opportunites") {
      if (!g.opportunites.length) p.appendChild(videOpportunites());
      else p.appendChild(listeCartes(g.opportunites));
      if (g.deconseillees.length) {
        var det = el("details", { class: "v-passes" }, [
          el("summary", { text: "Celles que nous vous déconseillons (" + g.deconseillees.length + ")" }),
          listeCartes(g.deconseillees)
        ]);
        p.appendChild(det);
      }
    } else if (o === "preparation") {
      p.appendChild(g.preparation.length ? listeCartes(g.preparation)
        : vide("Rien en préparation pour l'instant", "Quand une opportunité vous intéresse, cliquez sur « Je vais y répondre » : elle arrive ici, avec sa date limite."));
    } else if (o === "deposes") {
      p.appendChild(g.deposes.length ? listeCartes(g.deposes)
        : vide("Aucune offre en attente de résultat", "Quand vous avez déposé une offre, cliquez sur « J'ai déposé mon offre » : vous la retrouvez ici jusqu'au résultat."));
    } else {
      var filtres = el("div", { class: "filtres", role: "group", "aria-label": "Filtrer l'historique" });
      FILTRES.forEach(function (f) {
        var n = f[0] === "tous" ? g.historique.length : g.historique.filter(function (c) { return c.statut === f[0]; }).length;
        if (f[0] !== "tous" && !n) return;
        filtres.appendChild(el("button", { type: "button", "aria-pressed": etat.filtre === f[0] ? "true" : "false",
          onclick: function () { etat.filtre = f[0]; rendre(); } }, f[1] + " (" + n + ")"));
      });
      var h = g.historique.filter(function (c) { return etat.filtre === "tous" || c.statut === etat.filtre; });
      if (g.historique.length) p.appendChild(filtres);
      p.appendChild(h.length ? listeCartes(h)
        : vide("Votre historique est vide", "Il gardera la trace de vos appels d'offres terminés : gagnés, perdus, abandonnés ou écartés."));
    }
  }

  function vide(titre, texte, extra) {
    return el("div", { class: "vide" }, [el("h3", { text: titre }), el("p", { text: texte }), extra || null]);
  }
  function videOpportunites() {
    var e = etat.d.entreprise;
    if (e.veille_active) {
      return vide("Aucune consultation ouverte à vous proposer en ce moment",
        "Nous cherchons pour vous " + (e.metier ? "en " + e.metier + " " : "") + (e.zone ? "dans " + e.zone + " " : "") +
        "le lundi, le mercredi et le vendredi. Les nouvelles opportunités apparaîtront ici.");
    }
    return vide("Recevez les appels d'offres de votre métier",
      "Notre veille est gratuite : nous repérons les consultations de votre métier et de vos départements, et vous donnons notre avis sur chacune.",
      el("div", { class: "v-actions" }, [el("a", { class: "btn petit", href: "mailto:" + PG.CONTACT + "?subject=VEILLE&body=" +
        encodeURIComponent("Bonjour,\n\nJe souhaite la veille gratuite des appels d'offres dans mon espace client.\n\nMétier : \nDépartements : \n"), text: "Demander la veille gratuite" })]));
  }

  function listeCartes(cs) {
    var ul = el("ul", { class: "v-list" });
    cs.forEach(function (c) { ul.appendChild(el("li", {}, carte(c))); });
    return ul;
  }

  function classeCarte(c) {
    if (c.statut === "opportunite") return c.avis ? "v-" + c.avis : "";
    return { en_preparation: "v-prep", depose: "v-depose", gagne: "v-gagne", perdu: "v-perdu", sans_suite: "v-sans_suite",
             abandonne: "v-abandonne", ecartee: "v-ecartee" }[c.statut] || "";
  }

  function carte(c) {
    var art = el("article", { class: "v-card " + classeCarte(c), "aria-label": c.acheteur });
    // Étiquettes
    var top = el("div", { class: "v-top" });
    if (c.statut === "opportunite" && c.avis) top.appendChild(el("span", { class: "v-badge", text: AVIS[c.avis] }));
    if (c.statut !== "opportunite") {
      var coul = { gagne: "vert", en_preparation: "bleu", depose: "kraft" }[c.statut] || "";
      top.appendChild(el("span", { class: "etiq " + coul, text: STATUTS[c.statut] }));
    }
    if (estNouveau(c) && c.statut === "opportunite") top.appendChild(el("span", { class: "neuf", text: "Nouveau" }));
    if (c.source === "client") top.appendChild(el("span", { class: "etiq", text: "Ajouté par vous" }));
    if (c.memoire && c.statut !== "en_preparation") top.appendChild(el("span", { class: "etiq bleu", text: "Mémoire Pli Gagnant" }));
    if (top.childNodes.length) art.appendChild(top);

    art.appendChild(el("h3", { text: c.acheteur }));
    art.appendChild(el("p", { class: "v-objet", text: c.objet }));

    // Faits
    var faits = el("dl", { class: "v-faits" });
    function fait(t, v, chaud) { if (v) faits.appendChild(el("div", {}, [el("dt", { text: t }), el("dd", { class: chaud ? "chaud" : "", text: v })])); }
    if (c.date_limite) {
      var n = PG.ecart(c.date_limite, jour());
      var actif = ["opportunite", "en_preparation"].indexOf(c.statut) >= 0;
      fait("Date limite", PG.dateLongue(c.date_limite) + (c.heure_limite ? " à " + c.heure_limite : "") + (actif ? " (" + PG.dansCombien(n) + ")" : ""),
        actif && n <= 5);
    }
    fait("Lieu", c.lieu);
    if (c.valeur_technique !== null && c.valeur_technique !== undefined) fait("Valeur technique", c.valeur_technique + " % de la note");
    fait("Montant estimé", c.montant);
    if (c.date_depot) fait("Déposé le", PG.dateLongue(c.date_depot));
    if (c.date_resultat && ["gagne", "perdu", "sans_suite"].indexOf(c.statut) >= 0) fait("Résultat le", PG.dateLongue(c.date_resultat));
    if (c.montant_attribue && c.statut === "gagne") fait("Montant du marché", c.montant_attribue);
    if (faits.childNodes.length) art.appendChild(faits);

    if (c.raison && (c.statut === "opportunite" || c.statut === "en_preparation")) {
      art.appendChild(el("div", { class: "v-avis" }, [el("b", { text: "Notre avis : " }), c.raison]));
    }
    if (c.memoire) art.appendChild(suiviMemoire(c));
    if (c.note_client) art.appendChild(el("p", { class: "v-note" }, [el("b", { text: "Votre note : " }), c.note_client]));

    // Date limite passée sans dépôt
    if (c.statut === "en_preparation" && passee(c)) {
      art.appendChild(el("div", { class: "alerte" }, [
        el("span", { text: "La date limite est passée. Avez-vous déposé votre offre ?" }),
        el("div", { class: "v-actions" }, [
          el("button", { type: "button", class: "btn petit", text: "Oui, j'ai déposé", onclick: function () { fenDepot(c); } }),
          el("button", { type: "button", class: "btn petit", text: "Non", onclick: function (ev) { changerStatut(c, "abandonne", { annulable: true }, ev.currentTarget); } })
        ])
      ]));
    }

    var actions = actionsDe(c);
    if (actions.length) art.appendChild(el("div", { class: "v-actions" }, actions));

    // Liens
    var liens = el("div", { class: "v-liens" });
    if (c.url) {
      liens.appendChild(el("a", { href: c.url, target: "_blank", rel: "noopener noreferrer",
        text: "Voir l'avis" + (c.plateforme ? " sur " + c.plateforme : "") + (c.numero_avis ? " (n° " + c.numero_avis + ")" : "") + " ↗" }));
    } else if (c.numero_avis || c.plateforme) {
      liens.appendChild(el("span", { text: [c.plateforme, c.numero_avis ? "avis n° " + c.numero_avis : ""].filter(Boolean).join(", ") }));
    }
    liens.appendChild(el("button", { type: "button", class: "lien", text: c.note_client ? "Modifier ma note" : "Ajouter une note", onclick: function () { fenNote(c); } }));
    var corr = correction(c);
    if (corr) liens.appendChild(corr);
    art.appendChild(liens);
    return art;
  }

  function actionsDe(c) {
    var a = [];
    function bouton(texte, classe, fn) { return el("button", { type: "button", class: "btn petit " + (classe || ""), text: texte, onclick: fn }); }
    if (c.statut === "opportunite") {
      a.push(bouton("Je vais y répondre", "", function (ev) { changerStatut(c, "en_preparation", {}, ev.currentTarget); }));
      a.push(bouton("Confier le mémoire à Pli Gagnant", "ghost", function () { fenMemoire(c); }));
      a.push(bouton("Pas pour moi", "plain", function (ev) { changerStatut(c, "ecartee", { annulable: true }, ev.currentTarget); }));
    } else if (c.statut === "en_preparation" && !passee(c)) {
      a.push(bouton("J'ai déposé mon offre", "", function () { fenDepot(c); }));
      if (!c.memoire) a.push(bouton("Confier le mémoire à Pli Gagnant", "ghost", function () { fenMemoire(c); }));
      a.push(bouton("Je ne réponds plus", "plain", function () { fenAbandon(c); }));
    } else if (c.statut === "depose") {
      a.push(bouton("J'ai reçu le résultat", "", function () { fenResultat(c); }));
    }
    return a;
  }

  function correction(c) {
    var cible = null, texte = "";
    if (["gagne", "perdu", "sans_suite"].indexOf(c.statut) >= 0) { cible = "depose"; texte = "Corriger : remettre en attente du résultat"; }
    else if (c.statut === "abandonne") { cible = "en_preparation"; texte = "Reprendre la préparation"; }
    else if (c.statut === "ecartee") { cible = "opportunite"; texte = "Remettre dans mes opportunités"; }
    else if (c.statut === "depose") { cible = "en_preparation"; texte = "Annuler le dépôt"; }
    else if (c.statut === "en_preparation" && !c.memoire) { cible = "opportunite"; texte = "Remettre dans les opportunités"; }
    if (!cible) return null;
    if (cible === "opportunite" && c.statut === "en_preparation" && c.source !== "veille") return null;
    return el("button", { type: "button", class: "lien discret", text: texte, onclick: function (ev) { changerStatut(c, cible, {}, ev.currentTarget); } });
  }

  function suiviMemoire(c) {
    var idx = ETAPES.findIndex(function (e) { return e[0] === c.memoire; });
    var ol = el("ol", { class: "etapes", "aria-label": "Avancement de votre mémoire" });
    ETAPES.forEach(function (e, i) {
      ol.appendChild(el("li", { class: i < idx ? "fait" : i === idx ? "fait encours" : "", "aria-current": i === idx ? "step" : null, text: e[1] }));
    });
    var dernier = evenementsDe(c).filter(function (e) { return e.type === "memoire" && e.detail && e.detail.message; })[0];
    var info = dernier ? dernier.detail.message
      : c.memoire === "demande" ? "Nous vous écrivons sous 24 h ouvrées pour récupérer le dossier."
      : c.memoire === "livre" ? "Votre mémoire vous a été envoyé par email." : "";
    if (info) ol.appendChild(el("li", { class: "info", text: info }));
    return ol;
  }

  // ------------------------------------------------------------------ fenêtres
  function fenetre(titre, contenu, valider, texteValider, opts) {
    opts = opts || {};
    var d = el("dialog", { class: "fen", "aria-labelledby": "fen-titre" });
    var f = el("form", { method: "dialog", novalidate: true });
    var msg = el("p", { class: "msg", role: "alert" });
    var ok = el("button", { type: "submit", class: "btn" + (opts.vert ? " vert" : ""), text: texteValider || "Enregistrer" });
    f.appendChild(el("h2", { id: "fen-titre", text: titre }));
    contenu.forEach(function (n) { if (n) f.appendChild(n); });
    f.appendChild(msg);
    f.appendChild(el("div", { class: "boutons" }, [ok, el("button", { type: "button", class: "btn plain", text: "Annuler", onclick: function () { d.close(); } })]));
    d.appendChild(el("button", { type: "button", class: "fermer", "aria-label": "Fermer", text: "×", onclick: function () { d.close(); } }));
    d.appendChild(f);
    f.addEventListener("submit", async function (ev) {
      ev.preventDefault();
      msg.textContent = "";
      var res = await valider(f, msg, ok);
      if (res) d.close();
    });
    d.addEventListener("close", function () { d.remove(); });
    document.body.appendChild(d);
    d.showModal();
    var premier = f.querySelector("input:not([type=radio]), textarea, input[type=radio]:checked");
    if (premier) premier.focus();
    return d;
  }
  function champ(label, input, aide) {
    var id = input.id || ("c" + Math.random().toString(36).slice(2, 8));
    input.id = id;
    return el("div", { class: "champ" }, [el("label", { for: id, text: label }), input, aide ? el("small", { text: aide }) : null]);
  }
  function rappel(c) { return el("p", { class: "rappel", text: c.acheteur + " · " + c.objet }); }

  function fenMemoire(c) {
    var offre = etat.d.offre || {};
    var n = c.date_limite ? PG.ecart(c.date_limite, jour()) : null;
    var message = el("textarea", { maxlength: "2000", placeholder: "Facultatif : vos questions, le meilleur moment pour vous joindre, un lot précis…" });
    fenetre("Confier le mémoire à Pli Gagnant", [
      rappel(c),
      el("p", { text: "Nous vous écrivons sous 24 h ouvrées pour récupérer le dossier (règlement de consultation, cahier des charges) et vos références. Votre mémoire technique arrive en Word sous " + (offre.offre_delai || "72 h ouvrées") + " après réception du dossier." }),
      el("p", { class: "prix" }, [(offre.offre_prix_memoire ? "Mémoire technique : " + offre.offre_prix_memoire : "Mémoire technique sur mesure"),
        offre.offre_premier ? el("span", { text: offre.offre_premier }) : null]),
      n !== null && n <= 5 ? el("p", { class: "attention", text: "La date limite est " + PG.dansCombien(n) + " : envoyez-nous le dossier dès aujourd'hui à " + PG.CONTACT + "." }) : null,
      champ("Un message pour nous", message)
    ], async function (f, msg, ok) {
      var r = await appeler("client_demander_memoire", { p_id: c.id, p_message: message.value.trim() || null }, ok);
      if (!r) return false;
      remplacer(r); etat.onglet = "preparation"; rendre();
      PG.toast("Demande envoyée. Nous vous écrivons sous 24 h ouvrées.");
      return true;
    }, "Envoyer ma demande");
  }

  function fenDepot(c) {
    var date = el("input", { type: "date", value: jour(), max: jour(), required: true });
    fenetre("J'ai déposé mon offre", [rappel(c), champ("Date du dépôt", date)], async function (f, msg, ok) {
      if (!date.value) { msg.textContent = "Indiquez la date du dépôt."; return false; }
      if (date.value > jour()) { msg.textContent = "La date du dépôt ne peut pas être dans le futur."; return false; }
      var r = await changerStatut(c, "depose", { date: date.value }, ok);
      if (r) choisirOnglet("deposes");
      return r;
    }, "Enregistrer le dépôt");
  }

  function fenResultat(c) {
    var radios = el("fieldset", { class: "choix" }, [el("legend", { text: "Résultat" })]);
    [["gagne", "Gagné : le marché est attribué à mon entreprise"], ["perdu", "Perdu : attribué à un concurrent"],
     ["sans_suite", "Déclaré sans suite ou infructueux"]].forEach(function (o, i) {
      radios.appendChild(el("label", {}, [el("input", { type: "radio", name: "res", value: o[0], checked: i === 0 }), o[1]]));
    });
    var date = el("input", { type: "date", value: jour(), max: jour() });
    var montant = el("input", { type: "text", maxlength: "100", placeholder: "ex. 48 000 € HT par an", inputmode: "text" });
    var champMontant = champ("Montant du marché (facultatif)", montant);
    var note = el("textarea", { maxlength: "2000", placeholder: "Facultatif : votre classement, la note obtenue, ce que l'acheteur a dit…" });
    radios.addEventListener("change", function () {
      champMontant.hidden = radios.querySelector("input:checked").value !== "gagne";
    });
    fenetre("J'ai reçu le résultat", [rappel(c), radios, el("div", { class: "deux-champs" }, [champ("Date du résultat", date), champMontant]),
      champ("Une note (facultatif)", note)], async function (f, msg, ok) {
      var v = radios.querySelector("input:checked").value;
      if (date.value && date.value > jour()) { msg.textContent = "La date ne peut pas être dans le futur."; return false; }
      var r = await changerStatut(c, v, { date: date.value || null, montant: v === "gagne" ? montant.value.trim() : null, note: note.value.trim() || null }, ok);
      if (r) choisirOnglet("historique");
      return r;
    }, "Enregistrer le résultat");
  }

  function fenAbandon(c) {
    var note = el("textarea", { maxlength: "2000", placeholder: "Facultatif : pourquoi (délai trop court, exigence bloquante…). Utile pour la suite." });
    var contenu = [rappel(c), el("p", { text: "L'appel d'offres passe dans votre historique. Vous pourrez reprendre sa préparation si vous changez d'avis." })];
    if (c.memoire && c.memoire !== "livre") contenu.push(el("p", { class: "attention", text: "Nous préparons votre mémoire : nous serons prévenus et arrêterons la rédaction." }));
    contenu.push(champ("Une note (facultatif)", note));
    fenetre("Je ne réponds plus", contenu, async function (f, msg, ok) {
      return changerStatut(c, "abandonne", { note: note.value.trim() || null }, ok);
    }, "Confirmer");
  }

  function fenNote(c) {
    var note = el("textarea", { maxlength: "2000" });
    note.value = c.note_client || "";
    fenetre(c.note_client ? "Modifier ma note" : "Ajouter une note", [rappel(c),
      champ("Votre note", note, "Visible par vous et vos collaborateurs. Pli Gagnant la lit aussi pour mieux vous conseiller.")],
      async function (f, msg, ok) {
        var r = await appeler("client_noter", { p_id: c.id, p_note: note.value }, ok);
        if (!r) return false;
        remplacer(r); rendre(); PG.toast("Note enregistrée.");
        return true;
      });
  }

  function fenAjouter() {
    var acheteur = el("input", { type: "text", maxlength: "300", required: true, placeholder: "ex. Commune de Colmar", autocomplete: "off" });
    var objet = el("input", { type: "text", maxlength: "600", required: true, placeholder: "ex. Entretien des espaces verts", autocomplete: "off" });
    var date = el("input", { type: "date" });
    var lieu = el("input", { type: "text", maxlength: "200", placeholder: "ex. Colmar (68)" });
    var url = el("input", { type: "url", maxlength: "1000", placeholder: "https://…", inputmode: "url" });
    var statut = el("fieldset", { class: "choix" }, [el("legend", { text: "Où en êtes-vous ?" })]);
    [["opportunite", "Je l'étudie"], ["en_preparation", "Je prépare ma réponse"], ["depose", "J'ai déjà déposé mon offre"]].forEach(function (o, i) {
      statut.appendChild(el("label", {}, [el("input", { type: "radio", name: "st", value: o[0], checked: i === 1 }), o[1]]));
    });
    var note = el("textarea", { maxlength: "2000", placeholder: "Facultatif" });
    fenetre("Ajouter un appel d'offres", [
      el("p", { class: "rappel", text: "Pour suivre ici une consultation trouvée ailleurs." }),
      champ("Acheteur", acheteur), champ("Objet", objet),
      el("div", { class: "deux-champs" }, [champ("Date limite", date), champ("Lieu", lieu)]),
      champ("Lien vers l'avis (facultatif)", url), statut, champ("Note", note)
    ], async function (f, msg, ok) {
      if (!acheteur.value.trim()) { msg.textContent = "Indiquez l'acheteur."; acheteur.focus(); return false; }
      if (!objet.value.trim()) { msg.textContent = "Indiquez l'objet."; objet.focus(); return false; }
      var u = url.value.trim();
      if (u && !/^https?:\/\/\S+$/i.test(u)) { msg.textContent = "Le lien doit commencer par https://"; url.focus(); return false; }
      var st = statut.querySelector("input:checked").value;
      var r = await appeler("client_ajouter", { p_acheteur: acheteur.value.trim(), p_objet: objet.value.trim(), p_date_limite: date.value || null,
        p_lieu: lieu.value.trim() || null, p_url: u || null, p_statut: st, p_note: note.value.trim() || null }, ok);
      if (!r) return false;
      remplacer(r);
      PG.toast("Appel d'offres ajouté.");
      choisirOnglet(st === "opportunite" ? "opportunites" : st === "depose" ? "deposes" : "preparation");
      return true;
    }, "Ajouter");
  }

  function fenCompte() {
    var d = etat.d, moi = d.moi;
    var m1 = el("input", { type: "password", autocomplete: "new-password", minlength: "10" });
    var m2 = el("input", { type: "password", autocomplete: "new-password" });
    function mdp(label, input, aide) {
      var c = champ(label, input, aide);
      var boite = el("div", { class: "mdp" }, [input, el("button", { type: "button", "aria-pressed": "false", text: "Afficher" })]);
      c.insertBefore(boite, c.querySelector("small"));
      return c;
    }
    var equipe = el("ul", { class: "equipe" });
    d.membres.forEach(function (m) {
      var retirer = moi.role === "titulaire" && m.email !== moi.email
        ? el("button", { type: "button", class: "lien discret", text: "Retirer", onclick: function (ev) { confirmerRetrait(ev.currentTarget, m.email); } }) : null;
      equipe.appendChild(el("li", {}, [el("span", {}, [m.nom || m.email, el("small", { text: (m.nom ? m.email + " · " : "") + (m.role === "titulaire" ? "Titulaire du compte" : "Collaborateur") + (m.email === moi.email ? " · vous" : "") })]), retirer]));
    });
    d.invitations.forEach(function (i) {
      var retirer = moi.role === "titulaire" ? el("button", { type: "button", class: "lien discret", text: "Annuler", onclick: function (ev) { confirmerRetrait(ev.currentTarget, i.email); } }) : null;
      equipe.appendChild(el("li", {}, [el("span", {}, [i.nom || i.email, el("small", { text: (i.nom ? i.email + " · " : "") + "Invitation envoyée, en attente" })]), retirer]));
    });
    var contenu = [
      el("p", { class: "rappel", text: "Connecté avec " + moi.email + " · " + d.entreprise.nom }),
      el("h3", { text: "Changer mon mot de passe" }),
      mdp("Nouveau mot de passe", m1, "10 caractères au moins."),
      mdp("Confirmez", m2),
      el("h3", { text: "Accès à votre espace" }), equipe
    ];
    var invEmail = null, invNom = null;
    if (moi.role === "titulaire") {
      invEmail = el("input", { type: "email", autocomplete: "off", inputmode: "email", placeholder: "prenom@entreprise.fr" });
      invNom = el("input", { type: "text", maxlength: "120", autocomplete: "off", placeholder: "Facultatif" });
      contenu.push(el("p", { class: "rappel", text: "Invitez un collaborateur (5 accès au plus) : il reçoit un email pour choisir son propre mot de passe." }));
      contenu.push(el("div", { class: "deux-champs" }, [champ("Email du collaborateur", invEmail), champ("Son nom", invNom)]));
    }
    var dlg = fenetre("Mon compte", contenu, async function (f, msg, ok) {
      var fait = false;
      if (m1.value || m2.value) {
        if (m1.value.length < 10) { msg.textContent = "Le mot de passe doit faire 10 caractères au moins."; return false; }
        if (m1.value !== m2.value) { msg.textContent = "Les deux mots de passe ne sont pas identiques."; return false; }
        PG.occupe(ok, true);
        var u = await sb.auth.updateUser({ password: m1.value });
        PG.occupe(ok, false);
        if (u.error) { msg.textContent = PG.messageErreur(u.error); return false; }
        fait = true; m1.value = ""; m2.value = "";
        PG.toast("Mot de passe changé.");
      }
      if (invEmail && invEmail.value.trim()) {
        var e = invEmail.value.trim().toLowerCase();
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) { msg.textContent = "L'adresse du collaborateur n'est pas valable."; return false; }
        var r = await appeler("client_inviter", { p_email: e, p_nom: invNom.value.trim() || null }, ok);
        if (!r) return false;
        await charger(false); rendre();
        PG.toast("Invitation envoyée à " + e + ".");
        fait = true;
      }
      if (!fait) { msg.textContent = "Rien à enregistrer : remplissez un nouveau mot de passe ou l'email d'un collaborateur."; return false; }
      return true;
    }, "Enregistrer");
    PG.brancherAffichage(dlg);
  }

  function confirmerRetrait(bouton, email) {
    if (bouton.dataset.confirme) {
      appeler("client_retirer", { p_email: email }, bouton).then(async function (r) {
        if (!r) return;
        var li = bouton.closest("li"); if (li) li.remove();
        await charger(false); rendre();
        PG.toast("Accès retiré pour " + email + ".");
      });
      return;
    }
    bouton.dataset.confirme = "1";
    bouton.textContent = "Confirmer le retrait";
    bouton.classList.remove("discret");
  }

  // ------------------------------------------------------------------ états d'erreur
  function afficherErreur(texte) {
    var h = $("hello"); h.textContent = "";
    h.appendChild(el("h1", { text: "Votre espace n'a pas pu s'ouvrir" }));
    h.appendChild(el("p", { class: "sous", text: texte }));
    h.appendChild(el("div", { class: "v-actions" }, [el("button", { type: "button", class: "btn petit", text: "Réessayer", onclick: function () { location.reload(); } })]));
  }
  function afficherSansEntreprise() {
    var h = $("hello"); h.textContent = "";
    h.appendChild(el("h1", { text: "Votre compte n'est relié à aucune entreprise" }));
    h.appendChild(el("p", { class: "sous", text: "Votre accès a peut-être été retiré. Écrivez-nous à " + PG.CONTACT + " : nous le rétablissons rapidement." }));
  }

  // ------------------------------------------------------------------ démarrage
  async function demarrer() {
    var s = await sb.auth.getSession();
    if (!s.data || !s.data.session) { location.replace("/espace/"); return; }
    sb.auth.onAuthStateChange(function (ev) { if (ev === "SIGNED_OUT") location.replace("/espace/?deconnecte=1"); });
    $("b-deconnexion").addEventListener("click", async function () { await sb.auth.signOut(); location.replace("/espace/?deconnecte=1"); });
    $("b-compte").addEventListener("click", function () { if (etat.d) fenCompte(); });
    $("b-ajouter").addEventListener("click", function () { if (etat.d) fenAjouter(); });

    var dejaVu = PG.lireSession("pg-visite-prec");
    var visite = dejaVu === null;
    if (!visite) etat.visitePrec = dejaVu || null;
    if (!(await charger(visite))) return;

    var h = location.hash.slice(1);
    var memo = PG.lireStock("pg-onglet", "opportunites");
    etat.onglet = ONGLETS.some(function (t) { return t.id === h; }) ? h : ONGLETS.some(function (t) { return t.id === memo; }) ? memo : "opportunites";
    // Une action attend le client : on ouvre directement le bon onglet.
    var g = groupes();
    if (!h && g.preparation.some(passee)) etat.onglet = "preparation";
    rendre();
    if (new URLSearchParams(location.search).get("bienvenue")) PG.toast("Votre mot de passe est enregistré. Bienvenue !");

    window.addEventListener("hashchange", function () {
      var x = location.hash.slice(1);
      if (ONGLETS.some(function (t) { return t.id === x; }) && x !== etat.onglet) { etat.onglet = x; rendre(); }
    });
    // Retour sur l'onglet après un moment : on recharge pour voir les nouveautés.
    document.addEventListener("visibilitychange", async function () {
      if (document.visibilityState === "visible" && Date.now() - etat.charge > 5 * 60 * 1000 && !document.querySelector("dialog[open]")) {
        if (await charger(false)) rendre();
      }
    });
  }
  demarrer().catch(function (e) { afficherErreur(PG.messageErreur(e)); });
})();
