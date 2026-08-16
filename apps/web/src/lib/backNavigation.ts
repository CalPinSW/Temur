export function getBackHref(pathname: string): string | null {
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length <= 1) return null;
  return `/${segments.slice(0, -1).join('/')}`;
}
