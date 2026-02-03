# 🏠 Cosas en Casa

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Version](https://img.shields.io/badge/Version-0.5-purple.svg)]()

**Cosas en Casa** es una aplicación web de inventario doméstico profesional. Organiza, cataloga y encuentra tus pertenencias con metadatos extendidos, gestión de categorías, préstamos a personas y un plano interactivo.

---

## ✨ Características Principales

### 👥 Gestión de Personas y Préstamos (v0.5)
- **Agenda de Contactos**: Registra familiares y amigos para gestionar préstamos de forma ordenada.
- **Control de Préstamos**: Asigna objetos prestados a personas específicas desde un desplegable.
- **Alertas de Devolución**: Visualiza rápidamente qué objetos no están en casa y quién los tiene.

### 📦 Operaciones en Bloque (v0.5)
- **Selección Múltiple**: Selecciona varios objetos a la vez desde la vista de lista.
- **Movimiento Masivo**: Mueve decenas de objetos de un contenedor a otro con un solo clic.
- **Borrado Masivo**: Limpieza rápida de inventario obsoleto.
- **Exportación CSV**: Descarga tu inventario seleccionado a Excel/CSV para análisis externo.

### 🏷️ Gestión de Categorías (v0.4)
- **Categorías Personalizadas**: Crea, edita y elimina categorías con iconos y colores únicos.
- **Iconografía Visual**: Identifica tus objetos rápidamente mediante iconos de Lucide.
- **Filtros por Categoría**: Organiza tus pertenencias por tipos (Libros, Videojuegos, Electrónica, etc.).

### 📝 Metadatos Extendidos (v0.4)
- **Campos Generales**: Marca, modelo, número de serie y estado (nuevo, usado, etc.).
- **Detalles de Compra**: Fecha, precio, lugar y seguimiento de garantía.
- **Campos Específicos por Tipo**:
  - **Libros**: Autor, editorial, año, páginas, ISBN y género.
  - **Videojuegos**: Plataforma, desarrollador, publisher, año y género.
  - **Electrónica**: Especificaciones técnicas y URL del manual online.
- **Notas**: Campo extendido para cualquier información adicional.
- **Stock Mínimo**: Define alertas para cuando te quedan pocas unidades de un consumible.

### 🗺️ Plano Visual e Interactivo
- **Editor drag-and-drop** para crear el plano de tu casa.
- **Habitaciones y Muebles redimensionables** con colores personalizados.
- **Zoom y pan**: Navega cómodamente por planos complejos.
- **Interactividad**: Haz clic en un mueble para ver su contenido al instante.

### 📊 Base de Datos y Búsqueda
- **Vista de Tablas**: Gestiona Espacios, Contenedores, Objetos y Personas.
- **Sincronización en Tiempo Real**: Los cambios se reflejan instantáneamente en todas las vistas.
- **Búsqueda Avanzada**: Encuentra cualquier ítem por nombre, etiquetas o descripción.

### 📱 Diseño Moderno y Responsive
- **Interfaz Glassmorphism**: Estética premium con efectos de desenfoque y gradientes.
- **Totalmente Adaptable**: Sidebar lateral en escritorio y barra de navegación inferior en móvil.
- **Micro-animaciones**: Transiciones suaves para una experiencia de usuario fluida.

---

## 🚀 Instalación y Despliegue

### Requisitos
- **Node.js 18+**
- **npm** o **yarn**

### Quick Start (Desarrollo)

```bash
# 1. Clonar el repositorio
git clone https://github.com/VaroTv7/cosas-en-casa.git
cd cosas-en-casa

# 2. Servidor (con auto-reload)
cd server
npm install
npm run dev

# 3. Cliente (Vite Dev Server)
cd ../client
npm install
npm run dev
```

### Con Docker 🐳

```bash
docker-compose up -d
```

---

## 🛠️ Stack Tecnológico

- **Frontend**: React 18, TypeScript, Vite, Lucide Icons.
- **Backend**: Fastify, TypeScript, ts-node-dev.
- **Base de Datos**: SQLite (Better-SQLite3).
- **Procesamiento**: Sharp (Imágenes WebP), QR Code generation.

---

## 📁 Estructura del Proyecto

- `client/`: Aplicación frontend en React.
- `server/`: API backend y gestión de base de datos.
- `server/data/`: Almacenamiento de la base de datos SQLite.
- `server/uploads/`: Imágenes optimizadas de los objetos.

---

## 📝 Roadmap (Futuro - Diferido)
- [ ] Búsqueda global desde la pantalla de inicio (Omnibox).
- [ ] Escaneo de ISBN/Códigos de Barras para auto-rellenado (OpenLibrary integration).
- [ ] Estadísticas de valor total del inventario.
- [ ] Modo multi-vivienda.
- [ ] PWA (Progressive Web App) para instalación en móvil.

---

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver [LICENSE](LICENSE) para más detalles.

---

<p align="center">
  <strong>🏠 Cosas en Casa v0.5</strong><br>
  <em>Organización inteligente y social para tu hogar.</em>
</p>
