/**
 * Copyright (c) 2026 EAExpertise
 *
 * This software is licensed under the MIT License with Commons Clause.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to use,
 * copy, modify, merge, publish, distribute, and sublicense the Software,
 * subject to the conditions of the MIT License and the Commons Clause.
 *
 * Commercial use of this Software is strictly prohibited unless explicit prior
 * written permission is obtained from EAExpertise.
 *
 * The Software may be used for internal business purposes, research,
 * evaluation, or other non-commercial purposes.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

"use client";

import * as React from "react";

type Ctx = { open: boolean; setOpen: (v: boolean) => void };
const DialogCtx = React.createContext<Ctx | null>(null);

export function Dialog({ children, open: openProp, onOpenChange }: { children: React.ReactNode; open?: boolean; onOpenChange?: (v: boolean) => void }) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const controlled = typeof openProp === "boolean";
  const open = controlled ? (openProp as boolean) : internalOpen;
  const setOpen = (v: boolean) => {
    if (!controlled) setInternalOpen(v);
    onOpenChange?.(v);
  };
  return <DialogCtx.Provider value={{ open, setOpen }}>{children}</DialogCtx.Provider>;
}

export function useDialog() {
  const ctx = React.useContext(DialogCtx);
  if (!ctx) return { open: false, setOpen: (_: boolean) => { }, close: () => { }, openDialog: () => { } };
  return { ...ctx, close: () => ctx.setOpen(false), openDialog: () => ctx.setOpen(true) };
}

export function DialogTrigger({ asChild, children }: { asChild?: boolean; children: React.ReactNode }) {
  const { setOpen } = useDialog();
  if (asChild && React.isValidElement(children)) {
    const child: any = children;
    const onClick = (e: any) => {
      child.props?.onClick?.(e);
      setOpen(true);
    };
    return React.cloneElement(child, { onClick });
  }
  return <button onClick={() => setOpen(true)}>{children}</button>;
}

export function DialogPortal({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function DialogClose({ asChild, children }: { asChild?: boolean; children: React.ReactNode }) {
  const { setOpen } = useDialog();
  if (asChild && React.isValidElement(children)) {
    const child: any = children;
    const onClick = (e: any) => {
      child.props?.onClick?.(e);
      setOpen(false);
    };
    return React.cloneElement(child, { onClick });
  }
  return <button onClick={() => setOpen(false)}>{children}</button>;
}

export function DialogContent({ children }: { children: React.ReactNode }) {
  const ctx = React.useContext(DialogCtx);
  if (!ctx?.open) return null;
  return (
    <DialogPortal>
      <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" onClick={() => ctx.setOpen(false)} />
      <div className="fixed left-1/2 top-1/2 z-50 w-[90vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-md border bg-white p-4 shadow">
        {children}
      </div>
    </DialogPortal>
  );
}

export function DialogHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-3">
      <h3 className="text-lg font-semibold">{title}</h3>
      {description ? <p className="text-sm text-gray-600">{description}</p> : null}
    </div>
  );
}
