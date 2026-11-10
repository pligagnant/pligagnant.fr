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

  var etat = { d: null, onglet: "opportunites", filtre: "tous", filtreOpp: "tous", tri: PG.lireStock("pg-tri", "avis") === "date" ? "date" : "avis",
               visitePrec: null, charge: 0 };
  // Compte gratuit (formule « veille ») : seule la veille est active, le suivi s'active avec le premier mémoire.
  var VERROUILLES = ["preparation", "deposes", "historique"];
  function gratuit() { return !!(etat.d && etat.d.entreprise && etat.d.entreprise.formule === "veille"); }
  function verrouille(onglet) { return gratuit() && VERROUILLES.indexOf(onglet) >= 0; }
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
    var bAj = $("b-ajouter");
    bAj.classList.toggle("verrou", gratuit());
    bAj.title = gratuit() ? "S'active avec votre premier mémoire" : "";
    $("corps").hidden = false;
  }

  function dateMoyenne(d) { // « jeu. 12 nov. »
    var x = PG.vers(d); if (!x) return "";
    var s = ["dim.", "lun.", "mar.", "mer.", "jeu.", "ven.", "sam."][x.getDay()] + " " + PG.dateCourte(d);
    if (x.getFullYear() !== PG.vers(jour()).getFullYear()) s += " " + x.getFullYear();
    return s.replace(/ /g, "\u00a0");
  }
  function pluriel(n, un, plusieurs) { return n + " " + (n > 1 ? plusieurs : un); }
  function joursAvant(c) { return c.date_limite ? PG.ecart(c.date_limite, jour()) : null; }

  // En-tête : entreprise, veille, et ce qui attend une action du client.
  function rendreHello(d, g) {
    var e = d.entreprise, h = $("hello");
    h.textContent = "";
    var enCours = e.veille_active && e.a_examiner ? pluriel(e.a_examiner, "nouvelle consultation repérée", "nouvelles consultations repérées") +
      ", notre avis arrive " + (e.veille_prochaine && e.veille_prochaine > jour() ? "le " + dateMoyenne(e.veille_prochaine) : "dans la journée") : "";
    h.appendChild(el("div", { class: "hello-tete" }, [
      el("h1", { text: e.nom }),
      e.veille_active && e.metier ? el("p", { class: "sous" }, ["Veille " + e.metier + (e.zone ? " dans " + e.zone : "") + " ",
        el("button", { type: "button", class: "lien regler", text: "Régler ma veille", onclick: fenVeille })]) : null,
      e.veille_active && (e.veille_maj || enCours) ? el("p", { class: "maj", text: [e.veille_maj ? "Mise à jour chaque jour ouvré, la dernière le " + dateMoyenne(e.veille_maj) : "", enCours]
        .filter(Boolean).join(" · ") }) : null,
      !e.veille_active ? el("p", { class: "sous" }, [el("button", { type: "button", class: "btn petit blanc", text: "Recevoir la veille gratuite des appels d'offres", onclick: fenVeille })]) : null
    ]));
    if (gratuit()) {
      h.appendChild(el("p", { class: "bandeau" }, [el("b", { class: "verrou", text: "Compte gratuit : " }),
        "la veille est incluse ; le suivi de vos réponses s'active avec votre premier mémoire confié. ",
        el("button", { type: "button", class: "lien", text: "En savoir plus", onclick: fenVerrou })]));
    }
    var items = aFaire(g);
    if (!items.length) return;
    var ul = el("ul");
    items.slice(0, 3).forEach(function (it) {
      ul.appendChild(el("li", {}, [el("button", { type: "button", class: "af" + (it.urgent ? " af-urgent" : ""), onclick: it.action }, [
        el("span", { class: "af-txt" }, it.texte), el("span", { class: "af-go" }, [el("span", { class: "mot", text: it.bouton })])
      ])]));
    });
    h.appendChild(el("section", { class: "afaire", "aria-labelledby": "af-titre" }, [el("h2", { id: "af-titre", text: "À faire" }), ul]));
  }

  function aFaire(g) {
    var L = [];
    function b(t) { return el("b", { text: t }); }
    function voir(c, onglet) { return function () { allerA(onglet, c.id); }; }
    g.preparation.filter(passee).forEach(function (c) {
      L.push({ p: 0, urgent: true, bouton: "Répondre", action: voir(c, "preparation"),
        texte: [b(c.acheteur), " : date limite passée. Avez-vous déposé votre offre ?"] });
    });
    g.preparation.filter(function (c) { return !passee(c) && c.memoire === "livre"; }).forEach(function (c) {
      L.push({ p: 1, bouton: "Voir", action: voir(c, "preparation"),
        texte: [b(c.acheteur), " : votre mémoire est livré, à relire et déposer" + (c.date_limite ? " avant le " + dateMoyenne(c.date_limite) : "")] });
    });
    g.preparation.filter(function (c) { var n = joursAvant(c); return n !== null && n >= 0 && n <= 5 && c.memoire !== "livre"; }).forEach(function (c) {
      L.push({ p: 2, urgent: joursAvant(c) <= 2, bouton: "Voir", action: voir(c, "preparation"),
        texte: [b(c.acheteur), " : date limite " + PG.dansCombien(joursAvant(c))] });
    });
    var nouv = g.opportunites.filter(estNouveau).length;
    if (nouv) {
      L.push({ p: 3, bouton: "Voir", texte: [el("b", { text: pluriel(nouv, "nouvelle opportunité", "nouvelles opportunités") }), " depuis votre dernière visite"],
        action: function () { etat.filtreOpp = "nouvelles"; allerA("opportunites"); } });
    }
    var proche = g.opportunites.filter(function (c) { var n = joursAvant(c); return c.avis === "tenter" && n !== null && n <= 7; }).sort(parDate)[0];
    if (proche) {
      L.push({ p: 4, bouton: "Voir", action: voir(proche, "opportunites"),
        texte: [b(proche.acheteur), " : à tenter, date limite " + PG.dansCombien(joursAvant(proche))] });
    }
    var attente = g.deposes.filter(function (c) { return c.date_depot && PG.ecart(jour(), c.date_depot) >= 30; })
      .sort(function (a, b) { return a.date_depot < b.date_depot ? -1 : 1; })[0];
    if (attente) {
      L.push({ p: 5, bouton: "Indiquer", action: function () { fenResultat(attente); },
        texte: [b(attente.acheteur), " : résultat reçu ? Offre déposée le " + dateMoyenne(attente.date_depot)] });
    }
    return L.sort(function (a, b) { return a.p - b.p; });
  }

  // Ouvre un onglet et, si demandé, amène la fiche à l'écran.
  function allerA(onglet, id) {
    if (id && onglet === "opportunites") etat.filtreOpp = "tous";
    etat.onglet = onglet;
    if (location.hash !== "#" + onglet) history.replaceState(null, "", "#" + onglet);
    PG.ecrireStock("pg-onglet", onglet);
    rendre();
    var cible = id && document.getElementById("carte-" + id);
    if (!cible) { haut(true); return; }
    var det = cible.closest("details"); if (det) det.open = true;
    cible.scrollIntoView({ behavior: lent() ? "auto" : "smooth", block: "start" });
    cible.focus({ preventScroll: true });
    cible.classList.add("eclair");
    setTimeout(function () { cible.classList.remove("eclair"); }, 1800);
  }
  function lent() { return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches; }
  // Remonte en haut de la liste quand la barre d'onglets est restée collée en haut de l'écran.
  function haut(doux) {
    var y = $("corps").getBoundingClientRect().top + window.scrollY;
    if (window.scrollY > y) window.scrollTo({ top: y, behavior: doux && !lent() ? "smooth" : "auto" });
  }

  var COURTS = { opportunites: "Opportunités", preparation: "En cours", deposes: "Déposés", historique: "Historique" };
  function rendreOnglets(g) {
    var o = $("onglets");
    o.textContent = "";
    var signal = {
      opportunites: g.opportunites.some(estNouveau),
      preparation: g.preparation.some(function (c) { var n = joursAvant(c); return n !== null && n <= 3; })
    };
    ONGLETS.forEach(function (t) {
      var n = t.id === "opportunites" ? g.opportunites.length : g[t.id].length;
      var ferme = verrouille(t.id), choisi = etat.onglet === t.id;
      o.appendChild(el("button", { type: "button", role: "tab", id: "o-" + t.id, "aria-controls": "panneau",
        class: ferme ? "verrou" : null, title: ferme ? "S'active avec votre premier mémoire" : null,
        "aria-selected": choisi ? "true" : "false", tabindex: choisi ? "0" : "-1",
        onclick: function () { choisirOnglet(t.id); } }, [
        el("span", { class: "l" }, [el("span", { class: "long", text: t.nom }), el("span", { class: "court", text: COURTS[t.id] })]),
        ferme ? el("span", { class: "sr", text: " (à activer)" }) : el("span", { class: "c", text: String(n) }),
        signal[t.id] && !ferme ? el("span", { class: "point" }, [el("span", { class: "sr", text: t.id === "opportunites" ? " (nouveautés)" : " (date limite proche)" })]) : null
      ]));
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

  function choisirOnglet(id) {
    etat.onglet = id;
    if (location.hash !== "#" + id) history.replaceState(null, "", "#" + id);
    PG.ecrireStock("pg-onglet", id);
    rendre();
    haut(false);
  }

  function rendreGuide() {
    var zone = $("guide");
    zone.textContent = "";
    var bienvenue = new URLSearchParams(location.search).get("bienvenue");
    if (PG.lireStock("pg-guide-ferme", "") === "1" && !bienvenue) return;
    if (!bienvenue && etat.visitePrec) return;
    var g = el("section", { class: "guide", "aria-labelledby": "guide-titre" }, [
      el("div", { class: "haut" }, [
        el("h2", { id: "guide-titre", text: bienvenue ? "Bienvenue dans votre espace" : "Comment ça marche" }),
        el("button", { type: "button", class: "lien discret", text: "Masquer", onclick: function () {
          PG.ecrireStock("pg-guide-ferme", "1"); history.replaceState(null, "", location.pathname + location.hash); zone.textContent = ""; } })
      ]),
      gratuit() ? el("ol", {}, [
        el("li", {}, [el("b", { text: "Vos opportunités" }), " : les consultations ouvertes dans votre métier et vos départements, avec notre avis sur chacune. Nous en ajoutons chaque jour ouvré ; « Régler ma veille » vous permet de l'affiner."]),
        el("li", {}, [el("b", { text: "Une consultation vous intéresse ?" }), " Cliquez sur « Confier le mémoire à Pli Gagnant » : nous vous écrivons sous 24 h ouvrées pour récupérer le dossier."]),
        el("li", {}, [el("b", { text: "Les outils grisés" }), " (suivi de vos réponses, dépôts, résultats, collaborateurs) s'activent avec ce premier mémoire."])
      ]) : el("ol", {}, [
        el("li", {}, [el("b", { text: "Opportunités" }), " : les consultations que nous repérons pour vous, avec notre avis. « Je vais y répondre » les passe en préparation."]),
        el("li", {}, [el("b", { text: "En cours" }), " : vos réponses en préparation, avec la date limite et l'avancement de votre mémoire si nous le rédigeons."]),
        el("li", {}, [el("b", { text: "Déposés et historique" }), " : indiquez le résultat quand vous l'avez. Tout reste en mémoire, gagné ou perdu."])
      ])
    ]);
    zone.appendChild(g);
  }

  var FILTRES_OPP = [["tous", "Toutes"], ["tenter", "À tenter"], ["regarder", "À regarder"], ["nouvelles", "Nouvelles"]];
  function filtreOpp(c) {
    var f = etat.filtreOpp;
    return f === "tous" || (f === "nouvelles" ? estNouveau(c) : c.avis === f);
  }
  function triOpp(a, b) {
    return etat.tri === "date" ? parDate(a, b) || rangAvis(a) - rangAvis(b) : rangAvis(a) - rangAvis(b) || parDate(a, b);
  }
  // Barre de filtres réutilisable ; garde le focus sur le bouton choisi après le nouveau rendu.
  function barreFiltres(etiquette, options, actif, choisir, extra) {
    var f = el("div", { class: "filtres", role: "group", "aria-label": etiquette });
    options.forEach(function (o) {
      f.appendChild(el("button", { type: "button", "data-f": o[0], "aria-pressed": actif === o[0] ? "true" : "false",
        onclick: function () {
          choisir(o[0]); rendre();
          var x = document.querySelector('.filtres [data-f="' + o[0] + '"]'); if (x) x.focus();
        } }, [o[1] + " ", el("span", { class: "n", text: String(o[2]) })]));
    });
    if (extra) f.appendChild(extra);
    return f;
  }

  function rendrePanneau(g) {
    var p = $("panneau");
    p.textContent = "";
    var o = etat.onglet;
    if (verrouille(o)) { p.appendChild(panneauVerrou(o)); return; }
    if (o === "opportunites") {
      if (!g.opportunites.length) p.appendChild(videOpportunites());
      else {
        var nb = { tous: g.opportunites.length, nouvelles: g.opportunites.filter(estNouveau).length };
        ["tenter", "regarder"].forEach(function (a) { nb[a] = g.opportunites.filter(function (c) { return c.avis === a; }).length; });
        if (!nb[etat.filtreOpp]) etat.filtreOpp = "tous";
        if (g.opportunites.length >= 3) {
          var opts = FILTRES_OPP.filter(function (x) { return x[0] === "tous" || (nb[x[0]] && nb[x[0]] < nb.tous); })
            .map(function (x) { return [x[0], x[1], nb[x[0]]]; });
          var sel = el("select", { id: "tri", onchange: function () {
            etat.tri = sel.value; PG.ecrireStock("pg-tri", sel.value); rendre(); var t = $("tri"); if (t) t.focus(); } }, [
            el("option", { value: "avis", text: "notre avis" }), el("option", { value: "date", text: "date limite" })]);
          sel.value = etat.tri;
          var tri = el("label", { class: "tri", for: "tri" }, ["Trier par ", sel]);
          p.appendChild(el("div", { class: "outils" }, [opts.length > 1
            ? barreFiltres("Opportunités affichées", opts, etat.filtreOpp, function (v) { etat.filtreOpp = v; }, tri) : tri]));
        }
        p.appendChild(listeCartes(g.opportunites.filter(filtreOpp).sort(triOpp)));
      }
      if (g.deconseillees.length) {
        p.appendChild(el("details", { class: "v-passes" }, [
          el("summary", { text: "Celles que nous vous déconseillons (" + g.deconseillees.length + ")" }),
          listeCartes(g.deconseillees)
        ]));
      }
    } else if (o === "preparation") {
      p.appendChild(g.preparation.length ? listeCartes(g.preparation)
        : vide("Rien en préparation pour l'instant", "Quand une opportunité vous intéresse, cliquez sur « Je vais y répondre » : elle arrive ici, avec sa date limite."));
    } else if (o === "deposes") {
      p.appendChild(g.deposes.length ? listeCartes(g.deposes)
        : vide("Aucune offre en attente de résultat", "Quand vous avez déposé une offre, cliquez sur « J'ai déposé mon offre » : vous la retrouvez ici jusqu'au résultat."));
    } else {
      var resultats = g.historique.filter(function (c) { return ["gagne", "perdu", "sans_suite"].indexOf(c.statut) >= 0; });
      var gagnes = resultats.filter(function (c) { return c.statut === "gagne"; }).length;
      if (resultats.length) {
        p.appendChild(el("p", { class: "resume" }, [el("b", { text: pluriel(gagnes, "marché gagné", "marchés gagnés") }),
          " sur " + pluriel(resultats.length, "résultat connu", "résultats connus") + "."]));
      }
      var opts2 = FILTRES.map(function (f) {
        return [f[0], f[1], f[0] === "tous" ? g.historique.length : g.historique.filter(function (c) { return c.statut === f[0]; }).length];
      }).filter(function (f) { return f[0] === "tous" || f[2]; });
      if (!opts2.some(function (f) { return f[0] === etat.filtre; })) etat.filtre = "tous";
      var h = g.historique.filter(function (c) { return etat.filtre === "tous" || c.statut === etat.filtre; });
      if (opts2.length > 2) p.appendChild(el("div", { class: "outils" }, [barreFiltres("Filtrer l'historique", opts2, etat.filtre, function (v) { etat.filtre = v; })]));
      p.appendChild(h.length ? listeCartes(h)
        : vide("Votre historique est vide", "Il gardera la trace de vos appels d'offres terminés : gagnés, perdus, abandonnés ou écartés."));
    }
    p.appendChild(el("button", { type: "button", class: "ajout-bas" + (gratuit() ? " verrou" : ""),
      text: "Ajouter un appel d'offres trouvé ailleurs", onclick: ajouter }));
  }
  function ajouter() { if (!etat.d) return; if (gratuit()) fenVerrou(); else fenAjouter(); }

  function vide(titre, texte, extra) {
    return el("div", { class: "vide" }, [el("h3", { text: titre }), el("p", { text: texte }), extra || null]);
  }
  function videOpportunites() {
    var e = etat.d.entreprise;
    var regler = el("div", { class: "v-actions" }, [el("button", { type: "button", class: "btn petit ghost", text: "Régler ma veille", onclick: fenVeille })]);
    if (e.veille_active && (!e.veille_maj || e.a_examiner)) {
      return vide(e.a_examiner ? pluriel(e.a_examiner, "consultation repérée", "consultations repérées") + ", notre avis arrive bientôt" : "Votre première sélection est en préparation",
        "Nous lisons les consultations ouvertes " + (e.metier ? "en " + e.metier + " " : "") + (e.zone ? "dans " + e.zone : "") +
        ". Elles arrivent ici sous un jour ouvré, avec notre avis sur chacune, et nous vous prévenons par email.", regler);
    }
    if (e.veille_active) {
      return vide("Aucune consultation ouverte à vous proposer en ce moment",
        "Chaque jour ouvré, nous lisons toutes les consultations publiées au BOAMP " + (e.metier ? "en " + e.metier + " " : "") + (e.zone ? "dans " + e.zone : "") +
        ". Les nouvelles opportunités apparaîtront ici. Vous pouvez élargir votre veille : départements voisins, mots à inclure, taille des marchés.", regler);
    }
    return vide("Recevez les appels d'offres de votre métier",
      "Notre veille est gratuite : chaque jour ouvré, nous repérons les consultations de votre métier dans vos départements, et vous donnons notre avis sur chacune.",
      el("div", { class: "v-actions" }, [el("button", { type: "button", class: "btn petit", text: "Activer ma veille gratuite", onclick: fenVeille })]));
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
    var art = el("article", { class: "v-card " + classeCarte(c), id: "carte-" + c.id, tabindex: "-1", "aria-labelledby": "t-" + c.id });
    var top = el("div", { class: "v-top" });
    if (c.statut === "opportunite" && c.avis) top.appendChild(el("span", { class: "v-badge", text: AVIS[c.avis] }));
    if (["gagne", "perdu", "sans_suite", "abandonne", "ecartee"].indexOf(c.statut) >= 0) {
      top.appendChild(el("span", { class: "etiq" + (c.statut === "gagne" ? " vert" : ""), text: STATUTS[c.statut] }));
    }
    if (estNouveau(c) && c.statut === "opportunite") top.appendChild(el("span", { class: "neuf", text: "Nouveau" }));
    if (c.source === "client") top.appendChild(el("span", { class: "etiq", text: "Ajouté par vous" }));
    if (c.memoire && c.statut !== "en_preparation") top.appendChild(el("span", { class: "etiq bleu", text: "Mémoire Pli Gagnant" }));
    var delai = pastilleDelai(c);
    if (delai) top.appendChild(delai);
    if (top.childNodes.length) art.appendChild(top);

    art.appendChild(el("h3", { id: "t-" + c.id, text: c.acheteur }));
    art.appendChild(el("p", { class: "v-objet", text: c.objet }));
    var meta = metaDe(c);
    if (meta) art.appendChild(meta);

    if (c.raison && (c.statut === "opportunite" || c.statut === "en_preparation")) {
      art.appendChild(el("p", { class: "v-avis" }, [el("b", { text: "Notre avis : " }), c.raison]));
    }
    if (c.memoire) art.appendChild(suiviMemoire(c));
    if (c.note_client) art.appendChild(el("p", { class: "v-note" }, [el("b", { text: "Votre note : " }), c.note_client]));

    if (c.statut === "en_preparation" && passee(c)) {
      art.appendChild(el("div", { class: "alerte" }, [
        el("span", { text: "La date limite est passée. Avez-vous déposé votre offre ?" }),
        el("div", { class: "v-actions" }, [
          el("button", { type: "button", class: "btn petit", text: "Oui, j'ai déposé", onclick: function () { fenDepot(c); } }),
          el("button", { type: "button", class: "btn petit", text: "Non", onclick: function (ev) { changerStatut(c, "abandonne", { annulable: true }, ev.currentTarget); } })
        ])
      ]));
    }

    var a = actionsDe(c);
    if (a.boutons.length) art.appendChild(el("div", { class: "v-actions" + (a.boutons.length === 1 ? " seul" : "") }, a.boutons));
    if (a.liens.length) art.appendChild(el("div", { class: "v-liens" }, a.liens));
    return art;
  }

  // Compte à rebours visible d'un coup d'œil, pour ce qui est encore ouvert.
  function pastilleDelai(c) {
    if (["opportunite", "en_preparation"].indexOf(c.statut) < 0) return null;
    var n = joursAvant(c);
    if (n === null) return null;
    if (n < 0) return null;
    return el("span", { class: "delai" + (n <= 5 ? " urgent" : n <= 10 ? " bientot" : ""),
      text: n === 0 ? "Aujourd'hui" : n === 1 ? "Demain" : "Dans " + n + " jours" });
  }

  function metaDe(c) {
    var ul = el("ul", { class: "v-meta" });
    function m(lbl, val, cls) { if (val) ul.appendChild(el("li", { class: cls || null }, [lbl ? el("span", { class: "lbl", text: lbl + " " }) : null, val])); }
    var actif = ["opportunite", "en_preparation"].indexOf(c.statut) >= 0;
    if (c.date_limite && (actif || ["abandonne", "ecartee"].indexOf(c.statut) >= 0)) {
      m("Date limite", dateMoyenne(c.date_limite) + (c.heure_limite ? " à " + c.heure_limite : ""));
    }
    if (c.date_depot && ["depose", "gagne", "perdu", "sans_suite"].indexOf(c.statut) >= 0) m("Déposé le", dateMoyenne(c.date_depot));
    if (c.date_resultat && ["gagne", "perdu", "sans_suite"].indexOf(c.statut) >= 0) m("Résultat le", dateMoyenne(c.date_resultat));
    m(null, c.lieu, "lieu");
    if (c.valeur_technique !== null && c.valeur_technique !== undefined) m("Valeur technique", c.valeur_technique + " % de la note");
    m("Montant estimé", c.montant);
    if (c.montant_attribue && c.statut === "gagne") m("Marché", c.montant_attribue);
    return ul.childNodes.length ? ul : null;
  }

  // Boutons principaux de la fiche, puis liens secondaires plus discrets.
  function actionsDe(c) {
    var B = [], L = [];
    function bouton(texte, classe, fn) { return el("button", { type: "button", class: "btn petit " + (classe || ""), text: texte, onclick: fn }); }
    // Libellé court sur téléphone quand deux boutons partagent la ligne.
    function confier(classe) {
      return el("button", { type: "button", class: "btn petit " + (classe || ""), onclick: function () { fenMemoire(c); } },
        [el("span", { class: "long", text: "Confier le mémoire à Pli Gagnant" }), el("span", { class: "court", text: "Confier le mémoire" })]);
    }
    function lien(texte, fn, classe) { return el("button", { type: "button", class: "lien " + (classe || ""), text: texte, onclick: fn }); }
    var avis = null;
    if (c.url) {
      avis = el("a", { href: c.url, target: "_blank", rel: "noopener noreferrer", title: c.numero_avis ? "Avis n° " + c.numero_avis : null,
        text: "Voir l'avis" + (c.plateforme ? " sur " + c.plateforme : "") + " ↗" });
    } else if (c.numero_avis || c.plateforme) {
      avis = el("span", { class: "ref", text: [c.plateforme, c.numero_avis ? "avis n° " + c.numero_avis : ""].filter(Boolean).join(", ") });
    }
    var dossier = c.url_dossier ? el("a", { href: c.url_dossier, target: "_blank", rel: "noopener noreferrer", text: "Dossier de consultation ↗",
      title: "Le règlement et le cahier des charges, sur la plateforme de l'acheteur" }) : null;
    var note = lien(c.note_client ? "Modifier ma note" : "Ajouter une note", function () { fenNote(c); });
    var pasPourMoi = lien("Pas pour moi", function (ev) { changerStatut(c, "ecartee", { annulable: true }, ev.currentTarget); });
    if (c.statut === "opportunite" && gratuit()) {
      B.push(confier(""));
      L.push(dossier, avis, pasPourMoi, note, lien("Je vais y répondre", fenVerrou, "verrou"));
    } else if (c.statut === "opportunite") {
      B.push(bouton("Je vais y répondre", "", function (ev) { changerStatut(c, "en_preparation", {}, ev.currentTarget); }));
      B.push(confier("ghost"));
      L.push(dossier, avis, pasPourMoi, note);
    } else if (c.statut === "en_preparation" && !passee(c)) {
      B.push(bouton("J'ai déposé mon offre", "", function () { fenDepot(c); }));
      if (!c.memoire) B.push(confier("ghost"));
      L.push(dossier, avis, note, lien("Je ne réponds plus", function () { fenAbandon(c); }));
    } else if (c.statut === "depose") {
      B.push(bouton("J'ai reçu le résultat", "", function () { fenResultat(c); }));
      L.push(avis, note);
    } else {
      L.push(avis, note);
    }
    L.push(correction(c));
    return { boutons: B, liens: L.filter(Boolean) };
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
      var etaitGratuit = gratuit();
      if (etaitGratuit) etat.d.entreprise.formule = "client";
      remplacer(r); allerA("preparation", r.id);
      PG.toast(etaitGratuit ? "Demande envoyée, et votre suivi est activé. Nous vous écrivons sous 24 h ouvrées."
                            : "Demande envoyée. Nous vous écrivons sous 24 h ouvrées.", { duree: 6000 });
      return true;
    }, "Envoyer ma demande");
  }

  // ------------------------------------------------------------------ réglages de la veille
  var TAILLES = [["mapa", "Moins de 90 000 € HT", "Les plus accessibles aux petites entreprises"],
                 ["national", "De 90 000 € HT aux seuils européens", "Jusqu'à 221 000 € HT en services, 5,5 M€ en travaux"],
                 ["europeen", "Au-dessus des seuils européens", "Les plus gros marchés, souvent en lots"]];
  function motsEnTexte(l) { return (l || []).join(", "); }
  function texteEnMots(t) { return t.split(/[,;\n]+/).map(function (x) { return x.trim(); }).filter(function (x) { return x.length >= 3; }).slice(0, 12); }

  function fenVeille() {
    var e = etat.d.entreprise, active = e.veille_active;
    var metiers = etat.d.metiers || [];
    var sel = el("select", { required: true }, [el("option", { value: "", text: "Choisissez…" })]
      .concat(metiers.map(function (m) { return el("option", { value: m[0], text: m[1] }); }))
      .concat([el("option", { value: "autre", text: "Autre métier…" })]));
    var connu = metiers.some(function (m) { return m[0] === e.metier; });
    sel.value = e.metier ? (connu ? e.metier : "autre") : "";
    var autre = el("input", { type: "text", maxlength: "80", value: connu ? "" : (e.metier || ""), placeholder: "Ex. : élagage, désamiantage, restauration collective" });
    var champAutre = champ("Précisez votre métier", autre);
    champAutre.hidden = sel.value !== "autre";
    sel.addEventListener("change", function () { champAutre.hidden = sel.value !== "autre"; if (!champAutre.hidden) autre.focus(); });

    var saisie = el("input", { type: "text", autocomplete: "off", autocapitalize: "off", spellcheck: "false", id: "rv-dep" });
    var listeDep = el("ul", { class: "suggestions", id: "rv-dep-liste", role: "listbox", hidden: true });
    var puces = el("ul", { class: "puces", "aria-label": "Départements choisis" });
    var aide = el("small", { text: "Jusqu'à 8 départements : là où vous travaillez, et les départements voisins si vous vous déplacez." });
    var deps = window.PGDepartements.creer({ saisie: saisie, liste: listeDep, puces: puces, aide: aide, max: 8, valeurs: e.departements || [] });
    var champDep = el("div", { class: "champ" }, [el("label", { for: "rv-dep", text: "Vos départements" }), puces,
      el("div", { class: "combo" }, [saisie, listeDep]), aide]);

    var inclus = el("input", { type: "text", maxlength: "500", value: motsEnTexte(e.mots_inclus), placeholder: "Ex. : élagage, cimetière, aire de jeux" });
    var exclus = el("input", { type: "text", maxlength: "500", value: motsEnTexte(e.mots_exclus), placeholder: "Ex. : location, fourniture, déneigement" });
    var tailles = e.tailles && e.tailles.length ? e.tailles : ["mapa", "national", "europeen"];
    var cases = TAILLES.map(function (t) {
      var c = el("input", { type: "checkbox", value: t[0] });
      c.checked = tailles.indexOf(t[0]) >= 0;
      return el("label", { class: "case" }, [c, el("span", {}, [el("b", { text: t[1] }), el("small", { text: t[2] })])]);
    });
    var alertes = el("input", { type: "checkbox" });
    alertes.checked = e.alertes !== false;

    var d = fenetre(active ? "Régler ma veille" : "Activer ma veille gratuite", [
      el("p", { class: "rappel", text: "Chaque jour ouvré, nous lisons toutes les consultations publiées au BOAMP et vous gardons celles qui correspondent à ces réglages, avec notre avis." }),
      champ("Votre métier", sel), champAutre, champDep,
      champ("Mots à inclure (facultatif)", inclus, "Nous ajoutons aussi les consultations dont l'objet contient l'un de ces mots. Séparez-les par des virgules."),
      champ("Mots à exclure (facultatif)", exclus, "Nous écartons les consultations dont l'objet contient l'un de ces mots."),
      el("fieldset", { class: "champ cases" }, [el("legend", { text: "Taille des marchés" })].concat(cases)),
      el("label", { class: "case" }, [alertes, el("span", {}, [el("b", { text: "M'envoyer un email le jour même" }),
        el("small", { text: "quand une consultation que nous vous conseillons de tenter arrive (un email par jour au plus)." })])])
    ], async function (f, msg, ok) {
      var metier = sel.value === "autre" ? autre.value.trim() : sel.value;
      deps.completer();
      var lesDeps = deps.valeurs();
      var lesTailles = cases.map(function (l) { return l.querySelector("input"); }).filter(function (c) { return c.checked; }).map(function (c) { return c.value; });
      if (!sel.value) { msg.textContent = "Choisissez votre métier."; sel.focus(); return false; }
      if (metier.length < 3) { msg.textContent = "Précisez votre métier."; autre.focus(); return false; }
      if (!lesDeps.length) { msg.textContent = "Choisissez au moins un département."; saisie.focus(); return false; }
      if (!lesTailles.length) { msg.textContent = "Choisissez au moins une taille de marchés."; cases[0].querySelector("input").focus(); return false; }
      var r = await appeler("client_regler_veille", { p_metier: metier, p_departements: lesDeps, p_mots_inclus: texteEnMots(inclus.value),
        p_mots_exclus: texteEnMots(exclus.value), p_tailles: lesTailles, p_alertes: alertes.checked }, ok);
      if (!r) return false;
      await charger(false);
      rendre();
      PG.toast(!active ? "Votre veille est activée. Notre première sélection arrive sous un jour ouvré."
        : r.a_examiner ? "Réglages enregistrés. " + pluriel(r.a_examiner, "nouvelle consultation repérée", "nouvelles consultations repérées") + " : notre avis arrive à la prochaine mise à jour."
        : "Réglages enregistrés.", { duree: 6000 });
      return true;
    }, active ? "Enregistrer" : "Activer ma veille");
    d.classList.add("large");
    sel.focus();
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
    if (moi.role === "titulaire" && gratuit()) {
      contenu.push(el("p", { class: "rappel verrou", text: "L'accès de vos collaborateurs s'active avec votre premier mémoire confié à Pli Gagnant." }));
    } else if (moi.role === "titulaire") {
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

  // ------------------------------------------------------------------ compte gratuit
  function ceQuiSActive() {
    return el("ul", { class: "liste-verrou" }, [
      el("li", { text: "Le suivi de vos réponses en préparation, avec l'avancement de votre mémoire." }),
      el("li", { text: "Vos dépôts et vos résultats, gagnés ou perdus, dans un historique." }),
      el("li", { text: "L'ajout des appels d'offres que vous trouvez ailleurs." }),
      el("li", { text: "L'accès de vos collaborateurs à votre espace." })
    ]);
  }
  function commentActiver() {
    var offre = (etat.d && etat.d.offre) || {};
    return "Pour les activer, cliquez sur « Confier le mémoire à Pli Gagnant » sous une opportunité, ou transférez-nous un dossier à " +
      PG.CONTACT + ". Votre premier mémoire n'est payé que s'il vous convient" +
      (offre.offre_prix_memoire ? " (" + offre.offre_prix_memoire + " ensuite)." : ".");
  }
  function fenVerrou() {
    var d = el("dialog", { class: "fen", "aria-labelledby": "fen-titre" });
    var voir = el("button", { type: "button", class: "btn", text: "Voir mes opportunités", onclick: function () { d.close(); choisirOnglet("opportunites"); } });
    d.appendChild(el("button", { type: "button", class: "fermer", "aria-label": "Fermer", text: "×", onclick: function () { d.close(); } }));
    d.appendChild(el("div", { class: "fen-in" }, [
      el("h2", { id: "fen-titre", text: "S'active avec votre premier mémoire" }),
      el("p", { text: "Votre compte gratuit comprend la veille des appels d'offres, avec notre avis sur chacun. Ces outils s'activent dès que vous nous confiez un premier mémoire technique :" }),
      ceQuiSActive(),
      el("p", { class: "rappel", text: commentActiver() }),
      el("div", { class: "boutons" }, [voir])
    ]));
    d.addEventListener("close", function () { d.remove(); });
    document.body.appendChild(d);
    d.showModal();
    voir.focus();
  }
  function panneauVerrou(o) {
    var titres = { preparation: "Suivez vos réponses en préparation", deposes: "Suivez vos offres déposées", historique: "Gardez l'historique de vos résultats" };
    return el("div", { class: "panneau-verrou" }, [
      el("h3", { class: "verrou", text: titres[o] }),
      el("p", { text: "Cet outil s'active avec votre premier mémoire confié à Pli Gagnant. Vous aurez alors :" }),
      ceQuiSActive(),
      el("p", { text: commentActiver() }),
      el("div", { class: "v-actions" }, [el("button", { type: "button", class: "btn petit", text: "Voir mes opportunités", onclick: function () { choisirOnglet("opportunites"); } })])
    ]);
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
    $("b-ajouter").addEventListener("click", ajouter);

    var dejaVu = PG.lireSession("pg-visite-prec");
    var visite = dejaVu === null;
    if (!visite) etat.visitePrec = dejaVu || null;
    if (!(await charger(visite))) return;

    var h = location.hash.slice(1);
    var memo = PG.lireStock("pg-onglet", "opportunites");
    etat.onglet = ONGLETS.some(function (t) { return t.id === h; }) ? h : ONGLETS.some(function (t) { return t.id === memo; }) ? memo : "opportunites";
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
