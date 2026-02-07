import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VAST Test Harness - Google IMA SDK",
  description: "Validate VAST tags, track events, and debug media playback with Bunny.net video streaming",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <script src="https://imasdk.googleapis.com/js/sdkloader/ima3.js" async />
      </head>
      <body>{children}</body>
    </html>
  );
}
