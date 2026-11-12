'use client';

import { useState } from 'react';
import type { Bucket } from '@/lib/reports';
import { Card, METRICS, Seg, Trend, type Metric } from './charts';

/** The dashboard's trend chart: this period over the previous one, with a metric switch. */
export function TrendCard({ series, title, hint, legend }: { series: Bucket[]; title: string; hint: string; legend: [string, string] }) {
  const [metric, setMetric] = useState<Metric>('revenue');
  const options = METRICS.filter((m) => m.id !== 'stamps');
  return (
    <Card title={title} hint={hint} action={<Seg label="מדד" value={metric} onChange={setMetric} options={options} />}>
      <Trend series={series} metric={metric} hasPrev />
      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[13px] text-muted">
        <span className="flex items-center gap-1.5">
          <i className="h-0.5 w-4 rounded bg-blue" />
          {legend[0]}
        </span>
        <span className="flex items-center gap-1.5">
          <i className="h-0.5 w-4 rounded bg-[#8a94a6]" />
          {legend[1]}
        </span>
      </div>
    </Card>
  );
}
