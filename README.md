# 🛍️ Glass Store: tienda de ropa en línea

Una app para celular hecha con **Expo (React Native)**, con estilo **glassmorphism minimalista**,
conectada a **3 microservicios en Node.js** desplegados en **Render**, con una base de datos
**PostgreSQL en Render** y una base de datos **SQLite local en el teléfono**.

## Funciones

**Como cliente**
- Registro e inicio de sesión (contraseñas encriptadas y token JWT)
- Catálogo con fotos reales, filtro por categoría y control de **stock** ("Agotado")
- Carrito guardado en el teléfono (SQLite)
- Pago **simulado** que descuenta stock, factura en pantalla, **PDF descargable** e impresión
- Historial de compras con el estado del pedido (pagado → enviado → entregado)
- Modo sin conexión: catálogo y compras guardados en SQLite

**Como administrador** (sección dentro de la misma app)
- Resumen de la tienda: ventas, pedidos y productos agotados
- Crear, editar y eliminar productos; cambiar precio, **stock** e **imagen**
- Subir la foto del producto desde la galería o pegar una URL
- Cambiar el estado de cada pedido

**Para desarrolladores**
- Documentación **Swagger** de cada microservicio en `/docs`

## Usuarios de prueba

| Rol | Email | Contraseña |
|---|---|---|
| Cliente | `demo@tienda.com` | `123456` |
| Administrador | `admin@tienda.com` | `admin123` |

**Tarjetas para el pago simulado:** cualquier tarjeta de 16 dígitos es aprobada
(ej. `4111 1111 1111 1111`, vence `12/28`, CVV `123`); las que terminan en `0000`
son rechazadas, para probar errores.

---

## Arquitectura

```
                 ┌──────────────────────────────┐
                 │  APP EXPO (celular o web)    │
                 │  SQLite local:               │
                 │   sesión · carrito · caché   │
                 └──────┬─────────┬─────────┬───┘
                        │ HTTPS   │         │
          ┌─────────────▼──┐ ┌────▼──────┐ ┌▼──────────────────┐
          │ tienda-usuarios│ │ tienda-   │ │ tienda-pedidos    │
          │ /registro      │ │ productos │ │ POST /pedidos     │
          │ /login (JWT    │ │ CRUD admin│ │ (descuenta stock) │
          │  con rol)      │ │ + stock   │ │ /admin/pedidos    │
          │ /docs          │ │ /docs     │ │ /docs             │
          └───────┬────────┘ └────┬──────┘ └────────┬──────────┘
                  │               │                 │
                  └───────────────┼─────────────────┘
                          ┌───────▼────────┐
                          │ PostgreSQL     │  (Render)
                          │ usuarios       │
                          │ productos      │  <- stock e imagen viven aquí
                          │ pedidos        │
                          │ pedido_items   │
                          └────────────────┘
```

- **usuarios**: cuentas y login. El token JWT lleva el **rol** (`cliente` o `admin`).
- **productos**: catálogo con stock e imagen. Las rutas de escritura piden rol `admin`.
- **pedidos**: la compra ocurre en **una transacción**: descuenta el stock
  (`UPDATE ... WHERE stock >= cantidad`), toma los **precios reales** de la tabla
  de productos, simula el pago y guarda la factura. Si algo falla, nada se guarda
  y el stock vuelve a quedar como estaba.
- Los 3 servicios comparten el `JWT_SECRET` (validan el token sin llamarse entre sí)
  y la misma base de datos PostgreSQL.
- **Las imágenes** se guardan en la columna `imagen` de la tabla `productos`:
  una URL `https://...` o la foto en base64 (`data:image/jpeg;base64,...`).
  Así sobreviven a los reinicios de Render (su disco gratuito no es permanente).

### ¿Por qué hay dos bases de datos?

| Base de datos | Dónde vive | Qué guarda |
|---|---|---|
| **PostgreSQL** | Render (en línea) | La información oficial: usuarios, productos (stock, imagen), pedidos |
| **SQLite** | El teléfono | La sesión, el carrito y una copia del catálogo y del historial para verlos sin internet |

En el navegador, el papel de SQLite lo hace `localStorage` (`mobile/lib/db.web.js`).

---

## Estructura de carpetas

```
ComercioApp/
├── render.yaml                  ← despliega todo en Render con un clic
├── backend/
│   ├── usuarios/
│   │   ├── index.js             ← /registro, /login, /perfil (roles)
│   │   └── swagger.js           ← documentación de la API
│   ├── productos/
│   │   ├── index.js             ← catálogo + CRUD de admin (stock, imagen)
│   │   ├── productos-iniciales.js  ← catálogo inicial (solo primera vez)
│   │   └── swagger.js
│   └── pedidos/
│       ├── index.js             ← compra transaccional, estados, admin
│       ├── pago-simulado.js     ← reglas del pago falso
│       └── swagger.js
└── mobile/                      ← app Expo (Expo Router)
    ├── app/                     ← PANTALLAS: cada archivo es una ruta
    │   ├── _layout.js           ← navegación y protección por sesión/rol
    │   ├── login.js  registro.js
    │   ├── (tabs)/              ← catálogo, carrito, compras, perfil
    │   ├── producto/[id].js     ← detalle con tallas, cantidad y stock
    │   ├── pago.js              ← formulario del pago simulado
    │   ├── factura/[id].js      ← factura + PDF + imprimir
    │   └── admin/               ← SOLO ADMINISTRADOR
    │       ├── index.js         ← resumen y estados de pedidos
    │       ├── productos.js     ← lista con stock, editar, eliminar
    │       └── producto.js      ← crear/editar producto + foto
    ├── components/              ← Fondo, Tarjeta, Boton, Campo, Encabezado,
    │                              ImagenProducto, EstadoPedido
    └── lib/
        ├── config.js            ← URLs y datos de la tienda (variables EXPO_PUBLIC_*)
        ├── tema.js              ← EDITA AQUÍ los colores del glassmorphism
        ├── api.js               ← llamadas a los microservicios (cliente y admin)
        ├── db.js / db.web.js    ← SQLite (celular) / localStorage (navegador)
        ├── AuthContext.js       ← sesión y rol
        ├── facturaPdf.js        ← PDF en el celular (expo-print + compartir)
        ├── facturaPdf.web.js    ← PDF en el navegador (jsPDF, descarga directa)
        ├── confirmar.js         ← diálogo de confirmación celular/web
        └── formato.js           ← formato de dinero y fechas
```

---

## 1. Desplegar todo en Render

1. Sube esta carpeta a un repositorio de **GitHub**.
2. En [render.com](https://render.com), **New → Blueprint** y elige el repositorio
   (si ya lo tienes, Render redespliega solo con cada push).
3. `render.yaml` crea: la base `tienda-db`, los 3 microservicios y el sitio
   `tienda-web` (la misma app Expo exportada para navegador).
4. Abre la URL de cada microservicio: debes ver `{"servicio":"...","estado":"ok"}`,
   y en `/docs` su documentación Swagger.

### Variables de entorno (Render → servicio → *Environment*)

| Servicio | Variable | Para qué sirve |
|---|---|---|
| los 3 del backend | `DATABASE_URL` | URL de la base de datos (Render la llena con `tienda-db`) |
| los 3 del backend | `DATABASE_SSL` | Opcional: `true`/`false` para forzar SSL con otra base |
| los 3 del backend | `JWT_SECRET` | Secreto de los tokens (grupo `tienda-secretos`, igual en los 3) |
| pedidos | `IVA` | Impuesto, ej. `0.12` |
| tienda-web | `EXPO_PUBLIC_USUARIOS_URL` / `_PRODUCTOS_URL` / `_PEDIDOS_URL` | URLs públicas de los microservicios |
| tienda-web | `EXPO_PUBLIC_MONEDA`, `EXPO_PUBLIC_IVA`, `EXPO_PUBLIC_TIENDA_…` | Moneda, IVA y datos de la factura |

> ⚠️ Las variables `EXPO_PUBLIC_…` se copian dentro de la app **al compilarla**.
> Tras cambiarlas: **Manual Deploy → Clear build cache & deploy** en `tienda-web`.

> 💤 En el plan gratis los servicios se duermen a los 15 minutos; la primera
> petición puede tardar ~1 minuto.

## 2. Correr la app en el celular

```bash
cd mobile
npm install
npx expo start
```

Escanea el QR con **Expo Go**. Para usar microservicios corriendo en tu PC,
copia `mobile/.env.example` como `mobile/.env` y usa la IP de tu PC.

## 3. (Opcional) Correr los microservicios en tu PC

En cada carpeta de `backend/`: copia `.env.example` como `.env` (con la
External Database URL de Render), y luego `npm install` y `npm run dev`.

---

## Cómo modificar cosas comunes

| Quiero… | Dónde |
|---|---|
| Cambiar colores o el estilo de vidrio | `mobile/lib/tema.js` |
| Agregar/editar productos, stock e imágenes | En la app: Perfil → Panel de administración |
| Cambiar nombre, NIT, moneda, IVA | Variables de entorno (tabla de arriba) |
| Cambiar las reglas del pago simulado | `backend/pedidos/pago-simulado.js` |
| Cambiar el diseño de la factura | `mobile/lib/facturaPdf.js` (celular) y `facturaPdf.web.js` (web) |
| Agregar una pantalla | Crea un archivo en `mobile/app/` (Expo Router lo convierte en ruta) |
| Agregar estados de pedido | `ESTADOS` en `backend/pedidos/index.js` y `components/EstadoPedido.js` |

## Flujo de una compra (para explicarlo)

1. **Login**: `usuarios/login` devuelve un token (con rol) que se guarda en SQLite.
2. **Catálogo**: la app consulta `productos/productos` (PostgreSQL) y cachea la lista.
3. **Carrito**: se guarda en el teléfono (tabla `carrito` de SQLite).
4. **Pago**: la app envía `productoId + talla + cantidad` y la tarjeta simulada.
5. El servicio de **pedidos**, en una sola transacción: descuenta stock, toma los
   precios reales, simula el pago y guarda `pedidos` + `pedido_items`.
6. **Factura**: se muestra en pantalla y se descarga como PDF (expo-print en el
   celular, jsPDF en el navegador).
7. **Administrador**: ve el pedido en su panel y lo marca como enviado/entregado.
