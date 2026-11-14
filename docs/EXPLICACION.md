# Cómo funciona Glass Store, pieza por pieza

Este documento explica **todo** el sistema: qué hace cada parte, cómo se comunican
y por qué se hizo así. Está pensado para que puedas entenderlo, explicarlo y
modificarlo.

---

## Índice

1. [La idea general](#1-la-idea-general)
2. [Tecnologías usadas y para qué](#2-tecnologías-usadas-y-para-qué)
3. [La base de datos (PostgreSQL)](#3-la-base-de-datos-postgresql)
4. [Los microservicios (backend)](#4-los-microservicios-backend)
5. [La seguridad: tokens JWT y roles](#5-la-seguridad-tokens-jwt-y-roles)
6. [La compra paso a paso (la parte más importante)](#6-la-compra-paso-a-paso)
7. [La app (frontend con Expo)](#7-la-app-frontend-con-expo)
8. [La base de datos local (SQLite)](#8-la-base-de-datos-local-sqlite)
9. [El estilo glassmorphism](#9-el-estilo-glassmorphism)
10. [La factura en PDF](#10-la-factura-en-pdf)
11. [Las imágenes de los productos](#11-las-imágenes-de-los-productos)
12. [El panel de administrador](#12-el-panel-de-administrador)
13. [El despliegue en Render](#13-el-despliegue-en-render)
14. [La documentación Swagger](#14-la-documentación-swagger)
15. [Limitaciones conocidas](#15-limitaciones-conocidas)

---

## 1. La idea general

El sistema tiene **tres capas**:

```
┌─────────────────────────────────────────────────────────────┐
│ 1. LA APP (lo que ve el usuario)                            │
│    Expo / React Native. Funciona en el celular (Expo Go) y  │
│    en el navegador (sitio tienda-web en Render).            │
│    Guarda sesión, carrito y copias en SQLite (local).       │
└──────────────┬──────────────────┬──────────────────┬────────┘
               │ HTTP + JSON      │                  │
┌──────────────▼───┐  ┌───────────▼──────┐  ┌────────▼─────────┐
│ 2. usuarios      │  │ 2. productos     │  │ 2. pedidos       │
│ login, registro  │  │ catálogo, stock  │  │ compras, factura │
│ (Node + Express) │  │ (Node + Express) │  │ (Node + Express) │
└──────────────┬───┘  └───────────┬──────┘  └────────┬─────────┘
               └──────────────────┼──────────────────┘
                       ┌──────────▼──────────┐
                       │ 3. PostgreSQL       │
                       │ (en Render)         │
                       └─────────────────────┘
```

- **La app** nunca toca la base de datos directamente: siempre le pide las cosas a
  un microservicio por HTTP (por ejemplo `GET /productos`).
- **Cada microservicio** es un programa independiente de Node.js, con su propia URL,
  que se encarga de **un solo tema** (usuarios, productos o pedidos).
- **PostgreSQL** guarda la información oficial y permanente.

> **¿Por qué microservicios?** Cada servicio se puede desplegar, reiniciar o
> modificar sin tocar los otros. Si mañana quieres cambiar cómo funciona el login,
> solo tocas `backend/usuarios`.

---

## 2. Tecnologías usadas y para qué

| Tecnología | Dónde | Para qué |
|---|---|---|
| **Expo (SDK 58)** | `mobile/` | Framework para hacer apps con React Native sin compilar código nativo |
| **Expo Router** | `mobile/app/` | Navegación: cada archivo dentro de `app/` es una pantalla |
| **expo-sqlite** | `mobile/lib/db.js` | Base de datos local en el celular |
| **expo-blur** | `components/Tarjeta.js` | El desenfoque del efecto vidrio |
| **expo-linear-gradient** + **react-native-svg** | `components/Fondo.js` | El fondo degradado con luces difuminadas |
| **expo-print** + **expo-sharing** | `lib/facturaPdf.js` | Generar y compartir el PDF en el celular |
| **jsPDF** | `lib/facturaPdf.web.js` | Generar y descargar el PDF en el navegador |
| **expo-image-picker** | `app/admin/producto.js` | Elegir la foto del producto desde la galería |
| **@expo/vector-icons** | toda la app | Íconos de línea (Ionicons) |
| **Node.js + Express 5** | `backend/*` | Servidores HTTP de los microservicios |
| **pg** | `backend/*/db.js` | Conectarse a PostgreSQL desde Node |
| **bcryptjs** | `backend/usuarios` | Encriptar contraseñas |
| **jsonwebtoken** | `backend/*` | Crear y validar los tokens de sesión (JWT) |
| **swagger-ui-express** | `backend/*/swagger.js` | Página de documentación `/docs` |
| **Render** | `render.yaml` | Hosting de la base de datos, los servicios y el sitio web |

---

## 3. La base de datos (PostgreSQL)

Los tres microservicios usan **la misma base de datos**, pero cada uno crea y
maneja **sus propias tablas**.

```
usuarios                     productos                    producto_tallas
─────────────────            ─────────────────            ─────────────────────
id          (PK)             id          (PK) ◄───────────producto_id (FK)
nombre                       nombre                       id          (PK)
email       (único)          descripcion                  talla       "S", "M"...
password    (encriptada)     precio                       stock       (≥ 0)
rol         cliente|admin    categoria                    UNIQUE(producto_id, talla)
creado_en                    imagen      URL o base64

pedidos                      pedido_items
─────────────────            ─────────────────
id          (PK) ◄───────────pedido_id   (FK)
usuario_id                   id          (PK)
cliente_nombre               producto_id
cliente_email                nombre      (copia)
subtotal, impuesto, total    talla
metodo_pago "Tarjeta ****1111" cantidad
referencia_pago              precio      (copia del precio al comprar)
estado      pagado|enviado|entregado|cancelado
fecha
```

### Puntos clave

- **El stock vive en `producto_tallas`**, una fila por cada talla de cada producto.
  Así la camisa puede tener 5 en S y 0 en M.
  - `CHECK (stock >= 0)`: la base de datos rechaza un stock negativo.
  - `UNIQUE (producto_id, talla)`: no puede haber dos filas "M" del mismo producto.
  - `ON DELETE CASCADE`: si se borra un producto, sus tallas se borran solas.
- **`pedido_items` copia el nombre y el precio** del producto al momento de la
  compra. Si mañana el admin sube el precio o borra el producto, las facturas
  viejas no cambian.
- **Las tablas se crean solas**: cada servicio, al arrancar, ejecuta
  `CREATE TABLE IF NOT EXISTS ...` (función `prepararBaseDeDatos`). No hay que
  correr ningún script a mano.
- **Migración automática**: la versión anterior guardaba las tallas como texto
  (`"S,M,L"`) y un solo stock. Al arrancar, el servicio de productos detecta esas
  columnas viejas, pasa los datos a `producto_tallas` (cada talla recibe el stock
  que tenía el producto) y las borra. Esto está en `migrarVersionAnterior()`.

---

## 4. Los microservicios (backend)

### 4.1 La estructura que comparten los tres

Todos los `index.js` siguen el mismo orden, así cuando entiendes uno entiendes
los tres:

```js
// 1. Importar librerías y leer variables de entorno
const PORT = process.env.PORT || 3002;
const JWT_SECRET = process.env.JWT_SECRET || 'secreto-local';

// 2. Crear la app de Express
const app = express();
app.use(cors());          // permite que la app (otro dominio) haga peticiones
app.use(express.json());  // convierte el cuerpo JSON de la petición en req.body
app.use('/docs', ...);    // documentación Swagger

// 3. Preparar la base de datos (crear tablas, datos iniciales)
async function prepararBaseDeDatos() { ... }

// 4. Funciones de ayuda (validar, autenticar, etc.)

// 5. Rutas: app.get(...), app.post(...), ...

// 6. Manejador de errores: cualquier error responde 500 en JSON
app.use((err, req, res, next) => { ... });

// 7. Arranque: primero la base de datos, después escuchar el puerto
prepararBaseDeDatos().then(() => app.listen(PORT));
```

**`db.js`** (igual en los tres) crea un *pool* de conexiones a PostgreSQL usando
`DATABASE_URL`. Activa SSL automáticamente si la URL es la externa de Render
(la que usas desde tu PC), o si pones `DATABASE_SSL=true`.

> **Express 5** captura solo los errores de las funciones `async`: si una consulta
> falla, el error llega al manejador del paso 6 y el servidor no se cae.

### 4.2 Servicio de usuarios (`backend/usuarios`)

| Ruta | Qué hace |
|---|---|
| `POST /registro` | Valida datos, verifica que el email no exista, encripta la contraseña con **bcrypt** y crea el usuario con rol `cliente`. Devuelve un token. |
| `POST /login` | Busca el email, compara la contraseña con `bcrypt.compare` y devuelve un token. |
| `GET /perfil` | Devuelve los datos del dueño del token. |

- Las contraseñas **nunca se guardan en texto**: se guarda un *hash* de bcrypt.
  Ni siquiera el administrador de la base puede leerlas.
- Al arrancar crea dos usuarios de prueba: `demo@tienda.com` (cliente) y
  `admin@tienda.com` (administrador).

### 4.3 Servicio de productos (`backend/productos`)

| Ruta | Quién | Qué hace |
|---|---|---|
| `GET /productos` | todos | Lista el catálogo (opcional `?categoria=Camisas`) |
| `GET /productos/:id` | todos | Un producto |
| `GET /categorias` | todos | Las categorías distintas |
| `POST /productos` | admin | Crea un producto con sus tallas |
| `PUT /productos/:id` | admin | Modifica datos, tallas, stock e imagen |
| `DELETE /productos/:id` | admin | Elimina el producto (y sus tallas) |

**Cómo arma la respuesta.** Una sola consulta junta cada producto con sus tallas:

```sql
SELECT p.*,
       JSON_AGG(JSON_BUILD_OBJECT('talla', t.talla, 'stock', t.stock)) AS tallas,
       SUM(t.stock) AS stock
  FROM productos p
  LEFT JOIN producto_tallas t ON t.producto_id = p.id
 GROUP BY p.id
```

y devuelve algo así:

```json
{
  "id": 1, "nombre": "Camisa Oxford", "precio": 189, "categoria": "Camisas",
  "imagen": "https://... o data:image/jpeg;base64,...",
  "tallas": [ { "talla": "S", "stock": 5 }, { "talla": "M", "stock": 0 } ],
  "stock": 5
}
```

`stock` (la suma) sirve para mostrar "Agotado" en el catálogo; `tallas` sirve para
el detalle del producto.

**Guardar un producto** (`guardarProducto`) se hace dentro de una **transacción**:
actualiza la fila de `productos`, borra sus tallas y vuelve a insertar las nuevas.
Si algo falla a la mitad, no queda un producto sin tallas.

### 4.4 Servicio de pedidos (`backend/pedidos`)

| Ruta | Quién | Qué hace |
|---|---|---|
| `POST /pedidos` | cliente | Compra (ver sección 6) |
| `GET /pedidos` | cliente | Su historial |
| `GET /pedidos/:id` | cliente | Una factura **suya** (filtra por `usuario_id`) |
| `GET /admin/pedidos` | admin | Todos los pedidos de la tienda |
| `PUT /admin/pedidos/:id` | admin | Cambia el estado del pedido |

- El **número de factura** no se guarda: se calcula a partir del id
  (`7 → "FAC-000007"`) en la función `numeroFactura`.
- El **pago simulado** está aislado en `pago-simulado.js`: valida el formato de la
  tarjeta y la rechaza si termina en `0000`. Solo guarda los **últimos 4 dígitos**.
  Si algún día se integra una pasarela real, solo se reemplaza ese archivo.

---

## 5. La seguridad: tokens JWT y roles

### ¿Qué es un JWT?

Es un texto firmado que el servidor entrega al iniciar sesión. Contiene datos
(llamados *payload*) y una **firma** hecha con `JWT_SECRET`:

```
payload: { id: 2, nombre: "Administración", email: "admin@tienda.com", rol: "admin" }
```

- Nadie puede modificar el payload (por ejemplo cambiar `rol` a `admin`), porque
  la firma dejaría de coincidir.
- Vence a los **7 días** (`expiresIn: '7d'`).

### El recorrido del token

1. `usuarios` crea el token en `/login` y la app lo guarda (SQLite).
2. En cada petición protegida, la app lo manda en un encabezado:
   `Authorization: Bearer eyJhbGciOi...`
3. `productos` y `pedidos` lo **validan con el mismo `JWT_SECRET`** (por eso está
   en el grupo de variables `tienda-secretos` de Render). No necesitan preguntarle
   nada al servicio de usuarios: es más rápido y desacoplado.

### Los guardias de las rutas

```js
function autenticar(req, res, next)  // ¿el token es válido? → si no, 401
function soloAdmin(req, res, next)   // además, ¿rol === 'admin'? → si no, 403
```

Se ponen delante de la ruta: `app.post('/productos', soloAdmin, async (req, res) => ...)`.

> **Importante:** la app esconde los botones de admin a los clientes, pero **la
> seguridad real está en el backend**. Aunque alguien llame a la API a mano con un
> token de cliente, recibe `403 Solo el administrador puede hacer esto`.

---

## 6. La compra paso a paso

Esta es la parte más delicada, porque mueve stock y dinero (simulado).

### Lo que manda la app

```json
POST /pedidos
Authorization: Bearer <token>
{
  "items": [ { "productoId": 1, "talla": "M", "cantidad": 2 } ],
  "pago":  { "titular": "Ana", "numeroTarjeta": "4111 1111 1111 1111",
             "vencimiento": "12/28", "cvv": "123" }
}
```

Fíjate que **no manda precios**. Si los mandara, alguien podría cambiarlos y
comprar a Q 0.01.

### Lo que hace el servidor (todo dentro de UNA transacción)

```
BEGIN
 │
 ├─ 1. Por cada producto, descontar el stock de SU TALLA:
 │      UPDATE producto_tallas SET stock = stock - 2
 │       WHERE producto_id = 1 AND talla = 'M' AND stock >= 2
 │      RETURNING nombre, precio      ← precio REAL desde la tabla productos
 │
 │      Si no actualizó ninguna fila (no hay stock suficiente):
 │      → ROLLBACK y responde 409 "Solo quedan 1 unidades de ... en talla M"
 │
 ├─ 2. Calcular subtotal, IVA (12%) y total con los precios reales
 │
 ├─ 3. Simular el pago
 │      Si se rechaza → ROLLBACK (el stock vuelve) y responde 402
 │
 ├─ 4. INSERT en pedidos + INSERT en pedido_items
 │
COMMIT → responde 201 con la factura completa
```

### ¿Por qué `stock >= cantidad` dentro del UPDATE?

Imagina que queda **1** unidad y dos personas compran al mismo tiempo. Si el código
hiciera "leer el stock → ver que hay 1 → restar", ambas podrían leer "1" antes de
que la otra reste, y se venderían 2. Con el `UPDATE ... WHERE stock >= cantidad`,
PostgreSQL bloquea la fila: la primera compra la deja en 0 y la segunda ya no
cumple la condición. **Nunca se vende de más.**

### ¿Por qué una transacción?

Si el carrito tiene 3 productos y el tercero no tiene stock, los dos primeros ya
se habían descontado. El `ROLLBACK` deshace **todo**: el stock queda exactamente
como estaba. Lo mismo si el pago se rechaza. Es "todo o nada".

---

## 7. La app (frontend con Expo)

### 7.1 Expo Router: las carpetas son la navegación

```
mobile/app/
├── _layout.js            ← envuelve toda la app (sesión, tema, qué rutas existen)
├── login.js              → /login
├── registro.js           → /registro
├── (tabs)/               ← los paréntesis agrupan sin cambiar la URL
│   ├── _layout.js        ← la barra de pestañas de abajo
│   ├── index.js          → /            Catálogo
│   ├── carrito.js        → /carrito
│   ├── historial.js      → /historial   Mis compras
│   └── perfil.js         → /perfil
├── producto/[id].js      → /producto/5  ([id] es un parámetro)
├── pago.js               → /pago
├── factura/[id].js       → /factura/12
└── admin/
    ├── index.js          → /admin              Resumen y pedidos
    ├── productos.js      → /admin/productos    Lista de productos
    └── producto.js       → /admin/producto     Crear (o ?id=5 para editar)
```

Para navegar se usa `router.push('/producto/5')`, `router.back()` o
`router.replace(...)` (reemplaza la pantalla actual, por ejemplo al ir del pago a
la factura, para que "atrás" no vuelva al formulario de pago).

Los parámetros se leen con `const { id } = useLocalSearchParams();`.

### 7.2 Protección de rutas (`app/_layout.js`)

```jsx
<Stack.Protected guard={!!sesion}>   {/* solo con sesión */}
  (tabs), producto, pago, factura
</Stack.Protected>
<Stack.Protected guard={esAdmin}>    {/* solo rol admin */}
  admin/...
</Stack.Protected>
<Stack.Protected guard={!sesion}>    {/* solo sin sesión */}
  login, registro
</Stack.Protected>
```

Cuando inicias sesión, `sesion` cambia y Expo Router **cambia de pantalla solo**:
el login ni siquiera tiene que navegar. Al cerrar sesión pasa lo contrario.

### 7.3 La sesión (`lib/AuthContext.js`)

Un *Context* de React comparte la sesión con todas las pantallas:

```js
const { sesion, iniciarSesion, cerrarSesion } = useAuth();
// sesion = { token, usuario: { id, nombre, email, rol } }
```

- `iniciarSesion` la guarda en SQLite y en el estado de React.
- Al abrir la app, se lee de SQLite: el usuario sigue conectado.
- `cerrarSesion` borra sesión, carrito y caché (para que otro usuario del mismo
  teléfono no vea los datos).
- Si el servidor responde **401** (token vencido), las pantallas llaman a
  `cerrarSesion()` y el usuario vuelve al login.

### 7.4 La comunicación con el backend (`lib/api.js`)

Todas las llamadas pasan por una sola función, `pedir()`:

1. Hace el `fetch` con JSON y, si hay token, el encabezado `Authorization`.
2. Si no hay internet → error "No hay conexión con el servidor".
3. Si el servidor responde con error → lanza el mensaje que mandó el backend
   (por ejemplo "Solo quedan 2 unidades…") y guarda el código en `error.status`.

Encima de eso hay una función por cada ruta (`login`, `obtenerProductos`,
`crearPedido`, `actualizarProducto`, …). Las pantallas solo usan esas funciones.

### 7.5 Configuración (`lib/config.js`)

Las URLs de los microservicios y los datos de la tienda vienen de **variables de
entorno** que empiezan con `EXPO_PUBLIC_`:

```js
usuarios: process.env.EXPO_PUBLIC_USUARIOS_URL || 'https://tienda-usuarios.onrender.com',
```

- En Render se ponen en el servicio `tienda-web` → *Environment*.
- En tu PC, en `mobile/.env` (copia de `.env.example`).
- Lo que va después de `||` es el valor por defecto.
- Expo **copia estos valores dentro de la app al compilarla**: si los cambias,
  hay que volver a compilar (en Render: *Clear build cache & deploy*).

### 7.6 Las pantallas, en una línea cada una

| Pantalla | Qué hace |
|---|---|
| `login.js` / `registro.js` | Formularios; llaman a la API e `iniciarSesion` |
| `(tabs)/index.js` | Catálogo: pide productos y categorías; filtrar por categoría vuelve a consultar al servidor; muestra "Agotado" |
| `producto/[id].js` | Pide el producto; chips de talla (las agotadas aparecen tachadas y no se pueden elegir); la cantidad no puede superar el stock de la talla elegida |
| `(tabs)/carrito.js` | Lee el carrito de SQLite cada vez que se abre la pestaña (`useFocusEffect`) |
| `pago.js` | Formulario con formato automático de tarjeta; llama a `crearPedido`; vacía el carrito y abre la factura |
| `factura/[id].js` | Muestra la factura y los botones Descargar PDF / Imprimir |
| `(tabs)/historial.js` | Compras del usuario con su estado |
| `(tabs)/perfil.js` | Datos del usuario; si es admin, botón al panel |
| `admin/*` | Ver sección 12 |

---

## 8. La base de datos local (SQLite)

Archivo: `mobile/lib/db.js`. Se crea en el teléfono la primera vez:

| Tabla | Qué guarda | Por qué |
|---|---|---|
| `sesion` | token y usuario (una sola fila, `id = 1`) | No pedir login cada vez |
| `carrito` | producto, talla, precio, cantidad | El carrito sobrevive si cierras la app |
| `cache` | clave → JSON (`productos`, `historial`, `pedido-12`) | Ver catálogo y compras sin internet |

- El carrito usa `PRIMARY KEY (producto_id, talla)` y
  `ON CONFLICT ... DO UPDATE SET cantidad = cantidad + ...`: si agregas otra vez la
  misma camisa en talla M, suma la cantidad en vez de duplicar la fila.
- **Modo sin conexión**: cada pantalla intenta primero el servidor; si falla, usa
  la copia de `cache` y muestra un aviso.

### ¿Y en el navegador?

En el navegador se usa **`db.web.js`**, con **exactamente las mismas funciones**
pero guardando en `localStorage`. Expo elige solo: si existe `archivo.web.js`, lo
usa en la web y `archivo.js` en el celular. Las pantallas importan `../lib/db` y no
saben cuál de los dos están usando. El mismo truco se usa con `facturaPdf.js`.

---

## 9. El estilo glassmorphism

El *glassmorphism* imita un vidrio esmerilado. Se logra con 4 ingredientes, y
**todos los colores están en `mobile/lib/tema.js`**.

### Ingrediente 1: un fondo con color (`components/Fondo.js`)

Tres capas, una encima de otra:

```
Capa 3  ── el contenido de la pantalla
Capa 2  ── 3 "luces" SVG con gradiente RADIAL:
           centro de color (75% opaco) → borde transparente (0%)
           por eso se ven difuminadas, sin bordes
Capa 1  ── degradado lineal claro (blanco lila → blanco celeste → blanco rosado)
```

Para mover una luz se cambian `cx`/`cy` (posición) y `r` (tamaño) en la lista
`LUCES`; para cambiar su color, `luz1`, `luz2`, `luz3` en el tema.

### Ingrediente 2: el vidrio (`components/Tarjeta.js`)

```
┌ sombra suave lila (afuera) ─────────────┐
│ ┌ borde blanco fino (el filo del vidrio)┐ │
│ │ BlurView: desenfoca lo que está detrás │ │
│ │ fondo blanco al 45% de opacidad        │ │
│ │   ...contenido...                      │ │
│ └────────────────────────────────────────┘ │
└──────────────────────────────────────────────┘
```

La sombra va en una vista aparte porque `overflow: 'hidden'` (necesario para que el
blur respete las esquinas redondeadas) recortaría la sombra.

### Ingredientes 3 y 4: un solo acento y espacio

- Texto oscuro azulado, texto secundario al 55%, **un solo color de acento** (lila)
  para precios y enlaces.
- El botón principal es oscuro sobre fondo claro: es lo único que "pesa"
  visualmente, así el usuario sabe dónde tocar.
- Íconos de línea (Ionicons) en lugar de emojis; etiquetas pequeñas en mayúsculas.

### Componentes reutilizables (`mobile/components/`)

| Componente | Uso |
|---|---|
| `Fondo` | Envuelve cada pantalla |
| `Tarjeta` | Cualquier bloque de vidrio |
| `Boton` | `variante="solido"`, `"vidrio"` o `"peligro"`, con `icono` opcional |
| `Campo` | Input con etiqueta |
| `Encabezado` | Título, subtítulo y botón volver |
| `ImagenProducto` | Foto del producto o ícono si no tiene |
| `EstadoPedido` | Etiqueta de color: pagado / enviado / entregado / cancelado |

Cambiar `Boton.js` cambia **todos** los botones de la app.

---

## 10. La factura en PDF

Hay dos archivos con las mismas funciones (`descargarFacturaPdf` e `imprimirFactura`):

| | Celular (`facturaPdf.js`) | Navegador (`facturaPdf.web.js`) |
|---|---|---|
| Cómo se dibuja | HTML con estilos | jsPDF: texto y líneas en milímetros sobre una hoja A4 |
| Descargar | `expo-print` convierte el HTML en PDF → `expo-sharing` abre el menú para guardar/compartir | jsPDF crea el archivo y el navegador lo descarga (`Factura-FAC-000001.pdf`) |
| Imprimir | Abre el diálogo de impresión del sistema | Descarga el PDF (es lo que funciona igual en PC y celular) |
| Si falla | Si no se puede crear el archivo, cae al diálogo de impresión | — |

¿Por qué dos versiones? En el navegador, `expo-print` **ignora el HTML** e imprime
la pantalla de la app, y los navegadores del celular no permiten imprimir desde
marcos ocultos. jsPDF genera un archivo PDF real que funciona en cualquier lado.

---

## 11. Las imágenes de los productos

En el formulario del administrador hay dos formas de poner la foto:

1. **Elegir foto**: abre la galería (`expo-image-picker`), deja recortarla en
   cuadrado y la comprime (`quality: 0.4`). La foto se convierte en texto
   **base64** (`data:image/jpeg;base64,/9j/4AAQ...`) y se guarda en la columna
   `imagen` de la tabla `productos`.
2. **Pegar una URL** `https://...` de una foto publicada en internet.

El componente `ImagenProducto` muestra lo que haya en `imagen` (las dos formas
funcionan igual en `<Image source={{ uri }}>`), o un ícono si está vacío.

> **¿Por qué en la base de datos y no en una carpeta?** El disco de Render gratis
> se borra en cada reinicio o despliegue: las fotos se perderían. En PostgreSQL
> quedan guardadas para siempre. El servicio de productos acepta peticiones de
> hasta 5 MB por eso (`express.json({ limit: '5mb' })`).

---

## 12. El panel de administrador

Entrada: iniciar sesión como `admin@tienda.com` → pestaña **Perfil** →
**Panel de administración**.

| Pantalla | Qué hace | Rutas que usa |
|---|---|---|
| `admin/index.js` | Tarjetas de resumen (ventas sin cancelados, nº de pedidos, productos agotados) y lista de todos los pedidos; tocar un estado lo asigna | `GET /admin/pedidos`, `PUT /admin/pedidos/:id`, `GET /productos` |
| `admin/productos.js` | Lista con stock total y por talla (`S 5 · M 0 · L 3`), editar y eliminar (con confirmación) | `GET /productos`, `DELETE /productos/:id` |
| `admin/producto.js` | Formulario: foto, datos, y **editor de tallas** (filas talla + stock, agregar/quitar filas, total en vivo) | `GET /productos/:id`, `POST` / `PUT /productos` |

El cliente ve los cambios de estado en **Mis compras** y en la factura.

---

## 13. El despliegue en Render

Todo está descrito en **`render.yaml`** (un *Blueprint*). Render lo lee y crea:

| Recurso | Tipo | Cómo se construye |
|---|---|---|
| `tienda-db` | PostgreSQL | — |
| `tienda-usuarios` | Web Service (Node) | `npm install` → `npm start` en `backend/usuarios` |
| `tienda-productos` | Web Service (Node) | igual, en `backend/productos` |
| `tienda-pedidos` | Web Service (Node) | igual, en `backend/pedidos` |
| `tienda-web` | Static Site | `npx expo export --platform web` en `mobile` → publica la carpeta `dist` |

- `DATABASE_URL` se conecta sola a `tienda-db` (`fromDatabase`).
- `JWT_SECRET` se genera al azar una vez y se comparte (`envVarGroups`).
- El sitio web tiene una regla *rewrite* `/* → /index.html`: si abres directamente
  `/factura/3`, el servidor entrega la app y Expo Router muestra la pantalla
  correcta.
- **Cada `git push` a `main` redespliega** lo que cambió.

---

## 14. La documentación Swagger

Cada microservicio publica su documentación interactiva en **`/docs`**, por ejemplo
`https://tienda-productos-dxd5.onrender.com/docs`.

- Está escrita en `backend/*/swagger.js` (formato OpenAPI 3).
- Para probar rutas protegidas: haz login en `/docs` de usuarios, copia el `token`,
  y en otro servicio pulsa **Authorize** y pégalo.
- Si agregas una ruta nueva, agrégala también en el `swagger.js` de ese servicio.

---

## 15. Limitaciones conocidas

Cosas que funcionan bien para un proyecto académico pero que en una tienda real se
harían distinto:

- **Pago simulado**: no hay pasarela real; la tarjeta solo se valida en formato.
- **Fotos en base64**: cómodo y sin servicios extra, pero ocupan más que un archivo.
  Con muchos productos convendría un almacenamiento de archivos (por ejemplo
  Cloudinary o S3) y guardar solo la URL.
- **Plan gratis de Render**: los servicios se duermen a los 15 minutos; la primera
  petición tarda ~1 minuto.
- **Cancelar un pedido no devuelve el stock**: el admin puede corregirlo editando
  el producto.
- **Token de 7 días sin cierre remoto**: si se roba un token, sirve hasta que vence.
