import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

export function BackLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex max-w-full items-center gap-1.5 rounded-md text-sm font-medium text-fg-subtle transition-colors hover:text-fg"
    >
      <ArrowLeft className="size-4 shrink-0" aria-hidden />
      <span className="truncate">{children}</span>
    </Link>
  );
}
