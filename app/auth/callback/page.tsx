"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Loader2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LanguageProvider, useLanguage } from "@/components/language";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

function safeNext(value: string | null) {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/";
}

export default function AuthCallbackPage() {
  return <LanguageProvider><AuthCallback /></LanguageProvider>;
}

function AuthCallback() {
  const { t } = useLanguage();
  const [state, setState] = useState<"working" | "complete" | "error">("working");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    const finish = async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const query = new URLSearchParams(location.search);
        const code = query.get("code");
        const providerError = query.get("error_description") || query.get("error");
        if (providerError) throw new Error(providerError);
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        }
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (!data.session) throw new Error(t("The confirmation link is invalid or has expired."));
        if (!active) return;
        setState("complete");
        const destination = safeNext(query.get("next"));
        window.setTimeout(() => location.replace(destination), 650);
      } catch (error) {
        if (!active) return;
        setMessage(error instanceof Error ? error.message : t("Account confirmation failed."));
        setState("error");
      }
    };
    void finish();
    return () => { active = false; };
  }, [t]);

  return <main className="grid min-h-screen place-items-center px-5 py-10">
    <section className="case-card w-full max-w-md rounded-2xl border border-white/15 p-6 text-center sm:p-8">
      {state === "working" && <><Loader2 className="mx-auto size-10 animate-spin text-amber-200"/><h1 className="mt-5 font-serif text-3xl">{t("Confirming your account")}</h1><p className="mt-3 text-sm leading-6 text-slate-400">{t("Keep this page open for a moment.")}</p></>}
      {state === "complete" && <><span className="mx-auto grid size-14 place-items-center rounded-full border border-emerald-300/20 bg-emerald-950/30 text-emerald-200"><Check/></span><h1 className="mt-5 font-serif text-3xl">{t("Account confirmed")}</h1><p className="mt-3 text-sm leading-6 text-slate-400">{t("Returning to Hiddentify…")}</p></>}
      {state === "error" && <><span className="mx-auto grid size-14 place-items-center rounded-full border border-red-300/20 bg-red-950/30 text-red-200"><ShieldAlert/></span><h1 className="mt-5 font-serif text-3xl">{t("Confirmation failed")}</h1><p role="alert" className="mt-3 text-sm leading-6 text-red-100">{message}</p><Button asChild className="blood-button mt-6 h-12 w-full"><Link href="/">{t("Return to login")}</Link></Button></>}
    </section>
  </main>;
}
