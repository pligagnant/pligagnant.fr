/* Pages publiques : le menu du téléphone se referme après un clic, ou avec la touche Échap. */
(function () {
  "use strict";
  var menu = document.querySelector(".burger");
  if (!menu) return;
  menu.addEventListener("click", function (ev) { if (ev.target.closest("nav a")) menu.open = false; });
  document.addEventListener("keydown", function (ev) { if (ev.key === "Escape" && menu.open) { menu.open = false; menu.querySelector("summary").focus(); } });
  window.addEventListener("resize", function () { if (window.innerWidth > 1080) menu.open = false; });
})();
