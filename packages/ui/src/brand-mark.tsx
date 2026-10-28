import type { HTMLAttributes } from "react";

export function BrandMark(props: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      {...props}
      className={`font-semibold tracking-tight ${props.className ?? ""}`}
    >
      PETORA
    </span>
  );
}
