import type { Config } from 'tailwindcss';

const config: Config = {
    content: ['./src/app/**/*.{ts,tsx}', './src/components/**/*.{ts,tsx}'],
    theme: {
        extend: {
            colors: {
                ink: '#0B0D10',
                paper: '#F6F5F2',
                accent: '#3D5AFE',
                muted: '#8A8F98',
            },
            fontFamily: {
                display: ['var(--font-display)', 'sans-serif'],
                body: ['var(--font-body)', 'sans-serif'],
            },
        },
    },
    plugins: [],
};

export default config;
