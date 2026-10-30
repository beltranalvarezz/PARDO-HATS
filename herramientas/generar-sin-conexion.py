"""Genera pardoht-sin-conexion.html: la web entera en un único archivo que funciona sin internet.

Uso (desde la carpeta del proyecto, con conexión solo al generarlo):
    python herramientas/generar-sin-conexion.py

La primera vez instala Three.js y esbuild en herramientas/.cache (no se sube a git).
Vuelve a ejecutarlo después de cambiar la web para que la copia sin conexión esté al día.
"""
import base64
import mimetypes
import re
import shutil
import subprocess
import urllib.request
from pathlib import Path

H = Path(__file__).resolve().parent          # herramientas/
P = H.parent                                 # raíz del proyecto
B = H / ".cache"                             # dependencias y descargas
B.mkdir(exist_ok=True)

# Three.js empaquetado en un solo script (misma versión que usa la web)
if not (B / "node_modules" / "three").exists():
    (B / "package.json").write_text('{"private": true}', encoding="utf-8")
    subprocess.run("npm install --silent three@0.160.0 esbuild@0.24.0", cwd=B, shell=True, check=True)
shutil.copy(H / "entrada-three.js", B / "entrada.js")
subprocess.run("npx esbuild entrada.js --bundle --minify --format=iife --legal-comments=none --outfile=three-bundle.js",
               cwd=B, shell=True, check=True)

# Hoja de estilos de Google Fonts pidiendo formato woff2
peticion = urllib.request.Request(
    "https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;700;800;900&family=Dancing+Script:wght@600&family=Pacifico&family=Pinyon+Script&display=swap",
    headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"})
(B / "fuentes.css").write_bytes(urllib.request.urlopen(peticion).read())

leer = lambda f: (P / f).read_text(encoding="utf-8")


def dato(ruta):
    tipo = mimetypes.guess_type(str(ruta))[0]
    return f"data:{tipo};base64," + base64.b64encode((P / ruta).read_bytes()).decode()


usadas = ["img/logo-blanco.png", "img/logo-negro.png", "img/logo-rosa.png", "img/texturas/pelo-detalle.png",
          "img/favicon/icono-192.png", "img/favicon/apple-touch-icon.png", "img/bienvenida.webp"] + \
         [f"img/fotos/{c}-{n}.webp" for c in ("rosa", "negro") for n in range(1, 5)]
imagenes = {r: dato(r) for r in usadas}

# --- Tipografías: solo los alfabetos latinos, incrustadas en base64 ---
css_fuentes = (B / "fuentes.css").read_text(encoding="utf-8")
bloques = re.findall(r"/\* ([\w-]+) \*/\s*(@font-face \{.*?\})", css_fuentes, re.S)
grupos = {}
for subconjunto, bloque in bloques:
    if subconjunto not in ("latin", "latin-ext"):
        continue
    url = re.search(r"url\((https://[^)]+)\)", bloque).group(1)
    familia = re.search(r"font-family: '([^']+)'", bloque).group(1)
    peso = int(re.search(r"font-weight: (\d+)", bloque).group(1))
    rango = re.search(r"unicode-range: ([^;]+);", bloque).group(1)
    g = grupos.setdefault(url, {"familia": familia, "pesos": [], "rango": rango})
    g["pesos"].append(peso)
fuentes = []
for url, g in grupos.items():
    datos = base64.b64encode(urllib.request.urlopen(url).read()).decode()
    pesos = f"{min(g['pesos'])} {max(g['pesos'])}" if len(set(g["pesos"])) > 1 else str(g["pesos"][0])
    fuentes.append(f"@font-face {{ font-family: '{g['familia']}'; font-style: normal; font-weight: {pesos}; font-display: swap; "
                   f"src: url(data:font/woff2;base64,{datos}) format('woff2'); unicode-range: {g['rango']}; }}")

# --- JS: rutas de imágenes y Three.js empaquetado en lugar del CDN ---
script = leer("script.js")
for a, b in [('<image href="img/logo-${p.logo}.png"', '<image href="${window.__IMG["img/logo-" + p.logo + ".png"]}"'),
             ('<img src="img/fotos/${f}.webp"', '<img src="${window.__IMG["img/fotos/" + f + ".webp"]}"')]:
    assert a in script, f"script.js ha cambiado: no encuentro {a}"
    script = script.replace(a, b)

intro = leer("intro3d.js")
intro = intro.replace('THREE = await import("three");', "THREE = window.__PARDO.THREE;")
intro = intro.replace('({ RoomEnvironment } = await import("three/addons/environments/RoomEnvironment.js"));',
                      "({ RoomEnvironment } = window.__PARDO);")
intro, n = re.subn(r"POST = await Promise\.all\(\[.*?\]\)\.catch\(\(\) => null\);", "POST = window.__PARDO.POST;", intro, flags=re.S)
assert n == 1, "no encontré la carga del postproceso"
intro = intro.replace('cargar("img/logo-blanco.png")', 'cargar(window.__IMG["img/logo-blanco.png"])')
intro = intro.replace('loadAsync("img/texturas/pelo-detalle.png")', 'loadAsync(window.__IMG["img/texturas/pelo-detalle.png"])')
assert "await import(" not in intro and not re.search(r'\("img/', intro), "quedan cargas externas en intro3d.js"

seguro = lambda js: js.replace("</script", "<\\/script")
three = (B / "three-bundle.js").read_text(encoding="utf-8")

# --- HTML ---
html = leer("index.html")
for ruta, uri in imagenes.items():
    html = html.replace(f'"{ruta}"', f'"{uri}"')
html = re.sub(r'\s*<link rel="preconnect"[^>]*>', "", html)
html = re.sub(r'<link href="https://fonts\.googleapis\.com[^"]*" rel="stylesheet">', lambda m: "<style>\n" + "\n".join(fuentes) + "\n</style>", html)
html = re.sub(r'<link rel="stylesheet" href="estilos\.css[^"]*">', lambda m: "<style>\n" + leer("estilos.css") + "\n</style>", html)
html = re.sub(r'\s*<script type="importmap">.*?</script>', "", html, flags=re.S)
html = re.sub(r'<script src="script\.js[^"]*"></script>', lambda m:
              "<script>window.__IMG = " + repr(imagenes).replace("'", '"') + ";</script>\n"
              "  <script>\n" + seguro(script) + "\n  </script>\n"
              "  <script>\n" + seguro(three) + "\n  </script>", html)
html = re.sub(r'<script type="module" src="intro3d\.js[^"]*"></script>', lambda m: '<script type="module">\n' + seguro(intro) + "\n  </script>", html)
html = html.replace('href="favicon.ico"', f'href="{imagenes["img/favicon/icono-192.png"]}"')
html = re.sub(r'\s*<link rel="manifest"[^>]*>', "", html)  # el manifiesto solo sirve con la web publicada
html = re.sub(r"<title>(.*?)</title>", r"<title>\1 (sin conexión)</title>", html, count=1)

assert "https://cdn.jsdelivr" not in html and "fonts.googleapis" not in html
salida = P / "pardoht-sin-conexion.html"
salida.write_text(html, encoding="utf-8")
print(f"{salida.name}: {salida.stat().st_size / 1e6:.1f} MB, {len(fuentes)} fuentes, {len(imagenes)} imágenes")
