'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

export type LookbookItem = {
  id: string;
  title: string;
  caption: string | null;
  image_url: string;
  sort_order: number;
};

/** Full-page dress gallery (same data as admin “Homepage gallery”). */
export default function LookbookGallery() {
  const [items, setItems] = useState<LookbookItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/storefront/homepage-gallery', { cache: 'no-store' });
        const json = await res.json();
        if (!cancelled && res.ok && Array.isArray(json.items)) {
          setItems(json.items);
        }
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const close = useCallback(() => setLightbox(null), []);

  useEffect(() => {
    if (lightbox === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') setLightbox((i) => (i !== null && i > 0 ? i - 1 : i));
      if (e.key === 'ArrowRight')
        setLightbox((i) => (i !== null && i < items.length - 1 ? i + 1 : i));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightbox, items.length, close]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="aspect-[3/4] rounded-2xl bg-gray-100 animate-pulse" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-16 px-4 rounded-2xl border border-dashed border-brand-green/25 bg-brand-greenLight/30">
        <i className="ri-image-2-line text-4xl text-brand-green/60 mb-4 block" />
        <p className="text-lg font-semibold text-gray-900">Gallery coming soon</p>
        <p className="mt-2 text-sm text-gray-600 max-w-md mx-auto">
          We’re preparing new photos of our dresses. Browse the shop in the meantime.
        </p>
        <Link
          href="/shop"
          className="inline-flex mt-6 items-center rounded-full bg-brand-orange px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-orangeDark transition-colors"
        >
          Shop collection
          <i className="ri-arrow-right-line ml-2" />
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {items.map((item, index) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setLightbox(index)}
            className="group relative aspect-[3/4] overflow-hidden rounded-2xl border border-brand-green/15 bg-white shadow-sm text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange"
          >
            <Image
              src={item.image_url}
              alt={item.title || 'Lookbook photo'}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent opacity-90" />
            <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4">
              {item.title ? (
                <p className="text-sm font-semibold text-white drop-shadow line-clamp-2">{item.title}</p>
              ) : null}
              {item.caption ? (
                <p className="mt-1 text-xs text-white/90 line-clamp-2">{item.caption}</p>
              ) : null}
            </div>
          </button>
        ))}
      </div>

      {lightbox !== null && items[lightbox] && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Gallery image"
          onClick={close}
        >
          <button
            type="button"
            className="absolute top-4 right-4 z-[102] flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
            onClick={close}
            aria-label="Close"
          >
            <i className="ri-close-line text-2xl" />
          </button>
          {lightbox > 0 && (
            <button
              type="button"
              className="absolute left-2 sm:left-4 top-1/2 z-[102] -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
              onClick={(e) => {
                e.stopPropagation();
                setLightbox((i) => (i !== null && i > 0 ? i - 1 : i));
              }}
              aria-label="Previous"
            >
              <i className="ri-arrow-left-s-line text-2xl" />
            </button>
          )}
          {lightbox < items.length - 1 && (
            <button
              type="button"
              className="absolute right-2 sm:right-4 top-1/2 z-[102] -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
              onClick={(e) => {
                e.stopPropagation();
                setLightbox((i) => (i !== null && i < items.length - 1 ? i + 1 : i));
              }}
              aria-label="Next"
            >
              <i className="ri-arrow-right-s-line text-2xl" />
            </button>
          )}
          <div
            className="relative max-h-[85vh] max-w-5xl w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative aspect-[3/4] max-h-[85vh] w-full mx-auto">
              <Image
                src={items[lightbox].image_url}
                alt={items[lightbox].title || 'Lookbook'}
                fill
                className="object-contain"
                sizes="100vw"
                priority
              />
            </div>
            {(items[lightbox].title || items[lightbox].caption) && (
              <div className="mt-4 text-center text-white">
                {items[lightbox].title ? (
                  <p className="text-lg font-semibold">{items[lightbox].title}</p>
                ) : null}
                {items[lightbox].caption ? (
                  <p className="mt-1 text-sm text-white/85">{items[lightbox].caption}</p>
                ) : null}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
