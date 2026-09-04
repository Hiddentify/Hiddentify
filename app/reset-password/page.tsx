"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { Check, Loader2, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LanguageProvider, LanguageToggle, useLanguage } from "@/components/language";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

export default function ResetPasswordPage(){return <LanguageProvider><ResetPassword/></LanguageProvider>}

function ResetPassword(){
  const{t}=useLanguage();
  const[ready,setReady]=useState<boolean|null>(null),[password,setPassword]=useState(""),[confirmation,setConfirmation]=useState(""),[busy,setBusy]=useState(false),[error,setError]=useState(""),[complete,setComplete]=useState(false);
  useEffect(()=>{
    let active=true,unsubscribe=()=>{};
    try{
      const supabase=getSupabaseBrowserClient();
      void supabase.auth.getSession().then(({data})=>{if(active)setReady(Boolean(data.session))});
      const listener=supabase.auth.onAuthStateChange((_event,session)=>{if(active)setReady(Boolean(session))});
      unsubscribe=()=>listener.data.subscription.unsubscribe();
    }catch{queueMicrotask(()=>{if(active)setReady(false)})}
    return()=>{active=false;unsubscribe()};
  },[]);
  async function submit(event:FormEvent){
    event.preventDefault();setError("");
    if(password.length<8){setError(t("Use at least 8 characters for your password."));return}
    if(password!==confirmation){setError(t("Passwords do not match."));return}
    setBusy(true);
    try{
      const{error:updateError}=await getSupabaseBrowserClient().auth.updateUser({password});
      if(updateError)throw updateError;
      setComplete(true);
    }catch(updateError){setError(updateError instanceof Error?updateError.message:t("Your password could not be changed."))}finally{setBusy(false)}
  }
  return <main className="grid min-h-screen place-items-center px-5 py-10"><section className="case-card w-full max-w-md rounded-2xl border border-white/15 p-6 sm:p-8"><div className="mb-6 flex items-start justify-between gap-4"><div><p className="label">{t("ACCOUNT RECOVERY")}</p><h1 className="mt-2 font-serif text-3xl text-stone-100">{t("Choose a new password")}</h1></div><LanguageToggle compact/></div>{complete?<div className="text-center"><span className="mx-auto grid size-14 place-items-center rounded-full border border-emerald-300/20 bg-emerald-950/30 text-emerald-200"><Check/></span><p className="mt-4 text-stone-200">{t("Your password has been changed.")}</p><Button asChild className="blood-button mt-5 h-12 w-full"><Link href="/">{t("Return to Hiddentify")}</Link></Button></div>:ready===null?<div className="py-8 text-center"><Loader2 className="mx-auto size-7 animate-spin text-amber-200"/><p className="mt-3 text-sm text-slate-400">{t("Checking recovery link…")}</p></div>:ready?<form onSubmit={submit} className="space-y-4"><div><label className="mb-2 block text-sm text-slate-300">{t("New password")}</label><div className="relative"><LockKeyhole className="pointer-events-none absolute left-3 top-3.5 size-5 text-slate-500"/><Input type="password" autoComplete="new-password" value={password} onChange={event=>setPassword(event.target.value)} minLength={8} required className="h-12 border-white/10 bg-black/25 pl-11"/></div></div><div><label className="mb-2 block text-sm text-slate-300">{t("Confirm password")}</label><Input type="password" autoComplete="new-password" value={confirmation} onChange={event=>setConfirmation(event.target.value)} minLength={8} required className="h-12 border-white/10 bg-black/25"/></div>{error&&<p className="rounded-lg border border-red-400/25 bg-red-950/30 p-3 text-sm text-red-100">{error}</p>}<Button disabled={busy} className="blood-button h-12 w-full">{busy?<Loader2 className="animate-spin"/>:<LockKeyhole/>}{t(busy?"Changing password…":"Change password")}</Button></form>:<div className="text-center"><p className="text-sm leading-6 text-slate-400">{t("This recovery link is missing or has expired. Request a new link from the login screen.")}</p><Button asChild variant="outline" className="mt-5 h-12 w-full border-white/15 bg-black/20"><Link href="/">{t("Return to login")}</Link></Button></div>}</section></main>;
}
