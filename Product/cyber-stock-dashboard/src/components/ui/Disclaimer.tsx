import * as React from "react";
import { cn } from "@/lib/cn";

const DEFAULT_TEXT =
  "本サイトは情報提供のみを目的としており、特定銘柄の売買を推奨するものではありません。最終的な投資判断はご自身の責任で行ってください。表示データには遅延・誤りが含まれる可能性があります。(v4.1 BOUNDARY)";

export interface DisclaimerProps extends React.HTMLAttributes<HTMLElement> {
  text?: string;
}

export function Disclaimer({ text, className, ...rest }: DisclaimerProps) {
  return (
    <footer
      className={cn(
        "mt-12 border-t border-text/10 pt-4 text-[11px] leading-relaxed text-text/70",
        className,
      )}
      {...rest}
    >
      {text ?? DEFAULT_TEXT}
    </footer>
  );
}
