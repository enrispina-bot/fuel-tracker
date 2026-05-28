import "./globals.css";

export const metadata = {
  title: "Fuel Tracker",
  
icons: {
    icon: "/icon.png",
    apple: "/icon.png",
  },

};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="it">
      <body>{children}</body>
    </html>
  );
}
