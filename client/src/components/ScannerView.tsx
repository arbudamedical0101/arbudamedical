import { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader, IScannerControls } from '@zxing/browser';
import { Modal, Button } from './ui';

/**
 * Camera barcode / QR scanner. Opens the (rear) camera, decodes the first
 * code it sees and calls onDetected with the raw text, then closes.
 * Works on phones over HTTPS (camera permission required).
 */
export interface ScannerProps {
  onDetected: (text: string) => void;
  onClose: () => void;
  title?: string;
}

export function ScannerView({ onDetected, onClose, title = 'Scan barcode / QR' }: ScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const reader = new BrowserMultiFormatReader();
    let controls: IScannerControls | undefined;
    let done = false;

    reader
      .decodeFromConstraints(
        { video: { facingMode: { ideal: 'environment' } } },
        videoRef.current as HTMLVideoElement,
        (result, _err, ctrl) => {
          controls = ctrl;
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
        setError(
          /permission|denied|NotAllowed/i.test(msg)
            ? 'Camera permission was denied. Allow camera access and try again.'
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
      {error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : (
        <>
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video ref={videoRef} className="w-full rounded-lg bg-black" style={{ maxHeight: '60vh' }} muted playsInline />
          <p className="mt-2 text-center text-xs text-slate-400">
            Point the rear camera at the barcode or QR code on the pack.
          </p>
        </>
      )}
      <div className="mt-3 flex justify-end">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
      </div>
    </Modal>
  );
}
