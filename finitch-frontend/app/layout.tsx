import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import ClientLayout from "./client-layout";

export const metadata: Metadata = {
  title: "Vaultic | Decision Intelligence Engine",
  description: "Secure your financial DNA. Outrun your trajectory.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-scroll-behavior="smooth" data-theme="dark">
      <body className="bg-vaultic-black text-vaultic-cream antialiased font-body">
        <Suspense fallback={null}>
          <ClientLayout>{children}</ClientLayout>
        </Suspense>
      </body>
    </html>
  );
}
