import type { Metadata } from 'next';
import { AccountView } from './AccountView';

export const metadata: Metadata = { title: 'האזור שלי', robots: { index: false } };

export default function AccountPage() {
  return <AccountView />;
}
