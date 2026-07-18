// Mirrors the server's pricing.ts so the POS can show live totals.
// The server always recomputes authoritatively on save.
export interface CartLine {
  qty: number;
  saleRate: number; // GST-inclusive
  gstRate: number;
  discountPct: number;
}

const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export function priceCart(lines: CartLine[], billDiscountPct = 0) {
  const discountedGross = lines.map((l) => l.saleRate * l.qty * (1 - l.discountPct / 100));
  const itemsTotal = discountedGross.reduce((a, b) => a + b, 0);
  const billDiscountAmount = r2(itemsTotal * (billDiscountPct / 100));

  let subTotal = 0;
  let gstTotal = 0;
  lines.forEach((l, i) => {
    const share = itemsTotal > 0 ? (discountedGross[i] / itemsTotal) * billDiscountAmount : 0;
    const lineFinal = discountedGross[i] - share;
    const taxable = lineFinal / (1 + l.gstRate / 100);
    subTotal += taxable;
    gstTotal += lineFinal - taxable;
  });
  subTotal = r2(subTotal);
  gstTotal = r2(gstTotal);
  const beforeRound = subTotal + gstTotal;
  const grandTotal = Math.round(beforeRound);
  return {
    subTotal,
    gstTotal,
    billDiscountAmount,
    roundOff: r2(grandTotal - beforeRound),
    grandTotal,
  };
}
