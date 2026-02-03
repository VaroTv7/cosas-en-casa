# 🏠 Cosas en Casa

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Version](https://img.shields.io/badge/Version-0.3-purple.svg)]()

**Cosas en Casa** es una aplicación web de inventario doméstico que te permite organizar, catalogar y encontrar tus pertenencias de forma rápida y sencilla. Perfecta para saber exactamente qué tienes y dónde está guardado.

---

## ✨ Características

### 📦 Organización Jerárquica
- **Espacios** (Habitaciones): Cocina, Salón, Dormitorio...
- **Contenedores** (Muebles): Armario, Cajón, Estantería...
- **Objetos** (Items): Tus pertenencias con foto, cantidad y descripción

### 🗺️ Plano Visual de la Casa (v0.2)
- **Editor drag-and-drop** para crear el plano de tu casa
- **Habitaciones redimensionables** con colores personalizados
- **Muebles interactivos**: haz clic para ver todos los objetos
- **Contenedores anidados** en habitaciones - se mueven juntos
- **Vista rápida** de dónde está cada cosa

### 📊 Base de Datos Visual (v0.3)
- **Vista de tablas** para Espacios, Contenedores y Objetos
- **Búsqueda integrada** en cada categoría
- **CRUD rápido**: Añadir, editar y eliminar desde la misma vista
- **Descripciones** para espacios, contenedores y objetos

### 📱 Diseño Responsive (v0.3)
- **Móvil**: Navegación inferior tipo app
- **Tablet**: Layout de 2 columnas
- **Desktop**: Sidebar lateral con 3-5 columnas
- Aprovecha todo el espacio de pantallas panorámicas

### 🔍 Funcionalidades Principales
| Función | Descripción |
|---------|-------------|
| ✅ CRUD Completo | Crear, leer, editar y eliminar en todos los niveles |
| 📷 Múltiples Fotos | Hasta 10 fotos por objeto (v0.2) |
| 🔎 Búsqueda | Encuentra objetos por nombre o etiquetas |
| 📱 QR Codes | Códigos con nombre del objeto (`cec:ID:Nombre`) |
| 📲 Escáner QR | Escanea códigos para localizar objetos al instante |
| 🌙 Tema Oscuro | Interfaz moderna y elegante |
| 📱 Responsive | Sidebar en desktop, bottom nav en móvil |

---

## 🆕 Novedades v0.3

- **📊 Vista Base de Datos**: Nueva pestaña "BD" con tablas para gestionar espacios, contenedores y objetos
- **📝 Descripciones**: Campo de descripción en espacios y contenedores
- **🗂️ Navegación de 6 tabs**: Inventario, Plano, Añadir, Escanear, BD, Ajustes
- **📱 Layout Responsive**: 
  - Móvil: Barra de navegación inferior
  - Desktop (1024px+): Sidebar lateral izquierdo
  - Grids adaptativos de 1 a 5 columnas según pantalla
- **🏠 Contenedores anidados**: Los muebles se mueven con sus habitaciones en el plano

---

## 🛠️ Tecnologías

### Backend
- **Node.js** + **TypeScript**
- **Fastify** - Framework web de alto rendimiento
- **SQLite** (better-sqlite3) - Base de datos embebida
- **Sharp** - Procesamiento de imágenes (conversión a WebP)

### Frontend
- **React 18** + **TypeScript**
- **Vite** - Build tool ultrarrápido
- **Lucide React** - Iconos modernos
- **qrcode.react** - Generación de códigos QR
- **html5-qrcode** - Escáner de códigos QR
- **Axios** - Cliente HTTP

---

## 🚀 Instalación

### Requisitos Previos
- Node.js 18 o superior
- npm o yarn

### Instalación Local

```bash
# 1. Clonar el repositorio
git clone https://github.com/VaroTv7/cosas-en-casa.git
cd cosas-en-casa

# 2. Instalar dependencias del servidor
cd server
npm install

# 3. Instalar dependencias del cliente
cd ../client
npm install

# 4. Compilar el cliente
npm run build

# 5. Copiar el build al servidor
# Windows:
xcopy /E /I /Y dist ..\server\public
# Linux/Mac:
cp -r dist/* ../server/public/

# 6. Iniciar el servidor
cd ../server
npm run dev
```

La aplicación estará disponible en: **http://localhost:8110**

### Con Docker 🐳

```bash
# Construir y ejecutar
docker-compose up -d

# Ver logs
docker-compose logs -f
```

---

## 📖 Uso

### 1. Crear tu primer Espacio
1. Haz clic en **"Añadir"** en la navegación
2. Selecciona **"Nuevo Espacio"**
3. Escribe el nombre (ej: "Cocina") y pulsa Crear

### 2. Añadir un Contenedor
1. En la pestaña Añadir, selecciona **"Nuevo Contenedor"**
2. Elige el Espacio padre
3. Dale un nombre (ej: "Cajón de cubiertos")
4. Opcionalmente, añade una descripción y foto

### 3. Añadir Objetos
1. Selecciona **"Nuevo Objeto"**
2. Elige el Contenedor donde está guardado
3. Rellena: nombre, cantidad, descripción
4. ¡Saca una foto para identificarlo fácilmente!

### 4. Usar el Plano
1. Ve a la pestaña **"Plano"**
2. Pulsa **"Editar"** para entrar en modo edición
3. Añade habitaciones y muebles al plano
4. Arrastra para posicionar, usa la esquina para redimensionar
5. En modo normal, haz clic en un mueble para ver sus objetos

### 5. Usar la Base de Datos
1. Ve a la pestaña **"BD"**
2. Filtra por Espacios, Contenedores u Objetos
3. Usa la búsqueda para encontrar cualquier cosa
4. Edita o elimina directamente desde aquí

### 6. Escanear QR
- Imprime el código QR de un objeto y pégalo en el contenedor físico
- Usa la pestaña **"Escanear"** para localizarlo al instante

---

## 📁 Estructura del Proyecto

```
cosas-en-casa/
├── client/                 # Frontend React
│   ├── src/
│   │   ├── components/     # Componentes React
│   │   │   ├── FloorPlan.tsx      # Editor de plano
│   │   │   ├── DatabaseView.tsx   # Vista de base de datos (v0.3)
│   │   │   ├── ItemDetail.tsx     # Detalle con galería
│   │   │   ├── InventoryList.tsx  # Lista de inventario
│   │   │   └── ...
│   │   ├── services/       # API client (axios)
│   │   ├── App.tsx         # Componente principal
│   │   └── App.css         # Estilos globales + responsive
│   └── vite.config.ts
│
├── server/                 # Backend Fastify
│   ├── src/
│   │   ├── index.ts        # Punto de entrada
│   │   ├── routes.ts       # Rutas API
│   │   └── db.ts           # Configuración SQLite
│   ├── uploads/            # Imágenes subidas
│   └── public/             # Frontend compilado
│
├── docker-compose.yml
├── Dockerfile
└── README.md
```

---

## 🔌 API Endpoints

### Inventario
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/inventory` | Obtener todo el inventario |
| GET | `/api/items/:id` | Obtener un objeto por ID |
| GET | `/api/search?q=` | Buscar objetos |
| POST | `/api/spaces` | Crear espacio (con descripción) |
| POST | `/api/containers` | Crear contenedor (con descripción) |
| POST | `/api/items` | Crear objeto |
| PUT | `/api/spaces/:id` | Actualizar espacio |
| PUT | `/api/containers/:id` | Actualizar contenedor |
| PUT | `/api/items/:id` | Actualizar objeto |
| DELETE | `/api/spaces/:id` | Eliminar espacio |
| DELETE | `/api/containers/:id` | Eliminar contenedor |
| DELETE | `/api/items/:id` | Eliminar objeto |

### Plano (v0.2)
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/floor-plan` | Obtener plano completo |
| PUT | `/api/floor-plan` | Actualizar configuración |
| POST | `/api/room-layouts` | Añadir habitación |
| PUT | `/api/room-layouts/:id` | Mover/redimensionar |
| DELETE | `/api/room-layouts/:id` | Eliminar habitación |
| POST | `/api/container-positions` | Añadir mueble |
| PUT | `/api/container-positions/:id` | Mover mueble |
| DELETE | `/api/container-positions/:id` | Eliminar mueble |

### Fotos de Objetos (v0.2)
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/items/:id/photos` | Ver fotos |
| POST | `/api/items/:id/photos` | Añadir foto |
| DELETE | `/api/items/:id/photos/:photoId` | Eliminar foto |
| PUT | `/api/items/:id/photos/:photoId/primary` | Establecer principal |

---

## ❓ Preguntas Frecuentes (FAQ)

### ¿Dónde se guardan mis datos?
Los datos se almacenan localmente en un archivo SQLite (`server/data/inventory.db`). Las imágenes se guardan en `server/uploads/`.

### ¿Puedo acceder desde mi móvil?
Sí. Si el servidor está en tu red local, accede usando la IP del ordenador (ej: `http://192.168.1.100:8110`).

### ¿Cómo hago backup de mis datos?
Copia los archivos:
- `server/data/inventory.db` (base de datos)
- `server/uploads/` (imágenes)

### ¿Puedo cambiar el puerto?
Sí. Edita `server/src/index.ts` y cambia el valor de `PORT`.

### ¿Las fotos se optimizan?
Sí. Todas las imágenes se convierten automáticamente a formato WebP y se redimensionan a un máximo de 800x800 píxeles.

### ¿Necesito Internet?
No. La aplicación funciona completamente offline una vez instalada.

---

## 🔧 Desarrollo

```bash
# Desarrollo del cliente (hot reload)
cd client
npm run dev

# Desarrollo del servidor
cd server
npm run dev
```

### Scripts Disponibles

**Cliente:**
- `npm run dev` - Servidor de desarrollo Vite
- `npm run build` - Compilar para producción
- `npm run preview` - Previsualizar build

**Servidor:**
- `npm run dev` - Iniciar con ts-node
- `npm run build` - Compilar TypeScript
- `npm start` - Iniciar versión compilada

---

## 📝 Roadmap

- [x] Plano visual de la casa (v0.2)
- [x] Múltiples fotos por objeto (v0.2)
- [x] QR codes con nombre del objeto (v0.2)
- [x] Vista de base de datos (v0.3)
- [x] Descripciones para espacios/contenedores (v0.3)
- [x] Layout responsive sidebar/bottom nav (v0.3)
- [ ] Búsqueda global en inicio
- [ ] Plano panorámico con zoom
- [ ] Exportar inventario a PDF/Excel
- [ ] Modo multi-usuario
- [ ] Sincronización en la nube
- [ ] PWA (Progressive Web App)

---

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver [LICENSE](LICENSE) para más detalles.

---

## 👤 Autor

Desarrollado por VaroTv7 con ❤️ para organizar el hogar.

---

<p align="center">
  <strong>🏠 Cosas en Casa v0.3</strong><br>
  <em>Organiza tu hogar, encuentra todo al instante.</em>
</p>
