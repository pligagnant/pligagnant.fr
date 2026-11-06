/* Espace client Pli Gagnant : outils communs aux pages. */
(function () {
  "use strict";
  var C = window.PG_CONFIG || {};
  var client = window.supabase.createClient(C.url, C.cle, {
    auth: { flowType: "implicit", persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, storageKey: "pg-espace" }
  });

  var CONTACT = "contact@pligagnant.fr";
  var MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
  var JOURS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];

  // Crée un élément sans jamais interpréter de HTML venu des données.
  function el(tag, attrs, enfants) {
    var n = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        var v = attrs[k];
        if (v === null || v === undefined || v === false) return;
        if (k === "class") n.className = v;
        else if (k === "text") n.textContent = v;
        else if (k.slice(0, 2) === "on" && typeof v === "function") n.addEventListener(k.slice(2), v);
        else if (v === true) n.setAttribute(k, "");
        else n.setAttribute(k, String(v));
      });
    }
    (Array.isArray(enfants) ? enfants : enfants === undefined ? [] : [enfants]).forEach(function (e) {
      if (e === null || e === undefined || e === false) return;
      n.appendChild(typeof e === "string" || typeof e === "number" ? document.createTextNode(String(e)) : e);
    });
    return n;
  }

  function vers(d) { // "AAAA-MM-JJ" -> Date locale à minuit
    if (!d) return null;
    var p = String(d).slice(0, 10).split("-");
    return new Date(+p[0], +p[1] - 1, +p[2]);
  }
  function iso(dt) {
    return dt.getFullYear() + "-" + String(dt.getMonth() + 1).padStart(2, "0") + "-" + String(dt.getDate()).padStart(2, "0");
  }
  function aujourdhuiIso() { return iso(new Date()); }
  function dateLongue(d, avecJour) {
    var x = vers(d); if (!x) return "";
    var j = x.getDate() === 1 ? "1er" : String(x.getDate());
    var s = (avecJour === false ? "" : JOURS[x.getDay()] + " ") + j + " " + MOIS[x.getMonth()];
    if (x.getFullYear() !== new Date().getFullYear()) s += " " + x.getFullYear();
    return s;
  }
  function dateCourte(d) {
    var x = vers(d); if (!x) return "";
    var abr = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
    return (x.getDate() === 1 ? "1er" : x.getDate()) + " " + abr[x.getMonth()];
  }
  function ecart(d, ref) { // jours entre ref (aujourd'hui) et d
    var a = vers(d), b = vers(ref || aujourdhuiIso());
    if (!a || !b) return null;
    return Math.round((a - b) / 86400000);
  }
  function dansCombien(n) {
    if (n === null) return "";
    if (n < -1) return "passée depuis " + (-n) + " jours";
    if (n === -1) return "passée depuis hier";
    if (n === 0) return "aujourd'hui";
    if (n === 1) return "demain";
    return "dans " + n + " jours";
  }

  function messageErreur(e) {
    var m = (e && (e.message || e.error_description || e.msg)) || String(e || "");
    var code = e && (e.code || "");
    if (/Invalid login credentials/i.test(m)) return "Email ou mot de passe incorrect.";
    if (/Email not confirmed/i.test(m)) return "Votre compte n'est pas encore activé. Ouvrez le lien reçu par email, ou cliquez sur « Mot de passe oublié » pour en recevoir un nouveau.";
    if (/rate limit|too many|429|security purposes/i.test(m)) return "Trop d'essais d'affilée. Patientez quelques minutes, puis réessayez.";
    if (/Failed to fetch|NetworkError|Load failed|network/i.test(m)) return "Connexion impossible. Vérifiez votre connexion internet, puis réessayez.";
    if (/should be different/i.test(m)) return "Choisissez un mot de passe différent de l'ancien.";
    if (/Password should be at least|password.*short/i.test(m)) return "Mot de passe trop court : 10 caractères au moins.";
    if (/weak|pwned|leaked|known to be/i.test(m)) return "Ce mot de passe est trop facile à deviner ou a déjà fuité ailleurs. Choisissez-en un autre.";
    if (/expired|invalid.*(token|otp|link)|otp_expired|Token has expired/i.test(m)) return "Ce lien n'est plus valable.";
    if (/JWT|session/i.test(m)) return "Votre session a expiré. Reconnectez-vous.";
    // Messages de nos fonctions : déjà rédigés en français pour le client.
    if (/^(P0001|P0002|22023|42501)$/.test(code) && m) return m;
    return "Une erreur est survenue. Réessayez, ou écrivez-nous à " + CONTACT + ".";
  }
  function sessionExpiree(e) {
    var m = (e && e.message) || "";
    return /JWT expired|invalid JWT|not authenticated|PGRST301|PGRST303/i.test(m + " " + ((e && e.code) || ""));
  }

  var minuteur = null;
  function toast(texte, opts) {
    opts = opts || {};
    var ancien = document.querySelector(".toast");
    if (ancien) ancien.remove();
    clearTimeout(minuteur);
    var t = el("div", { class: "toast" + (opts.erreur ? " erreur" : ""), role: opts.erreur ? "alert" : "status" }, [el("span", { text: texte })]);
    if (opts.action) {
      t.appendChild(el("button", { type: "button", text: opts.action, onclick: function () { t.remove(); opts.surAction(); } }));
    }
    document.body.appendChild(t);
    minuteur = setTimeout(function () { t.remove(); }, opts.duree || (opts.action ? 7000 : 4000));
  }

  function lireStock(cle, defaut) { try { var v = localStorage.getItem(cle); return v === null ? defaut : v; } catch (e) { return defaut; } }
  function ecrireStock(cle, v) { try { localStorage.setItem(cle, v); } catch (e) { /* stockage indisponible : sans importance */ } }
  function lireSession(cle) { try { return sessionStorage.getItem(cle); } catch (e) { return null; } }
  function ecrireSession(cle, v) { try { sessionStorage.setItem(cle, v); } catch (e) { /* idem */ } }

  // Bouton « Afficher » des champs mot de passe.
  function brancherAffichage(racine) {
    (racine || document).querySelectorAll(".mdp button").forEach(function (b) {
      b.addEventListener("click", function () {
        var i = b.parentNode.querySelector("input");
        var montrer = i.type === "password";
        i.type = montrer ? "text" : "password";
        b.textContent = montrer ? "Masquer" : "Afficher";
        b.setAttribute("aria-pressed", montrer ? "true" : "false");
      });
    });
  }

  function occupe(bouton, oui, texte) {
    if (!bouton) return;
    if (oui) { bouton.dataset.texte = bouton.textContent; bouton.textContent = texte || "Un instant…"; bouton.disabled = true; }
    else { bouton.textContent = bouton.dataset.texte || bouton.textContent; bouton.disabled = false; }
  }

  window.PG = {
    client: client, el: el, CONTACT: CONTACT,
    vers: vers, iso: iso, aujourdhuiIso: aujourdhuiIso, dateLongue: dateLongue, dateCourte: dateCourte,
    ecart: ecart, dansCombien: dansCombien,
    messageErreur: messageErreur, sessionExpiree: sessionExpiree, toast: toast,
    lireStock: lireStock, ecrireStock: ecrireStock, lireSession: lireSession, ecrireSession: ecrireSession,
    brancherAffichage: brancherAffichage, occupe: occupe,
    REDIRECTION: "https://pligagnant.fr/espace/bienvenue/"
  };
})();
