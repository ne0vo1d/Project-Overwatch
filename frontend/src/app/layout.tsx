import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { Sidebar } from "@/components/ui/Sidebar";

export const metadata: Metadata = {
  title: "Project Overwatch",
  description: "Modern incident management & notification platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#0f1117]">
        <Providers>
          <div className="flex h-screen">
            <Sidebar />
            <main className="flex-1 overflow-y-auto p-6">{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
