import type { ReactNode } from 'react';

export interface TableRow {
  key: string;
  label: string;
  /** One entry per column after the row heading; `label` is shown above the value on narrow screens. */
  cells: { label: string; text: string }[];
}

function Cell({ label, children }: { label: string; children: string }) {
  return (
    <td role="cell" className="px-4 py-2 text-base sm:table-cell">
      <span aria-hidden="true" className="block text-sm text-muted sm:hidden">{label}</span>
      {children}
    </td>
  );
}

/**
 * The before-and-after style table. The roles are written out because a grid layout on narrow
 * screens can make browsers drop the table's own meaning. A `null` header is the blank corner cell.
 */
export function WhatIfTable({ caption, headers, rows }: { caption: ReactNode; headers: (string | null)[]; rows: TableRow[] }) {
  return (
    <table role="table" className="w-full border-collapse text-left">
      <caption className="mb-2 text-left text-sm text-pretty text-muted">{caption}</caption>
      <thead role="rowgroup" className="sr-only sm:not-sr-only">
        <tr role="row" className="sm:table-row">
          {headers.map((h, i) => h === null
            ? <th key={`blank-${i}`} role="columnheader" scope="col" className="w-1/4" />
            : <th key={h} role="columnheader" scope="col" className="px-4 py-2 text-sm font-semibold text-muted">{h}</th>)}
        </tr>
      </thead>
      <tbody role="rowgroup">
        {rows.map((r) => (
          <tr key={r.key} role="row" className="grid grid-cols-3 odd:bg-surface sm:table-row">
            <th role="rowheader" scope="row" className="col-span-3 px-4 pt-2 text-base font-semibold sm:table-cell sm:py-2">{r.label}</th>
            {r.cells.map((c) => <Cell key={c.label} label={c.label}>{c.text}</Cell>)}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
