import type { Metadata } from 'next';
import { Inter, Space_Grotesk } from 'next/font/google';
import { CartProvider } from '@/src/hooks/useCart';
import './globals.css';

const spaceGrotesk = Space_Grotesk({
    subsets: ['latin'],
    variable: '--font-display',
    weight: ['500', '600', '700'],
});

const inter = Inter({
    subsets: ['latin'],
    variable: '--font-body',
});

export const metadata: Metadata = {
    title: 'Vestro — Minimalist Tech Accessories',
    description: 'Thoughtfully designed accessories for the way you actually work.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <body className={`${spaceGrotesk.variable} ${inter.variable} font-body bg-paper text-ink antialiased`}>
                <CartProvider>{children}</CartProvider>
            </body>
        </html>
    );
}
