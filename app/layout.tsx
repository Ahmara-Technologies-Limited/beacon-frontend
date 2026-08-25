import type { Metadata } from "next";
import NextTopLoader from "nextjs-toploader";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "@/context/AuthContext";
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
      <body>
        <NextTopLoader color="#D4262A" showSpinner={false} />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: { fontSize: "14px" },
            success: { style: { border: "1px solid #D0F5E3" } },
            error: { duration: 6000, style: { border: "1px solid #FEE4E2" } },
          }}
        />
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
