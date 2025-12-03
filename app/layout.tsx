import type { Metadata } from "next";
import "./globals.css";

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
      <body className="antialiased font-sans">
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
