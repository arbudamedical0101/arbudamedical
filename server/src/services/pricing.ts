export interface RawLine {
  qty: number;
  saleRate: number; // GST-inclusive (Indian retail MRP-style pricing)
  gstRate: number;
  discountPct: number;
}

export interface PricedLine {
  qty: number;
  rate: number;
  gstRate: number;
  discountPct: number;
  taxableValue: number;
  cgst: number;
  sgst: number;
  lineTotal: number; // GST-inclusive amount the customer pays for this line
}

export interface PricedBill {
  lines: PricedLine[];
  subTotal: number; // sum of taxable values
  gstTotal: number;
  billDiscountPct: number;
  billDiscountAmount: number;
  roundOff: number;
  grandTotal: number;
}

const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/**
 * Prices a bill. Sale rates are GST-inclusive. A line discount is applied
 * first, then any bill-level discount is distributed proportionally across
 * lines so the CGST/SGST split (and the GSTR-1 summary) stays correct.
 */
export function priceBill(raw: RawLine[], billDiscountPct = 0): PricedBill {
  const discountedGross = raw.map((l) => {
    const gross = l.saleRate * l.qty;
    return gross * (1 - l.discountPct / 100);
  });
  const itemsTotal = discountedGross.reduce((a, b) => a + b, 0);
  const billDiscountAmount = r2(itemsTotal * (billDiscountPct / 100));

  const lines: PricedLine[] = raw.map((l, idx) => {
    const afterLineDisc = discountedGross[idx];
    // Proportional share of the bill discount for this line.
    const share = itemsTotal > 0 ? (afterLineDisc / itemsTotal) * billDiscountAmount : 0;
    const lineFinal = afterLineDisc - share; // inclusive of GST
    const taxableValue = lineFinal / (1 + l.gstRate / 100);
    const gst = lineFinal - taxableValue;
    return {
      qty: l.qty,
      rate: l.saleRate,
      gstRate: l.gstRate,
      discountPct: l.discountPct,
      taxableValue: r2(taxableValue),
      cgst: r2(gst / 2),
      sgst: r2(gst / 2),
      lineTotal: r2(lineFinal),
    };
  });

  const subTotal = r2(lines.reduce((a, l) => a + l.taxableValue, 0));
  const gstTotal = r2(lines.reduce((a, l) => a + l.cgst + l.sgst, 0));
  const beforeRound = subTotal + gstTotal;
  const grandTotal = Math.round(beforeRound);
  const roundOff = r2(grandTotal - beforeRound);

  return {
    lines,
    subTotal,
    gstTotal,
    billDiscountPct,
    billDiscountAmount,
    roundOff,
    grandTotal,
  };
}
