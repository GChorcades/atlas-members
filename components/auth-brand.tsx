import { getBrand } from '@/lib/brand';

export async function AuthBrand() {
  const brand = await getBrand();
  const initial = brand.name.trim().charAt(0).toUpperCase() || 'A';

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
      {brand.logoUrl ? (
        <>
          <img
            src={brand.logoUrl}
            alt={brand.name}
            style={{ height: 32, width: 'auto', maxWidth: 200, objectFit: 'contain' }}
          />
          {!brand.logoOnly && <span style={{ fontWeight: 600, fontSize: 17 }}>{brand.name}</span>}
        </>
      ) : (
        <>
          <span className="sidebar-brand-mark">{initial}</span>
          <span style={{ fontWeight: 600, fontSize: 17 }}>{brand.name}</span>
        </>
      )}
    </div>
  );
}
