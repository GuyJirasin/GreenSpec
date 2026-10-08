import { useEffect, useRef } from 'react';
import { X, Leaf, ArrowUpRight } from 'lucide-react';

export function Button({ children, primary, link, className = '', ...props }) {
  return <button className={`btn ${primary ? 'btn-primary' : ''} ${link ? 'btn-link' : ''} ${className}`} {...props}>{children}</button>;
}
export function Badge({ children, tone }) {
  const text = String(children);
  const kind = tone || (/Fail|High Risk|High risk|Not Pass|Rejected|blocked/.test(text) ? 'bad' : /Review|Medium|Verification|Unresolved|Adjustment/.test(text) ? 'warn' : 'good');
  return <span className={`inline-flex rounded-md px-2 py-1 text-[11px] font-semibold ${kind === 'bad' ? 'bg-red-50 text-red-700' : kind === 'warn' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-800'}`}>{children}</span>;
}
export function Title({ title, subtitle, action }) {
  return <div className="mb-7 flex flex-wrap items-center justify-between gap-4"><div><h1 className="mb-2">{title}</h1><p className="text-muted">{subtitle}</p></div>{action}</div>;
}
export function Kpis({ items }) {
  return <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{items.map(([label, value, sub]) => <div className="card" key={label}><p className="text-xs text-muted">{label}</p><div className="my-3 text-2xl font-semibold tracking-tight">{value}</div><p className="text-xs text-muted">{sub}</p></div>)}</div>;
}
export function Empty({ title, children, action }) {
  return <div className="card py-14 text-center"><div className="mx-auto mb-5 grid size-12 place-items-center rounded-full bg-mint text-forest"><Leaf size={23} /></div><h2 className="mb-2">{title}</h2><p className="mb-6 text-muted">{children}</p>{action}</div>;
}
export function Table({ children }) { return <div className="overflow-x-auto"><table className="w-full min-w-[550px] text-sm">{children}</table></div>; }
export function Actions({ children }) { return <div className="no-print mt-6 flex flex-wrap justify-end gap-3">{children}</div>; }
export function Bar({ value, muted }) { return <div className="my-3 h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${muted ? 'bg-slate-300' : 'bg-emerald-600'}`} style={{ width: `${value}%` }} /></div>; }
export function Field({ label, children }) { return <label className="flex flex-col gap-2">{label}{children}</label>; }
export function Modal({ title, children, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    const dialog = ref.current;
    dialog.showModal();
    return () => { dialog.close(); previous?.focus(); };
  }, []);
  return <dialog ref={ref} onCancel={onClose} onClick={e => { if (e.target === ref.current) onClose(); }} className="m-auto w-[calc(100%-2rem)] max-w-xl rounded-2xl border-0 bg-white p-0 text-ink backdrop:bg-forest/40"><div className="max-h-[85vh] overflow-auto p-6"><div className="mb-5 flex items-center justify-between gap-4"><h2>{title}</h2><Button aria-label="Close dialog" onClick={onClose}><X size={16} /></Button></div>{children}</div></dialog>;
}
export function SourceButton({ item, onClick }) { return <Button link onClick={() => onClick(item)}>{item.source}<ArrowUpRight size={14} /></Button>; }
