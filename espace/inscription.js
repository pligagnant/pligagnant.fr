/* Page « Créer un compte » : compte gratuit avec la veille des appels d'offres. */
(function () {
  "use strict";
  var C = window.PG_CONFIG || {};
  var URL_FONCTION = C.url + "/functions/v1/inscription";
  var MAX_DEP = 5;
  var debut = Date.now();
  var $ = function (id) { return document.getElementById(id); };

  var DEPARTEMENTS = [
    ["01", "Ain"], ["02", "Aisne"], ["03", "Allier"], ["04", "Alpes-de-Haute-Provence"], ["05", "Hautes-Alpes"],
    ["06", "Alpes-Maritimes"], ["07", "Ardèche"], ["08", "Ardennes"], ["09", "Ariège"], ["10", "Aube"], ["11", "Aude"],
    ["12", "Aveyron"], ["13", "Bouches-du-Rhône"], ["14", "Calvados"], ["15", "Cantal"], ["16", "Charente"],
    ["17", "Charente-Maritime"], ["18", "Cher"], ["19", "Corrèze"], ["2A", "Corse-du-Sud"], ["2B", "Haute-Corse"],
    ["21", "Côte-d'Or"], ["22", "Côtes-d'Armor"], ["23", "Creuse"], ["24", "Dordogne"], ["25", "Doubs"], ["26", "Drôme"],
    ["27", "Eure"], ["28", "Eure-et-Loir"], ["29", "Finistère"], ["30", "Gard"], ["31", "Haute-Garonne"], ["32", "Gers"],
    ["33", "Gironde"], ["34", "Hérault"], ["35", "Ille-et-Vilaine"], ["36", "Indre"], ["37", "Indre-et-Loire"], ["38", "Isère"],
    ["39", "Jura"], ["40", "Landes"], ["41", "Loir-et-Cher"], ["42", "Loire"], ["43", "Haute-Loire"], ["44", "Loire-Atlantique"],
    ["45", "Loiret"], ["46", "Lot"], ["47", "Lot-et-Garonne"], ["48", "Lozère"], ["49", "Maine-et-Loire"], ["50", "Manche"],
    ["51", "Marne"], ["52", "Haute-Marne"], ["53", "Mayenne"], ["54", "Meurthe-et-Moselle"], ["55", "Meuse"], ["56", "Morbihan"],
    ["57", "Moselle"], ["58", "Nièvre"], ["59", "Nord"], ["60", "Oise"], ["61", "Orne"], ["62", "Pas-de-Calais"],
    ["63", "Puy-de-Dôme"], ["64", "Pyrénées-Atlantiques"], ["65", "Hautes-Pyrénées"], ["66", "Pyrénées-Orientales"],
    ["67", "Bas-Rhin"], ["68", "Haut-Rhin"], ["69", "Rhône"], ["70", "Haute-Saône"], ["71", "Saône-et-Loire"], ["72", "Sarthe"],
    ["73", "Savoie"], ["74", "Haute-Savoie"], ["75", "Paris"], ["76", "Seine-Maritime"], ["77", "Seine-et-Marne"],
    ["78", "Yvelines"], ["79", "Deux-Sèvres"], ["80", "Somme"], ["81", "Tarn"], ["82", "Tarn-et-Garonne"], ["83", "Var"],
    ["84", "Vaucluse"], ["85", "Vendée"], ["86", "Vienne"], ["87", "Haute-Vienne"], ["88", "Vosges"], ["89", "Yonne"],
    ["90", "Territoire de Belfort"], ["91", "Essonne"], ["92", "Hauts-de-Seine"], ["93", "Seine-Saint-Denis"],
    ["94", "Val-de-Marne"], ["95", "Val-d'Oise"], ["971", "Guadeloupe"], ["972", "Martinique"], ["973", "Guyane"],
    ["974", "La Réunion"], ["976", "Mayotte"]
  ];
  function plat(s) { return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[-'’\s]+/g, " ").trim(); }
  var INDEX = DEPARTEMENTS.map(function (d) { return { code: d[0], nom: d[1], cle: plat(d[1]) }; });

  function li(texte, attrs) {
    var n = document.createElement("li");
    if (attrs) Object.keys(attrs).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    if (texte) n.textContent = texte;
    return n;
  }

  // ----------------------------------------------------------------- métier
  var metier = $("metier"), autre = $("metier-autre"), champAutre = $("champ-autre");
  metier.addEventListener("change", function () {
    champAutre.hidden = metier.value !== "autre";
    if (!champAutre.hidden) autre.focus();
  });

  // ----------------------------------------------------------------- départements
  var choisis = [];
  var saisie = $("dep-saisie"), liste = $("dep-liste"), puces = $("dep-choisis"), aide = $("dep-aide");
  var actif = -1, resultats = [];

  function chercher(q) {
    var p = plat(q);
    if (!p) return [];
    var num = q.trim().toUpperCase().replace(/\s+/g, "");
    var out = INDEX.filter(function (d) {
      if (choisis.indexOf(d.code) >= 0) return false;
      return d.code.indexOf(num) === 0 || d.cle.indexOf(p) === 0 || d.cle.indexOf(" " + p) >= 0;
    });
    out.sort(function (a, b) {
      var ea = a.code === num || a.cle === p ? 0 : 1, eb = b.code === num || b.cle === p ? 0 : 1;
      return ea - eb;
    });
    return out.slice(0, 7);
  }
  function fermerListe() {
    liste.hidden = true; liste.textContent = ""; resultats = []; actif = -1;
    saisie.setAttribute("aria-expanded", "false"); saisie.removeAttribute("aria-activedescendant");
  }
  function montrerListe() {
    resultats = chercher(saisie.value);
    if (actif >= resultats.length) actif = resultats.length - 1;
    liste.textContent = "";
    if (!resultats.length) {
      if (plat(saisie.value)) { liste.appendChild(li("Aucun département ne correspond.", { class: "aucun" })); liste.hidden = false; }
      else fermerListe();
      return;
    }
    resultats.forEach(function (d, i) {
      var o = li(null, { role: "option", id: "dep-o-" + i, "aria-selected": i === actif ? "true" : "false" });
      var code = document.createElement("b"); code.textContent = d.code;
      o.appendChild(code); o.appendChild(document.createTextNode(" " + d.nom));
      o.addEventListener("mousedown", function (ev) { ev.preventDefault(); ajouter(d.code); });
      liste.appendChild(o);
    });
    liste.hidden = false;
    saisie.setAttribute("aria-expanded", "true");
    if (actif >= 0) saisie.setAttribute("aria-activedescendant", "dep-o-" + actif); else saisie.removeAttribute("aria-activedescendant");
  }
  function ajouter(code, sansFocus) {
    if (choisis.indexOf(code) >= 0) return;
    if (choisis.length >= MAX_DEP) { aide.textContent = "5 départements au plus. Retirez-en un pour en ajouter un autre."; aide.className = "attention-txt"; return; }
    choisis.push(code);
    saisie.value = ""; fermerListe(); dessinerPuces(); if (!sansFocus) saisie.focus();
  }
  function retirer(code) {
    choisis = choisis.filter(function (c) { return c !== code; });
    dessinerPuces(); saisie.focus();
  }
  function dessinerPuces() {
    puces.textContent = "";
    choisis.forEach(function (code) {
      var d = INDEX.filter(function (x) { return x.code === code; })[0];
      var p = li(null);
      p.appendChild(document.createTextNode(d.code + " · " + d.nom));
      var b = document.createElement("button");
      b.type = "button"; b.textContent = "×"; b.setAttribute("aria-label", "Retirer " + d.nom);
      b.addEventListener("click", function () { retirer(code); });
      p.appendChild(b);
      puces.appendChild(p);
    });
    puces.hidden = !choisis.length;
    saisie.disabled = choisis.length >= MAX_DEP;
    saisie.placeholder = choisis.length >= MAX_DEP ? "5 départements choisis" : choisis.length ? "Ajouter un département voisin" : "Tapez un numéro ou un nom : 68, Gironde…";
    aide.className = ""; aide.textContent = "Jusqu'à 5 départements : là où vous travaillez.";
  }
  saisie.addEventListener("input", function () { actif = 0; montrerListe(); });
  saisie.addEventListener("keydown", function (ev) {
    if (ev.key === "ArrowDown" || ev.key === "ArrowUp") {
      if (!resultats.length) return;
      ev.preventDefault();
      actif = (actif + (ev.key === "ArrowDown" ? 1 : resultats.length - 1)) % resultats.length;
      montrerListe();
    } else if (ev.key === "Enter") {
      if (resultats.length) { ev.preventDefault(); ajouter(resultats[Math.max(actif, 0)].code); }
      else if (plat(saisie.value)) ev.preventDefault();
    } else if (ev.key === "Escape") {
      fermerListe();
    } else if (ev.key === "Backspace" && !saisie.value && choisis.length) {
      retirer(choisis[choisis.length - 1]);
    }
  });
  saisie.addEventListener("blur", function () { setTimeout(fermerListe, 120); });
  dessinerPuces();

  // ----------------------------------------------------------------- envoi
  var form = $("f-inscription"), msg = $("msg");
  var emailValide = function (v) { return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v); };
  function erreur(texte, champ) { msg.textContent = texte; if (champ) champ.focus(); return false; }

  form.addEventListener("submit", async function (ev) {
    ev.preventDefault();
    msg.textContent = "";
    var nom = $("nom").value.trim(), ent = $("entreprise").value.trim(), email = $("email").value.trim().toLowerCase();
    var m = metier.value === "autre" ? autre.value.trim() : metier.value;
    if (!nom) return erreur("Indiquez votre prénom et votre nom.", $("nom"));
    if (ent.length < 2) return erreur("Indiquez le nom de votre entreprise.", $("entreprise"));
    if (!emailValide(email)) return erreur("Indiquez une adresse email valable.", $("email"));
    if (!metier.value) return erreur("Choisissez votre métier.", metier);
    if (m.length < 3) return erreur("Précisez votre métier.", autre);
    if (!choisis.length) {
      // Un seul département tapé sans être validé : on le prend.
      var r = chercher(saisie.value);
      if (r.length === 1 || (r.length && (r[0].code === saisie.value.trim().toUpperCase() || r[0].cle === plat(saisie.value)))) ajouter(r[0].code);
    }
    if (!choisis.length) return erreur("Choisissez au moins un département.", saisie);

    var b = form.querySelector("button[type=submit]");
    b.disabled = true; b.dataset.texte = b.textContent; b.textContent = "Création de votre compte…";
    try {
      var rep = await fetch(URL_FONCTION, {
        method: "POST",
        headers: { "Content-Type": "application/json", "apikey": C.cle, "Authorization": "Bearer " + C.cle },
        body: JSON.stringify({ nom: nom, entreprise: ent, email: email, metier: m, departements: choisis,
                               ville: $("ville").value.trim() || null, site_web: $("site_web").value, duree: Date.now() - debut })
      });
      var data = {};
      try { data = await rep.json(); } catch (e) { /* réponse vide */ }
      if (!rep.ok || !data.ok) throw new Error(data.message || "");
      $("envoye-texte").textContent = "C'est presque fini ! Nous venons d'envoyer un email à " + email + " pour confirmer votre adresse.";
      form.hidden = true;
      $("envoye").hidden = false;
      $("titre").textContent = "Vérifiez votre boîte mail";
      document.querySelector("#carte .kicker").textContent = "Compte créé";
      document.querySelector("#carte > .intro").hidden = true;
      $("envoye").focus();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      var t = e && e.message;
      msg.textContent = t && !/fetch|network|load failed/i.test(t) ? t
        : "Connexion impossible. Vérifiez votre connexion internet, puis réessayez.";
    }
    b.disabled = false; b.textContent = b.dataset.texte;
  });

  $("recommencer").addEventListener("click", function () {
    $("envoye").hidden = true; form.hidden = false;
    $("titre").textContent = "Créer mon compte";
    document.querySelector("#carte .kicker").textContent = "Gratuit, sans engagement";
    document.querySelector("#carte > .intro").hidden = false;
    debut = Date.now() - 3000;
    $("email").focus(); $("email").select();
  });

  // Pré-remplissage depuis le formulaire de la page d'accueil (?entreprise=…&metier=…&departements=…).
  var q = new URLSearchParams(location.search);
  if (q.get("entreprise")) $("entreprise").value = q.get("entreprise").slice(0, 200);
  if (q.get("email")) $("email").value = q.get("email").slice(0, 200);
  if (q.get("metier")) {
    var mq = plat(q.get("metier")), trouve = false;
    Array.prototype.forEach.call(metier.options, function (o) {
      if (!trouve && o.value && o.value !== "autre" && (plat(o.value).indexOf(mq) >= 0 || mq.indexOf(plat(o.value)) >= 0)) { metier.value = o.value; trouve = true; }
    });
    if (!trouve) { metier.value = "autre"; champAutre.hidden = false; autre.value = q.get("metier").slice(0, 80); }
  }
  if (q.get("departements")) {
    q.get("departements").split(/[,;\/]+|\s+et\s+/).forEach(function (x) {
      var r = chercher(x.trim());
      if (r.length && (r[0].code === x.trim().toUpperCase() || r[0].cle === plat(x))) ajouter(r[0].code, true);
      else if (r.length === 1) ajouter(r[0].code, true);
    });
  }
})();
