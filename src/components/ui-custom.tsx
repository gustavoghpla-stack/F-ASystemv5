import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  icon: string;
  children?: ReactNode;
}

export function PageHeader({ title, icon, children }: PageHeaderProps) {
  return (
    <div className="px-4 py-3 border-b border-border bg-card flex flex-wrap items-center gap-2 shrink-0">
      <h1 className="font-heading text-[17px] sm:text-xl font-bold text-primary tracking-[1px] flex-1 min-w-[150px]">
        {icon} {title}
      </h1>
      {children && (
        <div className="flex flex-wrap gap-1.5 items-center">
          {children}
        </div>
      )}
    </div>
  );
}

interface StatCardProps {
  value: number | string;
  label: string;
  color?: string;
}

export function StatCard({ value, label, color }: StatCardProps) {
  return (
    <div className="bg-card border border-border rounded-xl p-3.5 text-center">
      <div className={`font-heading text-[26px] font-bold ${color || 'text-primary'}`}>{value}</div>
      <div className="text-[10px] text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}

interface TableWrapperProps {
  searchValue?: string;
  onSearch?: (v: string) => void;
  searchPlaceholder?: string;
  count?: string;
  children: ReactNode;
  actions?: ReactNode;
}

export function TableWrapper({ searchValue, onSearch, searchPlaceholder, count, children, actions }: TableWrapperProps) {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="p-2.5 px-3.5 bg-secondary border-b border-border flex items-center gap-2.5 flex-wrap">
        {onSearch && (
          <input
            type="text"
            value={searchValue}
            onChange={e => onSearch(e.target.value)}
            placeholder={searchPlaceholder}
            className="flex-1 min-w-[160px] p-[7px_10px] bg-card border border-border text-foreground rounded-md outline-none text-[12px] focus:border-primary"
          />
        )}
        {count && <span className="text-muted-foreground text-[11px] whitespace-nowrap">{count}</span>}
        {actions}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          {children}
        </table>
      </div>
    </div>
  );
}

export function Th({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <th className={`p-[9px_11px] text-left text-[9px] font-bold tracking-[1.5px] text-muted-foreground uppercase border-b border-border whitespace-nowrap bg-secondary ${className}`}>
      {children}
    </th>
  );
}

export function Td({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <td className={`p-[8px_11px] text-[12px] border-b border-primary/5 ${className}`}>
      {children}
    </td>
  );
}

interface BadgeProps {
  children: ReactNode;
  variant?: 'gold' | 'success' | 'danger' | 'info';
}

export function Badge({ children, variant = 'gold' }: BadgeProps) {
  const styles = {
    gold: 'bg-primary/10 text-primary border-primary/25',
    success: 'bg-success/10 text-success border-success/25',
    danger: 'bg-destructive/10 text-destructive border-destructive/25',
    info: 'bg-info/10 text-info border-info/25',
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold tracking-[0.5px] uppercase border ${styles[variant]}`}>
      {children}
    </span>
  );
}

interface BtnProps {
  children: ReactNode;
  variant?: 'gold' | 'outline' | 'danger' | 'success' | 'info';
  size?: 'sm' | 'md';
  onClick?: () => void;
  className?: string;
}

export function Btn({ children, variant = 'gold', size = 'md', onClick, className = '' }: BtnProps) {
  const base = 'rounded-md font-semibold inline-flex items-center gap-1.5 transition-all hover:opacity-85 hover:-translate-y-px active:translate-y-0 whitespace-nowrap cursor-pointer border-none';
  const sizes = {
    sm: 'py-[5px] px-[9px] text-[10px]',
    md: 'py-[7px] px-[14px] text-[11px] tracking-[0.3px]',
  };
  const variants = {
    gold: 'bg-gradient-to-br from-gold-dark to-primary text-primary-foreground',
    outline: 'bg-transparent border border-border text-muted-foreground hover:border-primary hover:text-primary',
    danger: 'bg-destructive text-destructive-foreground',
    success: 'bg-success text-success-foreground',
    info: 'bg-info text-info-foreground',
  };
  return (
    <button onClick={onClick} className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}>
      {children}
    </button>
  );
}

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  maxWidth?: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function Modal({ open, onClose, title, maxWidth = '960px', children, footer }: ModalProps) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 bg-black/75 z-50 flex items-end sm:items-center justify-center"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="animate-slide-up bg-popover border border-primary/50 rounded-t-2xl sm:rounded-xl overflow-hidden flex flex-col shadow-2xl w-full sm:w-[92%]" style={{ maxWidth, maxHeight: '95vh' }}>
        <div className="p-3.5 px-[18px] bg-secondary border-b border-border flex items-center gap-2.5 shrink-0">
          <h2 className="font-heading text-[15px] sm:text-lg font-bold text-primary flex-1 tracking-[0.5px] truncate">{title}</h2>
          <button onClick={onClose} className="bg-transparent text-muted-foreground text-[22px] cursor-pointer p-[2px_8px] rounded-md transition-colors hover:text-destructive shrink-0">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 sm:p-[18px]">{children}</div>
        {footer && (
          <div className="p-3 px-4 sm:px-[18px] bg-card border-t border-border flex justify-end gap-2 flex-wrap shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

interface FormCardProps {
  title: string;
  icon?: string;
  children: ReactNode;
}

export function FormCard({ title, icon, children }: FormCardProps) {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden mb-3.5">
      <div className="p-[9px_16px] bg-secondary border-b border-border font-heading text-[12px] font-semibold text-primary tracking-[1px] uppercase flex items-center gap-[7px]">
        {icon} {title}
      </div>
      <div className="p-[14px_16px]">{children}</div>
    </div>
  );
}

interface FieldProps {
  label: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}

export function Field({ label, required, children, className = 'flex-1 min-w-[70px]' }: FieldProps) {
  return (
    <div className={`flex flex-col gap-[3px] ${className}`}>
      <label className="text-[9px] font-bold tracking-[1px] text-muted-foreground uppercase">
        {label} {required && <span className="text-primary">*</span>}
      </label>
      {children}
    </div>
  );
}

export function Input({ className = '', ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`p-[8px_10px] bg-background border border-border text-foreground rounded-md outline-none w-full text-[12px] transition-all focus:border-primary focus:shadow-[0_0_0_2px_hsl(var(--gold-glow))] ${className}`}
    />
  );
}

export function Select({ className = '', children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`p-[8px_10px] bg-background border border-border text-foreground rounded-md outline-none w-full text-[12px] transition-all focus:border-primary focus:shadow-[0_0_0_2px_hsl(var(--gold-glow))] ${className}`}
    >
      {children}
    </select>
  );
}

// ─── CurrencyInput ────────────────────────────────────────────────────────────
// Text input that accepts/displays values in Brazilian format (78.000,00).
// Internally stores the value as a plain decimal string (78000.00) so it is
// compatible with all existing Number() conversions elsewhere.
import { useState as _useState } from 'react';

export function CurrencyInput({
  value,
  onChange,
  className = '',
  placeholder = '0,00',
  ...props
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'>) {
  const [focused, setFocused] = _useState(false);

  // Normalize any string to a plain decimal: "78.000,50" → "78000.50"
  const normalize = (raw: string): string => {
    // Remove thousand separators (dots before comma decimal) and replace comma with dot
    // Handles: 78000 / 78000.50 / 78.000,50 / 78000,50
    const s = String(raw).trim();
    if (!s) return '';
    // If contains comma, treat as pt-BR decimal
    if (s.includes(',')) {
      // Remove all dots (thousand sep), replace comma with dot
      return s.replace(/\./g, '').replace(',', '.');
    }
    // Otherwise already has dot decimal or is integer — keep as is
    return s;
  };

  // Format a numeric string for display
  const format = (raw: string): string => {
    const num = parseFloat(normalize(raw));
    if (isNaN(num)) return '';
    return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const displayValue = focused ? String(value ?? '') : format(String(value ?? ''));

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Allow free typing while focused; normalize later on blur
    onChange?.({ ...e, target: { ...e.target, value: e.target.value } } as any);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setFocused(false);
    // Normalize the stored value on blur
    const normalized = normalize(e.target.value);
    if (normalized !== e.target.value) {
      onChange?.({ ...e, target: { ...e.target, value: normalized } } as any);
    }
    props.onBlur?.(e);
  };

  return (
    <Input
      {...props}
      className={className}
      value={displayValue}
      onChange={handleChange}
      onFocus={(e) => { setFocused(true); props.onFocus?.(e); }}
      onBlur={handleBlur}
      placeholder={focused ? '' : placeholder}
      inputMode="decimal"
    />
  );
}

// ─── ConfirmModal — substitui window.confirm() que não funciona no iOS ────────
interface ConfirmModalProps {
  open: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'gold';
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  open, title = 'Confirmar', message,
  confirmLabel = 'Confirmar', cancelLabel = 'Cancelar',
  variant = 'danger', onConfirm, onCancel,
}: ConfirmModalProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/75 z-[60] flex items-end sm:items-center justify-center"
      onClick={e => { if (e.target === e.currentTarget) onCancel(); }}>
      <div className="bg-popover border border-primary/50 rounded-t-2xl sm:rounded-xl w-full sm:w-auto sm:min-w-[320px] sm:max-w-[420px] shadow-2xl animate-slide-up">
        <div className="p-4 pb-2 border-b border-border">
          <h3 className="font-heading text-[15px] font-bold text-foreground">{title}</h3>
        </div>
        <div className="p-4">
          <p className="text-[13px] text-muted-foreground leading-relaxed">{message}</p>
        </div>
        <div className="p-4 pt-2 flex gap-2.5 flex-row-reverse">
          <button onClick={onConfirm}
            className={`flex-1 py-3 rounded-xl text-[13px] font-bold transition-opacity hover:opacity-85
              ${variant === 'danger' ? 'bg-destructive text-destructive-foreground' : 'bg-primary text-primary-foreground'}`}>
            {confirmLabel}
          </button>
          <button onClick={onCancel}
            className="flex-1 py-3 rounded-xl text-[13px] font-semibold bg-secondary border border-border text-foreground">
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
