"use client";

import * as React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export type AppConfirmOptions = {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** زر التأكيد بلون تحذيري (حذف وغيره) */
  danger?: boolean;
};

export type ConfirmFn = (opts: AppConfirmOptions) => Promise<boolean>;

const ConfirmContext = React.createContext<ConfirmFn>(() => Promise.resolve(false));

export function useConfirm(): ConfirmFn {
  return React.useContext(ConfirmContext);
}

export function ConfirmDialogProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const [opts, setOpts] = React.useState<AppConfirmOptions | null>(null);
  const resolveRef = React.useRef<((value: boolean) => void) | null>(null);

  const settle = React.useCallback((value: boolean) => {
    const resolve = resolveRef.current;
    if (!resolve) return;
    resolveRef.current = null;
    resolve(value);
    setOpen(false);
    setOpts(null);
  }, []);

  const requestConfirm = React.useCallback((o: AppConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
      setOpts(o);
      setOpen(true);
    });
  }, []);

  return (
    <ConfirmContext.Provider value={requestConfirm}>
      {children}
      <AlertDialog
        open={open}
        onOpenChange={(next) => {
          if (!next && resolveRef.current) settle(false);
        }}
      >
        <AlertDialogContent dir="rtl" className="gap-4">
          <AlertDialogHeader>
            <AlertDialogTitle>{opts?.title ?? "تأكيد"}</AlertDialogTitle>
            <AlertDialogDescription className="text-foreground/90">
              {opts?.message ?? ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-row flex-wrap justify-start gap-2 sm:gap-3">
            <AlertDialogAction
              type="button"
              className={
                opts?.danger
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90 focus-visible:ring-destructive"
                  : ""
              }
              onClick={(e) => {
                e.preventDefault();
                settle(true);
              }}
            >
              {opts?.confirmLabel ?? "متابعة"}
            </AlertDialogAction>
            <AlertDialogCancel type="button" onClick={() => settle(false)}>
              {opts?.cancelLabel ?? "إلغاء"}
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ConfirmContext.Provider>
  );
}
