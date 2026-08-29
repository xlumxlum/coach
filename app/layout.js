import "./globals.css";

export const metadata = {
  title: "Lehrstellen Interview-Training",
  description: "Trainiere für dein Lehrstellen-Vorstellungsgespräch",
};

export default function RootLayout({ children }) {
  return (
    <html lang="de-CH">
      <body>{children}</body>
    </html>
  );
}
