/* Choix du mot de passe : lien d'invitation ou de mot de passe oublié.
   Le jeton du lien n'est utilisé qu'au moment où la personne valide le formulaire :
   les antivirus de messagerie qui ouvrent les liens à l'avance ne peuvent donc pas l'épuiser. */
(function () {
  "use strict";
  var PG = window.PG, sb = PG.client;
  var q = new URLSearchParams(location.search);
  var jeton = q.get("token_hash") || "";
  var type = q.get("type") === "invite" ? "invite" : q.get("type") === "recovery" ? "recovery" : "";
  var fM = document.getElementById("f-mdp"), fN = document.getElementById("f-nouveau");
  var msg = document.getElementById("msg-mdp");
  var verifie = false;

  PG.brancherAffichage(document);
  // Lien au format par défaut de Supabase : jetons ou erreur dans le fragment (#…).
  var frag = new URLSearchParams(location.hash.slice(1));
  if (!type && (frag.get("type") === "invite" || frag.get("type") === "recovery")) type = frag.get("type");
  if (type === "invite") {
    document.getElementById("titre").textContent = "Bienvenue dans votre espace client";
    document.getElementById("intro").textContent = "Choisissez votre mot de passe. Avec votre adresse email, il vous servira à ouvrir votre espace.";
  } else if (type === "recovery") {
    document.getElementById("titre").textContent = "Choisissez votre mot de passe";
  }

  function demanderNouveauLien(raison) {
    fM.hidden = true; fN.hidden = false;
    document.getElementById("raison-nouveau").textContent = raison;
    document.getElementById("email").focus();
  }
  var PERIME = "Ce lien n'est plus valable : il ne sert qu'une fois et expire au bout de 24 heures. Recevez-en un nouveau.";

  async function demarrer() {
    if (frag.get("error") || frag.get("error_code")) {
      history.replaceState(null, "", location.pathname);
      demanderNouveauLien(PERIME);
      return;
    }
    if (frag.get("access_token") && frag.get("refresh_token")) {
      var s = await sb.auth.setSession({ access_token: frag.get("access_token"), refresh_token: frag.get("refresh_token") });
      history.replaceState(null, "", location.pathname);
      if (s.error || !s.data || !s.data.session) { demanderNouveauLien(PERIME); return; }
      verifie = true;
      document.getElementById("identifiant").value = s.data.session.user.email || "";
      return;
    }
    var r = await sb.auth.getSession();
    var session = r.data && r.data.session;
    if (session) { verifie = !jeton; document.getElementById("identifiant").value = session.user.email || ""; }
    if (!jeton && !session) {
      demanderNouveauLien("Ce lien est incomplet. Ouvrez-le directement depuis l'email reçu, ou demandez-en un nouveau ici.");
    }
  }
  demarrer().catch(function () { demanderNouveauLien(PERIME); });

  fM.addEventListener("submit", async function (ev) {
    ev.preventDefault();
    var m1 = document.getElementById("mdp1").value, m2 = document.getElementById("mdp2").value;
    var b = fM.querySelector("button[type=submit]");
    msg.textContent = "";
    if (m1.length < 10) { msg.textContent = "Le mot de passe doit faire 10 caractères au moins."; document.getElementById("mdp1").focus(); return; }
    if (m1 !== m2) { msg.textContent = "Les deux mots de passe ne sont pas identiques."; document.getElementById("mdp2").focus(); return; }
    PG.occupe(b, true, "Enregistrement…");
    try {
      if (!verifie) {
        var v = await sb.auth.verifyOtp({ token_hash: jeton, type: type || "recovery" });
        if (v.error) {
          PG.occupe(b, false);
          demanderNouveauLien(PERIME);
          return;
        }
        verifie = true;
        // Le jeton est consommé : on l'enlève de l'adresse.
        history.replaceState(null, "", location.pathname);
      }
      var u = await sb.auth.updateUser({ password: m1 });
      if (u.error) throw u.error;
      location.replace("/espace/tableau-de-bord/?bienvenue=1");
    } catch (e) {
      msg.textContent = PG.messageErreur(e);
      PG.occupe(b, false);
    }
  });

  fN.addEventListener("submit", async function (ev) {
    ev.preventDefault();
    var champ = document.getElementById("email"), out = document.getElementById("msg-nouveau");
    var email = champ.value.trim().toLowerCase();
    var b = fN.querySelector("button[type=submit]");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { out.className = "msg"; out.textContent = "Indiquez une adresse email valable."; return; }
    PG.occupe(b, true, "Envoi…");
    try {
      var r = await sb.auth.resetPasswordForEmail(email, { redirectTo: PG.REDIRECTION });
      if (r.error) throw r.error;
      out.className = "msg ok";
      out.textContent = "C'est envoyé. Si un compte existe pour " + email + ", un nouveau lien arrive dans quelques minutes. Pensez à regarder dans les indésirables.";
    } catch (e) {
      out.className = "msg"; out.textContent = PG.messageErreur(e);
    }
    PG.occupe(b, false);
  });
})();
