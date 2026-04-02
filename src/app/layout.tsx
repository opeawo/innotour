import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { fraunces, instrumentSans } from "@/styles/fonts";
import { TRPCReactProvider } from "@/trpc/client";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "Innovation Tournament Platform",
  description:
    "Run structured innovation competitions where peers judge peers and the best ideas advance.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html
        lang="en"
        className={`${fraunces.variable} ${instrumentSans.variable} h-full antialiased`}
      >
        <body className="min-h-full flex flex-col">
          <TRPCReactProvider>
            {children}
          </TRPCReactProvider>
          <Toaster />
        </body>
      </html>
    </ClerkProvider>
  );
}
