import type { Metadata } from "next";
import "@/index.css";

export const metadata: Metadata = {
  title: "Beacon CRM - Beacon Corporate Realty Ltd",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
