# PardoHT — Faith in me

Web de la marca de gorras PardoHT: intro en 3D que vuela alrededor y dentro de la gorra con el scroll, y ficha de compra con los dos colores (rosa y negro).

## Archivos
- `index.html` — estructura de la página.
- `estilos.css` — estilos.
- `script.js` — catálogo (nombre, precio, colores, fotos), galería, carrito y cuenta atrás.
- `intro3d.js` — gorra 3D (Three.js) y el recorrido de cámara del scroll.
- `img/` — logo y fotos de producto (`img/fotos/`).

## Cambios rápidos
- Nombre provisional del modelo: `NOMBRE_MODELO` en `script.js`.
- Precio y colores: lista `PRODUCTOS` en `script.js`.
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

## Pendiente
- Conectar el pago (Shopify o Stripe).
- Añadir TikTok en el pie cuando exista la cuenta (Instagram ya enlaza a @pardoht).
