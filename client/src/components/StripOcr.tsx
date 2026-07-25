import { useState } from 'react';
import { Modal, Button } from './ui';
import { parseStripText, StripFields } from '@/lib/stripParse';

/**
 * Take/upload a photo of a medicine strip, OCR it on-device (Tesseract.js,
 * dynamically imported), and return best-effort extracted fields.
 */
export function StripOcr({
  onExtracted,
  onClose,
}: {
  onExtracted: (fields: StripFields) => void;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [preview, setPreview] = useState<string | null>(null);
  const [rawText, setRawText] = useState('');
  const [fields, setFields] = useState<StripFields | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async (file: File) => {
    setBusy(true);
    setError(null);
    setFields(null);
    setProgress(0);
    setPreview(URL.createObjectURL(file));
    try {
      const Tesseract = (await import('tesseract.js')).default;
      const { data } = await Tesseract.recognize(file, 'eng', {
        logger: (m: { status: string; progress: number }) => {
          if (m.status === 'recognizing text') setProgress(Math.round(m.progress * 100));
        },
      });
      const text = data.text || '';
      setRawText(text);
      setFields(parseStripText(text));
    } catch {
      setError('Could not read the image. Try a sharper, well-lit, straight-on photo.');
    } finally {
      setBusy(false);
    }
  };

  const hasAny = fields && Object.values(fields).some(Boolean);

  return (
    <Modal open onClose={onClose} title="Fill from strip photo">
      <label className="flex min-h-[44px] cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-slate-300 text-sm font-medium text-slate-600 hover:bg-slate-50">
        📷 Take / choose a photo of the strip
        <input
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) run(f); }}
        />
      </label>

      {preview && <img src={preview} alt="strip" className="mt-3 max-h-40 rounded-lg" />}
      {busy && <p className="mt-3 text-sm text-slate-500">Reading text… {progress}%</p>}
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {fields && (
        <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm">
          <p className="mb-1 font-medium text-slate-700">Detected (edit after applying):</p>
          {hasAny ? (
            <ul className="space-y-0.5 text-slate-600">
              {fields.name && <li>Name: <b>{fields.name}</b></li>}
              {fields.manufacturer && <li>Manufacturer: {fields.manufacturer}</li>}
              {fields.composition && <li>Composition: {fields.composition}</li>}
              {fields.batch && <li>Batch: {fields.batch}</li>}
              {fields.expiry && <li>Expiry: {fields.expiry}</li>}
              {fields.mrp != null && <li>MRP: ₹{fields.mrp}</li>}
            </ul>
          ) : (
            <p className="text-slate-500">Couldn’t confidently detect fields — you can copy from the raw text below.</p>
          )}
        </div>
      )}

      {rawText && (
        <details className="mt-2 text-xs text-slate-400">
          <summary className="cursor-pointer">Show raw text</summary>
          <pre className="mt-1 max-h-32 overflow-y-auto whitespace-pre-wrap">{rawText}</pre>
        </details>
      )}

      <div className="mt-4 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button disabled={!hasAny} onClick={() => fields && onExtracted(fields)}>Apply</Button>
      </div>
    </Modal>
  );
}
