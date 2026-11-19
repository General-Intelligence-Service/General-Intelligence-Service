"use client";

import { useRef, type ClipboardEvent, type KeyboardEvent } from "react";
import { cn } from "@/lib/utils";

type Props = {
  value: string;
  onChange: (digits: string) => void;
  disabled?: boolean;
  length?: number;
  className?: string;
};

/** 6 خانات منفصلة مع انتقال تلقائي ولصق ودعم one-time-code */
export function OtpInput({
  value,
  onChange,
  disabled,
  length = 6,
  className,
}: Props) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = value.replace(/\D/g, "").slice(0, length).split("");
  while (digits.length < length) digits.push("");

  const setAt = (index: number, char: string) => {
    const next = [...digits];
    next[index] = char.replace(/\D/g, "").slice(-1);
    onChange(next.join("").replace(/\D/g, "").slice(0, length));
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (!text) return;
    onChange(text);
    const focusIdx = Math.min(text.length, length - 1);
    refs.current[focusIdx]?.focus();
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (digits[index]) {
        setAt(index, "");
      } else if (index > 0) {
        refs.current[index - 1]?.focus();
        setAt(index - 1, "");
      }
      e.preventDefault();
    } else if (e.key === "ArrowLeft" && index > 0) {
      refs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < length - 1) {
      refs.current[index + 1]?.focus();
    }
  };

  return (
    <div
      className={cn("flex justify-center gap-2 dir-ltr", className)}
      dir="ltr"
      role="group"
      aria-label="رمز التحقق"
    >
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          type="text"
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          maxLength={1}
          value={d}
          disabled={disabled}
          aria-label={`الرقم ${i + 1}`}
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, "");
            if (!v) {
              setAt(i, "");
              return;
            }
            setAt(i, v.slice(-1));
            if (i < length - 1) refs.current[i + 1]?.focus();
          }}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          onFocus={(e) => e.target.select()}
          className="h-12 w-10 rounded-[10px] border border-border bg-[var(--input-bg,#F7F8F6)] text-center text-lg font-semibold outline-none focus:border-brand-green-dark focus:ring-2 focus:ring-brand-green-dark/20 dark:border-white/10 dark:bg-[#161d1b] sm:h-14 sm:w-12"
        />
      ))}
    </div>
  );
}
