interface MetricCardProps {
  label: string;
  value: string | number;
  detail?: string;
}

export function MetricCard({ detail, label, value }: MetricCardProps) {
  return (
    <article className="ui-metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
      {detail ? <small>{detail}</small> : null}
    </article>
  );
}
