import { Cormorant_Garamond, Great_Vibes, Manrope, Montserrat, Playfair_Display } from "next/font/google";

// Pareja de la referencia (por defecto): Montserrat (menú, títulos, botones), Cormorant (textos) y Great Vibes (subtítulos).
export const montserrat = Montserrat({ subsets: ["latin"], variable: "--font-montserrat", display: "swap", weight: ["400", "500", "600"] });
export const cormorant = Cormorant_Garamond({ subsets: ["latin"], variable: "--font-cormorant", display: "swap", weight: ["400", "500", "600"], style: ["normal", "italic"] });
export const greatVibes = Great_Vibes({ subsets: ["latin"], variable: "--font-greatvibes", display: "swap", weight: "400" });

// Pareja alternativa seleccionable en el CRM: no se precarga.
export const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair", display: "swap", weight: ["400", "500", "600"], preload: false });
export const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope", display: "swap", preload: false });

export const fontVariables = [montserrat.variable, cormorant.variable, greatVibes.variable, playfair.variable, manrope.variable].join(" ");
