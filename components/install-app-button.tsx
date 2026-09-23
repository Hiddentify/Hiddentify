"use client";

import { useEffect, useState } from "react";
import { Download, Smartphone } from "lucide-react";
import { useLanguage } from "@/components/language";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export function InstallAppButton({ className = "" }: { className?: string }) {
  const { t } = useLanguage();
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    const environmentFrame = window.requestAnimationFrame(() => {
      setInstalled(window.matchMedia("(display-mode: standalone)").matches);
      setIsIos(/iphone|ipad|ipod/i.test(navigator.userAgent));
    });

    const capturePrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    const markInstalled = () => {
      setInstalled(true);
      setInstallPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", capturePrompt);
    window.addEventListener("appinstalled", markInstalled);
    return () => {
      window.cancelAnimationFrame(environmentFrame);
      window.removeEventListener("beforeinstallprompt", capturePrompt);
      window.removeEventListener("appinstalled", markInstalled);
    };
  }, []);

  async function install() {
    if (!installPrompt) {
      setShowHelp(true);
      return;
    }
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === "accepted") setInstalled(true);
    setInstallPrompt(null);
  }

  if (installed) {
    return <span className="inline-flex h-12 items-center gap-2 rounded-md border border-emerald-300/25 bg-emerald-950/25 px-5 text-sm font-medium text-emerald-100"><Smartphone className="size-5"/>{t("App installed")}</span>;
  }

  return <>
    <Button type="button" variant="outline" onClick={()=>void install()} className={className}><Download/>{t("Download App")}</Button>
    <Dialog open={showHelp} onOpenChange={setShowHelp}>
      <DialogContent className="border-white/15 bg-[#120d0f] text-stone-100">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">{t("Install Hiddentify")}</DialogTitle>
          <DialogDescription className="leading-6 text-slate-300">
            {t(isIos?"On iPhone, tap Share and choose Add to Home Screen.":"On Android, open this page in Chrome, tap the menu, then choose Install app or Add to Home screen.")}
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-xl border border-amber-100/15 bg-amber-100/[.04] p-4 text-sm leading-6 text-stone-300">{t("The installed app opens Hiddentify full-screen from hiddentify.space.")}</div>
      </DialogContent>
    </Dialog>
  </>;
}
