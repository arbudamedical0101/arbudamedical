import { lazy, Suspense } from 'react';
import type { ScannerProps } from './ScannerView';

// Lazy-load the camera scanner (and the heavy ZXing library) only when it is
// actually opened, so it stays out of the main app bundle.
const ScannerView = lazy(() => import('./ScannerView').then((m) => ({ default: m.ScannerView })));

export function Scanner(props: ScannerProps) {
  return (
    <Suspense fallback={null}>
      <ScannerView {...props} />
    </Suspense>
  );
}
