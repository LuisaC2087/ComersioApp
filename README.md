# 🛍️ Glass Store: tienda de ropa en línea

Una app para celular hecha con **Expo (React Native)**, con estilo **glassmorphism**,
que se conecta a **3 microservicios en Node.js** desplegados en **Render**, con una base de datos
**PostgreSQL en Render** y una base de datos **SQLite local en el teléfono**.

## Funciones

- Registro e inicio de sesión (contraseñas encriptadas y token JWT)
- Catálogo de productos con filtro por categoría
- Detalle del producto con talla y cantidad
- Carrito de compras guardado en el teléfono (SQLite)
- Pago **simulado**, sin pasarela real
- Factura en pantalla y descarga en **PDF**
- Historial de compras
- Modo sin conexión: el catálogo y las compras se guardan en SQLite

---

## Arquitectura

```
                 ┌──────────────────────────────┐
                 │  APP EXPO (celular)          │
                 │  SQLite local:               │
                 │   sesión · carrito · caché   │
                 └──────┬─────────┬─────────┬───┘
                        │ HTTPS   │         │
          ┌─────────────▼──┐ ┌────▼──────┐ ┌▼──────────────────┐
          │ tienda-usuarios│ │ tienda-   │ │ tienda-pedidos    │
          │ /registro      │ │ productos │ │ POST /pedidos     │──┐ pregunta los
          │ /login         │ │ /productos│◄┼─(precios reales)  │  │ precios reales
          │ /perfil        │ │ /categorias│ │ GET  /pedidos     │◄─┘
          └───────┬────────┘ └────┬──────┘ │ GET  /pedidos/:id │
                  │               │        └────────┬──────────┘
                  └───────────────┼─────────────────┘
                          ┌───────▼────────┐
                          │ PostgreSQL     │  (Render)
                          │ usuarios       │
                          │ productos      │
                          │ pedidos        │
                          │ pedido_items   │
                          └────────────────┘
```

- **usuarios**: crea cuentas, valida el login y entrega un **token JWT**.
- **productos**: entrega el catálogo. La primera vez que arranca carga 12 prendas de ejemplo.
- **pedidos**: recibe el carrito, **le pregunta los precios al servicio de productos**
  (así nadie puede cambiar precios desde el celular), simula el pago, guarda la compra
  y devuelve la factura.
- Los 3 servicios comparten el mismo `JWT_SECRET`, así el servicio de pedidos sabe
  quién es el usuario sin tener que llamar al de usuarios.

### ¿Por qué hay dos bases de datos?

| Base de datos | Dónde vive | Qué guarda |
|---|---|---|
| **PostgreSQL** | Render (en línea) | La información oficial: usuarios, productos, pedidos y facturas |
| **SQLite** | El teléfono | La sesión, el carrito y una copia del catálogo y del historial para verlos sin internet |

---

## Estructura de carpetas

```
ComercioApp/
├── render.yaml                  ← despliega todo en Render con un clic
├── backend/
│   ├── usuarios/                ← microservicio 1
│   │   ├── index.js             ← rutas: /registro, /login, /perfil
│   │   └── db.js                ← conexión a PostgreSQL
│   ├── productos/               ← microservicio 2
│   │   ├── index.js             ← rutas: /productos, /categorias
│   │   └── productos-iniciales.js  ← EDITA AQUÍ el catálogo
│   └── pedidos/                 ← microservicio 3
│       ├── index.js             ← rutas: /pedidos
│       └── pago-simulado.js     ← reglas del pago falso
└── mobile/                      ← app Expo (con Expo Router)
    ├── app/                     ← PANTALLAS: cada archivo es una ruta
    │   ├── _layout.js           ← navegación raíz y protección por sesión
    │   ├── login.js             ← /login
    │   ├── registro.js          ← /registro
    │   ├── (tabs)/              ← pestañas inferiores
    │   │   ├── _layout.js       ← barra de pestañas de vidrio
    │   │   ├── index.js         ← /           (catálogo)
    │   │   ├── carrito.js       ← /carrito
    │   │   ├── historial.js     ← /historial  (mis compras)
    │   │   └── perfil.js        ← /perfil
    │   ├── producto/[id].js     ← /producto/5
    │   ├── pago.js              ← /pago
    │   └── factura/[id].js      ← /factura/12
    ├── components/              ← Fondo, Tarjeta (vidrio), Boton, Campo, Encabezado
    └── lib/
        ├── config.js            ← EDITA AQUÍ las URLs, la moneda y los datos de la tienda
        ├── tema.js              ← EDITA AQUÍ los colores del glassmorphism
        ├── api.js               ← llamadas a los microservicios
        ├── db.js                ← base de datos SQLite local
        ├── AuthContext.js       ← manejo de la sesión
        ├── facturaPdf.js        ← genera el PDF de la factura
        └── formato.js           ← formato de dinero y fechas
```

> **Expo Router:** la carpeta `app/` define la navegación. Para agregar una pantalla
> basta con crear un archivo, por ejemplo `app/ofertas.js`, y navegar con `router.push('/ofertas')`.
> Las carpetas entre paréntesis, como `(tabs)`, agrupan pantallas sin cambiar la URL.

---

## 1. Desplegar todo en Render

1. Sube esta carpeta a un repositorio de **GitHub**.
2. En [render.com](https://render.com), ve a **New → Blueprint** y elige el repositorio.
3. Render lee `render.yaml` y crea automáticamente:
   - la base de datos `tienda-db` (PostgreSQL gratis)
   - los servicios `tienda-usuarios`, `tienda-productos` y `tienda-pedidos`
   - un `JWT_SECRET` aleatorio compartido por los servicios
   - el sitio web `tienda-web`: **la misma app Expo, exportada para navegador**
4. Espera a que todo diga **Live** y abre la URL de cada microservicio.
   Deberías ver algo como `{"servicio":"productos","estado":"ok"}`.
5. Configura las **variables de entorno** (siguiente sección) con las URLs reales.
6. Abre la URL de **tienda-web** para usar la app desde cualquier navegador,
   también desde el celular.

> 🌐 En la versión web, "Descargar PDF" abre el diálogo de imprimir: elige **Guardar como PDF**.
> En el navegador, la sesión y el carrito se guardan en `localStorage` (`mobile/lib/db.web.js`);
> en el celular se usa SQLite (`mobile/lib/db.js`). Expo elige el archivo correcto automáticamente.

### Variables de entorno (se configuran en Render → servicio → *Environment*)

| Servicio | Variable | Para qué sirve |
|---|---|---|
| usuarios, productos, pedidos | `DATABASE_URL` | URL de la base de datos. Render la llena sola con `tienda-db`; puedes poner la de otra base. |
| usuarios, productos, pedidos | `DATABASE_SSL` | Opcional: `true` o `false` para forzar SSL (por ejemplo con una base externa). |
| usuarios, pedidos | `JWT_SECRET` | Secreto de los tokens (grupo `tienda-secretos`, debe ser igual en ambos). |
| pedidos | `PRODUCTOS_URL` | URL pública del servicio de productos, ej. `https://tienda-productos.onrender.com` |
| pedidos | `IVA` | Impuesto, ej. `0.12` |
| **tienda-web** | `EXPO_PUBLIC_USUARIOS_URL` | URL pública del servicio de usuarios |
| **tienda-web** | `EXPO_PUBLIC_PRODUCTOS_URL` | URL pública del servicio de productos |
| **tienda-web** | `EXPO_PUBLIC_PEDIDOS_URL` | URL pública del servicio de pedidos |
| **tienda-web** | `EXPO_PUBLIC_MONEDA`, `EXPO_PUBLIC_IVA` | Moneda e IVA que muestra la app |
| **tienda-web** | `EXPO_PUBLIC_TIENDA_NOMBRE`, `_NIT`, `_DIRECCION`, `_TELEFONO` | Datos de la factura |

> ⚠️ **Las variables `EXPO_PUBLIC_…` se copian dentro de la app al compilarla.**
> Después de cambiarlas, en **tienda-web** usa **Manual Deploy → Clear build cache & deploy**.

> ℹ️ Las URLs públicas de cada servicio aparecen arriba en su página de Render
> (algo como `https://tienda-usuarios-xxxx.onrender.com`). Cópialas sin `/` al final.

> ℹ️ Si cambias en el panel una variable que también tiene valor en `render.yaml`
> (`IVA`, `EXPO_PUBLIC_MONEDA`…), cámbiala también en `render.yaml`; si no, Render
> puede restaurarla la próxima vez que sincronice el Blueprint.

> 💤 En el plan gratis, los servicios se "duermen" después de 15 minutos sin uso.
> La primera petición puede tardar unos 50 segundos; después responden rápido.

## 2. Correr la app en el celular

```bash
cd mobile
npm install
npx expo start
```

Escanea el código QR con la app **Expo Go** (Android o iPhone).

**Usuario de prueba:** `demo@tienda.com` / `123456`

**Tarjetas para el pago simulado:**
- `4111 1111 1111 1111`, cualquier vencimiento futuro (ej. `12/28`) y CVV `123` → ✅ aprobado
- cualquier tarjeta que termine en `0000` → ❌ rechazado (para mostrar errores)

## 3. (Opcional) Correr los microservicios en tu PC

Cada servicio tiene un `.env.example`. Cópialo como `.env` y pon la
**External Database URL** de tu base de datos en Render:

```bash
cd backend/usuarios
npm install
npm run dev
```

Haz lo mismo en `productos` (puerto 3002) y `pedidos` (puerto 3003).
Luego copia `mobile/.env.example` como `mobile/.env` y pon la IP de tu PC,
por ejemplo `EXPO_PUBLIC_USUARIOS_URL=http://192.168.1.50:3001`.

---

## Cómo modificar cosas comunes

| Quiero… | Archivo |
|---|---|
| Cambiar colores o el estilo de vidrio | `mobile/lib/tema.js` |
| Cambiar las URLs de los microservicios | Variables `EXPO_PUBLIC_…_URL` (Render o `mobile/.env`) |
| Cambiar nombre, NIT o dirección de la tienda | Variables `EXPO_PUBLIC_TIENDA_…` |
| Cambiar la moneda | Variable `EXPO_PUBLIC_MONEDA` |
| Agregar o editar productos | `backend/productos/productos-iniciales.js` (solo se cargan si la tabla está vacía) o insertar directo en la tabla `productos` |
| Usar fotos en vez de emojis | Pon una URL en el campo `imagen` del producto |
| Cambiar el IVA | Variable `IVA` (servicio pedidos) y `EXPO_PUBLIC_IVA` (tienda-web) |
| Cambiar las reglas del pago simulado | `backend/pedidos/pago-simulado.js` |
| Cambiar el diseño de la factura PDF | `mobile/lib/facturaPdf.js` (es HTML normal) |
| Agregar una pantalla | Crea un archivo en `mobile/app/` (Expo Router lo convierte en ruta) |

---

## Flujo de una compra (para explicarlo)

1. **Login**: la app envía email y contraseña a `usuarios/login`. Recibe un **token**
   y lo guarda en **SQLite**, así la próxima vez entra directo.
2. **Catálogo**: la app pide `productos/productos` y guarda una copia en SQLite.
3. **Carrito**: al tocar "Añadir", el producto se guarda en la tabla `carrito` de SQLite.
4. **Pago**: la app envía a `pedidos/pedidos` solo `productoId + talla + cantidad`
   y los datos de la tarjeta, junto con el token.
5. El servicio de **pedidos**:
   - verifica el token;
   - pide el precio real de cada producto al servicio de **productos**;
   - calcula subtotal, IVA y total;
   - **simula** el pago (solo guarda los últimos 4 dígitos de la tarjeta);
   - guarda el pedido en PostgreSQL dentro de una **transacción**.
6. **Factura**: la app muestra la factura y, con `expo-print`, la convierte en PDF
   para guardarla o compartirla.
7. **Historial**: la app pide `pedidos/pedidos` y muestra todas las compras del usuario.
