# 🏠 Cosas en Casa

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Version](https://img.shields.io/badge/Version-0.9.0-purple.svg)]()

**Cosas en Casa** es una aplicación web de inventario doméstico profesional. Organiza, cataloga y encuentra tus pertenencias con metadatos extendidos, gestión de categorías, préstamos a personas, jerarquía profunda de muebles y un plano interactivo.

---

## ✨ Características Principales
13: 
14: ### 📦 Escáner de Códigos de Barras (v0.9) - ¡Nuevo!
15: - **Soporte Universal**: Registra y escanea códigos de barras originales (EAN, UPC, etc.) para encontrar tus objetos al instante.
16: - **Escaneo en Formularios**: Botón de cámara 📷 integrado en los formularios de alta y edición para capturar códigos automáticamente sin errores.
17: - **Buscador Dual**: El escáner principal detecta tanto QRs internos de la app como códigos de barras de fabricante.
18: 

### 🪑 Jerarquía Profunda (v0.8)
- **Soporte de Muebles**: Nuevo sistema jerárquico real: *Espacio → Mueble → Contenedor → Objeto*.
- **Flexibilidad Total**: Los contenedores pueden ubicarse directamente en el suelo de una habitación o dentro de un mueble específico (armario, estantería).
- **Interconexión Inteligente**: Mueve elementos libremente entre muebles y espacios manteniendo la integridad de los datos.

### 📊 Dashboard Renovado (v0.8)
- **Métricas Financieras**: Calcula y visualiza el valor total estimado de todo tu inventario en tiempo real.
- **Estadísticas Precisas**: Conteo exacto de objetos, indexando recursivamente todo el contenido dentro de muebles y contenedores.
- **Alertas Unificadas**: Un solo vistazo para ver Stock Bajo, Préstamos Activos y Alertas del Sistema.

### ⚠️ Zona de Recuperación "Limbo" (v0.8)
- **Recuperación en Cascada**: Detecta automáticamente objetos dentro de contenedores perdidos y contenedores dentro de muebles perdidos, permitiendo una recuperación jerárquica masiva.
- **Acceso Directo**: Navegación inmediata desde la alerta del Dashboard a la pestaña de gestión de integridad.
- **Indicadores en Tiempo Real**: Badge de contador vivo que se actualiza al instante.

### 📂 Organización Inteligente (v0.8)
- **Vistas Agrupadas**: Despídete de las listas planas interminables. Ahora los muebles, contenedores y objetos se agrupan automáticamente por su ubicación padre.
- **Desplegables (Accordions)**: Grupos colapsables para mantener la interfaz limpia y ordenada.
- **Búsqueda Reactiva**: Al buscar, los grupos relevantes se expanden automáticamente para mostrarte los resultados ocultos.

### 🔍 Búsqueda Global (v0.6)
- **Omnibox Inteligente**: Busca cualquier objeto por nombre, marca, modelo, etiquetas o descripción.
- **Contexto de Ubicación**: Los resultados muestran la ruta exacta (Ej: Salón > Estantería > Caja Azul).
- **Búsqueda En Vivo**: Resultados instantáneos con debounce para máximo rendimiento.

### 💾 Backup y Restauración (v0.7)
- **Portabilidad Total**: Exporta todo tu inventario, fotos, configuración de planos y personas a un único archivo JSON.
- **Restauración en un Click**: Recupera tu base de datos completa desde el menú de Ajustes.

### 🛡️ Gestor de Garantías y Facturas (v0.7.1)
- **Facturas Digitales**: Asocia fotos de tickets y facturas a cada objeto.
- **Acceso Rápido**: Visualización directa desde la ficha del objeto.

### 👥 Gestión de Personas y Préstamos (v0.5)
- **Agenda de Contactos**: Gestiona a quién prestas tus cosas.
- **Control de Préstamos**: Asigna devoluciones pendientes y visualízalas en el dashboard.

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
docker-compose up -d --build
```
> El flag `--build` es recomendable al actualizar versiones para asegurar que se compilan los nuevos cambios del backend.

---

## 🛠️ Stack Tecnológico

- **Frontend**: React 18, TypeScript, Vite, Lucide Icons.
- **Backend**: Fastify, TypeScript, ts-node-dev.
- **Base de Datos**: SQLite (Better-SQLite3) con modo WAL.
- **Procesamiento**: Sharp (Imágenes WebP), QR Code generation.

---

## 📝 Roadmap (Futuro - Diferido)
- [x] ~~Búsqueda global desde la pantalla de inicio (Omnibox).~~
- [x] ~~Estadísticas de valor total del inventario.~~
- [x] ~~Soporte para Códigos de Barras original (EAN/UPC).~~
- [ ] Integración con OpenLibrary (Auto-rellenado por ISBN).
- [ ] PWA (Progressive Web App) para instalación en móvil.
- [ ] **FloorPlan 2.0**: Dibujo avanzado de estancias y jerarquía visual basada en muebles.
- [ ] **Historial de Movimientos**: Registro detallado de cambios de ubicación.
- [ ] **Etiquetas PDF**: Generación de etiquetas listas para imprimir.
- [ ] **Alertas de Caducidad**: Notificaciones para fechas críticas y garantías.
- [ ] **IA Auto-Tagging**: Reconocimiento automático de objetos mediante imágenes.
- [ ] Modo multi-vivienda.

## 📰 Changelog

### v0.9.1 - Fixes de Jerarquía
- **Inventario**: Ahora muestra correctamente los muebles y sus contenidos.
- **Base de Datos**: Agrupación mejorada para evitar ambigüedades (muestra contexto Espacio/Mueble).
- **Edición**: Añadido selector de ubicación para mover objetos fácilmente.

### v0.9.0 (Barcode Revolution)
- **Barcode Engine**: Integración de soporte para códigos EAN, UPC y otros formatos industriales.
- **Form Scan**: Añadido botón de escaneo directo en formularios de objetos.
- **Intelligent Lookup**: El escáner principal ahora resuelve códigos de barras registrados automáticamente.
- **UX Fixes**: Corrección en la identificación de códigos puramente numéricos.

### v0.8.1 (UX Polish & Smart Features)
- **Database Grouping**: Vistas agrupadas por ubicación con acordeones.
- **Smart Search**: Expansión automática de grupos al filtrar.
- **Limbo V2**: Detección recursiva y navegación directa desde Dashboard.
- **Live Counts**: Indicadores de pestañas corregidos y reactivos.
- **Custom Icons**: Personalización de iconos para espacios, muebles y contenedores (Icon Picker).


### v0.8.0 (Deep Hierarchy & Integrity)
- **Muebles**: Implementación de nivel intermedio Mueble entre Espacio y Contenedor.
- **Dashboard V2**: Tarjetas de métricas (Valor, Items, Stock, Préstamos) y diseño responsivo mejorado.
- **Limbo**: Sistema de detección y alerta para items perdidos/huerfanos.
- **Interconectividad**: Mejoras masivas en modales de edición para soportar reasignaciones complejas.

### v0.7.1 (Warranty Manager)
- **Facturas**: Subida de fotos de tickets.

### v0.7 (Backup & Restore)
- **Backup**: Importación/Exportación JSON completa.

### v0.6 (Global Search)
- **Omnibox**: Búsqueda global inteligente.

---

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver [LICENSE](LICENSE) para más detalles.

---

<p align="center">
  <strong>🏠 Cosas en Casa v0.9 by ElVartoDev</strong><br>
  <em>Organización inteligente y social para tu hogar.</em>
</p>
