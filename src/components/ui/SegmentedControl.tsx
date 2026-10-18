import type { ReactNode } from 'react';

export interface SegmentItem<T extends string> {
  id: T;
  label: ReactNode;
  icon?: ReactNode;
  badge?: ReactNode;
  title?: string;
}

interface SegmentedControlProps<T extends string> {
  items: SegmentItem<T>[];
  value: T;
  onChange: (id: T) => void;
  ariaLabel?: string;
  className?: string;
}

/** iOS-style segmented control with a sliding thumb. */
export function SegmentedControl<T extends string>({
  items,
  value,
  onChange,
  ariaLabel,
  className = '',
}: SegmentedControlProps<T>) {
  const index = Math.max(
    0,
    items.findIndex((i) => i.id === value)
  );

  return (
    <div role="tablist" aria-label={ariaLabel} className={`segmented ${className}`}>
      <span
        aria-hidden="true"
        className="segmented-thumb"
        style={{
          width: `calc((100% - 4px) / ${items.length})`,
          transform: `translateX(${index * 100}%)`,
        }}
      />
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          role="tab"
          aria-selected={item.id === value}
          title={item.title}
          onClick={() => onChange(item.id)}
          className="segmented-item"
        >
          {item.icon}
          <span className="truncate">{item.label}</span>
          {item.badge}
        </button>
      ))}
    </div>
  );
}
