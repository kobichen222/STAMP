import { Breadcrumbs } from './Breadcrumbs';

export function PageHero({
  eyebrow,
  title,
  lead,
  crumbs,
  children,
}: {
  eyebrow?: string;
  title: string;
  lead?: string;
  crumbs?: { label: string; href?: string }[];
  children?: React.ReactNode;
}) {
  return (
    <section className="relative overflow-hidden border-b border-line bg-gradient-to-b from-surface to-white pt-24 pb-12 sm:pt-28 sm:pb-16">
      <div className="pointer-events-none absolute -top-40 left-1/2 h-80 w-[60rem] -translate-x-1/2 rounded-full bg-blue/5 blur-3xl" />
      <div className="container-x relative">
        {crumbs && <Breadcrumbs items={crumbs} />}
        {eyebrow && <p className="eyebrow mt-4">{eyebrow}</p>}
        <h1 className="mt-2 max-w-3xl text-4xl font-extrabold sm:text-5xl">{title}</h1>
        {lead && <p className="mt-4 max-w-2xl text-lg leading-8 text-muted">{lead}</p>}
        {children}
      </div>
    </section>
  );
}
