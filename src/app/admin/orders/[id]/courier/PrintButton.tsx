'use client';

import { Icon } from '@/components/ui/Icon';

export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className="btn-primary">
      <Icon name="file" size={16} /> הדפסה
    </button>
  );
}
