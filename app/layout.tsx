import type {Metadata} from 'next';
import './globals.css'; // Global styles

export const metadata: Metadata = {
  title: 'Magic Eraser - Remove Watermark from Video Online Free',
  description: 'Erase video watermarks, logos, subtitles, and timestamps with AI. No blur, no crop. 100% free with no watermark on output.',
  openGraph: {
    title: 'Magic Eraser - Remove Watermark from Video Online Free',
    description: 'Erase video watermarks, logos, subtitles, and timestamps with AI. No blur, no crop. 100% free with no watermark on output.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Magic Eraser - Remove Watermark from Video Online Free',
    description: 'Erase video watermarks, logos, subtitles, and timestamps with AI. No blur, no crop. 100% free with no watermark on output.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
