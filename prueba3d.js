/* ===== PardoHT · Prueba 3D: visor de estudio para valorar el realismo de la gorra ===== */
// Mismo modelo que intro3d.js, con mejoras en prueba: textura real de pelo, más capas,
// rejilla con grosor, oclusión ambiental (GTAO) y suelo de estudio que recoge la sombra.

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { GTAOPass } from "three/addons/postprocessing/GTAOPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

// Los mismos colores que la web (script.js)
const PRODUCTOS = [
  { id: "rosa", hex: "#c38f86", rejilla: "#f2a9c7", forro: "#f3b4c9", cinta: "#f1a7c3", tinta: "#1a1a1a", hilo: "#fff1f5" },
  { id: "negro", hex: "#1a1a1c", rejilla: "#1c1c1e", forro: "#1e1e20", cinta: "#151515", tinta: "#f2f2f2", hilo: "#f2f2f2" },
];
const porId = (id) => PRODUCTOS.find((p) => p.id === id);
let colorActivo = "rosa";

const lienzo = document.querySelector("#lienzo");
const renderer = new THREE.WebGLRenderer({ canvas: lienzo, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const escena = new THREE.Scene();
const FONDO = { claro: new THREE.Color("#e6e3e0"), oscuro: new THREE.Color("#2a1220") };  // gris claro / lila de la web
escena.background = FONDO.oscuro.clone();
const pmrem = new THREE.PMREMGenerator(renderer);
escena.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

const camara = new THREE.PerspectiveCamera(30, 1, 0.05, 60);
camara.position.set(3.4, 1.5, 4.6);

// Luz de estudio: principal suave con sombra, relleno y contraluz
const luz = new THREE.DirectionalLight(0xffffff, 2.4);
luz.position.set(-3, 5, 4);
luz.castShadow = true;
luz.shadow.mapSize.set(2048, 2048);
Object.assign(luz.shadow.camera, { left: -3, right: 3, top: 3, bottom: -3, near: 0.5, far: 16 });
luz.shadow.bias = -0.0004;
luz.shadow.normalBias = 0.03;
luz.shadow.radius = 6;
const relleno = new THREE.DirectionalLight(0xfff4ee, 0.8);
relleno.position.set(4, 2, 3);
const contraluz = new THREE.DirectionalLight(0xffe6f0, 1.6);
contraluz.position.set(1, 3, -5);
escena.add(luz, relleno, contraluz, new THREE.HemisphereLight(0xffffff, 0xd8cfc8, 0.6));

/* ---------- Ayudas de texturas (igual que en intro3d.js) ---------- */
const textura = (w, h, dibuja) => {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  dibuja(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c);
  t.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return t;
};
const grano = (x, w, h) => {
  const img = x.getImageData(0, 0, w, h);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = 0.88 + Math.random() * 0.12;
    img.data[i] *= n; img.data[i + 1] *= n; img.data[i + 2] *= n;
  }
  x.putImageData(img, 0, 0);
};
const linea = (x, x1, y1, x2, y2) => { x.beginPath(); x.moveTo(x1, y1); x.lineTo(x2, y2); x.stroke(); };

// Detalle real del pelo, sacado de las fotos de la gorra
const texDetalle = await new THREE.TextureLoader().loadAsync("img/texturas/pelo-detalle.png");
texDetalle.colorSpace = THREE.SRGBColorSpace;
texDetalle.wrapS = texDetalle.wrapT = THREE.RepeatWrapping;
texDetalle.repeat.set(8, 4);
texDetalle.anisotropy = renderer.capabilities.getMaxAnisotropy();

// Trucker: frontal alto de pelo (150°) y el resto de rejilla, como la gorra real
const FRENTE = (150 * Math.PI) / 180;
const ALTO = 1.02;
// Deforma la media esfera: laterales más rectos, frontal adelantado y casi vertical, trasera algo más baja.
// La base (y = 0) y la punta no se mueven, así visera, badana y cierre siguen encajando.
const forma = (x, y, z) => {
  const delante = Math.max(0, z), medio = y * (1 - y);
  return [
    x * (1 + 0.12 * medio),
    Math.pow(Math.max(0, y), 0.8) * (1 + 0.1 * z),
    z * (1 + 0.4 * delante * medio),
  ];
};
const casco = (r, inicio, largo) => {
  const g = new THREE.SphereGeometry(r, 96, 48, inicio, largo, 0, Math.PI / 2);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const [x, y, z] = forma(pos.getX(i) / r, pos.getY(i) / r, pos.getZ(i) / r);
    pos.setXYZ(i, x * r, y * r, z * r);
  }
  g.computeVertexNormals();
  return g;
};
// Punto de la copa (en coordenadas de la gorra) a partir de la vuelta y la altura, en grados
const enCopa = (phi, theta, r = 1) => {
  const f = (phi * Math.PI) / 180, t = (theta * Math.PI) / 180;
  const [x, y, z] = forma(-Math.cos(f) * Math.sin(t), Math.cos(t), Math.sin(f) * Math.sin(t));
  return new THREE.Vector3(x * r, y * r * ALTO, z * r * 1.08);
};
const tramoFrente = [Math.PI / 2 - FRENTE / 2, FRENTE];
const tramoRejilla = [Math.PI / 2 + FRENTE / 2, Math.PI * 2 - FRENTE];

// Fuentes del bordado "Pardo" y de la cinta interior
if (document.fonts) {
  await Promise.all([
    document.fonts.load("140px Pacifico"),
    document.fonts.load('600 24px "Dancing Script"'),
  ]).catch(() => {});
}

// Frontal (base bajo el pelo): costuras de los bordes
const mapaFrente = textura(1024, 512, (x, w, h) => {
  x.fillStyle = "#fff"; x.fillRect(0, 0, w, h);
  x.strokeStyle = "rgba(0,0,0,.4)"; x.lineWidth = 4;
  linea(x, 3, 0, 3, h); linea(x, w - 3, 0, w - 3, h);
  grano(x, w, h);
});
mapaFrente.colorSpace = THREE.SRGBColorSpace;

// Pelo: cada píxel es una hebra de altura aleatoria; cada capa deja ver solo las más largas
// Ruido suave y repetible para agrupar hebras en mechones y variar el tono
const ruidoSuave = (n) => {
  const g = Array.from({ length: n * n }, () => Math.random());
  const at = (i, j) => g[((j % n + n) % n) * n + ((i % n + n) % n)];
  return (u, v) => {
    const i = Math.floor(u), j = Math.floor(v), fu = u - i, fv = v - j;
    const a = at(i, j) + (at(i + 1, j) - at(i, j)) * fu;
    const b = at(i, j + 1) + (at(i + 1, j + 1) - at(i, j + 1)) * fu;
    return a + (b - a) * fv;
  };
};
const mechones = ruidoSuave(48), mechonesFinos = ruidoSuave(160);
const texPelo = textura(1024, 1024, (x, w, h) => {
  const img = x.createImageData(w, h);
  for (let j = 0, k = 0; j < h; j++) for (let i = 0; i < w; i++, k += 4) {
    const grupo = 0.45 + 0.35 * mechones((i / w) * 48, (j / h) * 48) + 0.2 * mechonesFinos((i / w) * 160, (j / h) * 160);
    const v = Math.min(255, Math.pow(Math.random(), 1.3) * grupo * 300);
    img.data[k] = img.data[k + 1] = img.data[k + 2] = v; img.data[k + 3] = 255;
  }
  x.putImageData(img, 0, 0);
});
texPelo.wrapS = texPelo.wrapT = THREE.RepeatWrapping;
texPelo.repeat.set(3, 1.5);

// Tono del pelo: zonas algo más claras y oscuras, peinadas hacia abajo
const vetas = ruidoSuave(24);
const mapaPelo = textura(512, 512, (x, w, h) => {
  const img = x.createImageData(w, h);
  for (let j = 0, k = 0; j < h; j++) for (let i = 0; i < w; i++, k += 4) {
    const v = 205 + 50 * vetas((i / w) * 24, (j / h) * 6);
    img.data[k] = img.data[k + 1] = img.data[k + 2] = v; img.data[k + 3] = 255;
  }
  x.putImageData(img, 0, 0);
});
mapaPelo.colorSpace = THREE.SRGBColorSpace;
mapaPelo.wrapS = mapaPelo.wrapT = THREE.RepeatWrapping;

// Rejilla: agujeros en tresbolillo, cintas en las costuras y apertura del snapback.
// El lienzo cubre 210° de vuelta (ancho) por 90° de altura, por eso los agujeros se dibujan achatados.
const COSTURAS = [0, 60 / 210, 0.5, 150 / 210, 1];
const ARCO = { cx: 0.5, an: 0.085, alto: 0.32 };
const dibujarRejilla = (x, w, h, conAgujeros) => {
  x.fillStyle = "#fff"; x.fillRect(0, 0, w, h);
  const estira = 1.57, paso = 15, rx = 5;
  x.fillStyle = conAgujeros ? "#000" : "rgba(0,0,0,.35)";
  for (let fila = 0, y = 34; y < h - 30; fila++, y += paso / estira) {
    for (let cx = (fila % 2) * paso / 2; cx < w; cx += paso) {
      x.beginPath(); x.ellipse(cx, y, rx, rx / estira, 0, 0, Math.PI * 2); x.fill();
    }
  }
  // Cintas sólidas: costuras, base y borde superior
  x.fillStyle = conAgujeros ? "#fff" : "#f4f4f4";
  for (const u of COSTURAS) x.fillRect(u * w - 9, 0, 18, h);
  x.fillRect(0, h - 26, w, 26);
  x.fillRect(0, 0, w, 26);
  // Apertura del snapback con ribete
  const cx = ARCO.cx * w, an = ARCO.an * w, alto = ARCO.alto * h;
  const arco = () => {
    x.beginPath();
    x.moveTo(cx - an, h);
    x.lineTo(cx - an, h - alto + an * 0.6);
    x.quadraticCurveTo(cx - an, h - alto, cx, h - alto);
    x.quadraticCurveTo(cx + an, h - alto, cx + an, h - alto + an * 0.6);
    x.lineTo(cx + an, h);
  };
  x.lineWidth = 34; x.strokeStyle = conAgujeros ? "#fff" : "#f4f4f4"; arco(); x.stroke();
  if (conAgujeros) { x.fillStyle = "#000"; arco(); x.fill(); }
  if (!conAgujeros) {
    x.strokeStyle = "rgba(0,0,0,.3)"; x.lineWidth = 1.5; x.setLineDash([6, 5]);
    for (const u of COSTURAS) { linea(x, u * w - 6, 26, u * w - 6, h); linea(x, u * w + 6, 26, u * w + 6, h); }
    linea(x, 0, h - 16, w, h - 16);
    x.setLineDash([]);
    grano(x, w, h);
  }
};
const mapaRejilla = textura(2048, 512, (x, w, h) => dibujarRejilla(x, w, h, false));
mapaRejilla.colorSpace = THREE.SRGBColorSpace;
const alfaRejilla = textura(2048, 512, (x, w, h) => dibujarRejilla(x, w, h, true));

// "Pardo" bordado en la rejilla del lateral izquierdo
const texPardo = textura(2048, 512, (x, w, h) => {
  x.translate(0.86 * w, 0.72 * h);
  x.scale(1, 1 / 1.57);
  x.font = '140px Pacifico, "Brush Script MT", cursive';
  x.textAlign = "center"; x.textBaseline = "middle";
  x.lineWidth = 12; x.strokeStyle = "rgba(0,0,0,.3)"; x.strokeText("Pardo", 0, 0);
  x.fillStyle = "#fff"; x.fillText("Pardo", 0, 0);
});
texPardo.colorSpace = THREE.SRGBColorSpace;

// Cinta interior: "faith in me" impreso en cada costura (vista desde dentro, por eso en espejo)
const texCinta = (fondo, tinta) => {
  const t = textura(2048, 1024, (x, w, h) => {
    const ancho = 40, estira = 2.16;
    for (const grados of [30, 90, 150, 210, 270, 330]) {
      const cx = (grados / 360) * w;
      x.fillStyle = fondo; x.fillRect(cx - ancho / 2, 0, ancho, h);
      x.save();
      x.translate(cx, 0); x.rotate(Math.PI / 2); x.scale(estira, -1);
      x.fillStyle = tinta;
      x.font = '600 24px "Dancing Script", cursive';
      x.textAlign = "left"; x.textBaseline = "middle";
      for (let y = 40; y < h; y += 280) x.fillText("faith in me", y / estira, 0);
      x.restore();
    }
  });
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
};
const cintas = Object.fromEntries(PRODUCTOS.map((p) => [p.id, texCinta(p.cinta, p.tinta)]));

// Logo bordado centrado en el frontal (se tiñe en el tono de la gorra)
const cargar = (src) => new Promise((ok, mal) => {
  const i = new Image(); i.onload = () => ok(i); i.onerror = mal; i.src = src;
});
const imgLogo = await cargar("img/logo-blanco.png");
const texLogo = textura(1024, 512, (x) => x.drawImage(imgLogo, 512 - 170, 205, 340, 200));
texLogo.colorSpace = THREE.SRGBColorSpace;

/* ---------- Materiales ---------- */
const blanco = new THREE.Color("#ffffff");
const tela = new THREE.MeshStandardMaterial({ map: mapaFrente, roughness: 1 });
const forro = new THREE.MeshStandardMaterial({ roughness: 1, side: THREE.BackSide });
const rejilla = new THREE.MeshStandardMaterial({
  map: mapaRejilla, alphaMap: alfaRejilla, alphaTest: 0.5,
  roughness: 0.75, side: THREE.DoubleSide,
});
const rejillaInterior = rejilla.clone();
const telaVisera = new THREE.MeshStandardMaterial({ roughness: 1, side: THREE.DoubleSide });
const plastico = new THREE.MeshStandardMaterial({ roughness: 0.35 });
const relieve = Array.from({ length: 4 }, (_, k) => new THREE.MeshStandardMaterial({
  map: texLogo, alphaTest: 0.35, bumpMap: texLogo, bumpScale: 2, envMapIntensity: 0.4,
  roughness: 0.75, metalness: 0, polygonOffset: true, polygonOffsetFactor: -2 - k,
}));
const bordadoPardo = new THREE.MeshStandardMaterial({
  map: texPardo, transparent: true, depthWrite: false,
  roughness: 0.45, metalness: 0.15, polygonOffset: true, polygonOffsetFactor: -2,
});
const cinta = new THREE.MeshStandardMaterial({ transparent: true, alphaTest: 0.5, side: THREE.BackSide, roughness: 0.7 });
const badana = new THREE.MeshStandardMaterial({ roughness: 1, side: THREE.BackSide });

// Capas de pelo: de la raíz (oscura) a las puntas (más claras)
const CAPAS = 34, LARGO_PELO = 0.13;
const pelos = Array.from({ length: CAPAS }, (_, k) => {
  const f = (k + 1) / CAPAS;
  return {
    f,
    m: new THREE.MeshPhysicalMaterial({
      map: texDetalle, alphaMap: texPelo, alphaTest: 0.05 + 0.88 * f,
      roughness: 1, sheen: 0.8 * f, sheenRoughness: 0.5, envMapIntensity: 0.35,
    }),
  };
});

function pintar(p) {
  const pelo = new THREE.Color(p.hex);
  tela.color.copy(pelo).multiplyScalar(0.45);
  telaVisera.color.copy(pelo).multiplyScalar(0.78);
  for (const { f, m } of pelos) {
    m.color.copy(pelo).multiplyScalar(0.38 + 0.72 * f);  // raíz oscura, puntas con luz
    m.sheenColor.copy(pelo).lerp(blanco, 0.35);
  }
  // Bordado tono sobre tono: apenas más claro que el pelo, como en la gorra real
  for (const [k, m] of relieve.entries()) m.color.copy(pelo).multiplyScalar(0.5 + 0.05 * k).lerp(blanco, p.id === "negro" ? 0.03 * k : 0.02 * k);
  rejilla.color.set(p.rejilla);
  rejillaInterior.color.set(p.rejilla).multiplyScalar(0.6);
  plastico.color.set(p.rejilla).multiplyScalar(0.9);
  bordadoPardo.color.set(p.hilo);
  forro.color.set(p.forro);
  badana.color.set(p.forro).multiplyScalar(0.85);
  cinta.map = cintas[p.id];
  cinta.needsUpdate = true;
}

/* ---------- Modelo de la gorra ---------- */
const gorra = new THREE.Group();

const sombra = (m) => { m.castShadow = true; m.receiveShadow = true; return m; };
const copa = new THREE.Group();
copa.scale.set(1, ALTO, 1.08);
const geoFrente = casco(1, ...tramoFrente);
copa.add(
  sombra(new THREE.Mesh(geoFrente, tela)),
  new THREE.Mesh(geoFrente, forro),
  sombra(new THREE.Mesh(casco(1, ...tramoRejilla), rejilla)),
  new THREE.Mesh(casco(0.986, ...tramoRejilla), rejillaInterior),
  new THREE.Mesh(casco(1.006, ...tramoRejilla), bordadoPardo),
  new THREE.Mesh(casco(0.994, 0, Math.PI * 2), cinta),
);
relieve.forEach((m, k) => copa.add(new THREE.Mesh(casco(1 + LARGO_PELO * 0.9 + 0.006 * k, ...tramoFrente), m)));
for (const { f, m } of pelos) {
  const capa = new THREE.Mesh(casco(1 + LARGO_PELO * f, ...tramoFrente), m);
  capa.position.y = -0.03 * f * f;  // el pelo cae, peinado hacia abajo
  capa.receiveShadow = true;
  copa.add(capa);
}
for (let k = 0; k < 8; k++) {
  const boton = new THREE.Mesh(new THREE.SphereGeometry(0.07 + 0.008 * k, 24, 12), pelos[Math.min(CAPAS - 1, k * 3)].m);
  boton.position.y = 1.02;
  boton.scale.y = 0.7;
  copa.add(boton);
}
gorra.add(copa);

// Badana: la cinta interior del contorno
const geoBadana = new THREE.CylinderGeometry(0.985, 0.985, 0.11, 96, 1, true);
const anillo = new THREE.Mesh(geoBadana, badana);
anillo.position.y = 0.055;
anillo.scale.z = 1.08;
gorra.add(anillo);

// Visera curva: superficie superior, inferior y canto
const puntoVisera = (s, t, y0) => {
  const a = s * 1.25;
  const largo = 0.86 * Math.pow(Math.max(0, Math.cos(a * 1.24)), 0.65);
  const x = Math.sin(a) * (1 + largo * t * 0.32);
  const z = Math.cos(a) * 1.08 + largo * t;
  // La caída es proporcional a lo que sobresale: en los extremos (casi sin visera) no baja
  return [x, y0 - (0.12 + 0.36 * x * x) * t * (largo / 0.86), z];
};
function geometriaVisera() {
  const S = 72, T = 18, grosor = 0.045, punto = puntoVisera;
  const pos = [], uv = [], idx = [];
  const superficie = (y0) => {
    const base = pos.length / 3;
    for (let j = 0; j <= T; j++) for (let i = 0; i <= S; i++) {
      pos.push(...punto((i / S) * 2 - 1, j / T, y0));
      uv.push(i / S, j / T);
    }
    for (let j = 0; j < T; j++) for (let i = 0; i < S; i++) {
      const a = base + j * (S + 1) + i, b = a + 1, c = a + S + 1, d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
    return base;
  };
  const arriba = superficie(0), abajo = superficie(-grosor);
  for (let i = 0; i < S; i++) {
    const a = arriba + T * (S + 1) + i, c = abajo + T * (S + 1) + i;
    idx.push(a, a + 1, c, a + 1, c + 1, c);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}
const geoVisera = geometriaVisera();
gorra.add(sombra(new THREE.Mesh(geoVisera, telaVisera)));
for (const { f, m } of pelos) {
  const capa = new THREE.Mesh(geoVisera, m);
  capa.position.y = LARGO_PELO * 0.75 * f;
  capa.receiveShadow = true;
  gorra.add(capa);
}

// Snapback: tira de plástico bajo la apertura con su fila de botones
const arcoTira = 0.62;
const geoTira = new THREE.TorusGeometry(1.012, 0.026, 8, 40, arcoTira);
geoTira.rotateX(Math.PI / 2);
geoTira.rotateY(arcoTira / 2 + Math.PI / 2);
const tira = new THREE.Mesh(geoTira, plastico);
tira.position.y = 0.055;
tira.scale.set(1, 2, 1.08);
gorra.add(sombra(tira));
const geoBoton = new THREE.CylinderGeometry(0.018, 0.018, 0.03, 16);
geoBoton.rotateX(Math.PI / 2);
for (let k = 0; k < 6; k++) {
  const a = -0.22 + k * 0.088;
  const soporte = new THREE.Group();
  soporte.rotation.y = -a;
  const b = new THREE.Mesh(geoBoton, plastico);
  b.position.set(0, 0.055, -1.1);
  soporte.add(b);
  gorra.add(soporte);
}

// Jerarquía: flotación → inclinación → giro → gorra centrada
gorra.position.set(0, -0.42, -0.35);
const giro = new THREE.Group(); giro.add(gorra);
const inclinacion = new THREE.Group(); inclinacion.add(giro);
const pivote = new THREE.Group(); pivote.add(inclinacion);
escena.add(pivote);


/* ---------- Suelo de estudio: solo recoge la sombra ---------- */
const caja = new THREE.Box3().setFromObject(pivote);
const suelo = new THREE.Mesh(new THREE.CircleGeometry(6, 64), new THREE.ShadowMaterial({ opacity: 0.14 }));
suelo.rotation.x = -Math.PI / 2;
suelo.position.y = caja.min.y - 0.002;
suelo.receiveShadow = true;
escena.add(suelo);

/* ---------- Controles ---------- */
const controles = new OrbitControls(camara, lienzo);
controles.target.set(0, (caja.min.y + caja.max.y) / 2, 0);
controles.enableDamping = true;
controles.dampingFactor = 0.06;
controles.autoRotate = true;
controles.autoRotateSpeed = 0.9;
controles.minDistance = 2.2;
controles.maxDistance = 9;
controles.maxPolarAngle = Math.PI * 0.6;
controles.enablePan = false;

/* ---------- Postproceso: oclusión ambiental (sombras de contacto) ---------- */
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(escena, camara));
const ao = new GTAOPass(escena, camara, 1, 1);
ao.updateGtaoMaterial({ radius: 0.35, distanceExponent: 1.5, thickness: 1, scale: 1.2, samples: 16 });
ao.blendIntensity = 0.85;
composer.addPass(ao);
composer.addPass(new OutputPass());

function ajustar() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  composer.setSize(w, h);
  camara.aspect = w / h;
  camara.updateProjectionMatrix();
  // En pantallas estrechas la cámara se aleja para que quepa la gorra entera
  controles.minDistance = w / h < 0.8 ? 3.4 : 2.2;
}
addEventListener("resize", ajustar);
ajustar();
pintar(porId(colorActivo));

/* ---------- Botones ---------- */
document.querySelectorAll("[data-color]").forEach((b) => b.addEventListener("click", () => {
  colorActivo = b.dataset.color;
  pintar(porId(colorActivo));
  document.querySelectorAll("[data-color]").forEach((o) => o.classList.toggle("activo", o === b));
}));

// Fondo automático como en la web: lila con la rosa, gris claro con la negra (el botón lo invierte)
let oscuro = true;
const btnFondo = document.querySelector("#btnFondo");
function ponerFondo(siOscuro) {
  oscuro = siOscuro;
  document.body.classList.toggle("oscuro", oscuro);
  escena.background.copy(oscuro ? FONDO.oscuro : FONDO.claro);
  suelo.material.opacity = oscuro ? 0.45 : 0.14;
  btnFondo.querySelector("span").textContent = oscuro ? "Fondo claro" : "Fondo oscuro";
}
btnFondo.addEventListener("click", () => ponerFondo(!oscuro));
document.querySelectorAll("[data-color]").forEach((b) => b.addEventListener("click", () => ponerFondo(b.dataset.color === "rosa")));
ponerFondo(true);

const btnGiro = document.querySelector("#btnGiro");
btnGiro.addEventListener("click", () => {
  controles.autoRotate = !controles.autoRotate;
  btnGiro.classList.toggle("activo", controles.autoRotate);
});

document.querySelector("#cargando").remove();

renderer.setAnimationLoop(() => {
  controles.update();
  composer.render();
});
