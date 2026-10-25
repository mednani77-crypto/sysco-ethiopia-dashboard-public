import type { Snapshot, Cell } from './model';

// Invented from scratch; these are not anonymized production records.
const definitions: Record<string, { headers: string[]; records?: Cell[][] }> = {
  Banks: { headers: ['Bank ID','Bank Name','Currency','Opening Balance','Balance'], records: [['DEMO-BANK-A','Synthetic Bank A','ETB',1000,1200]] },
  Customers: { headers: ['Customer ID','Customer Name','Branch','Opening Balance','Balance'], records: [['DEMO-CUSTOMER-A','Synthetic Customer A','Demo Branch',0,300]] },
  Items: { headers: ['Item ID','Item Name','Branch','Opening (Small Unit)','Current (Small Unit)','Small / Main','Packing Status','Main Unit','Small Unit'], records: [['DEMO-ITEM-A','Synthetic Item A','Demo Branch',100,110,10,'CONFIRMED','Carton','Piece']] },
  Accounts: { headers: ['Account ID','Account Name','Opening Balance ETB','Opening Balance USD','Balance ETB','Balance USD'], records: [['DEMO-ACCOUNT-A','Synthetic Account A',0,0,0,0]] },
  'customer payments': { headers: ['Payment ID','Date','Customer','Bank','Amount','Currency','Branch','Reference'], records: [['DEMO-PAYMENT-1','2026-06-10','DEMO-CUSTOMER-A','DEMO-BANK-A',200,'ETB','Demo Branch','DEMO-REF-1']] },
  'Sales invoice': { headers: ['Invoice ID','Date','Customer','Item','Total','Currency','Branch'], records: [['DEMO-INVOICE-1','2026-06-05','DEMO-CUSTOMER-A','DEMO-ITEM-A',500,'ETB','Demo Branch']] },
  Expenses: { headers: ['Expense ID','Date','Bank','Amount','Currency'] },
  'Customer adjustments': { headers: ['Adjustment ID','Date','Customer','Amount','Currency'] },
  Store: { headers: ['Store ID','Date','Item','Qty In (Small Unit)','Qty Out (Small Unit)','Branch'], records: [['DEMO-STOCK-1','2026-06-08','DEMO-ITEM-A',10,0,'Demo Branch']] },
  'Bank transfers': { headers: ['Transfer ID','Date','From Bank','To Bank','Amount','To Amount','From Currency','To Currency'] },
  'Account movements': { headers: ["Movement ID","Date","Account","Bank","Currency","له","عليه","USD له","USD عليه"] },
};
export const demoSnapshot: Snapshot = {
  schemaVersion: 1, spreadsheetId: 'SYNTHETIC-DEMO', title: 'Synthetic Public Demo', capturedAt: '2026-06-10T12:00:00Z',
  sheets: Object.entries(definitions).map(([name, d], gid) => ({ name, gid, values: [d.headers, ...(d.records ?? [])] })),
};
const status = { mode: 'demo', lastError: '', capturedAt: demoSnapshot.capturedAt };
const user = { id: 'demo', name: 'Synthetic Demo User', role: 'admin' };
export async function demoApi(url: string, _body?: unknown): Promise<any> {
  if (url === 'me' || url === 'login') return { user };
  if (url === 'logout') return { ok: true };
  if (url === 'master-snapshot' || url === 'sync') return { snapshot: structuredClone(demoSnapshot), status };
  if (url === 'insights') return { mode: 'local', answer: 'This is an offline synthetic demo. No AI service or accounting system is connected.' };
  throw new Error('Unavailable in the public synthetic demo.');
}
