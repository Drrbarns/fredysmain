import type { Metadata } from 'next';
import PageHero from '@/components/PageHero';
import LookbookGallery from '@/components/LookbookGallery';

const siteUrl =
  process.env.NEXT_PUBLIC_APP_URL || 'https://frebysfashion.com';

export const metadata: Metadata = {
  title: 'Lookbook',
  description:
    'Browse photos of our kids ready-to-wear Ankara dresses and studio creations from Freby’s Fashion GH.',
  alternates: { canonical: `${siteUrl}/lookbook` },
  openGraph: {
    title: 'Lookbook | Freby’s Fashion GH',
    description:
      'Photos of our latest kids Ankara outfits — Haatso, Accra, worldwide delivery.',
    url: `${siteUrl}/lookbook`,
    type: 'website',
  },
};

export default function LookbookPage() {
  return (
    <div className="min-h-screen bg-white">
      <PageHero
        title="Lookbook"
        subtitle="A walk through our dresses and creations — tap any photo to view it larger."
      />
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <LookbookGallery />
      </section>
    </div>
  );
}
