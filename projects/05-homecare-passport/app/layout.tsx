import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HomeCare Passport",
  description: "Quản lý đồ dùng, bảo hành và bảo dưỡng trong gia đình"
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#164e63"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="vi"><body>{children}</body></html>;
}
