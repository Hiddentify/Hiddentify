"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { useLanguage } from "@/components/language";
import { Button } from "@/components/ui/button";

const APK_URL="https://github.com/Hiddentify/Hiddentify/releases/download/android-direct/Hiddentify-1.1.3.apk";

export function InstallAppButton({className=""}:{className?:string}){
  const{t}=useLanguage();
  const[platform,setPlatform]=useState<"browser"|"android-app"|"ios">("browser");
  useEffect(()=>{
    const frame=window.requestAnimationFrame(()=>{
      const agent=navigator.userAgent;
      setPlatform(agent.includes("HiddentifyAndroid/")?"android-app":/iphone|ipad|ipod/i.test(agent)?"ios":"browser");
    });
    return()=>window.cancelAnimationFrame(frame);
  },[]);
  if(platform==="android-app"||platform==="ios")return null;
  return <Button asChild variant="outline" className={className}>
    <a href={APK_URL}><Download/>{t("Download App")}</a>
  </Button>;
}
