import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "HomeCare Passport",
    short_name: "HomeCare",
    description: "Hồ sơ bảo hành và bảo dưỡng đồ dùng cá nhân",
    start_url: "/",
    display: "standalone",
    background_color: "#f4f7f8",
    theme_color: "#164e63",
    icons: []
  };
}
