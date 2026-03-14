import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MindBoard",
  description: "Local-first Kanban board for markdown files",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className="bg-obsidian-bg text-obsidian-text antialiased"
        style={{
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        }}
      >
        {children}
      </body>
    </html>
  );
}
