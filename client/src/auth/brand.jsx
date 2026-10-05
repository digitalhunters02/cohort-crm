// Per-product bits the shared sign-in screens need.
export const BRAND = {
  name: 'Cohort',
  tagline: 'Ashford Preparatory Academy',
  storageKey: 'cohort-crm-session',
  langKey: 'cohort-lang',
  titleFont: 'font-serif',
};

export function BrandLogo({ size = 40 }) {
  return (
    <span
      className="inline-flex items-center justify-center rounded-xl bg-side"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg width={size * 0.62} height={size * 0.62} viewBox="0 0 26 26" fill="none">
        <path d="M13 2 23.5 8v10L13 24 2.5 18V8Z" stroke="#c98a4d" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M13 2v22M2.5 8l10.5 6 10.5-6" stroke="#c98a4d" strokeWidth="1.1" />
        <circle cx="13" cy="13" r="1.9" fill="#c98a4d" />
      </svg>
    </span>
  );
}
