/* Page d'un questionnaire à remplir (/espace/questionnaire/?q=<thème> ou ?m=<appel d'offres>) : enregistrer, puis envoyer. */
(function () {
  "use strict";
  var PG = window.PG, el = PG.el, QN = window.PG_QUESTIONNAIRE;
  var $ = function (id) { return document.getElementById(id); };
  var RETOUR = "/espace/entreprise/#questionnaire";
  var etat = { d: null, q: null, modifie: false, saisie: {} };

  function champ(q, valeurs) {
    var id = "q-" + q[0];
    var t = el("textarea", { id: id, maxlength: "4000", rows: "3", "data-q": q[0] });
    t.value = valeurs[q[0]] || "";
    return el("div", { class: "champ" }, [el("label", { for: id, text: q[1] }), t, q[2] ? el("small", { text: q[2] }) : null]);
  }
  function lire(racine) {
    var o = {};
    racine.querySelectorAll("textarea[data-q]").forEach(function (t) { o[t.dataset.q] = t.value.trim(); });
    return o;
  }
  function nonVides(o) { return Object.keys(o).filter(function (k) { return o[k]; }).length; }

  function trouver(d) {
    var p = new URLSearchParams(location.search), q = p.get("q"), m = p.get("m");
    return QN.liste(d).filter(function (x) { return m ? x.marche && x.marche.id === m : x.id === q && !x.marche; })[0] || null;
  }
  function valeurs(q) {
    return q.marche ? ((q.marche.questions || {}).rep || {}) : (etat.d.questionnaire || {});
  }

  // ------------------------------------------------------------------ rendu
  function rendre() {
    var d = etat.d, q = etat.q = trouver(d);
    $("qui").textContent = d.entreprise.nom; $("qui").title = d.moi.email;
    var h = $("hello"); h.textContent = "";
    var c = $("panneau"); c.textContent = "";
    h.appendChild(el("a", { class: "retour", href: RETOUR, text: "‹ Questionnaires" }));
    if (!q) {
      h.appendChild(el("h1", { text: "Ce questionnaire n'est plus ouvert" }));
      h.appendChild(el("p", { class: "sous", text: "Le mémoire a peut-être déjà été livré. Retrouvez vos questionnaires dans Mon entreprise." }));
      $("corps").hidden = true;
      return;
    }
    document.title = q.titre + " · Pli Gagnant";
    h.appendChild(el("h1", { text: q.titre }));
    if (q.sous) h.appendChild(el("p", { class: "sous", text: q.sous + (q.dateLimite ? " · à remettre le " + PG.dateLongue(q.dateLimite, false) : "") }));
    h.appendChild(el("p", { class: "q-meta", id: "q-etat" }, [PG.pluriel(q.questions.length, "question", "questions") + " · ", el("span", { class: "q-etat q-" + QN.etatDe(q), text: QN.texteEtat(q) })]));
    h.appendChild(el("p", { class: "q-conseil", text: "Répondez comme au téléphone, sans faire de phrases. « Je ne sais pas » est une réponse." }));

    var f = el("form", { class: "q-form", novalidate: true, id: "q-form" });
    var vals = Object.assign({}, valeurs(q), etat.saisie);
    if (q.volet) {
      var choix = el("select", { id: "q-volet" }, Object.keys(QN.B).map(function (k) { return el("option", { value: k, text: QN.B[k].nom }); }));
      choix.value = q.volet;
      var corps = el("div");
      var remplir = function () { corps.textContent = ""; QN.B[choix.value].q.forEach(function (x) { corps.appendChild(champ(x, vals)); }); };
      choix.addEventListener("change", function () { Object.assign(vals, lire(corps)); Object.assign(etat.saisie, lire(corps)); remplir(); });
      remplir();
      f.appendChild(el("div", { class: "champ" }, [el("label", { for: "q-volet", text: "Questions adaptées à" }), choix]));
      f.appendChild(corps);
    } else if (q.sup) {
      f.appendChild(el("h2", { text: "Nos questions sur ce dossier" }));
      q.questions.slice(0, q.sup).forEach(function (x) { f.appendChild(champ(x, vals)); });
      f.appendChild(el("h2", { text: "Pour tout marché" }));
      q.questions.slice(q.sup).forEach(function (x) { f.appendChild(champ(x, vals)); });
    } else {
      q.questions.forEach(function (x) { f.appendChild(champ(x, vals)); });
    }

    var msg = el("p", { class: "msg", role: "alert" });
    var envoyer = el("button", { type: "submit", class: "btn", text: q.envoye ? "Envoyer les modifications" : "Envoyer" });
    var garder = q.envoye ? null : el("button", { type: "button", class: "btn blanc", text: "Enregistrer", onclick: function () { sauver(false, garder, msg); } });
    f.appendChild(el("div", { class: "q-bas" }, [envoyer, garder, msg]));
    f.addEventListener("input", function () { etat.modifie = true; });
    f.addEventListener("submit", function (ev) { ev.preventDefault(); sauver(true, envoyer, msg); });
    c.appendChild(f);
    $("corps").hidden = false;
  }

  async function sauver(envoi, bouton, msg) {
    var q = etat.q, f = $("q-form");
    msg.textContent = "";
    var rep = Object.assign({}, etat.saisie, lire(f));
    if (envoi && !nonVides(rep)) { msg.textContent = "Répondez au moins à une question avant d'envoyer."; return; }
    var r;
    if (q.marche) {
      r = await PG.appeler("client_questionnaire_marche", { p_id: q.marche.id, p: rep, p_envoyer: envoi }, bouton);
      if (!r) return;
      etat.d.marches.forEach(function (m) { if (m.id === q.marche.id) m.questions = r; });
    } else {
      r = await PG.appeler("client_questionnaire_envoyer", { p_id: q.id, p: rep, p_envoyer: envoi }, bouton);
      if (!r) return;
      etat.d.questionnaire = r.questionnaire; etat.d.questionnaires_etat = r.etat;
    }
    etat.modifie = false; etat.saisie = {};
    if (window.PG_AFAIRE) window.PG_AFAIRE.rafraichir();
    if (!envoi) {
      etat.q = trouver(etat.d);
      var e = $("q-etat");
      e.textContent = "";
      e.append(PG.pluriel(etat.q.questions.length, "question", "questions") + " · ", el("span", { class: "q-etat q-" + QN.etatDe(etat.q), text: QN.texteEtat(etat.q) }));
      PG.toast("Enregistré. Vous pouvez revenir plus tard.");
      return;
    }
    merci(q);
  }

  // Après l'envoi : remerciement, puis le questionnaire suivant à remplir.
  function merci(q) {
    var c = $("panneau"); c.textContent = "";
    var suivant = QN.liste(etat.d).filter(function (x) { return x.groupe === q.groupe && !x.envoye && x.id !== q.id; })[0];
    c.appendChild(el("div", { class: "q-merci", tabindex: "-1", id: "q-merci" }, [
      el("h2", { text: "Merci, c'est envoyé." }),
      el("p", { text: q.groupe === "veille" ? "Nous en tenons compte dès la prochaine sélection d'appels d'offres." : "Nous reprenons vos réponses dans votre mémoire." }),
      suivant ? el("p", { class: "suivant", text: "Questionnaire suivant : " + suivant.titre }) : null,
      el("div", { class: "v-actions" }, [
        suivant ? el("a", { class: "btn", href: suivant.lien, text: "Y répondre" }) : null,
        el("a", { class: suivant ? "lien" : "btn", href: RETOUR, text: "Retour aux questionnaires" })
      ])
    ]));
    var e = $("q-etat");
    e.textContent = "";
    e.append(PG.pluriel(q.questions.length, "question", "questions") + " · ", el("span", { class: "q-etat q-envoye", text: "Envoyé" }));
    $("q-merci").focus();
    window.scrollTo(0, 0);
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
    window.addEventListener("beforeunload", function (ev) { if (etat.modifie) { ev.preventDefault(); ev.returnValue = ""; } });
    if (window.PG_AFAIRE) window.PG_AFAIRE.rafraichir();
    var r = await PG.client.rpc("client_entreprise");
    if (r.error) {
      if (PG.sessionExpiree(r.error)) { location.replace("/espace/?expire=1"); return; }
      erreur(PG.messageErreur(r.error)); return;
    }
    etat.d = r.data;
    rendre();
  }
  demarrer().catch(function (e) { erreur(PG.messageErreur(e)); });
})();
