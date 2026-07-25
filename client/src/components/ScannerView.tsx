import { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader, IScannerControls } from '@zxing/browser';
import { DecodeHintType, BarcodeFormat } from '@zxing/library';
import { Modal, Button, Input } from './ui';

export interface ScannerProps {
  onDetected: (text: string) => void;
  onClose: () => void;
  title?: string;
}

// Formats commonly found on medicine packs.
const HINTS = new Map<DecodeHintType, unknown>([
  [DecodeHintType.TRY_HARDER, true],
  [
    DecodeHintType.POSSIBLE_FORMATS,
    [
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E,
      BarcodeFormat.CODE_128,
      BarcodeFormat.CODE_39,
      BarcodeFormat.ITF,
      BarcodeFormat.QR_CODE,
      BarcodeFormat.DATA_MATRIX,
    ],
  ],
]);

export function ScannerView({ onDetected, onClose, title = 'Scan barcode / QR' }: ScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<'starting' | 'scanning' | 'error'>('starting');
  const [error, setError] = useState<string | null>(null);
  const [manual, setManual] = useState('');

  useEffect(() => {
    const reader = new BrowserMultiFormatReader(HINTS, { delayBetweenScanAttempts: 120 });
    let controls: IScannerControls | undefined;
    let done = false;

    reader
      .decodeFromConstraints(
        {
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        },
        videoRef.current as HTMLVideoElement,
        (result, _err, ctrl) => {
          controls = ctrl;
          setStatus('scanning');
          if (result && !done) {
            done = true;
            ctrl.stop();
            onDetected(result.getText());
          }
        },
      )
      .then((ctrl) => {
        controls = ctrl;
      })
      .catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : String(e);
        setStatus('error');
        setError(
          /permission|denied|NotAllowed/i.test(msg)
            ? 'Camera permission was denied. Allow camera access in your browser and reopen.'
            : /NotFound|Requested device/i.test(msg)
              ? 'No camera was found on this device.'
              : `Could not start the camera: ${msg}`,
        );
      });

    return () => {
      done = true;
      try {
        controls?.stop();
      } catch {
        /* already stopped */
      }
    };
  }, [onDetected]);

  return (
    <Modal open onClose={onClose} title={title}>
      {status !== 'error' && (
        <div className="relative overflow-hidden rounded-lg bg-black">
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video ref={videoRef} className="w-full" style={{ maxHeight: '55vh' }} autoPlay muted playsInline />
          {/* aiming guide */}
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-24 w-3/4 -translate-x-1/2 -translate-y-1/2 rounded-lg border-2 border-white/70" />
        </div>
      )}

      {status === 'error' ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : (
        <p className="mt-2 text-center text-xs text-slate-400">
          {status === 'starting' ? 'Starting camera…' : 'Hold the barcode steady inside the box, well-lit and in focus.'}
        </p>
      )}

      {/* Manual fallback — always available if the camera can't read the code. */}
      <div className="mt-4 border-t border-slate-100 pt-3">
        <p className="mb-1 text-xs font-medium text-slate-500">Or enter the code manually</p>
        <div className="flex gap-2">
          <Input
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            placeholder="Type / paste barcode"
            onKeyDown={(e) => { if (e.key === 'Enter' && manual.trim()) onDetected(manual.trim()); }}
          />
          <Button className="shrink-0" disabled={!manual.trim()} onClick={() => onDetected(manual.trim())}>Use</Button>
        </div>
      </div>

      <div className="mt-3 flex justify-end">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
      </div>
    </Modal>
  );
}
