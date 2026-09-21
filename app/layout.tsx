import type { Metadata, Viewport } from "next";
import NextTopLoader from "nextjs-toploader";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "@/context/AuthContext";
import { SkeletonStyles } from "@/components/Skeleton";
import ConfirmDialogHost from "@/components/ConfirmDialogHost";
import ServiceWorkerRegistrar from "@/components/ServiceWorkerRegistrar";
import "@/index.css";

export const metadata: Metadata = {
  title: "Beacon CRM - Beacon Corporate Realty Ltd",
  description:
    "Leads, site inspections and documentation for Beacon Corporate Realty.",
  applicationName: "Beacon CRM",
  icons: {
    icon: "/favicon.svg",
    apple: "/icons/apple-touch-icon.png",
  },
  // iOS ignores the manifest's display mode and reads these instead, so an
  // installed icon opens full-screen there too.
  appleWebApp: {
    capable: true,
    title: "Beacon CRM",
    statusBarStyle: "default",
  },
  formatDetection: {
    // Stops iOS turning every lead's budget figure into a phone link.
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#D4262A",
  width: "device-width",
  initialScale: 1,
  // Installed on a notched phone, the app should reach the edges; the layout
  // handles its own safe areas.
  viewportFit: "cover",
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
        <SkeletonStyles />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: { fontSize: "14px" },
            success: { style: { border: "1px solid #D0F5E3" } },
            error: { duration: 6000, style: { border: "1px solid #FEE4E2" } },
          }}
        />
        <ConfirmDialogHost />
        <ServiceWorkerRegistrar />
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
