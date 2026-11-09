/* Vistro: small, dependency-free helpers. Everything here runs in the browser only. */
(function () {
  "use strict";

  // Pause decorative CSS animations while their block is off-screen (saves the visitor's battery).
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { e.target.classList.toggle("off", !e.isIntersecting); });
    }, { rootMargin: "80px" });
    document.querySelectorAll(".feature, .soon").forEach(function (el) { io.observe(el); });
  }

  // Gentle 3D tilt of the phone on devices with a real pointer.
  var stage = document.querySelector(".stage");
  var calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  if (!stage || calm || !fine) return;

  var phone = stage.querySelector(".phone");
  var visible = false, raf = 0, px = 0, py = 0;

  new IntersectionObserver(function (en) { visible = en[0].isIntersecting; }).observe(stage);

  window.addEventListener("pointermove", function (e) {
    if (!visible) return;
    px = e.clientX; py = e.clientY;
    if (raf) return;
    raf = requestAnimationFrame(function () {
      raf = 0;
      var r = stage.getBoundingClientRect();
      var nx = Math.max(-1, Math.min(1, (px - (r.left + r.width / 2)) / 600));
      var ny = Math.max(-1, Math.min(1, (py - (r.top + r.height / 2)) / 600));
      phone.style.setProperty("--ry", (nx * 14).toFixed(2) + "deg");
      phone.style.setProperty("--rx", (-ny * 10).toFixed(2) + "deg");
    });
  }, { passive: true });
})();
