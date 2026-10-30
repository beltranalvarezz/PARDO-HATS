/* ===== PardoHT · páginas legales ===== */
document.querySelector("#anio").textContent = new Date().getFullYear();

// "Configurar cookies": borra la decisión guardada y vuelve a la tienda, donde se muestra el aviso otra vez
document.querySelector("#configCookies")?.addEventListener("click", () => {
  try { localStorage.removeItem("pardoht-cookies"); } catch (e) { /* sin almacenamiento */ }
  location.href = "index.html";
});
