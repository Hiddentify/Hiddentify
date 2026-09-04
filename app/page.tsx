"use client";
/* eslint-disable react-hooks/set-state-in-effect -- browser storage and lifecycle events restore the live multiplayer session */

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { choose, LanguageProvider, LanguageToggle, useLanguage, type Language } from "@/components/language";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { Activity, ArrowLeft, AtSign, BookOpen, Check, ChevronRight, Clipboard, Crown, ExternalLink, Eye, Fingerprint, FolderLock, FolderOpen, Link2, Loader2, LockKeyhole, LogIn, LogOut, Mail, MailOpen, MessageCircle, Radio, Search, Send, ShieldAlert, Smartphone, Target, Timer, UserRound, UserRoundPlus, Users, Zap } from "lucide-react";

type Session={code:string;token:string};
type Account={id:string;email:string;username:string};
type ViewerIdentity={email:string;displayName:string;suggestedUsername?:string};
type EntryMode="account"|"guest"|null;
type RoleAbility={id:string;name:string;description:string;needsTarget:boolean};
type Role={characterName:string;job:string;publicInfo:string;secret:string;objective:string;alibi:string;truth:string;knows:string;culprit:boolean;accomplices?:string[];ability?:RoleAbility};
type PlayerAction={phase:number;type:string;label:string;result:string;delayed:boolean;targetCharacter:string|null;covert:boolean};
type AbilityUse={abilityId:string;result:string;targetCharacter:string|null;createdAt:string};
type InterrogationMessage={id:string;senderPlayerId:string;senderName:string;isMine:boolean;body:string;createdAt:string};
type Interrogation={id:string;status:"pending"|"active"|"declined"|"expired";isInitiator:boolean;partner:{id:string;name:string;character:string|null};inviteExpiresAt:string;endsAt:string|null;createdAt:string;messages:InterrogationMessage[]};
type Player={id:string;name:string;isHost:boolean;character:{name:string;job:string}|null;actionSubmitted:boolean;abilityUsed:boolean;accusationSubmitted:boolean;accusationTargetIds:string[]|null};
type GameState={room:{code:string;status:"lobby"|"playing"|"revealed";phase:number;killerCount:number;maxKillers:number;mode:"casual"|"detective";votingPhase:number;evidencePackets:number};me:{id:string;name:string;isHost:boolean;role:Role|null;accusationSubmitted:boolean;actions:PlayerAction[];currentAction:PlayerAction|null;abilityUse:AbilityUse|null;interrogationUsed:boolean};players:Player[];interrogations:Interrogation[];case:{title:string;setting:string;victim:string;incident:string;evidence:string[][]}|null;roundActions:{submitted:number;total:number};publicEvents:{phase:number;text:string}[];solution:{culprits:{playerId:string;playerName:string;character:string}[];motive:string;method:string;twist:string;timeline:string[];inspiration:{title:string;year:string;connection:string;sourceLabel:string;sourceUrl:string}|null;detectivesWin:boolean;correctBallots:number;totalVotes:number;requiredVotes:number}|null;allSubmitted:boolean};

const STORE="case_unknown_multiplayer";
const POLL_INTERVAL_MS=2500;
const REQUEST_TIMEOUT_MS=8000;
const RULE_STEPS=[
  {n:"01",en:{title:"Join the same room",text:"One person creates a case and shares the link or five-character code. Up to ten people join from their own phones. Each phone may use English or Albanian."},sq:{title:"Hyni në të njëjtën dhomë",text:"Një person krijon çështjen dhe ndan lidhjen ose kodin pesëshkronjësh. Deri në dhjetë veta hyjnë nga telefonat e tyre. Çdo telefon mund të përdorë shqip ose anglisht."}},
  {n:"02",en:{title:"Choose Casual or Detective",text:"Casual gives exactly three key evidence envelopes—one per round—with shorter roles and no private actions. Detective is the full game with four evidence packets, powers, and interrogations."},sq:{title:"Zgjidh E thjeshtë ose Detektiv",text:"Mënyra E thjeshtë jep saktësisht tri zarfe me prova kryesore—nga një për raund—me role më të shkurtra dhe pa veprime private. Detektiv është loja e plotë me katër pako provash, fuqi dhe marrje në pyetje."}},
  {n:"03",en:{title:"Open your private folder",text:"Read your character, public story, alibi, secret, and objective. Do not show the screen. The killer or killers are chosen randomly; the host is not automatically guilty."},sq:{title:"Hap dosjen private",text:"Lexo personazhin, historinë publike, alibinë, sekretin dhe objektivin. Mos e trego ekranin. Vrasësi ose vrasësit zgjidhen rastësisht; drejtuesi nuk është automatikisht fajtor."}},
  {n:"04",en:{title:"Open clues and talk",text:"The host releases evidence in rounds. Open every envelope, compare information aloud, question suspicious stories, and remember that innocent players also have reasons to lie."},sq:{title:"Hap provat dhe bisedo",text:"Drejtuesi publikon prova me raunde. Hap çdo zarf, krahasoni informacionin me zë, pyetni tregimet e dyshimta dhe mbani mend se edhe të pafajshmit kanë arsye të gënjejnë."}},
  {n:"05",en:{title:"Name the full killer team",text:"Every player submits one complete secret ballot. Investigators win only if more than half of all ballots identify every killer exactly. Killer ballots count too."},sq:{title:"Emërto gjithë ekipin e vrasësve",text:"Çdo lojtar dërgon një votë sekrete të plotë. Hetuesit fitojnë vetëm nëse më shumë se gjysma e votave identifikojnë saktësisht çdo vrasës. Edhe votat e vrasësve numërohen."}},
] as const;

const MODE_DETAILS={
  casual:{
    en:{summary:"Exactly 3 key evidence cards",what:"Open one clear clue in each of three rounds, discuss it aloud, then vote. There are no powers, action menus, covert moves, or private chats.",innocent:"Read your short alibi and secret, compare the three clues, and help a majority name the complete killer team.",killer:"Bluff with your short alibi and protect every accomplice. You win if the majority does not name the complete team."},
    sq:{summary:"Saktësisht 3 karta provash kryesore",what:"Hapni nga një provë të qartë në secilin prej tri raundeve, diskutojeni me zë dhe pastaj votoni. Nuk ka fuqi, menu veprimesh, ndërhyrje të fshehta apo biseda private.",innocent:"Lexo alibinë dhe sekretin e shkurtër, krahaso tri provat dhe ndihmo shumicën të emërtojë gjithë ekipin e vrasësve.",killer:"Mashtro me alibinë e shkurtër dhe mbro çdo bashkëpunëtor. Fiton nëse shumica nuk emërton gjithë ekipin."},
  },
  detective:{
    en:{summary:"Full case + private investigation",what:"Open four evidence packets containing several connected clues. During the first three rounds, every player can investigate, use a unique power, or open one private interrogation.",innocent:"Combine timelines, alibis, private discoveries, and role powers to prove the complete killer team—not merely catch somebody lying.",killer:"Investigate normally or secretly create interference. Coordinate your story, protect every accomplice, and split the final vote."},
    sq:{summary:"Çështje e plotë + hetim privat",what:"Hapni katër pako provash me disa gjurmë të lidhura. Në tri raundet e para, çdo lojtar mund të hetojë, përdorë një fuqi unike ose hapë një marrje në pyetje private.",innocent:"Bashko kronologjinë, alibitë, zbulimet private dhe fuqitë për të provuar gjithë ekipin e vrasësve—jo vetëm për të kapur dikë në gënjeshtër.",killer:"Hetoni normalisht ose krijoni fshehurazi pengesa. Bashkërendoni historinë, mbroni çdo bashkëpunëtor dhe ndani votën përfundimtare."},
  },
} as const;

class ApiError extends Error{
  status:number;
  constructor(message:string,status:number){super(message);this.name="ApiError";this.status=status}
}

function isSession(value:unknown):value is Session{
  if(!value||typeof value!=="object")return false;
  const candidate=value as Partial<Session>;
  return typeof candidate.code==="string"&&/^[A-Z0-9]{5}$/.test(candidate.code)&&typeof candidate.token==="string"&&candidate.token.length>=32;
}

function wait(milliseconds:number){return new Promise(resolve=>setTimeout(resolve,milliseconds))}

async function readJson<T>(response:Response):Promise<T>{
  const data=await response.json().catch(()=>({})) as T&{error?:string};
  if(!response.ok)throw new ApiError(data.error??"The server could not complete that request.",response.status);
  return data;
}

async function fetchRoom(current:Session,language:Language):Promise<GameState>{
  let lastError:unknown;
  for(let attempt=0;attempt<3;attempt++){
    if(attempt>0)await wait(attempt===1?700:1600);
    const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),REQUEST_TIMEOUT_MS);
    try{
      const response=await fetch(`/api/games/${current.code}`,{headers:{"Accept":"application/json","x-player-token":current.token,"x-game-language":language},cache:"no-store",signal:controller.signal});
      return await readJson<GameState>(response);
    }catch(error){
      if(error instanceof ApiError)throw error;
      lastError=error;
      if(typeof navigator!=="undefined"&&!navigator.onLine)break;
    }finally{clearTimeout(timeout)}
  }
  throw lastError instanceof Error?lastError:new Error("Connection interrupted.");
}

function connectionMessage(error:unknown,automatic:boolean,language:Language){
  if(error instanceof ApiError)return error.message;
  if(typeof navigator!=="undefined"&&!navigator.onLine)return choose(language,"You are offline. Reconnect to Wi-Fi or mobile data and the room will resume automatically.","Je pa internet. Rilidhu me Wi-Fi ose internetin celular dhe dhoma do të vazhdojë automatikisht.");
  return automatic?choose(language,"Connection interrupted. Reconnecting automatically…","Lidhja u ndërpre. Po rilidhemi automatikisht…"):choose(language,"Connection interrupted. Check your internet and try again.","Lidhja u ndërpre. Kontrollo internetin dhe provo përsëri.");
}

async function postJson<T>(url:string,body:Record<string,unknown>,language:Language,token?:string,accountToken?:string):Promise<T>{
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),REQUEST_TIMEOUT_MS);
  try{
    const response=await fetch(url,{method:"POST",headers:{"Accept":"application/json","Content-Type":"application/json","x-game-language":language,...(token?{"x-player-token":token}:{}),...(accountToken?{Authorization:`Bearer ${accountToken}`}:{})},body:JSON.stringify(body),credentials:"same-origin",signal:controller.signal});
    return await readJson<T>(response);
  }finally{clearTimeout(timeout)}
}

export default function Home(){return <LanguageProvider><HomeContent/></LanguageProvider>}

function HomeContent(){
  const{language,t}=useLanguage();
  const[mode,setMode]=useState<"create"|"join">("create"),[name,setName]=useState(""),[joinCode,setJoinCode]=useState(""),[session,setSession]=useState<Session|null>(null),[game,setGame]=useState<GameState|null>(null),[busy,setBusy]=useState(false),[syncing,setSyncing]=useState(true),[error,setError]=useState(""),[copied,setCopied]=useState(false),[guesses,setGuesses]=useState<string[]>([]),[account,setAccount]=useState<Account|null>(null),[viewer,setViewer]=useState<ViewerIdentity|null>(null),[entryMode,setEntryMode]=useState<EntryMode>(null),[accountLoading,setAccountLoading]=useState(true),[accessToken,setAccessToken]=useState("");
  const sessionRef=useRef<Session|null>(null),requestInFlight=useRef(false),consecutiveFailures=useRef(0),hasGame=useRef(false);
  useEffect(()=>{hasGame.current=Boolean(game)},[game]);
  const refreshAccount=useCallback(async(token:string)=>{
    const controller=new AbortController(),timeout=window.setTimeout(()=>controller.abort(),REQUEST_TIMEOUT_MS);
    try{
      const response=await fetch("/api/auth/me",{headers:{"Accept":"application/json",Authorization:`Bearer ${token}`},credentials:"same-origin",cache:"no-store",signal:controller.signal});
      const data=await readJson<{signedIn:boolean;identity:ViewerIdentity|null;account:Account|null}>(response);
      if(!data.signedIn||!data.identity)throw new Error("Your account session has expired.");
      setViewer(data.identity);setEntryMode("account");setAccount(data.account);
      if(data.account)setName(data.account.username);
      return data;
    }finally{window.clearTimeout(timeout)}
  },[]);
  useEffect(()=>{
    let active=true,unsubscribe=()=>{};
    try{
      const supabase=getSupabaseBrowserClient();
      const applySession=async(token:string)=>{
        if(!active)return;
        setAccessToken(token);
        if(!token){setViewer(null);setAccount(null);setAccountLoading(false);return}
        try{await refreshAccount(token)}catch{if(active){setViewer(null);setAccount(null);setAccessToken("")}}
        finally{if(active)setAccountLoading(false)}
      };
      void supabase.auth.getSession().then(({data})=>applySession(data.session?.access_token??""));
      const listener=supabase.auth.onAuthStateChange((_event,nextSession)=>{void applySession(nextSession?.access_token??"")});
      unsubscribe=()=>listener.data.subscription.unsubscribe();
    }catch{setAccountLoading(false)}
    return()=>{active=false;unsubscribe()};
  },[refreshAccount]);
  useEffect(()=>{
    const query=new URLSearchParams(location.search).get("room")?.toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,5)??"";
    if(query){setJoinCode(query);setMode("join")}
    const saved=localStorage.getItem(STORE);
    if(!saved){setSyncing(false);return}
    try{
      const restored=JSON.parse(saved) as unknown;
      if(!isSession(restored))throw new Error("Invalid saved session");
      if(query&&restored.code!==query){setSyncing(false);return}
      sessionRef.current=restored;setSession(restored);
    }catch{localStorage.removeItem(STORE);setSyncing(false)}
  },[]);
  const load=useCallback(async(current:Session|null,reportImmediately=false)=>{
    if(!current||requestInFlight.current)return;
    requestInFlight.current=true;
    try{
      const data=await fetchRoom(current,language);
      if(sessionRef.current?.token!==current.token)return;
      consecutiveFailures.current=0;setGame(data);setError("");
    }catch(loadError){
      if(sessionRef.current?.token!==current.token)return;
      consecutiveFailures.current+=1;
      if(reportImmediately||!hasGame.current||consecutiveFailures.current>=2)setError(connectionMessage(loadError,true,language));
    }finally{requestInFlight.current=false;setSyncing(false)}
  },[language]);
  useEffect(()=>{
    if(!session)return;
    sessionRef.current=session;void load(session,true);
    const resume=()=>{if(document.visibilityState==="visible"&&navigator.onLine)void load(session,true)};
    const timer=window.setInterval(()=>{if(document.visibilityState==="visible"&&navigator.onLine)void load(session)},POLL_INTERVAL_MS);
    document.addEventListener("visibilitychange",resume);window.addEventListener("online",resume);window.addEventListener("pageshow",resume);
    return()=>{window.clearInterval(timer);document.removeEventListener("visibilitychange",resume);window.removeEventListener("online",resume);window.removeEventListener("pageshow",resume)};
  },[session,load]);
  function connect(next:Session){sessionRef.current=next;consecutiveFailures.current=0;localStorage.setItem(STORE,JSON.stringify(next));setSession(next);setSyncing(true)}
  async function submit(event:FormEvent){event.preventDefault();if(!entryMode)return;setError("");setBusy(true);try{const url=mode==="create"?"/api/games":`/api/games/${joinCode}/join`,playerName=entryMode==="account"&&account?account.username:name;const data=await postJson<Session>(url,{name:playerName,asGuest:entryMode==="guest"},language,undefined,entryMode==="account"?accessToken:undefined);connect({code:data.code,token:data.token})}catch(e){setError(connectionMessage(e,false,language))}finally{setBusy(false)}}
  async function saveProfile(username:string,token=accessToken){if(!token)throw new Error(t("Sign in before choosing your username."));const data=await postJson<{account:Account}>("/api/auth/profile",{username},language,undefined,token);setAccount(data.account);setEntryMode("account");setName(data.account.username);setError("");return data.account}
  async function authenticated(token:string,suggestedUsername?:string){setAccessToken(token);const data=await refreshAccount(token);if(!data.account&&suggestedUsername)return saveProfile(suggestedUsername,token);return data.account}
  async function signOut(){try{await getSupabaseBrowserClient().auth.signOut()}finally{setAccessToken("");setViewer(null);setAccount(null);setEntryMode(null);setName("");setError("")}}
  function chooseEntry(next:Exclude<EntryMode,null>){setEntryMode(next);setError("");if(next==="account"&&account)setName(account.username);if(next==="guest")setName("")}
  async function act(action:string,details:Record<string,unknown>={}){if(!session)return;setBusy(true);setError("");try{await postJson<{ok:true}>(`/api/games/${session.code}/action`,{action,...details},language,session.token);await load(session,true)}catch(e){setError(connectionMessage(e,false,language))}finally{setBusy(false)}}
  async function share(){if(!game)return;const url=`${location.origin}?room=${game.room.code}`,data={title:choose(language,"Join my Hiddentify game","Hyr në lojën time Hiddentify"),text:choose(language,`Join room ${game.room.code}`,`Hyr në dhomën ${game.room.code}`),url};try{if(navigator.share)await navigator.share(data);else await navigator.clipboard.writeText(url);setCopied(true);setTimeout(()=>setCopied(false),1800)}catch{}}
  function leave(){sessionRef.current=null;consecutiveFailures.current=0;localStorage.removeItem(STORE);setSession(null);setGame(null);setGuesses([]);setError("");history.replaceState({},"",location.pathname)}
  function openMode(next:"create"|"join"){setMode(next);window.setTimeout(()=>document.getElementById("play")?.scrollIntoView({behavior:"smooth",block:"center"}),0)}
  if(syncing||accountLoading)return <main className="grid min-h-screen place-items-center"><div className="text-center"><Loader2 className="mx-auto size-9 animate-spin text-amber-200"/><p className="mt-4 text-slate-400">{t("Reconnecting to your case…")}</p></div></main>;
  return <main className="min-h-screen"><Header game={game} leave={leave} openMode={openMode}/>{!session?<Landing mode={mode} setMode={setMode} openMode={openMode} name={name} setName={setName} code={joinCode} setCode={setJoinCode} submit={submit} busy={busy} error={error} account={account} viewer={viewer} entryMode={entryMode} chooseEntry={chooseEntry} changeEntry={()=>{setEntryMode(null);setError("")}} saveProfile={saveProfile} authenticated={authenticated} signOut={signOut}/>:!game?<ErrorState error={error} retry={()=>load(session)} leave={leave}/>:game.room.status==="lobby"?<Lobby game={game} share={share} copied={copied} busy={busy} start={()=>act("start")} setKillerCount={killerCount=>act("set_killer_count",{killerCount})} setGameMode={gameMode=>act("set_game_mode",{gameMode})} error={error}/>:game.room.status==="playing"?<Playing game={game} busy={busy} error={error} advance={()=>act("advance")} investigate={(actionType,targetPlayerId)=>act("investigate",{targetPlayerId,actionType})} activateAbility={targetPlayerId=>act("ability",{targetPlayerId})} inviteInterrogation={targetPlayerId=>act("invite_interrogation",{targetPlayerId})} respondInterrogation={(interrogationId,accepted)=>act("respond_interrogation",{interrogationId,accepted})} sendInterrogationMessage={(interrogationId,message)=>act("send_interrogation_message",{interrogationId,message})} accuse={()=>guesses.length===game.room.killerCount&&act("accuse",{targetPlayerIds:guesses})} reveal={()=>act("reveal")} guesses={guesses} setGuesses={setGuesses}/>:<Solution game={game} leave={leave}/>}</main>
}

function Header({game,leave,openMode}:{game:GameState|null;leave:()=>void;openMode:(mode:"create"|"join")=>void}){const{t}=useLanguage();return <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0d090be8] px-3 py-3 backdrop-blur-md sm:px-4"><div className="mx-auto flex max-w-6xl items-center justify-between gap-2"><div className="flex items-center gap-2"><span className="blood-dot size-2 rounded-full"/><span className="brand-frijole">HIDDENTIFY</span></div>{game?<div className="flex items-center gap-1.5"><LanguageToggle compact/><HowToPlayDialog compact/><Badge className="hidden border-red-300/25 bg-red-950/40 px-3 py-1 font-mono text-red-100 sm:inline-flex">{game.room.code}</Badge><Button variant="ghost" size="icon" onClick={leave} aria-label={t("Leave room")}><LogOut/></Button></div>:<nav className="flex items-center gap-1.5 sm:gap-3" aria-label="Main navigation"><LanguageToggle compact/><HowToPlayDialog/><Button variant="outline" size="sm" onClick={()=>openMode("join")} className="join-hover hidden border-white/25 bg-transparent sm:inline-flex">{t("Join a case")}</Button><Button size="sm" onClick={()=>openMode("create")} className="blood-button new-case-font hidden md:inline-flex">{t("New case")}</Button></nav>}</div></header>}

function HowToPlayDialog({compact=false}:{compact?:boolean}){
  const{language,t}=useLanguage();
  const icons=[Users,FolderLock,Mail,MessageCircle,Check];
  return <Dialog>
    <DialogTrigger asChild><Button variant="outline" size="sm" className={`rules-trigger ${compact?"is-compact":""}`} aria-label={t("How to play")}><BookOpen/><span className={compact?"hidden md:inline":"inline"}>{t("How to play")}</span></Button></DialogTrigger>
    <DialogContent className="rules-dialog" showCloseButton>
      <div className="rules-cover">
        <DialogHeader className="pr-8 text-left"><p className="label">{t("Case briefing · Read before play")}</p><DialogTitle className="mt-2 font-serif text-3xl sm:text-4xl">{t("How to play Hiddentify")}</DialogTitle><DialogDescription className="mt-2 text-base leading-7 text-stone-300">{t("The app protects the secrets. Your group investigates by talking, questioning, bluffing, and deciding which story explains every clue.")}</DialogDescription></DialogHeader>
        <div className="rules-meta"><Badge>{t("3–10 players")}</Badge><Badge>{t("1–4 killers")}</Badge><Badge>{t("One phone each")}</Badge><Badge>{t("2 ways to play")}</Badge></div>
      </div>
      <div className="rules-body">
        <div className="rules-step-grid">{RULE_STEPS.map((step,index)=>{const Icon=icons[index]??BookOpen,copy=step[language];return <article key={step.n} className={`rules-step ${index===4?"is-final":""}`}><div className="rules-step-head"><span>{step.n}</span><span className="rules-icon"><Icon/></span></div><h3>{copy.title}</h3><p>{copy.text}</p></article>})}</div>
        <div className="rules-share-grid"><div><Eye/><p><strong>{t("Safe to say aloud")}</strong>{t("Your character’s name, job, public background, and any clue you choose to share.")}</p></div><div><LockKeyhole/><p><strong>{t("Keep on your phone")}</strong>{t("Your secret, objective, true movements, power result, and private messages—unless revealing one helps your strategy.")}</p></div></div>
        <div className="rules-majority"><ShieldAlert/><div><strong>{t("The rule that decides the winner")}</strong><p>{t("Each ballot must identify the full hidden team. More than half of all ballots must match every killer exactly. The killers’ ballots count too; a tied, split, or partly correct result means the killer team wins.")}</p></div></div>
        <DialogFooter className="mt-5"><DialogClose asChild><Button className="blood-button h-11 px-6"><Check/>{t("Got it—open the case")}</Button></DialogClose></DialogFooter>
      </div>
    </DialogContent>
  </Dialog>;
}

function AccountAccess({viewer,saveProfile,authenticated,back}:{viewer:ViewerIdentity|null;saveProfile:(username:string)=>Promise<Account>;authenticated:(token:string,suggestedUsername?:string)=>Promise<Account|null>;back:()=>void}){
  const{t}=useLanguage();
  const[authMode,setAuthMode]=useState<"login"|"signup">("login"),[username,setUsername]=useState(""),[email,setEmail]=useState(""),[password,setPassword]=useState(""),[confirmation,setConfirmation]=useState(""),[busy,setBusy]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState("");
  useEffect(()=>{if(viewer?.suggestedUsername&&!username)setUsername(viewer.suggestedUsername)},[viewer,username]);
  async function submitProfile(event:FormEvent){event.preventDefault();setError("");setBusy(true);try{await saveProfile(username)}catch(profileError){setError(profileError instanceof Error?profileError.message:t("The profile could not be saved."))}finally{setBusy(false)}}
  async function submitAccount(event:FormEvent){
    event.preventDefault();setError("");setNotice("");
    if(authMode==="signup"&&password!==confirmation){setError(t("Passwords do not match."));return}
    if(authMode==="signup"&&password.length<8){setError(t("Use at least 8 characters for your password."));return}
    setBusy(true);
    try{
      const supabase=getSupabaseBrowserClient();
      if(authMode==="signup"){
        const{data, error:signupError}=await supabase.auth.signUp({email,password,options:{data:{username},emailRedirectTo:`${location.origin}/`}});
        if(signupError)throw signupError;
        if(data.session)await authenticated(data.session.access_token,username);
        else{setNotice(t("Check your email to confirm your account, then return here to log in."));setPassword("");setConfirmation("")}
      }else{
        const{data,error:loginError}=await supabase.auth.signInWithPassword({email,password});
        if(loginError)throw loginError;
        if(!data.session)throw new Error(t("The login session could not be created."));
        await authenticated(data.session.access_token);
      }
    }catch(authError){setError(authError instanceof Error?authError.message:t("Account access failed. Try again."))}finally{setBusy(false)}
  }
  async function continueWithGoogle(){
    setError("");setNotice("");setBusy(true);
    try{
      const{error:oauthError}=await getSupabaseBrowserClient().auth.signInWithOAuth({provider:"google",options:{redirectTo:`${location.origin}/`}});
      if(oauthError)throw oauthError;
    }catch(authError){setError(authError instanceof Error?authError.message:t("Google sign-in could not start."));setBusy(false)}
  }
  async function sendPasswordReset(){
    setError("");setNotice("");
    if(!email.trim()){setError(t("Enter your email first."));return}
    setBusy(true);
    try{
      const{error:resetError}=await getSupabaseBrowserClient().auth.resetPasswordForEmail(email,{redirectTo:`${location.origin}/reset-password`});
      if(resetError)throw resetError;
      setNotice(t("Password reset link sent. Check your email."));
    }catch(resetError){setError(resetError instanceof Error?resetError.message:t("The reset email could not be sent."))}finally{setBusy(false)}
  }
  return <div>
    <button type="button" onClick={back} className="mb-4 inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-amber-100"><ArrowLeft className="size-4"/>{t("Back to entry options")}</button>
    {!viewer?<div className="rounded-xl border border-amber-100/15 bg-amber-100/[.035] p-5"><div className="text-center"><span className="mx-auto grid size-14 place-items-center rounded-full border border-amber-100/20 bg-black/25 text-amber-100"><UserRoundPlus/></span><h3 className="mt-4 font-serif text-2xl text-stone-100">{t(authMode==="login"?"Welcome back":"Create your account")}</h3><p className="mt-2 text-sm leading-6 text-slate-400">{t("Use your own email. No ChatGPT account is required.")}</p></div>
      <Tabs value={authMode} onValueChange={value=>{setAuthMode(value as "login"|"signup");setError("");setNotice("")}} className="mt-5"><TabsList className="grid h-11 w-full grid-cols-2 bg-black/30"><TabsTrigger value="login">{t("Log in")}</TabsTrigger><TabsTrigger value="signup">{t("Sign up")}</TabsTrigger></TabsList></Tabs>
      <form onSubmit={submitAccount} className="mt-5 space-y-4">{authMode==="signup"&&<div><label className="mb-2 block text-sm text-slate-300">{t("Username")}</label><div className="relative"><UserRound className="pointer-events-none absolute left-3 top-3.5 size-5 text-slate-500"/><Input value={username} onChange={event=>setUsername(event.target.value)} autoComplete="username" placeholder="e.g. NightOwl" minLength={2} maxLength={24} required className="h-12 border-white/10 bg-black/25 pl-11"/></div></div>}<div><label className="mb-2 block text-sm text-slate-300">{t("Email")}</label><div className="relative"><Mail className="pointer-events-none absolute left-3 top-3.5 size-5 text-slate-500"/><Input value={email} onChange={event=>setEmail(event.target.value)} type="email" inputMode="email" autoComplete="email" placeholder="name@example.com" required className="h-12 border-white/10 bg-black/25 pl-11"/></div></div><div><label className="mb-2 block text-sm text-slate-300">{t("Password")}</label><div className="relative"><LockKeyhole className="pointer-events-none absolute left-3 top-3.5 size-5 text-slate-500"/><Input value={password} onChange={event=>setPassword(event.target.value)} type="password" autoComplete={authMode==="signup"?"new-password":"current-password"} minLength={authMode==="signup"?8:undefined} required className="h-12 border-white/10 bg-black/25 pl-11"/></div>{authMode==="signup"?<p className="mt-2 text-xs text-slate-500">{t("At least 8 characters")}</p>:<button type="button" onClick={()=>void sendPasswordReset()} className="mt-2 text-xs text-sky-200 transition hover:text-sky-100">{t("Forgot password?")}</button>}</div>{authMode==="signup"&&<div><label className="mb-2 block text-sm text-slate-300">{t("Confirm password")}</label><Input value={confirmation} onChange={event=>setConfirmation(event.target.value)} type="password" autoComplete="new-password" minLength={8} required className="h-12 border-white/10 bg-black/25"/></div>}{error&&<ErrorMessage text={error}/>} {notice&&<p className="rounded-lg border border-emerald-300/20 bg-emerald-950/25 p-3 text-sm leading-6 text-emerald-100">{notice}</p>}<Button disabled={busy||(authMode==="signup"&&username.trim().length<2)} className="blood-button h-12 w-full">{busy?<Loader2 className="animate-spin"/>:authMode==="login"?<LogIn/>:<UserRoundPlus/>}{t(busy?(authMode==="login"?"Signing in…":"Creating account…"):(authMode==="login"?"Log in":"Sign up"))}</Button></form>
      <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-[.14em] text-slate-600"><span className="h-px flex-1 bg-white/10"/><span>{t("or")}</span><span className="h-px flex-1 bg-white/10"/></div><Button type="button" variant="outline" disabled={busy} onClick={continueWithGoogle} className="h-12 w-full border-white/15 bg-black/20"><AtSign/>{t("Continue with Google")}</Button><p className="mt-4 text-center text-xs leading-5 text-slate-500">{t("Authentication is handled securely by Supabase. Hiddentify never stores your password.")}</p>
    </div>:<div><div className="mb-5 flex items-center gap-3 rounded-xl border border-amber-100/15 bg-amber-100/[.035] p-4"><AtSign className="size-5 shrink-0 text-amber-100"/><div className="min-w-0"><p className="text-xs uppercase tracking-[.14em] text-slate-500">{t("Signed in as")}</p><p className="truncate text-sm text-stone-200">{viewer.email}</p></div></div><form onSubmit={submitProfile} className="space-y-4"><div><label className="mb-2 block text-sm text-slate-300">{t("Choose your username")}</label><div className="relative"><UserRound className="pointer-events-none absolute left-3 top-3.5 size-5 text-slate-500"/><Input value={username} onChange={event=>setUsername(event.target.value)} autoComplete="username" placeholder="e.g. NightOwl" minLength={2} maxLength={24} required className="h-12 border-white/10 bg-black/25 pl-11"/></div><p className="mt-2 text-xs leading-5 text-slate-500">{t("This is the name friends will see in every room.")}</p></div>{error&&<ErrorMessage text={error}/>}<Button disabled={busy||username.trim().length<2} className="blood-button h-12 w-full">{busy?<Loader2 className="animate-spin"/>:<UserRoundPlus/>}{t(busy?"Saving username…":"Save username")}</Button></form></div>}
  </div>;
}

function Landing({mode,setMode,openMode,name,setName,code,setCode,submit,busy,error,account,viewer,entryMode,chooseEntry,changeEntry,saveProfile,authenticated,signOut}:{mode:"create"|"join";setMode:(x:"create"|"join")=>void;openMode:(x:"create"|"join")=>void;name:string;setName:(x:string)=>void;code:string;setCode:(x:string)=>void;submit:(e:FormEvent)=>void;busy:boolean;error:string;account:Account|null;viewer:ViewerIdentity|null;entryMode:EntryMode;chooseEntry:(mode:Exclude<EntryMode,null>)=>void;changeEntry:()=>void;saveProfile:(username:string)=>Promise<Account>;authenticated:(token:string,suggestedUsername?:string)=>Promise<Account|null>;signOut:()=>Promise<void>}){
  const{language,t}=useLanguage();
  const ready=entryMode==="guest"||(entryMode==="account"&&Boolean(account));
  return <>
    <section className="relative isolate overflow-hidden border-b border-white/10">
      <div aria-hidden="true" className="absolute inset-0 -z-20 bg-cover bg-center opacity-55" style={{backgroundImage:"url('/hiddentify-board.jpg')"}}/>
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_20%,rgba(10,7,8,.25),rgba(8,5,7,.92)_72%),linear-gradient(90deg,rgba(8,5,7,.38),rgba(8,5,7,.88))]"/>
      <div className="mx-auto grid min-h-[calc(100vh-65px)] max-w-6xl items-center gap-8 px-5 py-10 sm:py-14 lg:grid-cols-[1.05fr_.95fr] lg:gap-12">
        <div>
          <p className="mb-5 inline-flex rotate-[-1deg] bg-stone-100 px-3 py-1 text-sm font-semibold tracking-[.16em] text-stone-950">{t("CASE FILE · UNSOLVED")}</p>
          <h1 className="max-w-[11ch] font-serif text-5xl leading-[.94] text-stone-100 sm:text-7xl">{t("Somebody in your group is")} <span className="text-red-400 italic">{t("lying.")}</span></h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-stone-300">{t("A fresh murder case for 3–10 friends. Every phone receives a character, secrets, and only part of the truth.")}</p>
          <div className="mt-7 flex flex-wrap gap-3"><Button onClick={()=>openMode("create")} className="blood-button new-case-font h-12 px-6"><Users/>{t("Start a new case")}</Button><Button variant="outline" onClick={()=>openMode("join")} className="join-hover h-12 border-white/35 bg-black/20 px-6 text-stone-100"><Search/>{t("Join a case")}</Button></div>
          <div className="mt-7 flex flex-wrap gap-x-5 gap-y-3 text-sm text-stone-400"><span className="flex items-center gap-2"><Smartphone className="size-4 text-red-300"/>{t("No download")}</span><span className="flex items-center gap-2"><LockKeyhole className="size-4 text-red-300"/>{t("Private roles")}</span><span className="flex items-center gap-2"><Activity className="size-4 text-red-300"/>{t("Two game modes")}</span></div>
        </div>
        <Card id="play" className="landing-card scroll-mt-24 border-white/15"><CardContent className="pt-6">
          <div className="mb-5 flex items-center justify-between gap-3"><div><p className="label mb-2">{t("Enter the investigation")}</p><h2 className="font-serif text-3xl">{t(entryMode===null?"Account or guest":entryMode==="account"&&!account?"Account access":mode==="create"?"Open a private room":"Use your invitation code")}</h2></div><LanguageToggle/></div>
          {entryMode===null?<div><p className="mb-4 text-sm leading-6 text-slate-400">{t("Choose how you enter")}</p><div className="grid gap-3">
            <button type="button" onClick={()=>chooseEntry("account")} className="group rounded-xl border border-amber-100/15 bg-amber-100/[.035] p-4 text-left transition hover:border-amber-100/40 hover:bg-amber-100/[.08]"><span className="flex items-start gap-4"><span className="grid size-11 shrink-0 place-items-center rounded-full border border-amber-100/20 bg-black/25 text-amber-100"><UserRound/></span><span className="min-w-0 flex-1"><span className="label text-[11px]">{t("ACCOUNT")}</span><strong className="mt-1 block text-lg text-stone-100">{account?`${t("Continue as")} ${account.username}`:t("Play with an account")}</strong><span className="mt-1 block text-sm leading-6 text-slate-400">{account?account.email:viewer?.email??t("Save your username and stay signed in on this device.")}</span></span><ChevronRight className="mt-3 size-5 shrink-0 text-slate-500 transition group-hover:translate-x-1 group-hover:text-amber-100"/></span></button>
            <button type="button" onClick={()=>chooseEntry("guest")} className="group rounded-xl border border-sky-200/15 bg-sky-950/[.12] p-4 text-left transition hover:border-sky-200/40 hover:bg-sky-900/[.2]"><span className="flex items-start gap-4"><span className="grid size-11 shrink-0 place-items-center rounded-full border border-sky-200/20 bg-black/25 text-sky-200"><Smartphone/></span><span className="flex-1"><span className="label text-[11px] text-sky-200/75">{t("GUEST")}</span><strong className="mt-1 block text-lg text-stone-100">{t("Continue as guest")}</strong><span className="mt-1 block text-sm leading-6 text-slate-400">{t("Use a temporary name and enter immediately—no registration.")}</span></span><ChevronRight className="mt-3 size-5 shrink-0 text-slate-500 transition group-hover:translate-x-1 group-hover:text-sky-200"/></span></button>
          </div></div>:entryMode==="account"&&!account?<AccountAccess viewer={viewer} saveProfile={saveProfile} authenticated={authenticated} back={changeEntry}/>:ready?<>
            <div className="mb-5 flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 p-3"><span className={`grid size-10 shrink-0 place-items-center rounded-full ${entryMode==="account"?"bg-amber-100/10 text-amber-100":"bg-sky-100/10 text-sky-200"}`}>{entryMode==="account"?<UserRound/>:<Smartphone/>}</span><div className="min-w-0 flex-1"><p className="text-xs uppercase tracking-[.14em] text-slate-500">{t("Playing as")}</p><p className="truncate text-sm text-stone-200">{entryMode==="account"?account?.username:t("Temporary guest")}</p></div><Button type="button" variant="ghost" size="sm" onClick={changeEntry}>{t("Change")}</Button>{entryMode==="account"&&<Button type="button" variant="ghost" size="icon" onClick={()=>void signOut()} aria-label={t("Log out")} title={t("Log out")}><LogOut/></Button>}</div>
            <Tabs value={mode} onValueChange={value=>setMode(value as "create"|"join")}><TabsList className="mb-6 grid h-12 w-full grid-cols-2 bg-black/30"><TabsTrigger value="create" className="new-case-font">{t("Create case")}</TabsTrigger><TabsTrigger value="join" className="join-hover">{t("Join case")}</TabsTrigger></TabsList>
              <form onSubmit={submit} className="space-y-5">{entryMode==="account"&&account?<div><label className="mb-2 block text-sm text-slate-300">{t("Username")}</label><div className="flex h-12 items-center gap-3 rounded-md border border-white/10 bg-black/25 px-3 text-stone-200"><UserRound className="size-5 text-amber-100"/><span>{account.username}</span></div><p className="mt-2 text-xs leading-5 text-slate-500">{t("Your account keeps your username and lets you reconnect to rooms from another device.")}</p></div>:<div><label className="mb-2 block text-sm text-slate-300">{t("Your name")}</label><Input value={name} onChange={event=>setName(event.target.value)} placeholder={language==="sq"?"p.sh. EMRI":"e.g. NAME"} maxLength={24} required className="h-12 border-white/10 bg-black/25"/><p className="mt-2 text-xs leading-5 text-slate-500">{t("Guest names are only used for the current room.")}</p></div>}{mode==="join"&&<div><label className="mb-2 block text-sm text-slate-300">{t("Room code")}</label><Input value={code} onChange={event=>setCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,5))} placeholder="ABCDE" maxLength={5} required className="h-12 border-white/10 bg-black/25 text-center font-mono text-xl uppercase tracking-[.35em]"/></div>}{error&&<ErrorMessage text={error}/>}<Button disabled={busy||(entryMode==="guest"&&name.trim().length<2)||(mode==="join"&&code.length!==5)} className={`h-12 w-full ${mode==="create"?"blood-button new-case-font":"join-hover border border-[#397fa8] bg-[#16364d] text-white hover:bg-[#1d4f70]"}`}>{busy?<Loader2 className="animate-spin"/>:mode==="create"?<Users/>:<Search/>}{t(mode==="create"?"Create private room":"Join the investigation")}</Button></form>
              <p className="mt-4 text-center text-sm leading-6 text-slate-500">{t("Friends join from their own phones using the five-character code.")}</p>
            </Tabs>
          </>:null}
        </CardContent></Card>
      </div>
    </section>
    <section className="relative isolate overflow-hidden border-b border-white/10"><div aria-hidden="true" className="absolute inset-0 -z-20 bg-cover bg-center opacity-60" style={{backgroundImage:"url('/hiddentify-suspects.jpg')"}}/><div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-r from-black via-black/80 to-black/35"/><div className="mx-auto flex min-h-[28rem] max-w-6xl items-center px-5 py-16"><div className="max-w-xl"><p className="label">{t("The lineup")}</p><h2 className="mt-3 font-serif text-4xl sm:text-5xl">{t("Everyone looks suspicious for a reason.")}</h2><p className="mt-5 text-lg leading-8 text-slate-300">{t("Innocent players also hide mistakes, debts, secret meetings, and private objectives. Catching somebody in a lie does not automatically make them the killer.")}</p></div></div></section>
    <section className="relative isolate overflow-hidden px-5 py-20 text-center"><div aria-hidden="true" className="absolute inset-0 -z-20 bg-cover bg-[center_70%] opacity-35" style={{backgroundImage:"url('/hiddentify-evidence.jpg')"}}/><div aria-hidden="true" className="absolute inset-0 -z-10 bg-[radial-gradient(circle,rgba(13,9,11,.48),rgba(8,5,7,.96)_72%)]"/><div className="mx-auto max-w-2xl"><p className="label">{t("The board is waiting")}</p><h2 className="mt-3 font-serif text-4xl sm:text-5xl">{t("Somebody has to solve it.")}</h2><p className="mx-auto mt-5 max-w-xl text-lg leading-8 text-slate-300">{t("Open a room, send the link to your friends, and discover who can control the story without getting caught.")}</p><div className="mt-7 flex flex-wrap justify-center gap-3"><Button onClick={()=>openMode("create")} className="blood-button new-case-font h-12 px-6">{t("Start a new case")}</Button><Button variant="outline" onClick={()=>openMode("join")} className="join-hover h-12 border-white/30 bg-black/20 px-6">{t("Join a case")}</Button></div></div></section>
    <footer className="border-t border-white/10 px-5 py-8"><div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 text-sm text-slate-500"><span>© Hiddentify</span><span>{t("No case is ever quite the same.")}</span></div></footer>
  </>;
}

function Lobby({game,share,copied,busy,start,setKillerCount,setGameMode,error}:{game:GameState;share:()=>void;copied:boolean;busy:boolean;start:()=>void;setKillerCount:(count:number)=>void;setGameMode:(mode:"casual"|"detective")=>void;error:string}){
  const{language,t}=useLanguage(),canStart=game.players.length>=3,killerOptions=Array.from({length:game.room.maxKillers},(_,index)=>index+1),killerLabel=language==="sq"?`${game.room.killerCount} ${game.room.killerCount===1?"vrasës i fshehtë":"vrasës të fshehtë"}`:game.room.killerCount===1?"1 hidden killer":`${game.room.killerCount} hidden killers`,modeLabel=t(game.room.mode==="casual"?"Casual":"Detective");
  return <Shell eyebrow={t("Waiting room")} title={t("Assemble the suspects")}><div className="grid gap-6 lg:grid-cols-[.8fr_1.2fr]">
    <Card className="case-card"><CardContent className="text-center"><p className="text-sm text-slate-400">{t("Room code")}</p><p className="my-4 font-mono text-5xl tracking-[.22em] text-amber-100">{game.room.code}</p><Button variant="outline" onClick={share} className="w-full border-white/15 bg-transparent">{copied?<Check/>:<Link2/>}{t(copied?"Link copied":"Invite friends")}</Button><p className="mt-4 text-sm leading-6 text-slate-400">{t("Friends open the link, enter their name, and join from their own phone.")}</p><div className="mt-4 rounded-lg border border-white/10 bg-black/20 p-3 text-left text-sm leading-6 text-slate-400"><p>{choose(language,`${killerLabel} will be assigned randomly. The host can be selected just like anyone else.`,`${killerLabel} do të caktohet rastësisht. Drejtuesi mund të zgjidhet si gjithë të tjerët.`)}</p>{game.room.killerCount>1&&<p className="mt-2">{choose(language,"The killers know their accomplices and each receives a necessary part in the plan.","Vrasësit i njohin bashkëpunëtorët dhe secili merr një pjesë të nevojshme në plan.")}</p>}</div></CardContent></Card>
    <Card className="case-card"><CardContent><div className="mb-5 flex items-center justify-between"><h2 className="font-serif text-2xl">{t("Players")}</h2><Badge className="bg-white/10 text-slate-200">{game.players.length}/10</Badge></div><div className="space-y-3">{game.players.map(player=><PlayerLine key={player.id} player={player}/>)}</div>
      {game.me.isHost?<>
        <ModeChooser mode={game.room.mode} busy={busy} setGameMode={setGameMode}/>
        <div className="mt-4 rounded-xl border border-red-300/15 bg-red-950/15 p-4"><div className="flex items-start justify-between gap-3"><div><p className="label">{t("Choose the hidden team")}</p><h3 className="mt-1 font-serif text-xl">{t("How many killers?")}</h3></div><Badge className="bg-red-950/60 text-red-100">{killerLabel}</Badge></div><div className="mt-4 flex gap-2">{killerOptions.map(count=><Button key={count} type="button" variant="outline" disabled={busy} aria-pressed={game.room.killerCount===count} onClick={()=>setKillerCount(count)} className={`h-11 flex-1 border-red-200/15 ${game.room.killerCount===count?"bg-red-800 text-white hover:bg-red-700":"bg-black/20 text-slate-300 hover:bg-red-950/40"}`}>{count}</Button>)}</div><p className="mt-3 text-sm leading-6 text-slate-400">{t("More options unlock as friends join. Innocent players always remain the larger side.")}</p></div>
        <Button disabled={!canStart||busy} onClick={start} className="mt-6 h-11 w-full bg-amber-200 text-black">{busy?<Loader2 className="animate-spin"/>:<ShieldAlert/>}{canStart?t("Generate case & assign roles"):choose(language,`Waiting for ${3-game.players.length} more`,`Po presim edhe ${3-game.players.length}`)}</Button><p className="mt-3 text-center text-sm text-slate-500">{t("Only you, the host, can choose the mode, team size, start, and release evidence.")}</p>
      </>:<div className="mt-6 rounded-xl border border-white/10 bg-black/20 p-4 text-center text-slate-300"><Loader2 className="mx-auto mb-2 size-5 animate-spin text-amber-200"/><p>{t("Waiting for the host to start…")}</p><p className="mt-2 text-sm text-slate-500">{choose(language,`The host selected ${modeLabel} with ${killerLabel}.`,`Drejtuesi zgjodhi ${modeLabel} me ${killerLabel}.`)}</p></div>}
      {error&&<ErrorMessage text={error}/>}</CardContent></Card>
  </div></Shell>;
}

function ModeChooser({mode,busy,setGameMode}:{mode:"casual"|"detective";busy:boolean;setGameMode:(mode:"casual"|"detective")=>void}){
  const{language,t}=useLanguage(),copy=MODE_DETAILS[mode][language];
  return <section className="mt-6 rounded-xl border border-amber-100/15 bg-amber-100/[.035] p-4" aria-labelledby="mode-heading">
    <p id="mode-heading" className="label">{t("Casual or Detective")}</p>
    <div className="mode-picker mt-3">
      <div className="mode-options" role="group" aria-label={t("Casual or Detective")}>
        {(["casual","detective"] as const).map(option=>{const active=mode===option;return <button key={option} type="button" disabled={busy} onClick={()=>setGameMode(option)} aria-pressed={active} aria-controls="selected-mode-details" className={`mode-card rounded-xl border p-4 text-left ${active?"is-active border-amber-200/45 bg-amber-100/10":"border-white/10 bg-black/20 hover:border-amber-100/25"}`}><span className="flex items-center justify-between gap-3"><strong className="text-lg text-amber-100">{t(option==="casual"?"Casual":"Detective")}</strong>{active&&<Check className="size-4 shrink-0 text-amber-200"/>}</span></button>})}
      </div>
      <article id="selected-mode-details" className="mode-details" aria-live="polite">
        <p className="text-xs uppercase tracking-[.15em] text-amber-100/70">{t("Selected mode")}</p>
        <h3 className="mt-1 font-serif text-2xl text-stone-100">{t(mode==="casual"?"Casual":"Detective")}</h3>
        <p className="mt-1 text-sm text-slate-400">{copy.summary}</p>
        <div className="mt-4 border-t border-white/10 pt-4"><p className="text-sm text-amber-100/80">{t("What happens")}</p><p className="mt-1 text-sm leading-6 text-slate-300">{copy.what}</p></div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2"><div className="rounded-lg border border-emerald-300/10 bg-emerald-950/15 p-3"><p className="text-sm text-emerald-200">{t("Innocent role")}</p><p className="mt-1 text-sm leading-6 text-slate-400">{copy.innocent}</p></div><div className="rounded-lg border border-red-300/10 bg-red-950/15 p-3"><p className="text-sm text-red-200">{t("Killer role")}</p><p className="mt-1 text-sm leading-6 text-slate-400">{copy.killer}</p></div></div>
      </article>
    </div>
  </section>;
}

function Playing({game,busy,error,advance,investigate,activateAbility,inviteInterrogation,respondInterrogation,sendInterrogationMessage,accuse,reveal,guesses,setGuesses}:{game:GameState;busy:boolean;error:string;advance:()=>void;investigate:(actionType:string,targetPlayerId?:string)=>void;activateAbility:(targetPlayerId?:string)=>void;inviteInterrogation:(targetPlayerId:string)=>void;respondInterrogation:(interrogationId:string,accepted:boolean)=>void;sendInterrogationMessage:(interrogationId:string,message:string)=>void;accuse:()=>void;reveal:()=>void;guesses:string[];setGuesses:(x:string[])=>void}){
  const{language,t}=useLanguage(),[roleOpened,setRoleOpened]=useState(false),[openedClues,setOpenedClues]=useState<Set<string>>(()=>new Set());
  const openClue=useCallback((id:string)=>setOpenedClues(current=>current.has(id)?current:new Set(current).add(id)),[]);
  const clues=(game.case?.evidence??[]).flatMap((packet,packetIndex)=>packet.map((text,clueIndex)=>({id:`${packetIndex}-${clueIndex}`,packet:packetIndex+1,text}))).map((clue,index)=>({...clue,number:index+1})),phase=game.room.phase,detective=game.room.mode==="detective",votingAt=game.room.votingPhase,actionsOpen=detective&&phase>=1&&phase<=3;
  if(!roleOpened&&game.me.role)return <RoleReveal role={game.me.role} mode={game.room.mode} onContinue={()=>setRoleOpened(true)}/>;
  return <Shell eyebrow={choose(language,`Live case · ${detective?"Detective":"Casual"} · Evidence ${phase}/${votingAt}`,`Çështje aktive · ${detective?"Detektiv":"E thjeshtë"} · Prova ${phase}/${votingAt}`)} title={game.case?.title??t("Active investigation")}>
    <div className="mb-6 flex items-center gap-4"><Progress value={(phase/votingAt)*100} className="h-1.5 flex-1 bg-white/10"/><span className="text-sm text-slate-400">{phase<votingAt?choose(language,`Packet ${phase+1} locked`,`Pakoja ${phase+1} e mbyllur`):t("Accusations open")}</span></div>
    <Tabs key={phase} defaultValue={phase===0?"briefing":detective?"actions":"evidence"}>
      <TabsList className={`mb-6 grid h-11 w-full ${detective?"grid-cols-4":"grid-cols-3"} bg-black/25`}><TabsTrigger value="briefing"><Eye/>{t("Role")}</TabsTrigger><TabsTrigger value="evidence"><Clipboard/>{t("Clues")}</TabsTrigger>{detective&&<TabsTrigger value="actions" className="relative"><Activity/>{t("Actions")}{game.publicEvents.length>0&&<span className="absolute right-1 top-1 size-1.5 rounded-full bg-red-400"/>}</TabsTrigger>}<TabsTrigger value="suspects"><Users/>{t("Players")}</TabsTrigger></TabsList>
      <TabsContent value="briefing"><RoleCard role={game.me.role} mode={game.room.mode}/></TabsContent>
      <TabsContent value="evidence"><div className="grid gap-6 lg:grid-cols-[.75fr_1.25fr]"><CaseIntro game={game}/><div>{clues.length?<><div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-100/15 bg-amber-100/[.04] p-4"><Mail className="mt-0.5 size-5 shrink-0 text-amber-100"/><p className="text-sm leading-6 text-slate-300">{t("Released evidence arrives sealed. Tap each envelope to unfold the clue on your own phone.")}</p></div><div className="grid gap-3">{clues.map(clue=><ClueEnvelope key={clue.id} clue={clue} opened={openedClues.has(clue.id)} onOpen={openClue}/>)}</div></>:<Card className="case-card"><CardContent className="py-12 text-center"><LockKeyhole className="mx-auto size-9 text-amber-200"/><p className="mt-4 text-slate-300">{t("The first evidence envelope is sealed.")}</p></CardContent></Card>}</div></div></TabsContent>
      {detective&&<TabsContent value="actions"><InvestigationPanel game={game} busy={busy} submit={investigate} activateAbility={activateAbility} inviteInterrogation={inviteInterrogation} respondInterrogation={respondInterrogation} sendInterrogationMessage={sendInterrogationMessage}/></TabsContent>}
      <TabsContent value="suspects"><Card className="case-card"><CardContent><div className="grid gap-3 sm:grid-cols-2">{game.players.map(p=><PlayerLine key={p.id} player={p} detailed actionsOpen={actionsOpen}/>)}</div></CardContent></Card></TabsContent>
    </Tabs>
    {phase<votingAt&&game.me.isHost&&<div className="mt-7"><p className="mb-3 text-center text-sm text-slate-400">{phase===0?t("Give everyone time to read their private role before opening the case."):detective?choose(language,`${game.roundActions.submitted}/${game.roundActions.total} players have locked an action. You can wait for everyone or continue.`,`${game.roundActions.submitted}/${game.roundActions.total} lojtarë e kanë mbyllur veprimin. Mund të presësh të gjithë ose të vazhdosh.`):choose(language,"Let everyone open the clues and discuss them aloud before you continue.","Lëri të gjithë të hapin provat dhe t'i diskutojnë para se të vazhdosh.")}</p><Button disabled={busy} onClick={advance} className="h-11 w-full bg-amber-200 text-black">{busy?<Loader2 className="animate-spin"/>:<ChevronRight/>}{t(phase===0?"Open first evidence packet":"Release next evidence packet")}</Button></div>}
    {phase<votingAt&&!game.me.isHost&&<div className="mt-7 rounded-xl border border-white/10 bg-black/20 p-4 text-center text-slate-300">{phase===0?t("Waiting for the host to open the first evidence packet…"):detective?choose(language,`${game.roundActions.submitted}/${game.roundActions.total} players have acted. Discuss what you discovered while the host prepares the next packet.`,`${game.roundActions.submitted}/${game.roundActions.total} lojtarë kanë vepruar. Diskutoni zbulimet ndërsa drejtuesi përgatit pakon tjetër.`):choose(language,"Discuss every open clue while the host prepares the next packet.","Diskutoni çdo provë të hapur ndërsa drejtuesi përgatit pakon tjetër.")}</div>}
    {phase===votingAt&&<Accusation game={game} guesses={guesses} setGuesses={setGuesses} accuse={accuse} reveal={reveal} busy={busy}/>}
    {error&&<ErrorMessage text={error}/>}
  </Shell>
}

function ClueEnvelope({clue,opened,onOpen}:{clue:{id:string;packet:number;number:number;text:string};opened:boolean;onOpen:(id:string)=>void}){
  const{language,t}=useLanguage(),[opening,setOpening]=useState(false);
  useEffect(()=>{if(!opening||opened)return;const reduced=window.matchMedia("(prefers-reduced-motion: reduce)").matches,timer=window.setTimeout(()=>onOpen(clue.id),reduced?20:560);return()=>window.clearTimeout(timer)},[clue.id,onOpen,opened,opening]);
  if(opened)return <article className="clue-paper" aria-live="polite"><div className="clue-paper-head"><span><MailOpen/>{t("Evidence")} {String(clue.number).padStart(2,"0")}</span><Badge className="bg-red-950/10 text-red-950">{t("Packet")} {clue.packet}</Badge></div><p>{clue.text}</p></article>;
  return <button type="button" disabled={opening} onClick={()=>setOpening(true)} className={`clue-envelope ${opening?"is-opening":""}`} aria-label={choose(language,`Open evidence envelope ${clue.number}`,`Hap zarfin e provës ${clue.number}`)}><span className="clue-envelope-icon"><Mail/></span><span className="clue-envelope-copy"><small>{choose(language,`Evidence envelope ${String(clue.number).padStart(2,"0")}`,`Zarfi i provës ${String(clue.number).padStart(2,"0")}`)}</small><strong>{t("Packet")} {clue.packet} · {t("Sealed")}</strong><em>{t(opening?"Breaking the seal…":"Tap to open")}</em></span><span className="clue-envelope-seal"><Fingerprint/></span></button>;
}

function RoleReveal({role,mode,onContinue}:{role:Role;mode:"casual"|"detective";onContinue:()=>void}){
  const{t}=useLanguage(),[stage,setStage]=useState<"sealed"|"opening"|"open">("sealed");
  useEffect(()=>{if(stage!=="opening")return;const reduced=window.matchMedia("(prefers-reduced-motion: reduce)").matches,timer=window.setTimeout(()=>setStage("open"),reduced?20:900);return()=>window.clearTimeout(timer)},[stage]);
  if(stage==="open")return <section className="role-reveal-screen role-reveal-open"><div className="role-file-rise"><div className="role-clearance"><Check/>{t("Folder opened · private clearance granted")}</div><RoleCard role={role} mode={mode}/><Button onClick={onContinue} className="mx-auto mt-5 h-12 w-full max-w-3xl bg-amber-100 text-stone-950 hover:bg-amber-50"><Eye/>{t("Enter the investigation")}</Button><p className="mt-3 text-center text-sm text-slate-500">{t("You can reopen your folder from the Role tab.")}</p></div></section>;
  return <section className="role-reveal-screen" aria-live="polite" aria-busy={stage==="opening"}>
    <div className="mx-auto w-full max-w-2xl text-center">
      <p className="label">{t("Private role assignment")}</p>
      <h1 className="mt-3 font-serif text-4xl sm:text-5xl">{t("Make sure nobody is looking over your shoulder.")}</h1>
      <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-slate-300">{t("Every player receives a different sealed folder. Open yours only when you are ready to meet your character.")}</p>
      <div className={`role-folder-card ${stage==="opening"?"is-opening":""}`}>
        <div className="role-folder-tab">{t("PRIVATE ROLE FOLDER")}</div>
        <div className="role-folder-head"><span>{t("CLASSIFIED CASE FOLDER")}</span><span>{t("FICTIONAL GAME CASE")}</span></div>
        <div className="role-folder-body"><div className="role-folder-icon">{stage==="opening"?<FolderOpen/>:<FolderLock/>}</div><p>{t("PERSONNEL ASSIGNMENT · CLASSIFIED")}</p><strong>{t("EYES ONLY")}</strong><small>{t("One private identity is filed inside")}</small></div>
        <span className="role-folder-seal"><Fingerprint/></span>
      </div>
      <Button disabled={stage==="opening"} onClick={()=>setStage("opening")} className="blood-button h-12 min-w-52">{stage==="opening"?<Loader2 className="animate-spin"/>:<FolderOpen/>}{t(stage==="opening"?"Opening folder…":"Open folder")}</Button>
    </div>
  </section>;
}

type ActionOption={value:string;label:string;description:string;needsTarget?:boolean;allowsSelf?:boolean;covert?:boolean};
const investigationOptions:ActionOption[]=[
  {value:"search_scene",label:"Search the scene",description:"Inspect physical traces and receive one private observation."},
  {value:"analyze_evidence",label:"Analyze the evidence",description:"Test how the released clues fit together and uncover a hidden detail."},
  {value:"check_records",label:"Check digital records",description:"Examine schedules, access logs, and timestamps for contradictions."},
  {value:"interrogate",label:"Probe an alibi",description:"Analyze one character's account and privately assess the weakness in their story.",needsTarget:true},
];
const covertOptions:ActionOption[]=[
  {value:"plant_false_lead",label:"Plant a false trail",description:"Publish an unauthenticated trace that points toward another suspect.",needsTarget:true,covert:true},
  {value:"anonymous_tip",label:"Send an anonymous tip",description:"Publicly direct the room's suspicion toward another suspect.",needsTarget:true,covert:true},
  {value:"forge_alibi",label:"Forge an alibi",description:"Publish a late-synced record that appears to clear you or any other character.",needsTarget:true,allowsSelf:true,covert:true},
  {value:"delay_investigation",label:"Delay an investigation",description:"Hide one player's private result until the next evidence packet.",needsTarget:true,covert:true},
];

function InvestigationPanel({game,busy,submit,activateAbility,inviteInterrogation,respondInterrogation,sendInterrogationMessage}:{game:GameState;busy:boolean;submit:(actionType:string,targetPlayerId?:string)=>void;activateAbility:(targetPlayerId?:string)=>void;inviteInterrogation:(targetPlayerId:string)=>void;respondInterrogation:(interrogationId:string,accepted:boolean)=>void;sendInterrogationMessage:(interrogationId:string,message:string)=>void}){
  const{language,t}=useLanguage(),[choice,setChoice]=useState(""),[target,setTarget]=useState("");
  const phase=game.room.phase,open=phase>=1&&phase<=3,options=game.me.role?.culprit?[...investigationOptions,...covertOptions]:investigationOptions,selected=options.find(option=>option.value===choice),targetPlayers=selected?.allowsSelf?game.players:game.players.filter(player=>player.id!==game.me.id),current=game.me.currentAction,earlier=[...game.me.actions].filter(action=>action.phase!==phase).sort((a,b)=>b.phase-a.phase);
  return <div className="grid gap-6 lg:grid-cols-[1.15fr_.85fr]">
    <div className="space-y-6">
      <Card className="case-card overflow-hidden">
        <CardContent>
          <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="label">{t("Private move")}</p><h2 className="mt-2 font-serif text-3xl">{open?choose(language,`Evidence round ${phase}`,`Raundi i provave ${phase}`):t(phase===0?"Awaiting first evidence":"Investigation closed")}</h2></div>{open&&<Badge className="bg-white/10 text-slate-200">{game.roundActions.submitted}/{game.roundActions.total} {t("acted")}</Badge>}</div>
          {!open&&phase===0&&<div className="mt-6 rounded-xl border border-white/10 bg-black/20 p-5 text-slate-300"><LockKeyhole className="mb-3 size-6 text-amber-200"/>{t("Read your role and introduce only your public identity. Actions unlock when the host opens the first packet.")}</div>}
          {!open&&phase===4&&<div className="mt-6 rounded-xl border border-amber-200/20 bg-amber-200/5 p-5 text-slate-300">{t("All private actions are complete. Compare your discoveries, challenge the unverified signals, and prepare your final vote.")}</div>}
          {open&&current&&<div className={`mt-6 rounded-xl border p-5 ${current.covert?"border-red-400/25 bg-red-950/25":"border-emerald-400/20 bg-emerald-950/25"}`}><div className="flex flex-wrap items-center gap-2"><Badge className={current.covert?"bg-red-950 text-red-200":"bg-emerald-950 text-emerald-200"}>{t(current.covert?"COVERT MOVE LOCKED":"INVESTIGATION COMPLETE")}</Badge><span className="text-sm text-slate-400">{current.label}</span></div>{current.targetCharacter&&<p className="mt-3 text-sm text-slate-400">{t("Target")}: <span className="text-slate-200">{current.targetCharacter}</span></p>}<p className="mt-4 text-lg leading-8 text-slate-100">{current.result}</p><p className="mt-4 text-sm leading-6 text-slate-400">{t("This result is private. Reveal it, hide it, or describe it strategically when talking to the group.")}</p></div>}
          {open&&!current&&<div className="mt-6 space-y-4">{game.me.role?.culprit&&<div className="rounded-xl border border-red-400/25 bg-red-950/25 p-4 text-sm leading-6 text-red-100"><strong>{t("Only you can see the covert moves.")}</strong> {t("You may investigate normally or sacrifice this round’s investigation to mislead the room. Essential evidence cannot be destroyed.")}</div>}<div><label className="mb-2 block text-sm text-slate-300">{t("Choose one action")}</label><Select value={choice} onValueChange={value=>{setChoice(value);setTarget("")}}><SelectTrigger className="h-12 w-full border-white/10 bg-black/20"><SelectValue placeholder={t("Select your move")}/></SelectTrigger><SelectContent>{options.map(option=><SelectItem key={option.value} value={option.value}>{option.covert?`${t("Covert")} · `:""}{t(option.label)}</SelectItem>)}</SelectContent></Select></div>{selected&&<div className={`rounded-lg border p-3 text-sm leading-6 ${selected.covert?"border-red-400/20 bg-red-950/20 text-red-100":"border-white/10 bg-black/15 text-slate-300"}`}>{t(selected.description)}</div>}{selected?.needsTarget&&<div><label className="mb-2 block text-sm text-slate-300">{t("Choose a target")}</label><Select value={target} onValueChange={setTarget}><SelectTrigger className="h-12 w-full border-white/10 bg-black/20"><SelectValue placeholder={t(selected.allowsSelf?"Select a player":"Select another player")}/></SelectTrigger><SelectContent>{targetPlayers.map(player=><SelectItem key={player.id} value={player.id}>{player.character?.name} · {player.name}{player.id===game.me.id?` (${t("you")})`:""}</SelectItem>)}</SelectContent></Select></div>}<Button disabled={busy||!selected||(Boolean(selected.needsTarget)&&!target)} onClick={()=>selected&&submit(selected.value,target||undefined)} className={`h-12 w-full ${selected?.covert?"bg-red-800 text-white hover:bg-red-700":"bg-amber-200 text-black hover:bg-amber-100"}`}>{busy?<Loader2 className="animate-spin"/>:selected?.covert?<ShieldAlert/>:<Target/>}{t(selected?.covert?"Execute covert move":"Lock private action")}</Button><p className="text-center text-sm leading-6 text-slate-500">{t("Your choice cannot be changed after it is locked.")}</p></div>}
        </CardContent>
      </Card>
      <AbilityPanel game={game} busy={busy} activateAbility={activateAbility}/>
      <InterrogationPanel game={game} busy={busy} invite={inviteInterrogation} respond={respondInterrogation} sendMessage={sendInterrogationMessage}/>
      {earlier.length>0&&<Card className="case-card"><CardContent><h2 className="font-serif text-2xl">{t("Earlier discoveries")}</h2><div className="mt-4 space-y-3">{earlier.map(action=><div key={`${action.phase}-${action.type}`} className="rounded-lg border border-white/10 bg-black/15 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-amber-100">{t("Round")} {action.phase} · {action.label}</p>{action.targetCharacter&&<span className="text-sm text-slate-500">{t("Target")}: {action.targetCharacter}</span>}</div><p className="mt-2 leading-7 text-slate-300">{action.result}</p></div>)}</div></CardContent></Card>}
    </div>
    <Card className="case-card h-fit"><CardContent><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-full border border-red-400/20 bg-red-950/30"><Radio className="size-5 text-red-200"/></span><div><p className="label">{t("Open channel")}</p><h2 className="mt-1 font-serif text-2xl">{t("Unverified signals")}</h2></div></div><p className="mt-4 text-sm leading-6 text-slate-400">{t("These reports may be useful, forged, or planted by the killer. They are never required to solve the case.")}</p>{game.publicEvents.length?<div className="mt-5 space-y-3">{[...game.publicEvents].reverse().map((event,index)=><div key={`${event.phase}-${index}`} className="rounded-lg border border-red-400/20 bg-red-950/20 p-4"><p className="text-sm uppercase tracking-[.15em] text-red-300">{t("Round")} {event.phase}</p><p className="mt-2 leading-7 text-slate-200">{event.text}</p></div>)}</div>:<div className="mt-5 rounded-lg border border-white/10 bg-black/15 p-5 text-center text-sm text-slate-500">{t("No suspicious transmission has appeared yet.")}</div>}</CardContent></Card>
  </div>
}

function AbilityPanel({game,busy,activateAbility}:{game:GameState;busy:boolean;activateAbility:(targetPlayerId?:string)=>void}){
  const{language,t}=useLanguage(),[target,setTarget]=useState(""),ability=game.me.role?.ability,used=game.me.abilityUse,open=game.room.phase>=1&&game.room.phase<=3,targets=game.players.filter(player=>player.id!==game.me.id);
  if(!ability)return <Card className="case-card"><CardContent><p className="label">{t("Unique role power")}</p><h2 className="mt-2 font-serif text-2xl">{t("Available in newly generated cases")}</h2><p className="mt-3 leading-7 text-slate-400">{t("This case began before character abilities were added. Your normal investigation actions still work.")}</p></CardContent></Card>;
  return <Card className="case-card overflow-hidden"><CardContent>
    <div className="flex items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-full border border-amber-100/20 bg-amber-100/[.06]"><Zap className="size-5 text-amber-100"/></span><div><p className="label">{t("Unique role power · once per case")}</p><h2 className="mt-1 font-serif text-2xl">{ability.name}</h2></div></div>
    <p className="mt-4 leading-7 text-slate-300">{ability.description}</p>
    {used?<div className="mt-5 rounded-xl border border-emerald-400/20 bg-emerald-950/25 p-4"><div className="flex items-center gap-2 text-emerald-200"><Check className="size-4"/>{t("Power used")}{used.targetCharacter?choose(language,` on ${used.targetCharacter}`,` ndaj ${used.targetCharacter}`):""}</div><p className="mt-3 leading-7 text-slate-200">{used.result}</p><p className="mt-3 text-sm text-slate-500">{t("Only you can see this result.")}</p></div>:<div className="mt-5 space-y-4">{ability.needsTarget&&<div><label className="mb-2 block text-sm text-slate-300">{t("Choose one suspect")}</label><Select value={target} onValueChange={setTarget}><SelectTrigger className="h-12 w-full border-white/10 bg-black/20"><SelectValue placeholder={t("Select another player")}/></SelectTrigger><SelectContent>{targets.map(player=><SelectItem key={player.id} value={player.id}>{player.character?.name} · {player.name}</SelectItem>)}</SelectContent></Select></div>}<Button disabled={busy||!open||(ability.needsTarget&&!target)} onClick={()=>activateAbility(target||undefined)} className="h-12 w-full border border-amber-100/30 bg-amber-100/10 text-amber-50 hover:bg-amber-100/20"><Zap/>{choose(language,`Use ${ability.name}`,`Përdor ${ability.name}`)}</Button>{!open&&<p className="text-center text-sm text-slate-500">{t("Role powers open during evidence rounds 1–3.")}</p>}</div>}
  </CardContent></Card>;
}

function countdown(milliseconds:number){const total=Math.max(0,Math.ceil(milliseconds/1000)),minutes=Math.floor(total/60),seconds=String(total%60).padStart(2,"0");return `${minutes}:${seconds}`}

function InterrogationPanel({game,busy,invite,respond,sendMessage}:{game:GameState;busy:boolean;invite:(targetPlayerId:string)=>void;respond:(interrogationId:string,accepted:boolean)=>void;sendMessage:(interrogationId:string,message:string)=>void}){
  const{language,t}=useLanguage(),[target,setTarget]=useState(""),[draft,setDraft]=useState(""),[now,setNow]=useState(()=>Date.now());
  useEffect(()=>{const timer=window.setInterval(()=>setNow(Date.now()),1000);return()=>window.clearInterval(timer)},[]);
  const channels=game.interrogations??[],live=channels.find(channel=>channel.status==="active"&&Boolean(channel.endsAt)&&Date.parse(channel.endsAt!)>now)||channels.find(channel=>channel.status==="pending"&&Date.parse(channel.inviteExpiresAt)>now),closed=[...channels].reverse().find(channel=>channel.status!=="pending"||Date.parse(channel.inviteExpiresAt)<=now),open=game.room.phase>=1&&game.room.phase<=3,targets=game.players.filter(player=>player.id!==game.me.id),remaining=live?.status==="active"&&live.endsAt?Date.parse(live.endsAt)-now:live?Date.parse(live.inviteExpiresAt)-now:0;
  function submitMessage(event:FormEvent){event.preventDefault();if(!live||live.status!=="active"||!draft.trim())return;sendMessage(live.id,draft);setDraft("")}
  return <Card className="case-card overflow-hidden"><CardContent>
    <div className="flex flex-wrap items-start justify-between gap-3"><div className="flex items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-full border border-blue-300/20 bg-blue-950/30"><MessageCircle className="size-5 text-blue-200"/></span><div><p className="label">{t("Private interrogation · one invite per case")}</p><h2 className="mt-1 font-serif text-2xl">{t("Two minutes. Two players.")}</h2></div></div>{live&&<Badge className="border-blue-200/20 bg-blue-950/50 text-blue-100"><Timer/>{countdown(remaining)}</Badge>}</div>
    <p className="mt-4 text-sm leading-6 text-slate-400">{t("Invite one suspect. If they accept within 45 seconds, a private two-person text channel opens for two minutes. The rest of the room cannot read it.")}</p>
    {live?.status==="pending"&&!live.isInitiator&&<div className="mt-5 rounded-xl border border-blue-300/20 bg-blue-950/25 p-4"><p className="text-blue-100"><strong>{live.partner.name}</strong> {t("wants to question you privately.")}</p><p className="mt-1 text-sm text-slate-400">{t("Character")}: {live.partner.character}</p><div className="mt-4 grid grid-cols-2 gap-3"><Button disabled={busy} onClick={()=>respond(live.id,true)} className="bg-blue-200 text-slate-950 hover:bg-blue-100">{t("Accept")}</Button><Button disabled={busy} variant="outline" onClick={()=>respond(live.id,false)} className="border-white/15 bg-transparent">{t("Decline")}</Button></div></div>}
    {live?.status==="pending"&&live.isInitiator&&<div className="mt-5 rounded-xl border border-blue-300/20 bg-blue-950/20 p-5 text-center"><Loader2 className="mx-auto size-5 animate-spin text-blue-200"/><p className="mt-3 text-slate-200">{choose(language,`Waiting for ${live.partner.name} to accept…`,`Duke pritur ${live.partner.name} të pranojë…`)}</p><p className="mt-1 text-sm text-slate-500">{t("The invitation closes automatically.")}</p></div>}
    {live?.status==="active"&&<div className="mt-5"><div className="mb-3 flex items-center justify-between gap-3"><p className="text-sm text-blue-100">{choose(language,`Private with ${live.partner.name}`,`Privatisht me ${live.partner.name}`)} · {live.partner.character}</p><span className="text-xs text-slate-500">{t("max 40 messages")}</span></div><div className="max-h-64 space-y-2 overflow-y-auto rounded-xl border border-blue-300/15 bg-black/25 p-3" aria-live="polite">{live.messages.length?live.messages.map(message=><div key={message.id} className={`flex ${message.isMine?"justify-end":"justify-start"}`}><div className={`max-w-[85%] rounded-xl px-3 py-2 text-sm leading-6 ${message.isMine?"bg-blue-900/70 text-blue-50":"bg-white/8 text-slate-200"}`}><p className="mb-1 text-xs text-slate-400">{message.isMine?t("You"):message.senderName}</p><p>{message.body}</p></div></div>):<p className="py-7 text-center text-sm text-slate-500">{t("Channel open. Ask a direct question.")}</p>}</div><form onSubmit={submitMessage} className="mt-3 flex gap-2"><Input value={draft} onChange={event=>setDraft(event.target.value)} maxLength={280} placeholder={t("Write a private message…")} className="h-11 border-blue-300/15 bg-black/25"/><Button type="submit" size="icon" disabled={busy||!draft.trim()||remaining<=0} className="size-11 bg-blue-800 text-white hover:bg-blue-700" aria-label={t("Send private message")}><Send/></Button></form></div>}
    {!live&&<div className="mt-5">{!game.me.interrogationUsed?<div className="space-y-4"><div><label className="mb-2 block text-sm text-slate-300">{t("Choose who to invite")}</label><Select value={target} onValueChange={setTarget}><SelectTrigger className="h-12 w-full border-white/10 bg-black/20"><SelectValue placeholder={t("Select another player")}/></SelectTrigger><SelectContent>{targets.map(player=><SelectItem key={player.id} value={player.id}>{player.character?.name} · {player.name}</SelectItem>)}</SelectContent></Select></div><Button disabled={busy||!open||!target} onClick={()=>invite(target)} className="h-12 w-full bg-blue-900 text-blue-50 hover:bg-blue-800"><MessageCircle/>{t("Send private invitation")}</Button>{!open&&<p className="text-center text-sm text-slate-500">{t("Invitations open during evidence rounds 1–3.")}</p>}</div>:<div className="rounded-xl border border-white/10 bg-black/20 p-4 text-sm leading-6 text-slate-400">{t("Your invitation has been used. You can still accept an invitation from another player.")}</div>}{closed?.endsAt&&closed.messages.length>0&&<details className="mt-4 rounded-xl border border-white/10 bg-black/15 p-4"><summary className="cursor-pointer text-sm text-slate-300">{choose(language,`View closed transcript with ${closed.partner.name}`,`Shiko bisedën e mbyllur me ${closed.partner.name}`)}</summary><div className="mt-3 space-y-2">{closed.messages.map(message=><p key={message.id} className="text-sm leading-6 text-slate-400"><span className="text-slate-200">{message.isMine?t("You"):message.senderName}:</span> {message.body}</p>)}</div></details>}</div>}
  </CardContent></Card>;
}

function Accusation({game,guesses,setGuesses,accuse,reveal,busy}:{game:GameState;guesses:string[];setGuesses:(x:string[])=>void;accuse:()=>void;reveal:()=>void;busy:boolean}){
  const{language,t}=useLanguage(),required=game.room.killerCount,plural=required>1;
  function toggle(playerId:string){
    if(guesses.includes(playerId))setGuesses(guesses.filter(id=>id!==playerId));
    else if(guesses.length<required)setGuesses([...guesses,playerId]);
  }
  return <Card className="case-card mt-7"><CardContent><p className="label">{t("Final majority vote")}</p><h2 className="mt-2 font-serif text-2xl">{choose(language,`Pinpoint ${plural?`all ${required} killers`:"the killer"}`,plural?`Gjej të ${required} vrasësit`:`Gjej vrasësin`)}</h2><div className="mt-4 rounded-xl border border-amber-200/20 bg-amber-200/5 p-4 text-sm leading-6 text-slate-300"><strong className="text-amber-100">{choose(language,`Each phone must submit one complete ballot naming exactly ${required} ${plural?"suspects":"suspect"}.`,`Çdo telefon duhet të dërgojë një votë të plotë me saktësisht ${required} ${plural?"të dyshuar":"të dyshuar"}.`)}</strong> {choose(language,"More than half of all ballots must match the full killer team. Every ballot counts, including the killers’. A tie, split result, or partly correct team means the killers win.","Më shumë se gjysma e votave duhet të përputhen me gjithë ekipin e vrasësve. Çdo votë numërohet, përfshirë votat e vrasësve. Barazimi, ndarja ose një ekip pjesërisht i saktë do të thotë se fitojnë vrasësit.")}</div>{game.me.accusationSubmitted?<div className="mt-5 flex items-center gap-3 rounded-xl border border-emerald-400/20 bg-emerald-950/30 p-4 text-emerald-100"><Check/>{choose(language,`Your ballot is locked. ${game.me.isHost?"Wait for every phone, then reveal the result.":"The host will reveal the result when everyone has voted."}`,`Vota jote u mbyll. ${game.me.isHost?"Prit çdo telefon dhe pastaj zbulo rezultatin.":"Drejtuesi do të zbulojë rezultatin pasi të votojnë të gjithë."}`)}</div>:<div className="mt-5"><div className="mb-3 flex items-center justify-between gap-3"><p className="text-sm text-slate-300">{t("Select the full team")}</p><Badge className={guesses.length===required?"bg-emerald-950 text-emerald-200":"bg-white/10 text-slate-300"}>{guesses.length}/{required} {choose(language,"selected","zgjedhur")}</Badge></div><div className="grid gap-2 sm:grid-cols-2">{game.players.map(player=>{const selected=guesses.includes(player.id),full=guesses.length>=required&&!selected;return <button key={player.id} type="button" disabled={full||busy} aria-pressed={selected} onClick={()=>toggle(player.id)} className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-colors ${selected?"border-red-300/40 bg-red-950/45 text-red-50":"border-white/10 bg-black/15 text-slate-300 hover:border-red-200/25 hover:bg-red-950/20"} disabled:cursor-not-allowed disabled:opacity-45`}><span className={`grid size-8 shrink-0 place-items-center rounded-full border ${selected?"border-red-200/40 bg-red-800":"border-white/10 bg-white/5"}`}>{selected?<Check className="size-4"/>:player.name.charAt(0).toUpperCase()}</span><span><strong className="block font-medium">{player.character?.name}</strong><small className="text-slate-500">{choose(language,`played by ${player.name}`,`luhet nga ${player.name}`)}</small></span></button>})}</div><Button disabled={guesses.length!==required||busy} onClick={accuse} className="mt-4 h-11 w-full bg-red-900 text-white hover:bg-red-800">{t("Lock my complete ballot")}</Button></div>}<div className="mt-5 flex items-center justify-between gap-3 text-sm text-slate-400"><span>{game.players.filter(player=>player.accusationSubmitted).length}/{game.players.length} {choose(language,"ballots locked","vota të mbyllura")}</span>{game.me.isHost&&<Button disabled={!game.allSubmitted||busy} onClick={reveal} className="bg-amber-200 text-black">{t("Reveal vote & winner")}</Button>}</div></CardContent></Card>;
}

function Solution({game,leave}:{game:GameState;leave:()=>void}){
  const{language,t}=useLanguage(),s=game.solution;
  if(!s)return null;
  const killerCount=s.culprits.length,plural=killerCount>1,killerCharacters=s.culprits.map(culprit=>culprit.character).join(", "),culpritIds=s.culprits.map(culprit=>culprit.playerId).sort();
  return <Shell eyebrow={t("Final vote revealed")} title={s.detectivesWin?choose(language,`The investigators caught ${plural?"every killer":"the killer"}`,plural?"Hetuesit kapën çdo vrasës":"Hetuesit kapën vrasësin"):choose(language,`The killer${plural?" team":""} wins`,plural?"Ekipi i vrasësve fiton":"Vrasësi fiton")}>
    <div className={`mb-6 rounded-2xl border p-5 sm:p-6 ${s.detectivesWin?"border-emerald-400/25 bg-emerald-950/35":"border-red-400/25 bg-red-950/35"}`}>
      <p className={`font-serif text-3xl ${s.detectivesWin?"text-emerald-200":"text-red-200"}`}>{t(s.detectivesWin?"Majority matched the full team":"No majority for the full team")}</p>
      <p className="mt-2 leading-7 text-slate-300">{s.detectivesWin?choose(language,`${s.correctBallots} of ${s.totalVotes} ballots identified ${plural?"every killer":"the killer"}. ${s.requiredVotes} exact ballots were required.`,`${s.correctBallots} nga ${s.totalVotes} vota identifikuan ${plural?"çdo vrasës":"vrasësin"}. Kërkoheshin ${s.requiredVotes} vota të sakta.`):choose(language,`Only ${s.correctBallots} of ${s.totalVotes} ballots identified the complete team. At least ${s.requiredVotes} were required, so ${killerCharacters} ${plural?"escape":"escapes"} and ${plural?"win":"wins"}.`,`Vetëm ${s.correctBallots} nga ${s.totalVotes} vota identifikuan ekipin e plotë. Kërkoheshin të paktën ${s.requiredVotes}, prandaj ${killerCharacters} ${plural?"shpëtojnë dhe fitojnë":"shpëton dhe fiton"}.`)}</p>
    </div>
    <div className="grid gap-6 lg:grid-cols-[.8fr_1.2fr]">
      <Card className="case-card"><CardContent><p className="text-sm text-slate-400">{choose(language,plural?`The ${killerCount} killers`:"The killer",plural?`${killerCount} vrasësit`:"Vrasësi")}</p><div className="mt-3 space-y-3">{s.culprits.map(culprit=><div key={culprit.playerId} className="rounded-xl border border-red-300/15 bg-red-950/20 p-3"><h2 className="font-serif text-2xl text-red-200">{culprit.character}</h2><p className="mt-1 text-sm text-slate-400">{choose(language,`played by ${culprit.playerName}`,`luhet nga ${culprit.playerName}`)}</p></div>)}</div><Info title={t("Motive")} text={s.motive}/><Info title={t("Method")} text={s.method}/><Info title={t("Major revelation")} text={s.twist}/></CardContent></Card>
      <div className="space-y-6">
        <Card className="case-card"><CardContent><h2 className="font-serif text-2xl">{t("What actually happened")}</h2><ol className="mt-6 space-y-5">{s.timeline.map((event,index)=><li key={index} className="flex gap-4"><span className="grid size-8 shrink-0 place-items-center rounded-full border border-amber-200/30 text-sm text-amber-100">{index+1}</span><p className="pt-1 text-slate-300">{event}</p></li>)}</ol></CardContent></Card>
        {s.inspiration&&<Card className="border-amber-100/15 bg-amber-100/[.035]"><CardContent><div className="flex items-start gap-3"><div className="grid size-10 shrink-0 place-items-center rounded-full border border-amber-100/20 bg-amber-100/[.06]"><BookOpen className="size-5 text-amber-100"/></div><div><p className="label text-amber-100/80">{t("True-crime murder echo · unlocked")}</p><h2 className="mt-2 font-serif text-2xl">{t("Inspired by")} {s.inspiration.title} · {s.inspiration.year}</h2><p className="mt-3 leading-7 text-slate-300">{s.inspiration.connection}</p><a href={s.inspiration.sourceUrl} target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center gap-2 rounded-lg border border-amber-100/20 bg-amber-100/[.04] px-4 py-2 text-sm text-amber-100 transition-colors hover:bg-amber-100/10">{s.inspiration.sourceLabel}<ExternalLink className="size-4"/></a></div></div></CardContent></Card>}
        <Card className="case-card"><CardContent><h2 className="font-serif text-2xl">{t("Secret vote breakdown")}</h2><div className="mt-4 space-y-3">{game.players.map(player=>{const targets=[...(player.accusationTargetIds??[])].sort(),correct=targets.length===culpritIds.length&&targets.every((id,index)=>id===culpritIds[index]),votedFor=targets.map(id=>game.players.find(candidate=>candidate.id===id)?.character?.name).filter(Boolean).join(", ");return <div key={player.id} className="flex items-center justify-between gap-3 rounded-lg border border-white/10 p-3"><div><p>{player.name}</p><p className="mt-1 text-sm text-slate-500">{choose(language,`named ${votedFor||"no one"}`,`zgjodhi ${votedFor||"askënd"}`)}</p></div><Badge className={correct?"bg-emerald-950 text-emerald-200":"bg-red-950 text-red-200"}>{t(correct?"Exact team":"Wrong or partial team")}</Badge></div>})}</div><Button onClick={leave} className="mt-6 w-full bg-amber-200 text-black"><Users/>{t("Create or join another room")}</Button></CardContent></Card>
      </div>
    </div>
  </Shell>;
}

function RoleCard({role,mode}:{role:Role|null;mode:"casual"|"detective"}){const{language,t}=useLanguage();if(!role)return null;const killerTeamSize=(role.accomplices?.length??0)+1,badge=role.culprit?choose(language,killerTeamSize>1?`YOU ARE ONE OF ${killerTeamSize} KILLERS`:"YOU ARE THE KILLER",killerTeamSize>1?`TI JE NJË NGA ${killerTeamSize} VRASËSIT`:"TI JE VRASËSI"):choose(language,"YOU ARE INNOCENT OF THE MAIN CRIME","TI JE I PAFAJSHËM PËR KRIMIN KRYESOR");if(mode==="casual")return <Card className="case-card casual-role-card mx-auto max-w-3xl"><CardContent><div className="flex flex-wrap items-center justify-between gap-2"><Badge className={role.culprit?"bg-red-950 text-red-200":"bg-emerald-950 text-emerald-200"}>{badge}</Badge><Badge className="border-amber-100/15 bg-amber-100/[.06] text-amber-100">{t("Quick role folder")}</Badge></div><h2 className="mt-5 font-serif text-4xl">{role.characterName}</h2><p className="text-amber-100">{role.job}</p><div className={`mt-5 rounded-xl border p-4 text-sm leading-6 ${role.culprit?"border-red-300/20 bg-red-950/20 text-red-100":"border-emerald-300/15 bg-emerald-950/15 text-emerald-100"}`}>{role.culprit?choose(language,"Bluff with your alibi. Keep every killer safe and prevent a majority from naming the complete team.","Mashtro me alibinë. Mbro çdo vrasës dhe pengo shumicën të emërtojë ekipin e plotë."):choose(language,"You did not commit the murder. Compare the three key clues and help the majority name the complete killer team.","Ti nuk e kreve vrasjen. Krahaso tri provat kryesore dhe ndihmo shumicën të emërtojë ekipin e plotë të vrasësve.")}</div><div className="mt-5 grid gap-3"><QuickRoleSection title={t("Say aloud")} text={`${role.publicInfo} ${role.alibi}`} tone="public"/><QuickRoleSection title={t("Keep private")} text={`${role.secret} ${role.truth}`} tone={role.culprit?"danger":"private"}/><QuickRoleSection title={t("Your mission")} text={`${role.knows} ${role.objective}`} tone="mission"/></div><div className="mt-5 rounded-xl border border-amber-200/15 bg-amber-200/5 p-4 text-sm leading-6 text-slate-300">{t("Do not show this screen to anyone. You may lie about your secrets, but do not contradict facts the app has released.")}</div></CardContent></Card>;return <Card className="case-card mx-auto max-w-3xl"><CardContent><Badge className={role.culprit?"bg-red-950 text-red-200":"bg-emerald-950 text-emerald-200"}>{badge}</Badge><h2 className="mt-5 font-serif text-4xl">{role.characterName}</h2><p className="text-amber-100">{role.job}</p>{role.culprit&&role.ability&&<div className="mt-6 rounded-xl border border-red-400/25 bg-red-950/25 p-4 text-sm leading-6 text-red-100"><strong>{t("Covert advantage")}:</strong> {t("During each of the first three evidence rounds, open the Actions tab. You may investigate normally or secretly create interference. Other phones never reveal which killer caused it.")}</div>}{role.ability&&<div className="mt-6 rounded-xl border border-amber-100/20 bg-amber-100/[.06] p-4"><div className="flex items-center gap-2 text-amber-100"><Zap className="size-4"/><strong>{t("Unique power")} · {role.ability.name}</strong></div><p className="mt-2 text-sm leading-6 text-slate-300">{role.ability.description} {t("Use it from Actions during rounds 1–3.")}</p></div>}<div className="mt-6 grid gap-x-8 md:grid-cols-2"><Info title={t("Public background")} text={role.publicInfo}/><Info title={t("Your secret")} text={role.secret}/><Info title={t("Claimed alibi")} text={role.alibi}/><Info title={t("What really happened")} text={role.truth}/><Info title={t("What you know")} text={role.knows}/><Info title={t("Private objective")} text={role.objective}/></div><div className="mt-6 rounded-xl border border-amber-200/15 bg-amber-200/5 p-4 text-sm leading-6 text-slate-300">{t("Do not show this screen to anyone. You may lie about your secrets, but do not contradict facts the app has released.")}</div></CardContent></Card>}
function QuickRoleSection({title,text,tone}:{title:string;text:string;tone:"public"|"private"|"danger"|"mission"}){const styles={public:"border-blue-300/15 bg-blue-950/15",private:"border-white/10 bg-black/15",danger:"border-red-300/20 bg-red-950/20",mission:"border-amber-200/15 bg-amber-100/[.04]"};return <section className={`rounded-xl border p-4 ${styles[tone]}`}><p className="text-xs uppercase tracking-[.16em] text-amber-100/75">{title}</p><p className="mt-2 leading-7 text-slate-200">{text}</p></section>}
function CaseIntro({game}:{game:GameState}){const{t}=useLanguage();return <Card className="case-card h-fit"><CardContent><p className="label">{t("Location")}</p><p className="mt-2 text-lg capitalize">{game.case?.setting}</p><p className="label mt-6">{t("Victim")}</p><p className="mt-2 text-slate-200">{game.case?.victim}</p><p className="label mt-6">{t("Incident")}</p><p className="mt-2 leading-7 text-slate-300">{game.case?.incident}</p></CardContent></Card>}
function PlayerLine({player,detailed=false,actionsOpen=false}:{player:Player;detailed?:boolean;actionsOpen?:boolean}){const{t}=useLanguage();return <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/15 p-3"><span className="grid size-9 shrink-0 place-items-center rounded-full bg-white/10 font-serif text-amber-100">{player.name.charAt(0).toUpperCase()}</span><div className="min-w-0 flex-1"><p className="flex items-center gap-2 truncate">{player.name}{player.isHost&&<Crown className="size-3.5 text-amber-200"/>}</p>{player.character&&<p className="truncate text-sm text-slate-400">{player.character.name} · {player.character.job}</p>}{!player.character&&detailed&&<p className="text-sm text-slate-500">{t("Role not assigned")}</p>}</div>{actionsOpen&&<div className="flex items-center gap-2"><Badge className={player.actionSubmitted?"bg-emerald-950 text-emerald-200":"bg-white/10 text-slate-400"}>{t(player.actionSubmitted?"Acted":"Thinking")}</Badge>{player.abilityUsed&&<Zap className="size-4 text-amber-200" aria-label={t("Role power used")}/>}</div>}{player.accusationSubmitted&&<Check className="size-4 text-emerald-300"/>}</div>}
function Shell({eyebrow,title,children}:{eyebrow:string;title:string;children:React.ReactNode}){return <section className="mx-auto max-w-6xl px-4 py-8 sm:px-5 sm:py-10"><p className="text-xs uppercase tracking-[.28em] text-amber-200">{eyebrow}</p><h1 className="mb-7 mt-3 font-serif text-4xl sm:text-5xl">{title}</h1>{children}</section>}
function Info({title,text}:{title:string;text:string}){return <div className="mt-5 border-l border-amber-200/30 pl-4"><p className="text-xs uppercase tracking-[.18em] text-slate-500">{title}</p><p className="mt-1 leading-6 text-slate-200">{text}</p></div>}
function ErrorMessage({text}:{text:string}){return <div role="alert" aria-live="polite" className="mt-4 rounded-lg border border-red-400/20 bg-red-950/30 p-3 text-sm text-red-100">{text}</div>}
function ErrorState({error,retry,leave}:{error:string;retry:()=>void;leave:()=>void}){const{t}=useLanguage();return <section className="mx-auto max-w-md px-5 py-20 text-center"><ShieldAlert className="mx-auto size-10 text-red-300"/><h1 className="mt-5 font-serif text-3xl">{t("Connection lost")}</h1><p className="mt-3 text-slate-400">{error||t("This room is unavailable.")}</p><div className="mt-6 flex justify-center gap-3"><Button onClick={retry} className="bg-amber-200 text-black">{t("Try again")}</Button><Button variant="outline" onClick={leave} className="border-white/15 bg-transparent">{t("Leave room")}</Button></div></section>}
