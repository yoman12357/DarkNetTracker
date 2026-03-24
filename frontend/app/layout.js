import "./globals.css";

export const metadata = {
  title: "Traffic Correlation Dashboard",
  description: "Controlled anonymous-routing analysis platform",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
