'use client';
import { NhostProvider } from '@nhost/nextjs';
import { ApolloProvider } from '@/lib/apollo';
import { nhost } from '@/lib/nhost';
import './globals.css';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <NhostProvider nhost={nhost}>
          <ApolloProvider>
            {children}
          </ApolloProvider>
        </NhostProvider>
      </body>
    </html>
  );
}
