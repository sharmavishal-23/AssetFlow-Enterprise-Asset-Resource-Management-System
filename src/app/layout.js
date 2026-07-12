import "./globals.css";

export const metadata = {
  title: "AssetFlow - Enterprise Asset & Resource Management",
  description: "Production-ready Asset & Resource Management ERP System",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
