/* ===== PardoHT ===== */

// Fecha del próximo drop (cuenta atrás)
const FECHA_DROP = new Date("2026-11-20T20:00:00");

// Nombre del modelo: provisional hasta que la marca lo decida (se cambia solo aquí)
const NOMBRE_MODELO = "GORRA PARDOHT";

// Un modelo en dos colores. Cada color es una referencia del carrito.
// hex = pelo del frontal; el resto de colores los usa la gorra 3D (sacados de las fotos reales).
const PRODUCTOS = [
  {
    id: "rosa", nombre: NOMBRE_MODELO, color: "Rosa", precio: 34.99, logo: "blanco",
    hex: "#c38f86", rejilla: "#f2a9c7", forro: "#f3b4c9", cinta: "#f1a7c3", tinta: "#1a1a1a", hilo: "#fff1f5",
    fotos: ["rosa-1", "rosa-2", "rosa-3", "rosa-4"],
  },
  {
    id: "negro", nombre: NOMBRE_MODELO, color: "Negro", precio: 34.99, logo: "blanco",
    hex: "#1a1a1c", rejilla: "#1c1c1e", forro: "#1e1e20", cinta: "#151515", tinta: "#f2f2f2", hilo: "#f2f2f2",
    fotos: ["negro-1", "negro-2", "negro-3", "negro-4"],
  },
];

const $ = (s) => document.querySelector(s);
const euros = (n) => n.toFixed(2).replace(".", ",") + " €";
const porId = (id) => PRODUCTOS.find((p) => p.id === id);

let colorActivo = "rosa";

/* ---------- Gorra dibujada (respaldo si no hay 3D) ---------- */
function mezcla(hex, con, cuanto) {
  const a = parseInt(hex.slice(1), 16), b = parseInt(con.slice(1), 16);
  const c = (x, y) => Math.round(x + (y - x) * cuanto);
  const r = c(a >> 16, b >> 16), g = c((a >> 8) & 255, (b >> 8) & 255), bl = c(a & 255, b & 255);
  return "#" + ((1 << 24) | (r << 16) | (g << 8) | bl).toString(16).slice(1);
}

let svgId = 0;
function gorraSVG(p) {
  const i = ++svgId;
  const claro = mezcla(p.hex, "#ffffff", .38), oscuro = mezcla(p.hex, "#000000", .5), sombra = mezcla(p.hex, "#000000", .7);
  return `
  <svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${p.nombre} ${p.color}">
    <defs>
      <radialGradient id="c${i}" cx="38%" cy="28%" r="80%">
        <stop offset="0" stop-color="${claro}"/><stop offset=".45" stop-color="${p.hex}"/><stop offset="1" stop-color="${oscuro}"/>
      </radialGradient>
      <linearGradient id="v${i}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${mezcla(p.hex, "#ffffff", .15)}"/><stop offset="1" stop-color="${oscuro}"/>
      </linearGradient>
      <pattern id="r${i}" width="7" height="7" patternUnits="userSpaceOnUse">
        <rect width="7" height="7" fill="${p.hex}"/><circle cx="3.5" cy="3.5" r="2" fill="${sombra}"/>
      </pattern>
    </defs>
    <ellipse cx="185" cy="262" rx="160" ry="11" fill="#000" opacity=".13"/>
    <path d="M22 224C16 230 22 238 40 237C86 234 150 226 196 210L196 217C150 233 86 242 40 244C20 244 13 234 22 224Z" fill="${sombra}"/>
    <path d="M126 190C96 192 48 202 22 224C16 230 22 238 40 237C86 234 150 226 196 210C180 204 150 196 126 190Z" fill="url(#v${i})"/>
    <path d="M118 202C110 122 168 52 240 50C302 48 342 112 338 198C292 210 170 212 118 202Z" fill="url(#r${i})"/>
    <path d="M118 202C110 122 168 52 240 50C226 90 222 150 226 208C190 210 150 208 118 202Z" fill="url(#c${i})"/>
    <ellipse cx="240" cy="51" rx="11" ry="5" fill="${oscuro}"/>
    <image href="img/logo-${p.logo}.png" x="138" y="100" width="86" height="66" opacity=".95"/>
  </svg>`;
}

/* ---------- Galería del producto (fotos reales) ---------- */
const NOMBRES_VISTA = ["Frontal", "Lateral", "Rejilla", "Interior"];
const vistas = Object.fromEntries(PRODUCTOS.map((p) => [p.id, p.fotos.map((f, i) => ({
  nombre: NOMBRES_VISTA[i],
  html: `<img src="img/fotos/${f}.jpg" alt="${p.nombre} ${p.color} — ${NOMBRES_VISTA[i].toLowerCase()}" loading="lazy">`,
}))]));
let vistaActiva = 0;

function pintarGaleria() {
  const lista = vistas[colorActivo];
  vistaActiva = Math.min(vistaActiva, lista.length - 1);
  $("#galeriaPrincipal").innerHTML = lista[vistaActiva].html;
  $("#galeriaMiniaturas").innerHTML = lista.length > 1 ? lista.map((v, i) =>
    `<button class="miniatura ${i === vistaActiva ? "activa" : ""}" data-i="${i}" aria-label="Vista ${v.nombre}">${v.html}</button>`).join("") : "";
}

$("#galeriaMiniaturas").addEventListener("click", (e) => {
  const m = e.target.closest(".miniatura");
  if (!m) return;
  vistaActiva = +m.dataset.i;
  pintarGaleria();
});

// Zoom: con ratón, la foto se amplía siguiendo el cursor
const principal = $("#galeriaPrincipal");
principal.addEventListener("pointermove", (e) => {
  if (e.pointerType !== "mouse") return;
  const r = principal.getBoundingClientRect();
  principal.style.setProperty("--zx", `${((e.clientX - r.left) / r.width) * 100}%`);
  principal.style.setProperty("--zy", `${((e.clientY - r.top) / r.height) * 100}%`);
  principal.classList.add("zoom");
});
principal.addEventListener("pointerleave", () => principal.classList.remove("zoom"));

// Deslizar: en el móvil se pasa de foto arrastrando a los lados
let toqueX = null;
principal.addEventListener("touchstart", (e) => { toqueX = e.touches[0].clientX; }, { passive: true });
principal.addEventListener("touchend", (e) => {
  if (toqueX === null) return;
  const dx = e.changedTouches[0].clientX - toqueX;
  toqueX = null;
  if (Math.abs(dx) < 40) return;
  const total = vistas[colorActivo].length;
  vistaActiva = (vistaActiva + (dx < 0 ? 1 : -1) + total) % total;
  pintarGaleria();
});

/* ---------- Color ---------- */
// Lo usan los selectores de la intro y de la ficha; intro3d.js escucha "colorpardo" para pintar la gorra 3D.
function elegirColor(id) {
  colorActivo = id;
  const p = porId(id);
  $("#colorNombre").textContent = p.color;
  document.querySelectorAll("[data-color]").forEach((b) => b.classList.toggle("activo", b.dataset.color === id));
  pintarGaleria();
  dispatchEvent(new CustomEvent("colorpardo", { detail: p }));
}

document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-color]");
  if (b) elegirColor(b.dataset.color);
});

/* ---------- Compra ---------- */
let cantidad = 1;
function pintarCantidad() { $("#cantidad").textContent = cantidad; }
$("#menos").addEventListener("click", () => { cantidad = Math.max(1, cantidad - 1); pintarCantidad(); });
$("#mas").addEventListener("click", () => { cantidad = Math.min(10, cantidad + 1); pintarCantidad(); });
$("#anadir").addEventListener("click", () => {
  anadir(colorActivo, cantidad);
  cantidad = 1; pintarCantidad();
  abrirCarrito();
});

/* ---------- Carrito ---------- */
let carrito = {};
try { carrito = JSON.parse(localStorage.getItem("pardoht-carrito")) || {}; } catch (e) { carrito = {}; }

function guardar() {
  try { localStorage.setItem("pardoht-carrito", JSON.stringify(carrito)); } catch (e) { /* sin almacenamiento */ }
}

function anadir(id, n = 1) {
  carrito[id] = (carrito[id] || 0) + n;
  guardar(); pintarCarrito();
  aviso("Añadida al carrito");
}

function cambiar(id, d) {
  carrito[id] = (carrito[id] || 0) + d;
  if (carrito[id] <= 0) delete carrito[id];
  guardar(); pintarCarrito();
}

function pintarCarrito() {
  const ids = Object.keys(carrito).filter(porId);
  const unidades = ids.reduce((s, id) => s + carrito[id], 0);
  const total = ids.reduce((s, id) => s + carrito[id] * porId(id).precio, 0);
  const contador = $("#contador");
  contador.textContent = unidades;
  contador.classList.toggle("vacio", unidades === 0);
  $("#carritoTotal").textContent = euros(total);
  $("#btnPagar").disabled = unidades === 0;
  $("#carritoLista").innerHTML = ids.length ? ids.map((id) => {
    const p = porId(id);
    return `<div class="linea">
      <div class="linea__img">${vistas[id][0].html}</div>
      <div>
        <h4>${p.nombre}</h4>
        <p>${p.color} · ${euros(p.precio)}</p>
        <div class="cantidad">
          <button data-menos="${id}" aria-label="Quitar una">−</button><span>${carrito[id]}</span><button data-mas="${id}" aria-label="Añadir una">+</button>
        </div>
      </div>
      <button class="linea__quitar" data-quitar="${id}">Quitar</button>
    </div>`;
  }).join("") : `<p class="carrito__vacio">Tu carrito está vacío.</p>`;
}

$("#carritoLista").addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  if (b.dataset.mas) cambiar(b.dataset.mas, 1);
  if (b.dataset.menos) cambiar(b.dataset.menos, -1);
  if (b.dataset.quitar) cambiar(b.dataset.quitar, -Infinity);
});

function abrirCarrito() { $("#carrito").classList.add("abierto"); mostrarCapa(true); }
function cerrarCarrito() { $("#carrito").classList.remove("abierto"); mostrarCapa(false); }
function mostrarCapa(si) {
  $("#capa").classList.toggle("visible", si);
  document.body.classList.toggle("bloqueado", si);
}

$("#btnCarrito").addEventListener("click", abrirCarrito);
$("#cerrarCarrito").addEventListener("click", cerrarCarrito);
$("#capa").addEventListener("click", cerrarCarrito);
document.addEventListener("keydown", (e) => { if (e.key === "Escape") cerrarCarrito(); });
$("#btnPagar").addEventListener("click", () => aviso("El pago se conectará en el siguiente paso"));

/* ---------- Avisos y formulario ---------- */
let temporizador;
function aviso(texto) {
  const t = $("#toast");
  t.textContent = texto;
  t.classList.add("visible");
  clearTimeout(temporizador);
  temporizador = setTimeout(() => t.classList.remove("visible"), 2200);
}

$("#formAcceso").addEventListener("submit", (e) => {
  e.preventDefault();
  e.target.hidden = true;
  $("#accesoOk").hidden = false;
});

/* ---------- Apariciones al hacer scroll ---------- */
const observador = new IntersectionObserver((entradas) => {
  for (const e of entradas) if (e.isIntersecting) { e.target.classList.add("visto"); observador.unobserve(e.target); }
}, { threshold: 0.15 });
document.querySelectorAll("[data-aparece]").forEach((el) => observador.observe(el));

// El lema del manifiesto se abre a medida que entra en pantalla
const lema = $(".manifiesto__lema");
addEventListener("scroll", () => {
  const r = lema.getBoundingClientRect();
  const t = Math.min(1, Math.max(0, 1 - r.top / innerHeight));
  lema.style.letterSpacing = `${0.02 + t * 0.16}em`;
  lema.style.opacity = 0.25 + t * 0.75;
}, { passive: true });

/* ---------- Cuenta atrás ---------- */
function cuentaAtras() {
  const resto = Math.max(0, FECHA_DROP - new Date());
  const v = { d: resto / 864e5, h: (resto / 36e5) % 24, m: (resto / 6e4) % 60, s: (resto / 1e3) % 60 };
  document.querySelectorAll("#cuenta b").forEach((b) => {
    b.textContent = String(Math.floor(v[b.dataset.u])).padStart(2, "0");
  });
}

/* ---------- Inicio ---------- */
$("#precio").textContent = euros(PRODUCTOS[0].precio);
$("#nombreModelo").textContent = NOMBRE_MODELO;
$("#anio").textContent = new Date().getFullYear();
elegirColor(colorActivo);
pintarCantidad();
pintarCarrito();
cuentaAtras();
setInterval(cuentaAtras, 1000);
