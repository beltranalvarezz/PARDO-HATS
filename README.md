# PardoHT — Faith in me

Web de la marca de gorras PardoHT: intro en 3D que vuela alrededor y dentro de la gorra con el scroll, y ficha de compra con los dos colores (rosa y negro).

## Archivos
- `index.html` — estructura de la página.
- `estilos.css` — estilos.
- `script.js` — catálogo (nombre, precio, colores, fotos), galería, carrito y cuenta atrás.
- `intro3d.js` — gorra 3D (Three.js) y el recorrido de cámara del scroll.
- `img/` — logo, fotos de producto (`img/fotos/`, en WebP para la web y JPG de respaldo), favicons (`img/favicon/`) e imagen para redes (`og-pardoht.jpg`).
- `privacidad.html`, `condiciones.html` y `legal.js` — páginas legales (borradores) y su script.
- `404.html` — página de error propia (GitHub Pages la usa sola).
- `robots.txt`, `sitemap.xml`, `site.webmanifest`, `favicon.ico` — buscadores, iconos y app.

## Cambios rápidos
- Nombre provisional del modelo: `NOMBRE_MODELO` en `script.js`.
- Precio y colores: lista `PRODUCTOS` en `script.js`.
- Precios por pack (2 = 63,40 €, 3 = 89,70 €, 4 = 113,40 €, cada gorra extra 28,33 €): `PACKS` y `EXTRA_DESDE_4` en `script.js`. Hay que configurar el mismo descuento en la tienda que cobre. Máximo 15 gorras por pedido (`MAX_CARRITO`; en la ficha se pueden elegir hasta 99 con `MAX_SELECTOR`, pero al carrito solo entran 15); el aviso "Añade 1 más y te sale a…" sale hasta llegar a 15.
- Envío (4,95 € con una gorra, gratis desde 2): `ENVIO` y `ENVIO_GRATIS_DESDE` en `script.js`; el precio también sale en `condiciones.html` y en la ficha ("Envíos y devoluciones"). La tienda que cobre tiene que aplicar la misma regla. El "AHORRAS" de cada pack ya cuenta los 4,95 € del envío gratis.
- Con un solo color en el carrito se ofrece el otro al precio de pack; si el cliente pulsa "No, gracias" no vuelve a salir en esa visita.
- Fecha del próximo drop: `FECHA_DROP` en `script.js`.
- Recorrido de la cámara: lista `RUTA` en `intro3d.js`.

## Verla en local
```bash
python -m http.server 5501
```
y abrir http://localhost:5501

## Copia sin conexión
`pardoht-sin-conexion.html` es la web entera en un solo archivo (imágenes, tipografías y Three.js dentro): se abre con doble clic sin internet.
Es una foto fija de la web: después de cambiarla, vuelve a generarla con
```bash
python herramientas/generar-sin-conexion.py
```

## Antes de publicar
- Rellenar los huecos entre [corchetes] de `privacidad.html` y `condiciones.html` (titular, NIF, dirección, email, proveedores, coste de envío) y que los revise un asesor.
- La dirección supuesta es `https://beltranalvarezz.github.io/PARDO-HATS/` (en `index.html`, `robots.txt`, `sitemap.xml` y las páginas legales). Si hay dominio propio, cambiarla ahí.
- En GitHub → Settings → Pages: publicar desde `main` y marcar **Enforce HTTPS**.
- Analítica: poner el dominio de Plausible o el ID de GA4 en `ANALITICA` (`script.js`). Solo se carga si el visitante acepta las cookies.
- Conectar el formulario de acceso anticipado a un servicio de emails (Brevo, Mailchimp…).

## Pendiente
- Conectar el pago (Shopify o Stripe).
- Añadir TikTok en el pie cuando exista la cuenta (Instagram ya enlaza a @pardoht).
