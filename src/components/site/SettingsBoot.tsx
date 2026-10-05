'use client';

import { applyPublicSettings, type PublicSettings } from '@/lib/admin-settings';

let applied = '';

/**
 * Applies the admin's prices / contact details in the browser before the page
 * renders (placed first in <body>), so client-side quotes match the server.
 */
export function SettingsBoot({ settings }: { settings: PublicSettings }) {
  const key = JSON.stringify(settings);
  if (applied !== key) {
    applyPublicSettings(settings);
    applied = key;
  }
  return null;
}
