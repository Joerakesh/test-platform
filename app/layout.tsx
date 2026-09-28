// @ts-nocheck
import "./globals.css";
import { SCHOOL } from "@/lib/school";

export const metadata = {
  title: `${SCHOOL.name} — Examination Cell`,
  description: `Online test platform for ${SCHOOL.name}, ${SCHOOL.place}. Question papers, test sessions, mark registers.`,
};

export const viewport = {
  themeColor: "#7a1020",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
