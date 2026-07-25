// Best-effort extraction of medicine details from OCR'd strip text.
// OCR on foil strips is noisy, so treat every field as a suggestion.

export interface StripFields {
  name?: string;
  manufacturer?: string;
  composition?: string;
  batch?: string;
  expiry?: string; // ISO yyyy-mm-01
  mrp?: number;
}

function normExpiry(s: string): string | undefined {
  const m = s.match(/(\d{1,2})[\/\-.](\d{2,4})/);
  if (!m) return undefined;
  const mm = m[1].padStart(2, '0');
  let yr = m[2];
  if (yr.length === 2) yr = `20${yr}`;
  const mi = Number(mm);
  if (mi < 1 || mi > 12) return undefined;
  return `${yr}-${mm}-01`;
}

export function parseStripText(text: string): StripFields {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const joined = text.replace(/\s+/g, ' ');
  const out: StripFields = {};

  const mrp = joined.match(/M\.?\s*R\.?\s*P\.?\s*[:\-]?\s*(?:Rs\.?|₹|INR)?\s*([0-9]+(?:\.[0-9]{1,2})?)/i);
  if (mrp) out.mrp = Number(mrp[1]);

  const exp = joined.match(/(?:EXP|Expiry|Exp\.?|Use before|Best before)\s*[:\-]?\s*([0-9]{1,2}[\/\-.][0-9]{2,4})/i);
  if (exp) out.expiry = normExpiry(exp[1]);

  const batch = joined.match(/(?:B\.?\s*No\.?|Batch\s*No\.?|Batch|LOT|B\/N|Mfg\. Lic)\s*[:\-]?\s*([A-Z0-9][A-Z0-9\-]{2,})/i);
  if (batch) out.batch = batch[1].toUpperCase();

  // Name: first "clean" line that isn't an obvious keyword line.
  const skip = /mrp|exp|batch|mfg|lot|comp|store|dosage|contains|licen|net\b|tablet|capsule|rs\.?|₹|read|keep|reach|children/i;
  const nameCand = lines.find((l) => l.replace(/[^A-Za-z]/g, '').length >= 4 && !skip.test(l));
  if (nameCand) out.name = nameCand.replace(/[^A-Za-z0-9 +\-]/g, '').trim();

  const man = lines.find((l) => /(pharma|laborator|industries|\bltd\b|limited|healthcare|remedies|\blabs\b|biotech|life ?sciences)/i.test(l));
  if (man) out.manufacturer = man.replace(/[^A-Za-z0-9 .,&\-]/g, '').trim();

  const comp = lines.find((l) => /\b\d+\s*(mg|mcg|ml|g)\b/i.test(l) || /each .*contains/i.test(l));
  if (comp) out.composition = comp.trim();

  return out;
}
