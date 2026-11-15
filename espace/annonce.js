/* Page d'une annonce (/espace/annonce/?id=…) : toutes les informations, notre avis, et « Répondre » (avec Pli Gagnant). */
(function () {
  "use strict";
  var PG = window.PG, el = PG.el;
  var $ = function (id) { return document.getElementById(id); };
  var TDB = "/espace/tableau-de-bord/";
  var ETAPES = [["demande", "Demande reçue"], ["dossier_recu", "Dossier reçu"], ["en_redaction", "Rédaction"], ["livre", "Mémoire livré"]];
  var etat = { d: null, c: null };

  function prix(t) { return String(t || "").replace(/ /g, "\u00a0"); }
  function jour() { return etat.d.aujourdhui || PG.aujourdhuiIso(); }
  function joursAvant(c) { return c.date_limite ? PG.ecart(c.date_limite, jour()) : null; }
  function dateMoyenne(x) {
    var v = PG.vers(x); if (!v) return "";
    return (["dim.", "lun.", "mar.", "mer.", "jeu.", "ven.", "sam."][v.getDay()] + " " + PG.dateCourte(x)).replace(/ /g, " ");
  }

  async function charger() {
    var r = await PG.client.rpc("client_tableau", { p_visite: false });
    if (r.error) {
      if (PG.sessionExpiree(r.error)) { location.replace("/espace/?expire=1"); return false; }
      erreur(PG.messageErreur(r.error)); return false;
    }
    if (!r.data) { location.replace(TDB); return false; }
    etat.d = r.data;
    var id = new URLSearchParams(location.search).get("id");
    etat.c = (r.data.consultations || []).filter(function (c) { return c.id === id; })[0] || null;
    if (window.PG_AFAIRE) window.PG_AFAIRE.badge(r.data);
    return true;
  }

  // ------------------------------------------------------------------ rendu
  function rendre() {
    var d = etat.d, c = etat.c, h = $("hello"), p = $("panneau");
    $("qui").textContent = d.entreprise.nom; $("qui").title = d.moi.email;
    h.textContent = ""; p.textContent = "";
    h.appendChild(el("a", { class: "retour", href: TDB + "#opportunites", text: "‹ Opportunités" }));
    if (!c) {
      h.appendChild(el("h1", { text: "Cette annonce n'est plus disponible" }));
      h.appendChild(el("p", { class: "sous", text: "Elle a peut-être été retirée de votre espace." }));
      $("corps").hidden = true;
      return;
    }
    document.title = c.acheteur + " · Pli Gagnant";
    h.appendChild(el("h1", { text: c.acheteur }));
    h.appendChild(el("p", { class: "an-objet-grand", text: c.objet }));

    var n = joursAvant(c), dl = el("dl", { class: "an-infos" });
    function info(lbl, val, cls) { if (val) dl.append(el("dt", { text: lbl }), el("dd", { class: cls || null, text: val })); }
    info("Date limite", c.date_limite ? dateMoyenne(c.date_limite) + (c.heure_limite ? " à " + c.heure_limite : "") +
      (n !== null ? " (" + PG.dansCombien(n) + ")" : "") : "", n !== null && n >= 0 && n <= 5 ? "urgent" : null);
    info("Lieu", c.lieu);
    info("Montant estimé", c.montant);
    if (c.valeur_technique !== null && c.valeur_technique !== undefined) info("Valeur technique", c.valeur_technique + " % de la note");
    info("Source", [c.plateforme, c.numero_avis ? "avis n° " + c.numero_avis : ""].filter(Boolean).join(", "));
    if (dl.childNodes.length) p.appendChild(dl);

    if (c.raison) p.appendChild(el("section", { class: "an-avis" }, [el("h2", { text: "Notre avis" }), el("p", { text: c.raison })]));

    var liens = [];
    if (c.url) liens.push(el("a", { href: c.url, target: "_blank", rel: "noopener noreferrer", text: "Voir l'avis officiel ↗" }));
    if (c.url_dossier) liens.push(el("a", { href: c.url_dossier, target: "_blank", rel: "noopener noreferrer", text: "Dossier de consultation ↗" }));
    if (liens.length) p.appendChild(el("p", { class: "an-liens" }, liens));

    p.appendChild(action(c, n));
    $("corps").hidden = false;
  }

  function action(c, n) {
    var z = el("section", { class: "an-action", "aria-label": "Votre réponse" });
    var offre = etat.d.offre || {};
    var marche = (etat.d.marches || []).filter(function (m) { return m.id === c.id; })[0];
    if (c.memoire) {
      var idx = ETAPES.findIndex(function (e) { return e[0] === c.memoire; });
      z.appendChild(el("ol", { class: "etapes", "aria-label": "Avancement de votre mémoire" }, ETAPES.map(function (e, i) {
        return el("li", { class: i < idx ? "fait" : i === idx ? "fait encours" : "", "aria-current": i === idx ? "step" : null, text: e[1] });
      })));
      if (marche) {
        var envoye = !!(marche.questions && marche.questions.envoye);
        z.appendChild(el("p", { text: envoye ? "Questionnaire envoyé. Merci." : "Pour écrire votre mémoire, nous avons besoin de vos réponses au questionnaire de ce marché." }));
        z.appendChild(el("div", { class: "v-actions" }, [
          el("a", { class: "btn" + (envoye ? " blanc" : ""), href: "/espace/questionnaire/?m=" + encodeURIComponent(c.id), text: envoye ? "Revoir le questionnaire" : "Remplir le questionnaire" }),
          el("a", { class: "lien", href: TDB + "?fiche=" + encodeURIComponent(c.id), text: "Voir dans le tableau de bord" })
        ]));
      } else {
        z.appendChild(el("div", { class: "v-actions" }, [el("a", { class: "lien", href: TDB + "?fiche=" + encodeURIComponent(c.id), text: "Voir dans le tableau de bord" })]));
      }
      return z;
    }
    if (c.statut === "ecartee") {
      z.appendChild(el("p", { text: "Vous avez écarté cette annonce." }));
      z.appendChild(el("button", { type: "button", class: "lien", text: "La remettre dans mes opportunités", onclick: function (ev) { statut("opportunite", ev.currentTarget); } }));
      return z;
    }
    if (["opportunite", "en_preparation"].indexOf(c.statut) < 0) {
      z.appendChild(el("div", { class: "v-actions" }, [el("a", { class: "lien", href: TDB + "?fiche=" + encodeURIComponent(c.id), text: "Voir dans le tableau de bord" })]));
      return z;
    }
    if (n !== null && n < 0) {
      z.appendChild(el("p", { text: "La date limite est passée." }));
      return z;
    }
    z.appendChild(el("button", { type: "button", class: "btn", text: "Répondre", onclick: fenRepondre }));
    z.appendChild(el("p", { class: "an-prix" }, [
      "Nous rédigeons votre mémoire technique" + (offre.offre_prix_memoire ? " : " + prix(offre.offre_prix_memoire) + "." : "."),
      offre.offre_premier && etat.d.entreprise.formule === "veille" ? " " + offre.offre_premier : ""
    ]));
    if (c.statut === "opportunite") {
      z.appendChild(el("button", { type: "button", class: "lien discret", text: "Pas pour moi", onclick: function (ev) { statut("ecartee", ev.currentTarget, true); } }));
    }
    return z;
  }

  async function statut(vers, bouton, annulable) {
    var avant = etat.c.statut;
    var r = await PG.appeler("client_changer_statut", { p_id: etat.c.id, p_statut: vers, p_date: null, p_montant: null, p_note: null }, bouton);
    if (!r) return;
    await charger(); rendre();
    if (annulable) PG.toast("Retiré de vos opportunités.", { action: "Annuler", surAction: function () { statut(avant); } });
    else PG.toast("Remis dans vos opportunités.");
  }

  function fenRepondre() {
    var c = etat.c, offre = etat.d.offre || {}, n = joursAvant(c);
    var message = el("textarea", { maxlength: "2000", placeholder: "Facultatif : vos questions, le meilleur moment pour vous joindre, un lot précis…" });
    PG.fenetre("Répondre avec Pli Gagnant", [
      el("p", { class: "rappel", text: c.acheteur + " · " + c.objet }),
      el("p", { text: "Nous rédigeons votre mémoire technique. Nous vous écrivons sous 24 h ouvrées pour récupérer le dossier ; le mémoire arrive en Word sous " + (offre.offre_delai || "72 h ouvrées") + " après réception." }),
      el("p", { class: "prix" }, [(offre.offre_prix_memoire ? "Mémoire technique : " + prix(offre.offre_prix_memoire) : "Mémoire technique sur mesure"),
        offre.offre_premier && etat.d.entreprise.formule === "veille" ? el("span", { text: offre.offre_premier }) : null]),
      n !== null && n <= 5 ? el("p", { class: "attention", text: "La date limite est " + PG.dansCombien(n) + " : envoyez-nous le dossier dès aujourd'hui à " + PG.CONTACT + "." }) : null,
      PG.champ("Un message pour nous", message)
    ], async function (f, msg, ok) {
      var r = await PG.appeler("client_demander_memoire", { p_id: c.id, p_message: message.value.trim() || null }, ok);
      if (!r) return false;
      await charger(); rendre();
      PG.toast("Demande envoyée. Nous vous écrivons sous 24 h ouvrées.", { duree: 6000 });
      var a = document.querySelector(".an-action");
      if (a) a.scrollIntoView({ block: "center" });
      return true;
    }, "Envoyer ma demande");
  }

  // ------------------------------------------------------------------ démarrage
  function erreur(texte) {
    var h = $("hello"); h.textContent = "";
    h.appendChild(el("h1", { text: "Cette page n'a pas pu s'ouvrir" }));
    h.appendChild(el("p", { class: "sous", text: texte }));
    h.appendChild(el("div", { class: "v-actions" }, [el("button", { type: "button", class: "btn petit", text: "Réessayer", onclick: function () { location.reload(); } })]));
  }
  async function demarrer() {
    if (!(await PG.exigerSession())) return;
    if (await charger()) rendre();
  }
  demarrer().catch(function (e) { erreur(PG.messageErreur(e)); });
})();
