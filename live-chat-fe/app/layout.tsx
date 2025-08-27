import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Live Chat - Real-time Chat App",
  description: "Join rooms and chat in real-time. Simple, fast, and secure chat app built with Bun + Next.js.",
  keywords: ["chat app", "real-time chat", "Bun WebSocket", "Next.js chat", "Live Chat"],
  openGraph: {
    title: "Live Chat - Real-time Chat App",
    description: "Chat with friends instantly. Join rooms, send messages, and see who's online.",
    url: "https://chat.mahs.me",
    siteName: "Live Chat",
    images: [
      {
        url: "https://chat.mahs.me/og-image.png", // add an OG image later
        width: 1200,
        height: 630,
        alt: "Live Chat App Preview",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Live Chat - Real-time Chat App",
    description: "Chat instantly with friends in real-time rooms.",
    images: ["https://chat.mahs.me/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            {children}
          </ThemeProvider>
      </body>
    </html>
  );
}
