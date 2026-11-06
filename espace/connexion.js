/* Page de connexion de l'espace client. */
(function () {
  "use strict";
  var PG = window.PG, sb = PG.client;
  var fC = document.getElementById("f-connexion"), fO = document.getElementById("f-oubli");
  var msgC = document.getElementById("msg-connexion"), msgO = document.getElementById("msg-oubli");
  var info = document.getElementById("info");
  var lienOubli = document.getElementById("vers-oubli");
  var TABLEAU = "/espace/tableau-de-bord/";

  PG.brancherAffichage(fC);
  var q = new URLSearchParams(location.search);
  if (q.get("expire")) info.textContent = "Votre session a expiré. Reconnectez-vous.";
  if (q.get("deconnecte")) info.textContent = "Vous êtes déconnecté. À bientôt.";
  if (q.get("email")) document.getElementById("email").value = q.get("email");

  // Déjà connecté : directement au tableau de bord.
  sb.auth.getSession().then(function (r) {
    if (r.data && r.data.session && !q.get("deconnecte")) location.replace(TABLEAU);
  });

  function montrer(oubli) {
    fC.hidden = oubli; lienOubli.hidden = oubli; fO.hidden = !oubli;
    var vi = document.getElementById("vers-inscription"); if (vi) vi.hidden = oubli;
    msgC.textContent = ""; msgO.textContent = ""; msgO.className = "msg"; info.textContent = "";
    document.getElementById("titre").textContent = oubli ? "Choisir un mot de passe" : "Connexion";
    var e = document.getElementById(oubli ? "email-oubli" : "email");
    var autre = document.getElementById(oubli ? "email" : "email-oubli");
    if (!e.value && autre.value) e.value = autre.value;
    e.focus();
  }
  lienOubli.addEventListener("click", function () { montrer(true); });
  document.getElementById("vers-connexion").addEventListener("click", function () { montrer(false); });

  var emailValide = function (v) { return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v); };

  fC.addEventListener("submit", async function (ev) {
    ev.preventDefault();
    var email = fC.email.value.trim().toLowerCase(), mdp = fC.password.value;
    var b = fC.querySelector("button[type=submit]");
    if (!emailValide(email)) { msgC.textContent = "Indiquez une adresse email valable."; fC.email.focus(); return; }
    if (!mdp) { msgC.textContent = "Indiquez votre mot de passe."; fC.password.focus(); return; }
    msgC.textContent = ""; PG.occupe(b, true, "Connexion…");
    try {
      var r = await sb.auth.signInWithPassword({ email: email, password: mdp });
      if (r.error) throw r.error;
      location.replace(TABLEAU);
    } catch (e) {
      msgC.textContent = PG.messageErreur(e);
      PG.occupe(b, false);
    }
  });

  fO.addEventListener("submit", async function (ev) {
    ev.preventDefault();
    var champ = document.getElementById("email-oubli");
    var email = champ.value.trim().toLowerCase();
    var b = fO.querySelector("button[type=submit]");
    if (!emailValide(email)) { msgO.className = "msg"; msgO.textContent = "Indiquez une adresse email valable."; champ.focus(); return; }
    PG.occupe(b, true, "Envoi…");
    try {
      var r = await sb.auth.resetPasswordForEmail(email, { redirectTo: PG.REDIRECTION });
      if (r.error) throw r.error;
      msgO.className = "msg ok";
      msgO.textContent = "C'est envoyé. Si un compte existe pour " + email + ", vous allez recevoir un email avec un lien pour choisir votre mot de passe. Pensez à regarder dans les indésirables.";
    } catch (e) {
      msgO.className = "msg";
      msgO.textContent = PG.messageErreur(e);
    }
    PG.occupe(b, false);
  });
})();
