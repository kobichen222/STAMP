export const formatPrice = (price: number | null | undefined) =>
  price == null ? 'לפי הצעה' : `₪${price.toLocaleString('he-IL', { maximumFractionDigits: 2 })}`;

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
