/* Choix de départements avec suggestions (page « Créer un compte » et réglages de la veille). */
(function () {
  "use strict";
  var LISTE = [
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
  function plat(s) { return String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[-'’\s]+/g, " ").trim(); }
  var INDEX = LISTE.map(function (d) { return { code: d[0], nom: d[1], cle: plat(d[1]) }; });
  var compteur = 0;

  function chercher(q, exclus) {
    var p = plat(q);
    if (!p) return [];
    var num = String(q).trim().toUpperCase().replace(/\s+/g, "");
    var out = INDEX.filter(function (d) {
      if (exclus && exclus.indexOf(d.code) >= 0) return false;
      return d.code.indexOf(num) === 0 || d.cle.indexOf(p) === 0 || d.cle.indexOf(" " + p) >= 0;
    });
    out.sort(function (a, b) {
      var ea = a.code === num || a.cle === p ? 0 : 1, eb = b.code === num || b.cle === p ? 0 : 1;
      return ea - eb;
    });
    return out.slice(0, 7);
  }
  function nom(code) { var d = INDEX.filter(function (x) { return x.code === code; })[0]; return d ? d.nom : code; }

  // Crée le sélecteur dans les éléments donnés : saisie (input), liste (ul), puces (ul), aide (small).
  function creer(o) {
    var max = o.max || 5, choisis = (o.valeurs || []).slice(0, max);
    var saisie = o.saisie, liste = o.liste, puces = o.puces, aide = o.aide;
    var aideTexte = aide ? aide.textContent : "";
    var actif = 0, resultats = [];
    var prefixe = "dep-" + (++compteur) + "-";
    function li(texte, attrs) {
      var n = document.createElement("li");
      if (attrs) Object.keys(attrs).forEach(function (k) { n.setAttribute(k, attrs[k]); });
      if (texte) n.textContent = texte;
      return n;
    }
    function fermer() {
      liste.hidden = true; liste.textContent = ""; resultats = []; actif = 0;
      saisie.setAttribute("aria-expanded", "false"); saisie.removeAttribute("aria-activedescendant");
    }
    function montrer() {
      resultats = chercher(saisie.value, choisis);
      if (actif >= resultats.length) actif = resultats.length - 1;
      liste.textContent = "";
      if (!resultats.length) {
        if (plat(saisie.value)) { liste.appendChild(li("Aucun département ne correspond.", { class: "aucun" })); liste.hidden = false; }
        else fermer();
        return;
      }
      resultats.forEach(function (d, i) {
        var opt = li(null, { role: "option", id: prefixe + i, "aria-selected": i === actif ? "true" : "false" });
        var b = document.createElement("b"); b.textContent = d.code;
        opt.appendChild(b); opt.appendChild(document.createTextNode(" " + d.nom));
        opt.addEventListener("mousedown", function (ev) { ev.preventDefault(); ajouter(d.code); });
        liste.appendChild(opt);
      });
      liste.hidden = false;
      saisie.setAttribute("aria-expanded", "true");
      if (actif >= 0) saisie.setAttribute("aria-activedescendant", prefixe + actif);
    }
    function ajouter(code, sansFocus) {
      if (choisis.indexOf(code) >= 0) return;
      if (choisis.length >= max) {
        if (aide) { aide.textContent = max + " départements au plus. Retirez-en un pour en ajouter un autre."; aide.className = "attention-txt"; }
        return;
      }
      choisis.push(code);
      saisie.value = ""; fermer(); dessiner(); if (!sansFocus) saisie.focus();
      if (o.surChangement) o.surChangement(choisis.slice());
    }
    function retirer(code) {
      choisis = choisis.filter(function (c) { return c !== code; });
      dessiner(); saisie.focus();
      if (o.surChangement) o.surChangement(choisis.slice());
    }
    function dessiner() {
      puces.textContent = "";
      choisis.forEach(function (code) {
        var p = li(null);
        p.appendChild(document.createTextNode(code + " · " + nom(code)));
        var b = document.createElement("button");
        b.type = "button"; b.textContent = "×"; b.setAttribute("aria-label", "Retirer " + nom(code));
        b.addEventListener("click", function () { retirer(code); });
        p.appendChild(b);
        puces.appendChild(p);
      });
      puces.hidden = !choisis.length;
      saisie.disabled = choisis.length >= max;
      saisie.placeholder = choisis.length >= max ? max + " départements choisis"
        : choisis.length ? "Ajouter un département voisin" : "Tapez un numéro ou un nom : 68, Gironde…";
      if (aide) { aide.className = ""; aide.textContent = aideTexte; }
    }
    saisie.setAttribute("role", "combobox");
    saisie.setAttribute("aria-expanded", "false");
    saisie.setAttribute("aria-autocomplete", "list");
    if (liste.id) saisie.setAttribute("aria-controls", liste.id);
    saisie.addEventListener("input", function () { actif = 0; montrer(); });
    saisie.addEventListener("keydown", function (ev) {
      if (ev.key === "ArrowDown" || ev.key === "ArrowUp") {
        if (!resultats.length) return;
        ev.preventDefault();
        actif = (actif + (ev.key === "ArrowDown" ? 1 : resultats.length - 1)) % resultats.length;
        montrer();
      } else if (ev.key === "Enter") {
        if (resultats.length) { ev.preventDefault(); ajouter(resultats[Math.max(actif, 0)].code); }
        else if (plat(saisie.value)) ev.preventDefault();
      } else if (ev.key === "Escape") {
        if (!liste.hidden) { ev.preventDefault(); ev.stopPropagation(); fermer(); }
      } else if (ev.key === "Backspace" && !saisie.value && choisis.length) {
        retirer(choisis[choisis.length - 1]);
      }
    });
    saisie.addEventListener("blur", function () { setTimeout(fermer, 120); });
    dessiner();
    return {
      valeurs: function () { return choisis.slice(); },
      ajouter: ajouter,
      // Un département tapé mais pas validé : on le prend s'il n'y a pas de doute.
      completer: function () {
        if (!plat(saisie.value)) return;
        var r = chercher(saisie.value, choisis);
        if (r.length === 1 || (r.length && (r[0].code === saisie.value.trim().toUpperCase() || r[0].cle === plat(saisie.value)))) ajouter(r[0].code, true);
      }
    };
  }

  window.PGDepartements = { LISTE: LISTE, plat: plat, chercher: chercher, nom: nom, creer: creer };
})();
