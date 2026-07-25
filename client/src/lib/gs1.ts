// Best-effort GS1 parser for pharma barcodes / DataMatrix / QR.
// Extracts the common Application Identifiers used on medicine packs:
//   (01) GTIN, (17) expiry YYMMDD, (10) batch/lot, (21) serial.
// Falls back gracefully: if the string isn't GS1, `raw` is returned as `code`.

export interface Gs1Result {
  code: string; // GTIN if found, else the raw scanned text (use as barcode)
  gtin?: string;
  batch?: string;
  expiry?: string; // ISO yyyy-mm-dd
  serial?: string;
  isGs1: boolean;
}

const GS = '\x1d'; // FNC1 separator
const FIXED: Record<string, number> = { '00': 18, '01': 14, '11': 6, '12': 6, '13': 6, '15': 6, '16': 6, '17': 6, '20': 2 };

function expiryToIso(yymmdd: string): string | undefined {
  if (!/^\d{6}$/.test(yymmdd)) return undefined;
  const yy = Number(yymmdd.slice(0, 2));
  const mm = yymmdd.slice(2, 4);
  let dd = yymmdd.slice(4, 6);
  // GS1: day "00" means last day of the month; use 01 as a safe default here.
  if (dd === '00') dd = '01';
  const year = 2000 + yy;
  return `${year}-${mm}-${dd}`;
}

export function parseGs1(raw: string): Gs1Result {
  let s = (raw || '').trim();
  // Strip common symbology identifiers (]d2 = DataMatrix, ]Q3 = QR, ]C1 = Code128)
  s = s.replace(/^\][A-Za-z]\d/, '');

  // Bracketed form: (01)08901234567890(17)261231(10)ABC123
  if (s.includes('(')) {
    const out: Gs1Result = { code: s, isGs1: true };
    const re = /\((\d{2,4})\)([^(]*)/g;
    let m: RegExpExecArray | null;
    let found = false;
    while ((m = re.exec(s))) {
      found = true;
      applyAi(out, m[1], m[2].replace(new RegExp(GS, 'g'), ''));
    }
    if (found) {
      out.code = out.gtin ?? s;
      return out;
    }
  }

  // Concatenated form with/without FNC1 separators.
  if (/^\d/.test(s) && s.length >= 16) {
    const out: Gs1Result = { code: s, isGs1: false };
    let i = 0;
    let matched = false;
    while (i < s.length) {
      if (s[i] === GS) { i++; continue; }
      const ai = s.substr(i, 2);
      i += 2;
      if (FIXED[ai]) {
        const val = s.substr(i, FIXED[ai]);
        i += FIXED[ai];
        applyAi(out, ai, val);
        matched = true;
      } else {
        // variable length: read until FNC1 or end
        let end = s.indexOf(GS, i);
        if (end === -1) end = s.length;
        applyAi(out, ai, s.substring(i, end));
        i = end;
        matched = true;
      }
    }
    if (matched && (out.gtin || out.batch || out.expiry)) {
      out.isGs1 = true;
      out.code = out.gtin ?? raw.trim();
      return out;
    }
  }

  // Not GS1 — treat the whole thing as a plain barcode value.
  return { code: raw.trim(), isGs1: false };
}

function applyAi(out: Gs1Result, ai: string, value: string) {
  const v = value.trim();
  if (ai === '01') out.gtin = v;
  else if (ai === '17') out.expiry = expiryToIso(v);
  else if (ai === '10') out.batch = v;
  else if (ai === '21') out.serial = v;
}
