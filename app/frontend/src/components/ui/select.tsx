"use client";

import * as React from "react";
import { createPortal } from "react-dom";

type SelectCtx = {
  open: boolean;
  setOpen: (v: boolean) => void;
  value: string | undefined;
  onValueChange: (v: string) => void;
  disabled?: boolean;
  rootRef: React.RefObject<HTMLDivElement>;
};

const Ctx = React.createContext<SelectCtx | null>(null);

export function Select({ value, onValueChange, disabled, children }: { value: string | undefined; onValueChange: (v: string) => void; disabled?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      const el = rootRef.current;
      if (!el) return;
      if (!el.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  return (
    <div ref={rootRef} className="relative inline-block" data-select-root>
      <Ctx.Provider value={{ open, setOpen, value, onValueChange, disabled, rootRef }}>{children}</Ctx.Provider>
    </div>
  );
}

export function SelectTrigger({ className, children, ariaLabel }: { className?: string; children: React.ReactNode; ariaLabel?: string }) {
  const ctx = React.useContext(Ctx)!;
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      className={(className ?? "") + (ctx.disabled ? " opacity-50 cursor-not-allowed" : "")}
      onClick={() => {
        if (ctx.disabled) return;
        ctx.setOpen(!ctx.open);
      }}
    >
      {children}
    </button>
  );
}

export function SelectContent({ className, children }: { className?: string; children: React.ReactNode }) {
  const ctx = React.useContext(Ctx)!;
  const [pos, setPos] = React.useState<
    | {
        left: number;
        width: number;
        top?: number;
        bottom?: number;
        maxHeight: number;
      }
    | null
  >(null);

  React.useEffect(() => {
    if (!ctx.open) return;
    const calc = () => {
      const n = ctx.rootRef.current;
      if (!n) return;
      const rect = n.getBoundingClientRect();
      const margin = 8;
      const desired = 240; // px
      const vh = window.innerHeight;
      const vw = window.innerWidth;
      const spaceBelow = vh - rect.bottom - margin;
      const spaceAbove = rect.top - margin;
      const openAbove = spaceBelow < 160 && spaceAbove > spaceBelow;
      const maxHeight = Math.max(120, Math.min(desired, openAbove ? spaceAbove : spaceBelow));
      const left = Math.min(rect.left, vw - rect.width - margin);
      if (openAbove) {
        setPos({ left, width: rect.width, bottom: vh - rect.top + 4, maxHeight });
      } else {
        setPos({ left, width: rect.width, top: rect.bottom + 4, maxHeight });
      }
    };
    calc();
    window.addEventListener("scroll", calc, true);
    window.addEventListener("resize", calc);
    return () => {
      window.removeEventListener("scroll", calc, true);
      window.removeEventListener("resize", calc);
    };
  }, [ctx.open, ctx.rootRef]);

  if (!ctx.open || !pos) return null;

  return createPortal(
    <>
      <div className="fixed inset-0 z-[9998]" onMouseDown={() => ctx.setOpen(false)} />
      <div
        className={"fixed z-[9999] rounded-md border bg-white shadow overflow-auto " + (className ?? "")}
        style={{
          top: pos.top,
          bottom: pos.bottom,
          left: pos.left,
          minWidth: Math.max(224, pos.width),
          maxHeight: pos.maxHeight,
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </>,
    document.body
  );
}

export function SelectItem({ value, children, className }: { value: string; children: React.ReactNode; className?: string }) {
  const ctx = React.useContext(Ctx)!;
  const selected = ctx.value === value;
  return (
    <div
      role="option"
      aria-selected={selected}
      className={
        "px-3 py-2 cursor-pointer hover:bg-gray-100 text-sm " +
        (selected ? "bg-gray-50 font-medium" : "") +
        (className ? " " + className : "")
      }
      onClick={() => {
        if (ctx.disabled) return;
        ctx.onValueChange(value);
        ctx.setOpen(false);
      }}
    >
      {children}
    </div>
  );
}

export function SelectValue({ placeholder }: { placeholder?: string }) {
  const ctx = React.useContext(Ctx)!;
  return <span className="truncate text-sm text-gray-800">{ctx.value ?? placeholder ?? "Select"}</span>;
}
