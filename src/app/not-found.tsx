import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="container page center">
      <h1>העמוד לא נמצא</h1>
      <p>ייתכן שהעמוד הועבר. אפשר לחזור לדף הבית, לעבור לחנות או לעצב חותמת אונליין.</p>
      <p className="product-actions" style={{ justifyContent: 'center' }}>
        <Link href="/" className="btn btn-outline">דף הבית</Link>
        <Link href="/shop/" className="btn btn-outline">חנות חותמות</Link>
        <Link href="/designer/" className="btn btn-primary">מעצב החותמות</Link>
      </p>
    </div>
  );
}
