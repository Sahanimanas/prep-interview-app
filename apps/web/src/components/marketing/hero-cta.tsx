"use client";

import { ArrowRight } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

export function HeroCta({ align = "start" }: { align?: "start" | "center" }) {
  const { status } = useAuth();
  const authed = status === "authenticated";
  return (
    <div className={align === "center" ? "flex flex-wrap justify-center gap-3" : "flex flex-wrap gap-3"}>
      {authed ? (
        <ButtonLink href="/dashboard" size="lg" rightIcon={<ArrowRight className="size-4" aria-hidden />}>
          Go to dashboard
        </ButtonLink>
      ) : (
        <ButtonLink href="/register" size="lg" rightIcon={<ArrowRight className="size-4" aria-hidden />}>
          Start preparing — free
        </ButtonLink>
      )}
      <ButtonLink href={authed ? "/plans/new" : "/login"} size="lg" variant="outline">
        {authed ? "New prep plan" : "I have an account"}
      </ButtonLink>
    </div>
  );
}
