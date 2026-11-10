/* Page « Créer un compte » : compte gratuit avec la veille des appels d'offres. */
(function () {
  "use strict";
  var C = window.PG_CONFIG || {};
  var URL_FONCTION = C.url + "/functions/v1/inscription";
  var MAX_DEP = 5;
  var debut = Date.now();
  var $ = function (id) { return document.getElementById(id); };

  var D = window.PGDepartements, plat = D.plat;

  // ----------------------------------------------------------------- métier
  var metier = $("metier"), autre = $("metier-autre"), champAutre = $("champ-autre");
  metier.addEventListener("change", function () {
    champAutre.hidden = metier.value !== "autre";
    if (!champAutre.hidden) autre.focus();
  });

  // ----------------------------------------------------------------- départements
  var saisie = $("dep-saisie");
  var deps = D.creer({ saisie: saisie, liste: $("dep-liste"), puces: $("dep-choisis"), aide: $("dep-aide"), max: MAX_DEP });

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
    deps.completer();
    var choisis = deps.valeurs();
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
      var r = D.chercher(x.trim(), deps.valeurs());
      if (r.length && (r[0].code === x.trim().toUpperCase() || r[0].cle === plat(x))) deps.ajouter(r[0].code, true);
      else if (r.length === 1) deps.ajouter(r[0].code, true);
    });
  }
})();
