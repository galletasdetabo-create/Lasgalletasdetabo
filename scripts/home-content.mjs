// Contenido inicial de la página de inicio (editable después desde el CRM).
// Orden de secciones igual al de la referencia: portada, historia, frase, categorías, productos,
// galería, pasos, lista con precios, bloque dividido, testimonios, Instagram y WhatsApp.
export function homeSections(ids) {
  const img = (s) => ids[s] ?? null;
  const gallery = ["galletas-corazon-glaseado-rosa", "corazones-de-masa", "caja-regalo-flores", "galletas-estrella-glaseadas", "alfajor-dulce-de-leche-corte", "galletas-glaseadas-plato", "galletas-chispas-marmol"]
    .map(img).filter(Boolean).map((image) => ({ image }));
  const insta = ["decorando-galletas-corazon", "galletas-glaseadas-plato", "corazones-de-azucar", "galletas-corazon-horneadas", "cortador-y-rodillo"]
    .map(img).filter(Boolean).map((image) => ({ image }));
  return [
    { type: "hero", label: "Portada", variant: "slider", content: {
      slides: [
        { bg: img("hero-fondo-1"), image: img("hero-producto-1"), eyebrow: "Regalos que enamoran", title: "Alfajores artesanales",
          text: "Cajas de alfajores rellenos de dulce de leche, con el lazo que elijas y listas para regalar.",
          cta_primary_label: "Pedir alfajores", cta_primary_href: "/tienda/alfajores-artesanales" },
        { bg: img("hero-fondo-2"), image: img("hero-producto-2"), eyebrow: "Amor en cada detalle", title: "Aniversarios inolvidables",
          text: "Detalles dulces y personalizados para celebrar el amor y las fechas que merecen recordarse.",
          cta_primary_label: "Crea tu detalle", cta_primary_href: "/tienda" },
        { bg: img("hero-fondo-3"), image: img("hero-producto-3"), eyebrow: "Sorpresas que celebran", title: "Momentos especiales",
          text: "Detalles únicos y personalizados para cumpleaños, aniversarios y fechas inolvidables.",
          cta_primary_label: "Crea tu detalle", cta_primary_href: "/tienda/galletas-personalizadas" },
      ].filter((s) => s.image && s.bg) } },
    { type: "story", label: "Historia de la marca (texto provisional)", variant: "default", content: {
      eyebrow: "hecho en casa", title: "Nuestra historia",
      text: "Las Galletas de Tabo nace en una cocina de casa, donde cada pedido se hornea y se decora a mano. Creemos que un detalle dulce puede hacer especial cualquier día, y por eso cuidamos cada galleta y cada alfajor como si fueran para nuestra propia familia.",
      quote: "Horneando con amor", image: img("fondo-historia") } },
    { type: "quote", label: "Frase", variant: "default", content: { text: "Cada galleta lleva un poquito de amor, hecha a mano.", image: img("fondo-frase") } },
    { type: "categories", label: "Nuestras dos líneas", variant: "default", content: {
      eyebrow: "lo que hacemos", title: "Dos dulces", intro: "Elige entre galletas diseñadas para tu ocasión o nuestros alfajores suaves rellenos de dulce de leche.",
      items: [
        { title: "Galletas personalizadas", text: "Con tu nombre, mensaje y colores", image: img("galleta-recorte"), href: "/tienda/galletas-personalizadas", link_label: "Ver galletas" },
        { title: "Alfajores artesanales", text: "Rellenos de dulce de leche", image: img("alfajor-recorte"), href: "/tienda/alfajores-artesanales", link_label: "Ver alfajores" },
      ] } },
    { type: "featured_products", label: "Favoritos", variant: "grid", content: {
      eyebrow: "favoritos de la casa", title: "Productos destacados", intro: "Una selección de lo que más nos piden. Todo se hornea por encargo.", source: "featured", limit: 6, cta_label: "Ver toda la tienda", cta_href: "/tienda" } },
    { type: "gallery", label: "Galería", variant: "mosaic", content: { eyebrow: "del horno a tu mesa", title: "Galería", images: gallery } },
    { type: "menu_list", label: "Delicias de la casa", variant: "image-right", content: {
      title: "Pura delicia", source: "dulces", limit: 4, image: img("fondo-menu-marmol"), plate: img("plato-corazon"), cta_label: "Ver tienda", cta_href: "/tienda" } },
    { type: "timeline", label: "Tradición (textos provisionales: confirmar años e historia)", variant: "default", content: {
      eyebrow: "nuestra", title: "Tradición",
      intro: "El arte de elaborar galletas que combinan recetas tradicionales, ingredientes de calidad y un toque de alegría en cada creación.",
      image: img("fondo-tradicion"),
      items: [
        { year: "2018", label: "La receta familiar", title: "Nuestros inicios", text: "Todo comenzó con una receta casera, la ilusión de compartir algo especial y la pasión por la repostería. Con el tiempo, esa tradición se convirtió en una variedad de galletas y alfajores que hoy endulzan momentos únicos." },
        { year: "2019", label: "Primeras creaciones", title: "Primeras creaciones", text: "Los primeros diseños y sabores que salieron de nuestra cocina, hechos a mano y con mucho cuidado." },
        { year: "2021", label: "Más variedad de galletas", title: "Más variedad", text: "Fuimos sumando formas, colores y sabores para acompañar cada celebración." },
        { year: "2023", label: "Nuevas presentaciones", title: "Nuevas presentaciones", text: "Llegaron las cajas de regalo y las presentaciones pensadas para sorprender." },
        { year: "2025", label: "Seguimos endulzando momentos", title: "Seguimos endulzando momentos", text: "Seguimos horneando con amor para endulzar los momentos que más importan." },
      ] } },
    { type: "steps", label: "Cómo pedir", variant: "default", content: {
      eyebrow: "así de fácil", title: "Cómo pedir", intro: "Todos nuestros productos se preparan por encargo. Revisa el tiempo de preparación de cada uno.",
      items: [
        { title: "Elige", text: "Explora la tienda y escoge el producto, el tamaño o la presentación." },
        { title: "Personaliza", text: "Cuéntanos la ocasión, los colores, el texto y la fecha en que lo necesitas." },
        { title: "Confirma", text: "Completa tus datos y elige cómo pagar: PSE, transferencia o WhatsApp." },
        { title: "Celebra", text: "Te avisamos cuando tu pedido esté listo para la entrega." },
      ], cta_label: "Empezar mi pedido", cta_href: "/tienda" } },
    { type: "feature_split", label: "Galletas personalizadas", variant: "image-left", content: {
      eyebrow: "hechas para ti", title: "Galletas personalizadas",
      text: "Tú nos cuentas la idea y nosotros la convertimos en galletas: personajes, flores, iniciales, logos o mensajes. Cada diseño se decora a mano con glaseado real.",
      bullets: [{ text: "Diseño a la medida de tu ocasión" }, { text: "Nombres, fechas y mensajes cortos" }, { text: "Los colores de tu celebración" }, { text: "Sube una imagen de referencia al pedir" }],
      image: img("decorando-galletas-corazon"), cta_label: "Personalizar galletas", cta_href: "/producto/galletas-personalizadas-a-tu-gusto" } },
    { type: "testimonials", label: "Testimonios (agregar testimonios reales)", variant: "default", enabled: false, content: { eyebrow: "lo que dicen de nosotros", title: "Testimonios", items: [] } },
    { type: "instagram", label: "Instagram", variant: "default", content: { eyebrow: "síguenos", title: "En Instagram", text: "Mira nuestros diseños más recientes y comparte tus celebraciones con nosotros.", images: insta } },
    { type: "whatsapp_cta", label: "Pedidos por WhatsApp", variant: "default", content: {
      eyebrow: "¿tienes una idea especial?", title: "Escríbenos por WhatsApp", text: "Si prefieres contarnos tu idea directamente, te ayudamos a diseñar tu pedido por WhatsApp.",
      button_label: "Pedir por WhatsApp", message: "¡Hola! Quiero hacer un pedido en Las Galletas de Tabo.", image: img("corazones-de-azucar") } },
  ];
}
