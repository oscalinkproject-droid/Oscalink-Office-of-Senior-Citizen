import type { Metadata } from "next";
import { Inter, Manrope } from "next/font/google";
import { ToastProvider } from "@/components/ui/toast";
import "./globals.css";

import { MotionProvider } from "@/components/providers/motion-provider";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "OSCALINK | Office for Senior Citizen Affairs",
  description: "Digital platform for monitoring senior citizens and managing records in Cotabato City.",
  icons: {
    icon: [
      {
        url: "https://res.cloudinary.com/de98nxawm/image/upload/c_scale,w_32/v1784430191/Cotabato_City_Official_Seal_httyas.png",
        sizes: "32x32",
        type: "image/png",
      },
      {
        url: "https://res.cloudinary.com/de98nxawm/image/upload/c_scale,w_16/v1784430191/Cotabato_City_Official_Seal_httyas.png",
        sizes: "16x16",
        type: "image/png",
      },
    ],
    apple: "https://res.cloudinary.com/de98nxawm/image/upload/c_scale,w_180/v1784430191/Cotabato_City_Official_Seal_httyas.png",
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={`${inter.variable} ${manrope.variable} antialiased min-h-full flex flex-col`}>
        <MotionProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </MotionProvider>
      </body>
    </html>
  );
}
