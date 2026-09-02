import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";

const arabic = Cairo({
  variable: "--font-arabic",
  subsets: ["arabic", "latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "قرص الألوان — متجر الملابس",
  description:
    "تصفّح ألوان التيشيرت على قرص دوّار ثلاثي الأبعاد، واختر لونك لتراه عن قرب.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" className={arabic.variable}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
