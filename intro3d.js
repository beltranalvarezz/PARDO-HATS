/* ===== PardoHT · Intro 3D ===== */
// Un único vuelo de cámara, sin cortes, controlado por el scroll:
// "Faith in me" → la gorra sale de la oscuridad → la rodea → entra por el snapback,
// la recorre por dentro, sale por debajo → visera → elige color (arrastrar para girar).

const intro = document.querySelector("#intro");
const pegajoso = document.querySelector("#introPegajoso");
const lienzo = document.querySelector("#lienzo3d");
const frase = document.querySelector("#introFrase");
const foco = document.querySelector("#introFoco");
const final = document.querySelector("#introFinal");
const desliza = document.querySelector("#introDesliza");
const cuenta = document.querySelector("#introCuenta");
const barra = document.querySelector("#introBarra");
const btnGiro = document.querySelector("#btnGiro");
const svgLineas = document.querySelector("#introLineas");

// Ruta de la cámara: [progreso, posición de la cámara, punto al que mira] (coordenadas de la escena)
const RUTA = [
  [0.000, [ 0.0,  2.2, 17.0], [0,  0.00,  0.00]],
  [0.060, [-1.0,  1.8, 14.0], [0,  0.00,  0.00]],
  [0.240, [ 3.2,  1.4,  4.6], [0,  0.00,  0.00]],  // llega al centro
  [0.310, [ 2.4,  1.0,  4.4], [0,  0.05,  0.00]],
  [0.400, [ 0.0,  0.55, 4.4], [0,  0.10,  0.00]],  // 01 frontal
  [0.460, [-0.4,  0.6,  4.4], [0,  0.10,  0.00]],
  [0.540, [-4.6,  1.6,  0.2], [0,  0.10, -0.35]],  // 02 rejilla
  [0.590, [-4.4,  1.3, -1.4], [0,  0.05, -0.40]],
  [0.650, [-0.5,  0.15,-4.4], [0, -0.10, -1.40]],  // 03 snapback
  [0.690, [ 0.0,  0.0, -3.4], [0, -0.10, -1.40]],
  [0.740, [ 0.0, -0.1, -1.6], [0, -0.05,  0.00]],  // entra por la apertura
  [0.785, [ 0.0, -0.30,-0.45], [0,  0.60, -0.10]],  // 04 por dentro: mira arriba, a las cintas "faith in me"
  [0.810, [ 0.0, -0.28,-0.40], [0,  0.60, -0.05]],
  [0.840, [ 0.0, -0.75,-0.1], [0, -0.20,  0.60]],  // baja y sale por debajo
  [0.860, [ 2.6, -0.2,  0.8], [0, -0.20,  0.60]],  // se abre hacia un lado
  [0.885, [ 2.8,  1.2,  3.4], [0.2, -0.30, 0.90]], // 04 visera
  [0.920, [ 2.2,  1.4,  3.8], [0.2, -0.30, 0.90]],
  [0.970, [ 0.0,  0.8,  7.4], [0, -0.70,  0.00]],  // elige la tuya
  [1.000, [ 0.0,  0.8,  7.4], [0, -0.70,  0.00]],
];

const suave = (t) => { t = Math.min(1, Math.max(0, t)); return t * t * (3 - 2 * t); };

function progreso() {
  const r = intro.getBoundingClientRect();
  const arriba = parseFloat(getComputedStyle(pegajoso).top) || 0;
  const recorrido = r.height - pegajoso.offsetHeight;
  return Math.min(1, Math.max(0, (arriba - r.top) / recorrido));
}

function modoSimple() {
  intro.classList.add("intro--simple");
  document.querySelector("#introSimple").innerHTML = gorraSVG(porId(colorActivo));
}

let THREE, RoomEnvironment, POST;
try {
  THREE = await import("three");
  ({ RoomEnvironment } = await import("three/addons/environments/RoomEnvironment.js"));
  // Postproceso (oclusión ambiental); si no carga, la intro funciona igual sin él
  POST = await Promise.all([
    import("three/addons/postprocessing/EffectComposer.js"),
    import("three/addons/postprocessing/RenderPass.js"),
    import("three/addons/postprocessing/GTAOPass.js"),
    import("three/addons/postprocessing/OutputPass.js"),
  ]).catch(() => null);
  await iniciar();
} catch (e) {
  console.warn("Intro 3D no disponible:", e);
  modoSimple();
}

async function iniciar() {
  const renderer = new THREE.WebGLRenderer({ canvas: lienzo, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const escena = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  escena.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const camara = new THREE.PerspectiveCamera(30, 1, 0.05, 60);

  const luz = new THREE.DirectionalLight(0xffffff, 2.2);
  luz.position.set(-3, 4, 5);
  luz.castShadow = true;
  luz.shadow.mapSize.set(2048, 2048);
  Object.assign(luz.shadow.camera, { left: -2.5, right: 2.5, top: 2.5, bottom: -2.5, near: 0.5, far: 16 });
  luz.shadow.bias = -0.0004;
  luz.shadow.normalBias = 0.03;
  luz.shadow.radius = 5;
  const contraluz = new THREE.DirectionalLight(0xf3d2e2, 2.2);
  contraluz.position.set(3, 2, -4);
  // Linterna: sigue al ratón y saca el brillo del terciopelo (y alumbra el interior)
  const linterna = new THREE.PointLight(0xffe3f0, 0, 7, 1.6);
  // Luz interior: solo se enciende cuando la cámara vuela por dentro de la gorra
  const luzInterior = new THREE.PointLight(0xffd6e8, 0, 2.5, 1.5);
  luzInterior.position.set(0, 0.0, -0.3);
  escena.add(luz, contraluz, linterna, luzInterior, new THREE.HemisphereLight(0xffffff, 0x4a2a3a, 0.7));

  /* ---------- Texturas dibujadas en canvas ---------- */
  const textura = (w, h, dibuja) => {
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    dibuja(c.getContext("2d"), w, h);
    const t = new THREE.CanvasTexture(c);
    t.anisotropy = renderer.capabilities.getMaxAnisotropy();
    return t;
  };

  // Grano del terciopelo
  const grano = (x, w, h) => {
    const img = x.getImageData(0, 0, w, h);
    for (let i = 0; i < img.data.length; i += 4) {
      const n = 0.88 + Math.random() * 0.12;
      img.data[i] *= n; img.data[i + 1] *= n; img.data[i + 2] *= n;
    }
    x.putImageData(img, 0, 0);
  };

  const linea = (x, x1, y1, x2, y2) => { x.beginPath(); x.moveTo(x1, y1); x.lineTo(x2, y2); x.stroke(); };

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
  const deformar = (g, r) => {
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const [x, y, z] = forma(pos.getX(i) / r, pos.getY(i) / r, pos.getZ(i) / r);
      pos.setXYZ(i, x * r, y * r, z * r);
    }
    g.computeVertexNormals();
    return g;
  };
  const casco = (r, inicio, largo) => deformar(new THREE.SphereGeometry(r, 96, 48, inicio, largo, 0, Math.PI / 2), r);
  // Trozo de copa centrado en (phi, theta), en grados; muy subdividido para poder darle relieve
  const rad = (g) => (g * Math.PI) / 180;
  const parche = (r, phi, ancho, theta, alto) =>
    deformar(new THREE.SphereGeometry(r, 256, 160, rad(phi - ancho / 2), rad(ancho), rad(theta - alto / 2), rad(alto)), r);
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
  const ARCO = { cx: 0.5, an: 0.08, alto: 0.21 };  // apertura del snapback: ~7 cm de ancho por ~5 cm de alto
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

  // Cinta interior: "faith in me" impreso en cada costura (vista desde dentro, por eso en espejo)
  const texCinta = (fondo, tinta) => {
    const t = textura(2048, 1024, (x, w, h) => {
      const ancho = 40, estira = 2.16;
      for (const grados of [15, 90, 165, 225, 270, 315]) {
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

  // Bordado en relieve: silueta (recorte), altura suavizada (relieve) y puntadas satinadas (hilo)
  const engordar = (x, dibuja, grosor) => {
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 6) { x.save(); x.translate(Math.cos(a) * grosor, Math.sin(a) * grosor); dibuja(x); x.restore(); }
    dibuja(x);
  };
  function texturasBordado(w, h, dibuja, grosor) {
    const fondo = (x) => { x.fillStyle = "#000"; x.fillRect(0, 0, w, h); x.fillStyle = x.strokeStyle = "#fff"; };
    const silueta = textura(w, h, (x) => { fondo(x); engordar(x, dibuja, grosor); });
    const altura = textura(w, h, (x) => { fondo(x); x.filter = `blur(${grosor + 1}px)`; engordar(x, dibuja, grosor); });
    // Ribete: un anillo alrededor de la silueta, más oscuro, como el borde de un bordado satinado
    const anillo = document.createElement("canvas");
    anillo.width = w; anillo.height = h;
    const a = anillo.getContext("2d");
    a.fillStyle = a.strokeStyle = "#fff";
    engordar(a, dibuja, grosor + 4);
    a.globalCompositeOperation = "destination-out";
    engordar(a, dibuja, Math.max(0, grosor - 1));
    const puntadas = textura(w, h, (x) => {
      x.fillStyle = "#fff"; x.fillRect(0, 0, w, h);
      x.strokeStyle = "rgba(0,0,0,.3)"; x.lineWidth = 1.5;
      for (let k = -h; k < w; k += 5) linea(x, k, h, k + h, 0);  // hilos en diagonal, como un satinado
      grano(x, w, h);
      x.globalCompositeOperation = "multiply";
      x.filter = "brightness(0.55)";
      x.drawImage(anillo, 0, 0);
    });
    puntadas.colorSpace = THREE.SRGBColorSpace;
    return { silueta, altura, puntadas };
  }
  const materialBordado = (t, relieve) => new THREE.MeshPhysicalMaterial({
    map: t.puntadas, bumpMap: t.altura, bumpScale: 4,  // el relieve sombrea los bordes de cada letra
    alphaMap: t.silueta, alphaTest: 0.5,
    displacementMap: t.altura, displacementScale: relieve,
    roughness: 0.5, specularIntensity: 0.6, sheen: 0.5, sheenRoughness: 0.3,
    anisotropy: 0.8, anisotropyRotation: Math.PI / 4,  // brillo alargado del hilo satinado
  });

  // "Pardo" en la rejilla del lateral izquierdo: letra script con borde, como en la gorra real
  const texPardo = texturasBordado(1024, 512, (x) => {
    x.font = '200px Pacifico, "Brush Script MT", cursive';
    const tam = 200 * 900 / x.measureText("Pardo").width;
    x.font = `${tam}px Pacifico, "Brush Script MT", cursive`;
    x.textAlign = "center"; x.textBaseline = "middle";
    x.lineWidth = 8; x.lineJoin = "round";
    x.fillText("Pardo", 512, 256); x.strokeText("Pardo", 512, 256);
  }, 3);

  // Logo frontal: el monograma, con el trazo engordado para que sea un hilo con cuerpo
  const LOGO = { x: 57, y: 56, w: 911, h: 659 };  // dentro del parche frontal (1024 × 768)
  const texLogoBordado = texturasBordado(1024, 768, (x) => x.drawImage(imgLogo, LOGO.x, LOGO.y, LOGO.w, LOGO.h), 5);

  // Máscara del pelo: alrededor del logo el pelo queda aplastado por el bordado
  const mascaraLogo = textura(1024, 512, (x, w, h) => {
    x.fillStyle = "#000"; x.fillRect(0, 0, w, h);
    x.filter = "blur(10px)";
    engordar(x, (c) => c.drawImage(imgLogo, 512 - 170, 205, 340, 200), 7);
  });

  /* ---------- Materiales ---------- */
  const blanco = new THREE.Color("#ffffff");
  const tela = new THREE.MeshStandardMaterial({ map: mapaFrente, roughness: 1 });
  const forro = new THREE.MeshStandardMaterial({ roughness: 1, side: THREE.BackSide });
  const rejilla = new THREE.MeshStandardMaterial({
    map: mapaRejilla, alphaMap: alfaRejilla, alphaTest: 0.5,
    roughness: 0.75, side: THREE.DoubleSide,
  });
  // Rejilla con grosor: segunda capa interior algo más oscura
  const rejillaInterior = rejilla.clone();
  const telaVisera = new THREE.MeshStandardMaterial({ roughness: 1, side: THREE.DoubleSide });
  const plastico = new THREE.MeshStandardMaterial({ roughness: 0.35 });
  const bordadoPardo = materialBordado(texPardo, 0.04);
  const bordadoLogo = materialBordado(texLogoBordado, 0.03);
  const cinta = new THREE.MeshStandardMaterial({ transparent: true, alphaTest: 0.5, side: THREE.BackSide, roughness: 0.7 });
  const texBadana = textura(1024, 64, (x, w, h) => {
    x.fillStyle = "#fff"; x.fillRect(0, 0, w, h);
    x.strokeStyle = "rgba(0,0,0,.35)"; x.lineWidth = 2; x.setLineDash([7, 5]);
    linea(x, 0, 9, w, 9); linea(x, 0, h - 9, w, h - 9);
    x.setLineDash([]);
    grano(x, w, h);
  });
  texBadana.colorSpace = THREE.SRGBColorSpace;
  texBadana.wrapS = THREE.RepeatWrapping;
  texBadana.repeat.set(6, 1);
  const badana = new THREE.MeshStandardMaterial({ map: texBadana, roughness: 1, side: THREE.BackSide });

  // Detalle real del pelo, sacado de las fotos de la gorra
  const texDetalle = await new THREE.TextureLoader().loadAsync("img/texturas/pelo-detalle.png");
  texDetalle.colorSpace = THREE.SRGBColorSpace;
  texDetalle.wrapS = texDetalle.wrapT = THREE.RepeatWrapping;
  texDetalle.repeat.set(8, 4);
  texDetalle.anisotropy = renderer.capabilities.getMaxAnisotropy();

  // Capas de pelo: de la raíz (oscura) a las puntas (más claras)
  const CAPAS = 40, LARGO_PELO = 0.13;
  const materialPelo = (f) => new THREE.MeshPhysicalMaterial({
    map: texDetalle, alphaMap: texPelo, alphaTest: 0.05 + 0.88 * f,
    roughness: 1, sheen: f, sheenRoughness: 0.38, envMapIntensity: 0.35,
  });
  // En el frontal, las capas altas desaparecen donde está el logo: el pelo queda aplastado alrededor
  const conMascara = (m, f) => {
    m.onBeforeCompile = (sh) => {
      sh.uniforms.mascaraLogo = { value: mascaraLogo };
      sh.uniforms.alturaCapa = { value: f };
      sh.vertexShader = "varying vec2 vUvMascara;\n" + sh.vertexShader.replace("#include <uv_vertex>", "#include <uv_vertex>\n  vUvMascara = uv;");
      sh.fragmentShader = "uniform sampler2D mascaraLogo;\nuniform float alturaCapa;\nvarying vec2 vUvMascara;\n" +
        sh.fragmentShader.replace("#include <alphatest_fragment>",
          "  if (alturaCapa > 1.0 - 0.8 * texture2D(mascaraLogo, vUvMascara).r) diffuseColor.a = 0.0;\n#include <alphatest_fragment>");
    };
    m.customProgramCacheKey = () => "pelo-con-mascara";
    return m;
  };
  const pelos = Array.from({ length: CAPAS }, (_, k) => { const f = (k + 1) / CAPAS; return { f, m: conMascara(materialPelo(f), f) }; });
  const pelosVisera = pelos.map(({ f }) => ({ f, m: materialPelo(f) }));

  function pintar(p) {
    const pelo = new THREE.Color(p.hex);
    tela.color.copy(pelo).multiplyScalar(0.45);
    telaVisera.color.copy(pelo).multiplyScalar(0.78);
    for (const { f, m } of [...pelos, ...pelosVisera]) {
      m.color.copy(pelo).multiplyScalar(0.38 + 0.72 * f);  // raíz oscura, puntas con luz
      m.sheenColor.copy(pelo).lerp(blanco, 0.45);
    }
    // Logo bordado tono sobre tono: el hilo brilla algo más que el pelo, como en la gorra real
    bordadoLogo.color.copy(pelo).multiplyScalar(p.id === "negro" ? 1.6 : 0.95).lerp(blanco, 0.04);
    bordadoLogo.sheenColor.copy(bordadoLogo.color).lerp(blanco, 0.3);
    bordadoPardo.sheenColor.set(p.hilo);
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
  const capasPelo = [];  // para mover el pelo un poco en cada fotograma
  const copa = new THREE.Group();
  copa.scale.set(1, ALTO, 1.08);
  const geoFrente = casco(1, ...tramoFrente);
  copa.add(
    sombra(new THREE.Mesh(geoFrente, tela)),
    new THREE.Mesh(geoFrente, forro),
    sombra(new THREE.Mesh(casco(1, ...tramoRejilla), rejilla)),
    new THREE.Mesh(casco(0.986, ...tramoRejilla), rejillaInterior),
    sombra(new THREE.Mesh(parche(1.006, 348, 46, 65, 27), bordadoPardo)),
    sombra(new THREE.Mesh(parche(1 + LARGO_PELO * 0.45, 90, 56, 53.5, 41), bordadoLogo)),
    new THREE.Mesh(casco(0.994, 0, Math.PI * 2), cinta),
  );
  for (const { f, m } of pelos) {
    const capa = new THREE.Mesh(casco(1 + LARGO_PELO * f, ...tramoFrente), m);
    capa.position.y = -0.03 * f * f;  // el pelo cae, peinado hacia abajo
    capa.receiveShadow = true;
    copa.add(capa);
    capasPelo.push({ capa, f });
  }
  for (let k = 0; k < 8; k++) {
    const boton = new THREE.Mesh(new THREE.SphereGeometry(0.07 + 0.008 * k, 24, 12), pelosVisera[Math.min(CAPAS - 1, k * 4)].m);
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
  for (const { f, m } of pelosVisera) {
    const capa = new THREE.Mesh(geoVisera, m);
    capa.position.y = LARGO_PELO * 0.75 * f;
    capa.receiveShadow = true;
    gorra.add(capa);
  }

  // Snapback de plástico: la tira izquierda (por fuera) tiene una fila de agujeros y la derecha (por dentro),
  // pivotes que asoman por esos agujeros. Ángulos medidos desde el centro de la nuca; la apertura va de -0,31 a 0,31.
  const Y_CIERRE = 0.09;
  const enCierre = (a, r) => new THREE.Vector3(Math.sin(a) * r, Y_CIERRE, -Math.cos(a) * r * 1.08);
  const hacia = (a) => new THREE.Vector3(Math.sin(a), 0, -Math.cos(a) / 1.08).normalize();
  const rectRedondo = (g, h, r) => {
    const f = new THREE.Shape();
    f.moveTo(-g, -h + r); f.lineTo(-g, h - r); f.quadraticCurveTo(-g, h, -g + r, h);
    f.lineTo(g - r, h); f.quadraticCurveTo(g, h, g, h - r); f.lineTo(g, -h + r);
    f.quadraticCurveTo(g, -h, g - r, -h); f.lineTo(-g + r, -h); f.quadraticCurveTo(-g, -h, -g, -h + r);
    return f;
  };
  const tiraCurva = (a0, a1, r) => {
    const camino = new THREE.CatmullRomCurve3(Array.from({ length: 24 }, (_, k) => enCierre(a0 + (a1 - a0) * k / 23, r)));
    // La sección se extruye con su eje X en vertical y el Y hacia fuera: 1,6 de alto × 0,14 de grosor
    return new THREE.ExtrudeGeometry(rectRedondo(0.08, 0.007, 0.006), { steps: 60, extrudePath: camino, bevelEnabled: false });
  };
  const R_FUERA = 1.004, R_DENTRO = 0.992;
  gorra.add(sombra(new THREE.Mesh(tiraCurva(-0.36, 0.1, R_FUERA), plastico)));    // tira con agujeros
  gorra.add(sombra(new THREE.Mesh(tiraCurva(0.36, -0.16, R_DENTRO), plastico)));  // tira con pivotes

  const agujero = new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 1 });
  const geoAgujero = new THREE.CylinderGeometry(0.026, 0.026, 0.002, 24).rotateX(Math.PI / 2);
  const geoPivote = new THREE.CylinderGeometry(0.021, 0.026, 0.016, 24).rotateX(Math.PI / 2);
  const ponerEn = (geo, mat, a, r) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.copy(enCierre(a, r));
    m.lookAt(m.position.clone().add(hacia(a)));
    gorra.add(m);
  };
  for (const a of [-0.24, -0.135]) ponerEn(geoAgujero, agujero, a, R_FUERA + 0.0075);          // agujeros libres
  for (const a of [-0.03, 0.075]) ponerEn(geoPivote, plastico, a, R_FUERA + 0.012);            // pivotes encajados
  for (const a of [0.18, 0.285]) ponerEn(geoPivote, plastico, a, R_DENTRO + 0.012);            // pivotes sueltos

  // Jerarquía: flotación → inclinación → giro → gorra centrada
  gorra.position.set(0, -0.42, -0.35);
  const giro = new THREE.Group(); giro.add(gorra);
  const inclinacion = new THREE.Group(); inclinacion.add(giro);
  const pivote = new THREE.Group(); pivote.add(inclinacion);
  escena.add(pivote);

  /* ---------- Puntos de anclaje de las notas (coordenadas de la gorra) ---------- */
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const anclas = {
    logo:    { pos: enCopa(90, 52, 1 + LARGO_PELO), normal: V(0, 0.5, 0.87).normalize() },
    rejilla: { pos: enCopa(-12, 64),        normal: V(-0.85, 0.5, 0.15).normalize() },
    cierre:  { pos: V(-0.03, 0.09, -1.1), normal: V(0, 0, -1) },
    dentro:  { pos: enCopa(90, 40, 0.99),   normal: V(0, -0.7, -0.7).normalize() },
    visera:  { pos: V(...puntoVisera(0.25, 0.75, LARGO_PELO * 0.75)), normal: V(0, 1, 0.15).normalize() },
  };

  const NS = "http://www.w3.org/2000/svg";
  const notas = [...document.querySelectorAll(".nota")].map((el) => {
    const g = document.createElementNS(NS, "g");
    g.innerHTML = `<path/><circle class="onda" r="10"/><circle class="punto" r="3.5"/>`;
    svgLineas.appendChild(g);
    return {
      el, g, path: g.querySelector("path"), circulos: g.querySelectorAll("circle"),
      ancla: anclas[el.dataset.ancla], desde: +el.dataset.desde, hasta: +el.dataset.hasta,
    };
  });

  const enMundo = new THREE.Vector3(), normalMundo = new THREE.Vector3(), haciaCamara = new THREE.Vector3();
  const giroMundo = new THREE.Quaternion();

  function pintarNotas(p, w, h) {
    gorra.getWorldQuaternion(giroMundo);
    for (const n of notas) {
      enMundo.copy(n.ancla.pos);
      gorra.localToWorld(enMundo);
      normalMundo.copy(n.ancla.normal).applyQuaternion(giroMundo);
      haciaCamara.copy(camara.position).sub(enMundo).normalize();
      const deCara = suave((normalMundo.dot(haciaCamara) - 0.05) / 0.25);
      const o = Math.min(suave((p - n.desde) / 0.03), 1 - suave((p - n.hasta + 0.03) / 0.03)) * deCara;

      n.el.style.opacity = o;
      n.g.style.opacity = o;
      if (o < 0.01) continue;

      const v = enMundo.clone().project(camara);
      const sx = (v.x + 1) / 2 * w, sy = (1 - v.y) / 2 * h;
      let d, lx, ly, largo;

      if (movil) {
        // Nota abajo, línea vertical desde el punto; deja sitio al círculo "-10%" si está a la vista
        const reserva = document.querySelector("#descuentoFlotante")?.hidden === false ? 66 : 0;
        n.el.style.width = `${w - 32 - reserva}px`;
        lx = 16 + reserva;
        ly = h - 30 - n.el.offsetHeight;
        d = `M${sx} ${sy} L${sx} ${ly - 14}`;
        largo = Math.abs(ly - 14 - sy);
      } else {
        // Nota en la columna lateral del lado más cercano, fuera de la gorra
        const lado = sx >= w / 2 ? 1 : -1;
        const ancho = n.el.offsetWidth, margen = Math.max(24, w * 0.05);
        n.el.classList.toggle("derecha", lado < 0);
        lx = lado > 0 ? w - margen - ancho : margen;
        ly = Math.min(h - 170, Math.max(24, sy - 90));
        const lineaY = ly + 30, codoX = sx + lado * 40;
        const finX = lado > 0 ? lx - 18 : lx + ancho + 18;
        d = `M${sx} ${sy} L${codoX} ${lineaY} L${finX} ${lineaY}`;
        largo = Math.hypot(40, lineaY - sy) + Math.abs(finX - codoX);
      }

      n.path.setAttribute("d", d);
      n.path.style.strokeDasharray = largo;
      n.path.style.strokeDashoffset = largo * (1 - o);
      for (const c of n.circulos) { c.setAttribute("cx", sx); c.setAttribute("cy", sy); }
      n.el.style.transform = `translate(${lx}px, ${ly + (1 - o) * 14}px)`;
    }
  }

  /* ---------- Oclusión ambiental: sombras de contacto en uniones y pliegues ---------- */
  let composer = null;
  if (POST) {
    const [{ EffectComposer }, { RenderPass }, { GTAOPass }, { OutputPass }] = POST;
    composer = new EffectComposer(renderer);
    composer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    composer.addPass(new RenderPass(escena, camara));
    const ao = new GTAOPass(escena, camara, 1, 1);
    ao.updateGtaoMaterial({ radius: 0.35, distanceExponent: 1.5, thickness: 1, scale: 1.2, samples: 16 });
    ao.blendIntensity = 0.85;
    composer.addPass(ao);
    composer.addPass(new OutputPass());
  }

  /* ---------- Tamaño ---------- */
  let movil = false;
  function ajustar() {
    const w = lienzo.clientWidth, h = lienzo.clientHeight;
    if (!w || !h) return;  // aún sin medidas (pestaña oculta o en carga)
    renderer.setSize(w, h, false);
    if (composer) composer.setSize(w, h);
    camara.aspect = w / h;
    camara.updateProjectionMatrix();
    movil = w / h < 0.8;
  }
  addEventListener("resize", ajustar);
  new ResizeObserver(ajustar).observe(lienzo);

  pintar(porId(colorActivo));
  ajustar();

  /* ---------- Interacción ---------- */
  const raton = { x: 0, y: 0 };
  addEventListener("pointermove", (e) => {
    raton.x = (e.clientX / innerWidth) * 2 - 1;
    raton.y = (e.clientY / innerHeight) * 2 - 1;
  });

  // Arrastrar para girar la gorra, con inercia
  let girado = 0, velGiro = 0, arrastrando = false, ultimoX = 0, giroAuto = true;
  // Al final gira sola; el botón lo para o lo reanuda
  btnGiro.addEventListener("click", () => {
    giroAuto = !giroAuto;
    btnGiro.classList.toggle("activo", giroAuto);
    btnGiro.textContent = giroAuto ? "Parar giro" : "Girar sola";
  });
  pegajoso.addEventListener("pointerdown", (e) => {
    if (e.target.closest("a, button")) return;
    arrastrando = true; ultimoX = e.clientX;
    lienzo.classList.add("arrastrando");
  });
  addEventListener("pointermove", (e) => {
    if (!arrastrando) return;
    velGiro = (e.clientX - ultimoX) * 0.009;
    girado += velGiro;
    ultimoX = e.clientX;
  });
  const soltar = () => { arrastrando = false; lienzo.classList.remove("arrastrando"); };
  addEventListener("pointerup", soltar);
  addEventListener("pointercancel", soltar);

  // Al cambiar de color, la gorra da un giro
  addEventListener("colorpardo", (e) => { pintar(e.detail); velGiro += 0.32; });

  let visible = true;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(intro);

  /* ---------- Vuelo ---------- */
  const V3 = (a) => new THREE.Vector3(...a);
  const curvaCamara = new THREE.CatmullRomCurve3(RUTA.map((k) => V3(k[1])), false, "centripetal");
  const curvaMira = new THREE.CatmullRomCurve3(RUTA.map((k) => V3(k[2])), false, "centripetal");

  function enRuta(p) {
    let i = 0;
    while (i < RUTA.length - 2 && p > RUTA[i + 1][0]) i++;
    const f = suave((p - RUTA[i][0]) / (RUTA[i + 1][0] - RUTA[i][0]));
    return (i + f) / (RUTA.length - 1);
  }

  const posCam = curvaCamara.getPoint(0), mira = curvaMira.getPoint(0);
  const objCam = new THREE.Vector3(), objMira = new THREE.Vector3(), tmp = new THREE.Vector3();
  const reloj = new THREE.Clock();
  let pAnterior = 0, inclina = 0;

  function bucle() {
    requestAnimationFrame(bucle);
    if (!visible) return;
    const p = progreso();
    const t = reloj.getElapsedTime();

    // Cámara sobre la ruta, suavizada
    const u = enRuta(p);
    curvaCamara.getPoint(u, objCam);
    curvaMira.getPoint(u, objMira);
    const lejos = suave((objCam.distanceTo(objMira) - 1.6) / 1.5);  // 0 dentro o pegado, 1 fuera
    if (movil) {
      tmp.subVectors(objCam, objMira).multiplyScalar(1 + 0.6 * lejos);
      objMira.y -= 0.4 * lejos;
      objCam.copy(objMira).add(tmp);
    }
    posCam.lerp(objCam, 0.09);
    mira.lerp(objMira, 0.09);
    camara.position.copy(posCam);
    camara.lookAt(mira);

    // Giro: arrastre con inercia; al final gira solo, durante el vuelo vuelve a su sitio
    if (!arrastrando) {
      girado += velGiro;
      velGiro *= 0.94;
      if (p > 0.95 && giroAuto) girado += 0.004;
      else girado += (Math.round(girado / (Math.PI * 2)) * Math.PI * 2 - girado) * 0.03;
    }
    giro.rotation.y = girado;

    // La gorra se inclina con la velocidad del scroll
    const vel = p - pAnterior;
    pAnterior = p;
    inclina += (Math.max(-0.3, Math.min(0.3, vel * 40)) * lejos - inclina) * 0.1;
    inclinacion.rotation.x = inclina;
    pivote.position.y = Math.sin(t * 1.1) * 0.03 * lejos;
    // El pelo se mece un poco: las puntas más que la raíz
    for (const { capa, f } of capasPelo) capa.position.x = Math.sin(t * 1.4 + f * 1.5) * 0.004 * f * f;

    // ¿Está la cámara dentro de la copa? (elipsoide con centro en la base)
    const r = Math.hypot(posCam.x, (posCam.y + 0.35) / 0.9, (posCam.z + 0.35) / 1.08);
    const dentroF = (1 - suave((r - 0.8) / 0.3)) * suave((posCam.y + 0.4) / 0.1);
    luzInterior.intensity = 2.5 * dentroF;

    // Dentro de la gorra se abre el ángulo para ver todas las cintas
    const fov = 30 + (movil ? 50 : 40) * dentroF;
    if (Math.abs(camara.fov - fov) > 0.05) { camara.fov = fov; camara.updateProjectionMatrix(); }

    // Linterna: delante de la cámara, desplazada hacia el ratón
    const entrada = suave((p - 0.06) / 0.08);
    linterna.intensity = 6 * entrada * (1 - 0.9 * dentroF);
    linterna.position.copy(camara.localToWorld(tmp.set(
      movil ? 0.6 : raton.x * 1.6, movil ? 0.4 : -raton.y * 1.1, -1.2,
    )));


    // Frase → foco → gorra
    const fraseO = 1 - suave((p - 0.025) / 0.06);
    frase.style.opacity = fraseO;
    frase.style.transform = `scale(${1 + (1 - fraseO) * 0.12})`;
    frase.style.filter = `blur(${(1 - fraseO) * 10}px)`;
    foco.style.opacity = suave((p - 0.06) / 0.1) * (0.35 + 0.65 * lejos);
    lienzo.style.opacity = entrada;
    desliza.style.opacity = 1 - suave(p / 0.04);
    cuenta.style.opacity = fraseO;
    const finalO = suave((p - 0.94) / 0.03);
    final.style.opacity = finalO;
    final.style.transform = `translateY(${(1 - finalO) * 20}px)`;
    final.classList.toggle("activo", finalO > 0.5);
    barra.style.height = `${p * 100}%`;

    if (!lienzo.clientWidth || !lienzo.clientHeight) return;
    if (composer) composer.render(); else renderer.render(escena, camara);
    pintarNotas(p, lienzo.clientWidth, lienzo.clientHeight);
  }

  bucle();
}
