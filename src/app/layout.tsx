import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Zooz Treats",
  description: "Home bakery — fresh cookies and treats.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
