import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "Relay IT Service Hub", description: "Ticket and asset operations for small IT teams" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="vi"><body>{children}</body></html>;
}

