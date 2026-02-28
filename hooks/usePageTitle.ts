'use client';

import { useEffect } from 'react';

const SITE_NAME = 'Deliz Beauty Tools';

export function usePageTitle(title: string) {
  useEffect(() => {
    document.title = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} | Premium Quality Mannequins & Home Essentials in Ghana`;
  }, [title]);
}
