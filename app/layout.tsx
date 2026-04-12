import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: 'GrindOs — Habit Tracker & Gym Logger',
  description:
    'Simple habit tracker and gym logger with streaks, progress insights, and AI coaching.',
  manifest: '/manifest.json',
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'GrindOs',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#06060F',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className="antialiased"
        style={{ background: '#06060F', color: '#E2E8F0' }}
      >
        {children}
        {/* Register SW inline — minimal JS, no extra bundle */}
        <script
          dangerouslySetInnerHTML={{
            __html: `if('serviceWorker' in navigator){window.addEventListener('load',()=>{navigator.serviceWorker.register('/sw.js',{scope:'/'})})}`
          }}
        />
      </body>
    </html>
  );
}

