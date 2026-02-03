# 🏠 Cosas en Casa

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)

**Cosas en Casa** es una aplicación web de inventario doméstico que te permite organizar, catalogar y encontrar tus pertenencias de forma rápida y sencilla. Perfecta para saber exactamente qué tienes y dónde está guardado.

![Vista Principal](https://via.placeholder.com/800x400/1a1a2e/00d4ff?text=Cosas+en+Casa)

---

## ✨ Características

### 📦 Organización Jerárquica
- **Espacios** (Habitaciones): Cocina, Salón, Dormitorio...
- **Contenedores** (Muebles): Armario, Cajón, Estantería...
- **Objetos** (Items): Tus pertenencias con foto, cantidad y descripción

### 🔍 Funcionalidades Principales
| Función | Descripción |
|---------|-------------|
| ✅ CRUD Completo | Crear, leer, editar y eliminar en todos los niveles |
| 📷 Fotos con Cámara | Captura fotos directamente desde el móvil |
| 🔎 Búsqueda | Encuentra objetos por nombre o etiquetas |
| 📱 QR Codes | Cada objeto genera un código QR único para identificación rápida |
| 📲 Escáner QR | Escanea códigos para localizar objetos instantáneamente |
| 🌙 Tema Oscuro | Interfaz moderna y elegante en modo oscuro |
| 📱 Responsive | Funciona en móvil, tablet y escritorio |

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
git clone https://github.com/TU_USUARIO/cosas-en-casa.git
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
1. Haz clic en **"Añadir"** en la navegación inferior
2. Selecciona **"Nuevo Espacio"**
3. Escribe el nombre (ej: "Cocina") y pulsa Crear

### 2. Añadir un Contenedor
1. En la pestaña Añadir, selecciona **"Nuevo Contenedor"**
2. Elige el Espacio padre
3. Dale un nombre (ej: "Cajón de cubiertos")
4. Opcionalmente, saca una foto

### 3. Añadir Objetos
1. Selecciona **"Nuevo Objeto"**
2. Elige el Contenedor donde está guardado
3. Rellena: nombre, cantidad, descripción
4. ¡Saca una foto para identificarlo fácilmente!

### 4. Escanear QR
- Imprime el código QR de un objeto y pégalo en el contenedor físico
- Usa la pestaña **"Escanear"** para localizarlo al instante

---

## 📁 Estructura del Proyecto

```
cosas-en-casa/
├── client/                 # Frontend React
│   ├── src/
│   │   ├── components/     # Componentes React
│   │   ├── services/       # API client (axios)
│   │   ├── App.tsx         # Componente principal
│   │   └── App.css         # Estilos globales
│   ├── package.json
│   └── vite.config.ts
│
├── server/                 # Backend Fastify
│   ├── src/
│   │   ├── index.ts        # Punto de entrada
│   │   ├── routes.ts       # Rutas API
│   │   └── db.ts           # Configuración SQLite
│   ├── uploads/            # Imágenes subidas
│   ├── public/             # Frontend compilado
│   └── package.json
│
├── docker-compose.yml      # Configuración Docker
├── Dockerfile              # Imagen Docker
└── README.md
```

---

## 🔌 API Endpoints

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/inventory` | Obtener todo el inventario |
| GET | `/api/items/:id` | Obtener un objeto por ID |
| GET | `/api/search?q=` | Buscar objetos |
| POST | `/api/spaces` | Crear espacio |
| POST | `/api/containers` | Crear contenedor (multipart) |
| POST | `/api/items` | Crear objeto (multipart) |
| PUT | `/api/spaces/:id` | Actualizar espacio |
| PUT | `/api/containers/:id` | Actualizar contenedor |
| PUT | `/api/items/:id` | Actualizar objeto |
| DELETE | `/api/spaces/:id` | Eliminar espacio |
| DELETE | `/api/containers/:id` | Eliminar contenedor |
| DELETE | `/api/items/:id` | Eliminar objeto |

---

## ❓ Preguntas Frecuentes (FAQ)

### ¿Dónde se guardan mis datos?
Los datos se almacenan localmente en un archivo SQLite (`server/data.db`). Las imágenes se guardan en `server/uploads/`.

### ¿Puedo acceder desde mi móvil?
Sí. Si el servidor está en tu red local, accede usando la IP del ordenador (ej: `http://192.168.1.100:8110`).

### ¿Cómo hago backup de mis datos?
Copia los archivos:
- `server/data.db` (base de datos)
- `server/uploads/` (imágenes)

### ¿Puedo cambiar el puerto?
Sí. Edita `server/src/index.ts` y cambia el valor de `PORT`.

### ¿Qué pasa si elimino un Espacio con contenido?
La aplicación no permite eliminar Espacios o Contenedores que tengan elementos dentro. Primero debes vaciarlos.

### ¿Las fotos se optimizan?
Sí. Todas las imágenes se convierten automáticamente a formato WebP y se redimensionan a un máximo de 800x800 píxeles para ahorrar espacio.

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

- [ ] Exportar inventario a PDF/Excel
- [ ] Modo multi-usuario
- [ ] Sincronización en la nube
- [ ] Notificaciones de caducidad
- [ ] PWA (Progressive Web App)
- [ ] Etiquetas y categorías personalizadas

---

## 🤝 Contribuir

¡Las contribuciones son bienvenidas! Por favor:

1. Haz fork del proyecto
2. Crea una rama para tu feature (`git checkout -b feature/NuevaFuncion`)
3. Commit tus cambios (`git commit -m 'Añadir nueva función'`)
4. Push a la rama (`git push origin feature/NuevaFuncion`)
5. Abre un Pull Request

---

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver [LICENSE](LICENSE) para más detalles.

---

## 👤 Autor

Desarrollado con ❤️ para organizar el hogar.

---

<p align="center">
  <strong>🏠 Cosas en Casa</strong><br>
  <em>Organiza tu hogar, encuentra todo al instante.</em>
</p>
