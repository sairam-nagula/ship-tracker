import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Margaritaville at Sea – Ship Tracker",
  description: "Live tracking for MVAS Islander and Paradise.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <div className="app-shell">
          {children}

          <footer className="site-footer">
            © {new Date().getFullYear()} Margaritaville at Sea — All Rights Reserved
          </footer>
        </div>
      </body>
    </html>
  );
}
