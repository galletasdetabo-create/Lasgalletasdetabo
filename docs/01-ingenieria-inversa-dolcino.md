# Ingeniería inversa de la referencia (Dolcino)

Fecha de inspección: 18–19 de noviembre de 2026.
Sitio: https://dolcino.qodeinteractive.com/ (tema WordPress + WooCommerce de Qode Interactive).

## Método y herramientas

- **REA** (`capture_browser_scenario`, Chrome 157 headless, viewport 1440×900, `reduced_motion: no-preference`): captura de la página de inicio con árbol de accesibilidad y captura de pantalla. La herramienta devuelve las capturas como base64 dentro del resultado (más de 1 MB por página), lo que hacía inviable repetirla en las 12 rutas.
- **Playwright (Chrome local) como complemento**: navegación por las rutas, capturas a disco en escritorio (1440) y móvil (390), extracción de estilos computados, reglas `transition`/`animation`, `@keyframes`, estados hover, menú desplegable, mini‑carrito, cabecera fija y menú móvil.
- No se copió código, imágenes, textos ni recursos de Dolcino. Solo se midieron patrones (tiempos, curvas, proporciones, estructura) para recrearlos con implementación y contenido propios.

Rutas inspeccionadas: Home (`/`), Cookies & Tarts (`/cookies-tarts/`), Cake Store (`/cake-store/`), Pastry Home (`/`), Product List (`/shop/`), Product Single (`/product/orange-twist/`), Shop Layouts (`/shop/three-columns/`), Cart (`/cart/`), Checkout (`/checkout/`), My Account (`/my-account/`), About Us (`/about-us/`), Contact Us (`/contact-us/`).

## 1. Componentes visuales

| Componente | Observación |
|---|---|
| Preloader | Línea dorada horizontal con rombo central; animación `scaleX` de 3.5 s `cubic-bezier(0.18, 0.89, 0.32, 1)`. |
| Cabecera | 130 px de alto, fondo blanco. Variante centrada (logo arriba, menú debajo) en Cookies & Tarts; variante logo izquierda + menú derecha en tienda. Iconos de búsqueda, carrito con contador y menú lateral. |
| Menú | Montserrat 13 px, mayúsculas, `letter-spacing` ≈ 0.19 em, padding horizontal 24 px. Activo/hover en dorado con subrayado corto. Transición `color 0.2s ease-out`. |
| Desplegable | Panel blanco sin borde, ítems en serif cursiva (Cormorant 21 px). Aparece con `top 0.15s ease-out` y opacidad. Submenús con chevron. |
| Cabecera fija | Aparece tras el scroll con `0.6s cubic-bezier(0.77, 0, 0.175, 1)`. |
| Hero / slider | Imagen a ancho de contenedor, título en caligrafía (Great Vibes), separador dorado con rombo, dos botones (sólido blanco y contorno). Paginación con rombos. Flechas laterales finas. |
| Títulos de sección | Patrón triple: subtítulo caligráfico dorado + título Montserrat 600 en mayúsculas con tracking amplio (0.1 em) + separador dorado con rombo + párrafo serif cursiva centrado. |
| Tarjeta de producto | Imagen cuadrada sobre gris muy claro; nombre Montserrat mayúsculas; categorías y precio en serif cursiva. Hover: velo blanco translúcido sobre la imagen y botón "Add to cart" en dorado con subrayado. Etiquetas "New", "Sale", "Sold" en bloque dorado en la esquina. |
| Banners editoriales | Imagen ancha con texto a un lado y botón dorado sólido. |
| Galería | Mosaico de 4 columnas sin separación. |
| Testimonios | Carrusel centrado con cita en serif cursiva y paginación. |
| Pie de página | Fondo negro; logo, subtítulo caligráfico, texto, iconos sociales dentro de rombos con borde dorado; columna de contacto. |
| Fondo | Variante "boxed": contenedor blanco sobre una textura clara con patrón en los márgenes; el hero usa fotografía de mármol claro. |

## 2. Estructura por página

- **Home / Pastry home**: hero dividido (imagen + titular), "Our story", cita caligráfica, grilla de productos (6), galería en mosaico, tabla de precios, menú, línea de tiempo, equipo, formulario de contacto, banner, testimonios, footer.
- **Cookies & Tarts**: cabecera centrada, slider hero, 3 tarjetas de categoría, banner "Daily offers", grilla de 8 productos, banner "Birthday cups", redes sociales.
- **Cake Store**: variante comercial con productos protagonistas y banners.
- **Product list**: título de página con imagen, contador de resultados y ordenamiento, grilla 2–5 columnas, barra lateral (filtro por precio, categorías, productos recientes, etiquetas, búsqueda), paginación numérica.
- **Product single**: galería con miniaturas verticales a la izquierda, título, precio, valoración, descripción corta, selector de cantidad con botones +/−, botón "Add to cart" dorado, SKU/categorías/etiquetas, pestañas (descripción, información adicional, reseñas), productos relacionados (4).
- **Cart / Checkout / My account**: plantillas WooCommerce con la tipografía del tema; tabla de carrito, cupón, totales; checkout de una columna de datos + resumen; acceso y registro.
- **About / Contact**: bloques editoriales con imagen, texto, mapa y formulario.

## 3. Funcionalidades

Carrito persistente con contador en cabecera, mini‑carrito al pasar el cursor, cantidades editables, cupones, filtros por precio y categoría, ordenamiento, paginación, pestañas de producto, productos relacionados, cuenta de usuario, búsqueda.

## 4. Comportamientos y animaciones medidas

| Patrón | Valor medido |
|---|---|
| Entrada al hacer scroll | **Auditoría del 19/11/2026**: la página de inicio de la referencia no anima la entrada de textos, tarjetas ni imágenes. Al hacer scroll solo se mueven los separadores, las franjas con parallax, la cabecera fija y el carrusel de testimonios. Por eso la web tampoco anima esos elementos. |
| Separador con rombo | Línea de 140 px y 1 px con rombo de 8 px. Al entrar en pantalla la línea pasa de `scale(0)` a `scale(1)` desde el centro en 1 s con `cubic-bezier(0.18, 0.89, 0.32, 1)`. El rombo no se anima. |
| Franja con parallax | La imagen queda fija (`background-attachment: fixed`, tamaño natural) y su posición vertical es 0,4 × velocidad × distancia de la franja al borde superior. Velocidad 1 en la frase y 1,1 en la lista de productos. Mide 571 px y 828 px de alto. |
| Imagen de producto al pasar el cursor | Parte con `scale(1.06)` y baja a `scale(1)` en 0,8 s `ease-out`. El velo blanco al 90 % aparece en 0,2 s `ease-out`. |
| Aparición genérica | `fadein` y `opacity 0.8s`. |
| Curvas de transición | `cubic-bezier(0.165, 0.84, 0.44, 1)` (ease‑out‑quart), `cubic-bezier(0.785, 0.135, 0.15, 0.86)` (ease‑in‑out‑circ), `cubic-bezier(0, 1, 0.5, 1)`, `cubic-bezier(0.77, 0, 0.175, 1)`. |
| Duraciones | Hover de color 0.2–0.25 s; velos de imagen 0.3–0.5 s; reveals 0.55–1.1 s. |
| Botones | Cambio de color, fondo y borde en 0.2–0.25 s lineal. |
| Desplegable | Opacidad y posición en 0.15–0.3 s. |
| Calendario (fecha) | `fpFadeInDown` 300 ms `cubic-bezier(0.23, 1, 0.32, 1)`. |

## 5. Responsive

A 390 px: cabecera de 70 px con logo a la izquierda y hamburguesa a la derecha; el menú se despliega bajo la cabecera como lista con separadores y chevrons; el hero pasa a formato vertical con botones apilados a ancho completo; las tarjetas pasan a una columna; el patrón de fondo de los márgenes se mantiene.

## 6. Elementos reutilizables identificados

Título de sección triple, separador con rombo, botón sólido/contorno, tarjeta de producto, banner editorial, mosaico de galería, carrusel, iconos sociales en rombo, selector de cantidad, pestañas, migas, barra lateral de filtros.

## 7. Patrones de conversión

CTA doble en el hero (descubrir / comprar), "Add to cart" visible al pasar el cursor, contador del carrito siempre visible, productos relacionados al final de la ficha, banners de oferta intercalados entre grillas.

## 8. Medidas del hero y de los patrones (mediadas el 19/11/2026 a 1440×900 y 390×844)

**Portada (Revolution Slider, pantalla completa de 900 px de alto)**

| Elemento | Valor medido |
|---|---|
| Cabecera | 130 px, transparente sobre la portada. Logotipo a 90 px del borde. Menú Montserrat 13 px, peso 500, espaciado 2,47 px, mayúsculas, relleno lateral de 24 px; hover en dorado y subrayado corto de 22 px |
| Subtítulo | Great Vibes 60 px / 70 px, dorado |
| Título | Montserrat 95 px / 100 px, peso 600, espaciado 12 px, mayúsculas |
| Separador | Línea dorada de 180 px con rombo central |
| Párrafo | Cormorant cursiva 26 px / 36 px, ancho 750 px |
| Botones | Montserrat 13 px, peso 500, espaciado 2,47 px, relleno 12 × 54 px, 52 px de alto, sin radio. Uno sólido y otro con borde dorado |
| Flechas | Dos chevrones finos de 32 × 62 px, a 20 px del borde izquierdo y a 62 px del derecho |
| Paginación | Rombos de 11 px, separados 34 px, a 51 px del borde inferior; el activo va relleno |
| Móvil | Cabecera de 70 px con logo de 44 px y botón de tres líneas. El contenido se centra y los botones se apilan |

**Animación de entrada de cada capa** (extraída de los datos del slider):

| Capa | Desde | Curva | Inicio | Duración |
|---|---|---|---|---|
| Subtítulo | x −50 px, opacidad 0 | power2.out | 210 ms | 1000 ms |
| Título | x +50 px, opacidad 0 | power2.inOut | 250 ms | 1000 ms |
| Separador | escala 0,8, opacidad 0 | power4.out | 240 ms | 500 ms |
| Párrafo | opacidad 0 | lineal | 490 ms | 800 ms |
| Botones | opacidad 0 | lineal | ≈650 ms | 800 ms |

El fondo de cada diapositiva hace un desplazamiento lento y cruza con la siguiente. Antes del hero hay un preloader: línea dorada con rombo que escala con `cubic-bezier(0.18, 0.89, 0.32, 1)`.

**Patrones del resto de la página**

- Títulos de sección: subtítulo Great Vibes 50 px / 40 px, título Montserrat 56 px (móvil 32 px), peso 600, espaciado 0,1 em, mayúsculas, separador con rombo y párrafo Cormorant cursiva de 21 px.
- Cabecera fija: aparece al subir y se oculta al bajar. Fondo blanco, borde inferior claro, desplazamiento de 130 px con `0.6s cubic-bezier(0.77, 0, 0.175, 1)`.
- Aparición de elementos: opacidad 0 → 1 y desplazamiento de 30 % en 0,55 s `ease`.
- Banda de título de página: 300 px de alto (móvil, 96 px), título Montserrat 70 px con espaciado 8,4 px y fotografía a la derecha.
- Tienda: cuadrícula de dos columnas con barra lateral de 305 px (buscar, filtrar por precio, categorías, destacados). Tarjetas cuadradas sobre gris muy claro; al pasar el cursor, velo blanco y enlace dorado.
- Ficha: miniaturas verticales a la izquierda, título Montserrat, precio en cursiva, cantidad cuadrada con `+` y `−` apilados, botón dorado con doble borde y pestañas.

## 9. Adaptación a Las Galletas de Tabo

El diseño, las medidas, la tipografía y las animaciones son los de la referencia. Solo cambian el contenido y la identidad:

- **Textos** propios de la marca; ninguno procede de la referencia.
- **Imágenes**: fotografías de stock con licencia (ver [07-creditos-imagenes.md](07-creditos-imagenes.md)). El logotipo y el favicon son los de la marca.
- **Colores**: el negro de los textos pasa a chocolate `#6A4437` y el dorado a `#D9B477` (editable en el CRM). Para texto pequeño se usa un dorado oscurecido para mantener el contraste (WCAG).
- **Fondo**: mármol blanco con vetas grises muy sutiles, requisito del cliente, en lugar del fondo plano.
- **Pie de página**: la referencia es negro. Aquí es claro, sobre mármol, porque el cliente pidió evitar grandes superficies oscuras. La estructura es la misma: contacto, marca centrada con lema y redes en rombos, información y línea de copyright.
- **Preloader**: se incluye, pero no espera más de 2,5 s y no bloquea el contenido.
- **Contenido sin equivalente real**: el mapa del pie, la firma, los miembros del equipo y el vídeo no se incluyen, porque no hay datos ni fotografías reales de la marca.
- **Imágenes recortables**: la referencia usa productos recortados sobre blanco. Con fotografías de stock completas, las tarjetas recortan la imagen en cuadrado. Mejorará al sustituirlas por fotografías propias sobre fondo blanco.

Fuentes: Montserrat, Cormorant Garamond y Great Vibes (Google Fonts, servidas desde el mismo dominio con `next/font`).
