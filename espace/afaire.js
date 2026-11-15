/* « À faire » : tout ce qui attend une action du client, calculé à partir de client_tableau.
   Sert au nombre affiché dans le menu de chaque page de l'espace, et à la page /espace/a-faire/. */
(function () {
  "use strict";
  var PG = window.PG, el = PG.el;
  var TDB = "/espace/tableau-de-bord/";

  function jour(d) { return d.aujourdhui || PG.aujourdhuiIso(); }
  function avant(d, c) { return c.date_limite ? PG.ecart(c.date_limite, jour(d)) : null; }
  function dateCourte(x) { return PG.dateCourte(x).replace(/ /g, " "); }

  // Chaque élément : texte (morceaux), bouton, lien, priorité, urgent.
  function liste(d) {
    var L = [], cs = d.consultations || [];
    function b(t) { return el("b", { text: t }); }
    function fiche(c) { return TDB + "?fiche=" + encodeURIComponent(c.id); }
    cs.forEach(function (c) {
      var n = avant(d, c);
      if (c.statut === "en_preparation" && n !== null && n < 0) {
        L.push({ p: 0, urgent: true, texte: [b(c.acheteur), " – avez-vous déposé votre offre ?"], bouton: "Répondre", lien: fiche(c) });
      } else if (c.statut === "en_preparation" && c.memoire === "livre") {
        L.push({ p: 2, urgent: n !== null && n <= 2, texte: [b(c.acheteur), " – mémoire livré, offre à déposer" + (n !== null ? " " + PG.dansCombien(n) : "")], bouton: "Voir", lien: fiche(c) });
      } else if (c.statut === "en_preparation" && n !== null && n <= 5) {
        L.push({ p: 2, urgent: n <= 2, texte: [b(c.acheteur), " – à déposer " + PG.dansCombien(n)], bouton: "Voir", lien: fiche(c) });
      } else if (c.statut === "opportunite" && c.avis === "tenter" && n !== null && n >= 0 && n <= 7) {
        L.push({ p: 4, urgent: n <= 2, texte: [b(c.acheteur), " – date limite " + PG.dansCombien(n)], bouton: "Voir l'annonce", lien: "/espace/annonce/?id=" + encodeURIComponent(c.id) });
      } else if (c.statut === "depose" && c.date_depot && PG.ecart(jour(d), c.date_depot) >= 30) {
        L.push({ p: 5, texte: [b(c.acheteur), " – résultat reçu ?"], bouton: "Indiquer", lien: fiche(c) });
      }
    });
    (d.pieces_alertes || []).forEach(function (p) {
      L.push({ p: 3, urgent: !!p.expiree, texte: [b(p.nom), p.expiree ? " – expirée" : " – expire le " + dateCourte(p.date_fin)],
               bouton: "Mettre à jour", lien: "/espace/entreprise/#pieces" });
    });
    var QN = window.PG_QUESTIONNAIRE;
    if (QN) {
      var qs = QN.liste(d).filter(function (q) { return !q.envoye; });
      qs.filter(function (q) { return q.marche; }).forEach(function (q) {
        var n = q.dateLimite ? PG.ecart(q.dateLimite, jour(d)) : null;
        L.push({ p: 1, urgent: n !== null && n <= 7, texte: [b(q.titre), " – questionnaire pour votre mémoire"], bouton: q.nbRep ? "Continuer" : "Y répondre", lien: q.lien });
      });
      var mem = qs.filter(function (q) { return q.groupe === "memoire" && !q.marche; });
      if (mem.length) L.push({ p: 6, texte: [b(PG.pluriel(mem.length, "questionnaire", "questionnaires")), " pour vos mémoires"], bouton: "Y répondre", lien: "/espace/entreprise/#questionnaire" });
      var vei = qs.filter(function (q) { return q.groupe === "veille"; });
      if (vei.length) L.push({ p: 8, texte: [b(PG.pluriel(vei.length, "questionnaire", "questionnaires")), " pour votre veille"], bouton: "Y répondre", lien: "/espace/entreprise/#questionnaire" });
    }
    var e = d.entreprise || {};
    if (e.veille_active && e.profil_rempli === false) {
      L.push({ p: 7, texte: [b("Profil de l'entreprise"), " – à compléter"], bouton: "Compléter", lien: "/espace/entreprise/#profil" });
    }
    return L.sort(function (a, b) { return a.p - b.p || (b.urgent ? 1 : 0) - (a.urgent ? 1 : 0); });
  }

  // Nombre dans le menu.
  function badge(d) {
    var n = d ? liste(d).length : 0, s = document.getElementById("n-afaire"), l = document.getElementById("l-afaire");
    if (!s || !l) return n;
    s.textContent = n > 99 ? "99+" : String(n);
    s.hidden = !n;
    l.setAttribute("aria-label", n ? "À faire : " + n : "À faire");
    return n;
  }
  var dernier = null;
  async function rafraichir() {
    var r = await PG.appeler("client_tableau", { p_visite: false }, null, true);
    if (r && r !== true) { dernier = r; badge(r); }
    return dernier;
  }

  // Page « À faire ».
  function rendrePage(d) {
    var L = liste(d), h = document.getElementById("hello"), c = document.getElementById("panneau");
    document.getElementById("qui").textContent = d.entreprise.nom;
    h.textContent = ""; c.textContent = "";
    h.appendChild(el("h1", { text: "À faire" }));
    h.appendChild(el("p", { class: "sous", text: L.length ? PG.pluriel(L.length, "chose", "choses") + " à faire" : "Rien à faire pour le moment." }));
    if (!L.length) {
      c.appendChild(el("div", { class: "vide" }, [el("h3", { text: "Tout est à jour" }),
        el("p", {}, [el("a", { href: TDB + "#opportunites", text: "Voir vos opportunités" })])]));
    } else {
      var ul = el("ul", { class: "af-liste" });
      L.forEach(function (it) {
        ul.appendChild(el("li", {}, [el("a", { class: "af" + (it.urgent ? " af-urgent" : ""), href: it.lien }, [
          el("span", { class: "af-txt" }, it.texte), el("span", { class: "af-go" }, [el("span", { class: "mot", text: it.bouton })])
        ])]));
      });
      c.appendChild(ul);
    }
    document.getElementById("corps").hidden = false;
  }

  window.PG_AFAIRE = { liste: liste, badge: badge, rafraichir: rafraichir, rendrePage: rendrePage };

  if (document.getElementById("page-afaire")) {
    (async function () {
      if (!(await PG.exigerSession())) return;
      var r = await PG.client.rpc("client_tableau", { p_visite: false });
      if (r.error) {
        if (PG.sessionExpiree(r.error)) { location.replace("/espace/?expire=1"); return; }
        var h = document.getElementById("hello"); h.textContent = "";
        h.appendChild(el("h1", { text: "Cette page n'a pas pu s'ouvrir" }));
        h.appendChild(el("p", { class: "sous", text: PG.messageErreur(r.error) }));
        return;
      }
      if (!r.data) { location.replace("/espace/tableau-de-bord/"); return; }
      badge(r.data);
      rendrePage(r.data);
    })().catch(function (e) { PG.toast(PG.messageErreur(e), { erreur: true }); });
  }
})();
