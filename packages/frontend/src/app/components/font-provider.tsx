import { Pixeloid, PixeloidBold, PixeloidMono } from "@/utils/get_fonts";

const FontProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <html
      lang="fi"
      className={`${Pixeloid.variable} ${PixeloidBold.variable} ${PixeloidMono.variable}`}
    >
      <body>{children}</body>
    </html>
  );
};

export default FontProvider;
