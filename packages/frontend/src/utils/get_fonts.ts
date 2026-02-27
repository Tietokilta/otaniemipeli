import localFont from "next/font/local";

export const Pixeloid = localFont({
  src: "../../public/fonts/pixeloid-font/PixeloidSans-E40en.ttf",
  variable: "--font-pixeloid",
  display: "swap",
});

export const PixeloidMono = localFont({
  src: "../../public/fonts/pixeloid-font/PixeloidMono.ttf",
  variable: "--font-pixeloid-mono",
  display: "swap",
});

export const PixeloidBold = localFont({
  src: "../../public/fonts/pixeloid-font/PixeloidSansBold-OG894.ttf",
  variable: "--font-pixeloid-bold",
  display: "swap",
});
