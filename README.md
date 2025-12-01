# BeatFlow - Proyecto Final

## Descripción
BeatFlow es una plataforma web dedicada a la música electrónica, especializada en géneros como trance, deep house y progressive. Permite explorar catálogos musicales, escuchar previews, añadir favoritos al carrito y realizar compras simuladas.

## Características Principales
- **Responsive Design**: Optimizado para dispositivos móviles, tablets y desktop (360px - 1920px+).
- **Menú Hamburguesa**: Navegación móvil funcional con animaciones suaves.
- **Carrito de Compras**: Persistente con localStorage, gestión de cantidades y checkout simulado.
- **Búsqueda y Filtrado**: Modal de búsqueda con resultados paginados.
- **Previews de Audio**: Reproducción de muestras musicales.
- **Accesibilidad**: Etiquetas ARIA, navegación por teclado, soporte para lectores de pantalla.

## Tecnologías Utilizadas
- **HTML5**: Estructura semántica y accesible.
- **CSS3**: Diseño responsive con variables CSS, flexbox/grid, animaciones.
- **JavaScript (Vanilla)**: Lógica del carrito, API de iTunes, manejo de eventos.
- **Netlify Functions**: Proxy serverless para API de iTunes (evita CORS).
- **Font Awesome**: Iconografía.
- **Google Fonts**: Tipografía Poppins.
- **Node.js**: Para dependencias y desarrollo local.

## Estructura del Proyecto
```
beatflow/
├── index.html              # Página principal con hero, video y destacados
├── catalogo.html           # Catálogo completo con paginación
├── contacto.html           # Formulario de contacto
├── login.html              # Inicio de sesión
├── register.html           # Registro de usuarios
├── search-results.html     # Resultados de búsqueda
├── checkout.html           # Checkout simulado
├── package.json            # Configuración del proyecto y dependencias
├── netlify.toml            # Configuración de despliegue en Netlify
├── css/
│   └── styles.css          # Estilos unificados y responsive
├── js/
│   └── script.js           # Lógica JavaScript (carrito, API, eventos)
├── netlify/
│   └── functions/
│       └── itunes-proxy.js # Función serverless para proxy de iTunes API
├── img/                    # Imágenes y favicon
└── README.md              # Esta documentación
```

## Responsive Breakpoints
- **Móvil pequeño**: ≤ 560px (360px, 390px, 393px)
- **Móvil grande**: ≤ 768px
- **Tablet**: 769px - 1024px (768px, 810px, 820px)
- **Desktop pequeño**: 1025px - 1365px (1366px)
- **Desktop grande**: ≥ 1366px (1920px)

## Funcionalidades
### Navegación
- Header fijo con logo y navegación.
- Menú hamburguesa en móviles con toggle JavaScript.
- Enlaces activos según página actual.

### Contenido Principal
- **Hero Section**: Título y descripción con imagen de fondo.
- **Video Promocional**: Embed de Vimeo responsive.
- **Destacados**: 10 pistas aleatorias de géneros electrónicos.
- **Reseñas**: Testimonios de usuarios.

### Carrito y Checkout
- Añadir/remover items con cantidades.
- Persistencia en localStorage.
- Panel lateral deslizable.
- Checkout con resumen y formulario simulado.

### Búsqueda
- Modal de búsqueda con input y botones.
- Filtrado por artista, álbum o canción.
- Resultados paginados (30 por página).

## Notas de Desarrollo
- **API**: iTunes Search API con proxy Netlify Functions (evita problemas de CORS)
- **Géneros filtrados**: trance, deep house, progressive house, progressive trance
- **Dependencias**: Font Awesome, Google Fonts, node-fetch (para desarrollo local)
- **Almacenamiento**: Carrito persistente con localStorage
- **Compatible**: Navegadores modernos, responsive design
- **Configuración**: netlify.toml para despliegue automático
