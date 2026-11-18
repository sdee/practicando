import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Practicando — Spike',
    short_name: 'Practicando',
    description: 'Mobile swipe spike for Spanish verb conjugation flashcards.',
    start_url: '/',
    display: 'standalone',
    orientation: 'any',
    // Matched to the app shell so there's no launch flash.
    background_color: '#f9a8d4', // pink-300
    theme_color: '#312e81', // indigo-900
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
