import { getRawDb } from "@/db";
import { cleanName } from "@/lib/game-server";

export type AccountIdentity={id:string;email:string;username:string};
export type PlatformIdentity={id:string;email:string;displayName:string;suggestedUsername:string};
type SupabaseUser={id?:unknown;email?:unknown;user_metadata?:Record<string,unknown>};

export function cleanUsername(value:unknown){
  const username=cleanName(value).replace(/[<>]/g,"");
  return username.length>=2?username:"";
}

export function usernameKey(username:string){return username.normalize("NFKC").toLocaleLowerCase("en-US")}

function supabaseAuthConfig(){
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL?.trim(),key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim()||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if(!url||!key)throw new Error("Supabase authentication is not configured.");
  return{url:url.replace(/\/$/,""),key};
}

export async function platformIdentity(request:Request):Promise<PlatformIdentity|null>{
  const authorization=request.headers.get("authorization")??"";
  if(!authorization.toLowerCase().startsWith("bearer "))return null;
  const token=authorization.slice(7).trim();
  if(!token)return null;
  const{url,key}=supabaseAuthConfig();
  const response=await fetch(`${url}/auth/v1/user`,{headers:{apikey:key,Authorization:`Bearer ${token}`},cache:"no-store"});
  if(!response.ok)return null;
  const user=await response.json() as SupabaseUser,id=typeof user.id==="string"?user.id:"",email=typeof user.email==="string"?user.email.trim().toLowerCase():"";
  if(!id||!email)return null;
  const metadata=user.user_metadata??{},suggestedUsername=cleanUsername(metadata.username),fullName=cleanName(metadata.full_name??metadata.name);
  return{id,email,displayName:fullName||suggestedUsername||email,suggestedUsername};
}

export async function accountForRequest(request:Request){
  const identity=await platformIdentity(request);
  if(!identity)return {identity:null,account:null};
  const row=await getRawDb().prepare("SELECT id,email,username FROM accounts WHERE platform_user_id=?").bind(identity.id).first<AccountIdentity>();
  return {identity,account:row??null};
}

export async function resolvePlayerIdentity(request:Request,suppliedName:unknown,asGuest:unknown){
  if(asGuest!==true){
    const {account}=await accountForRequest(request);
    if(account)return {name:account.username,accountId:account.id};
  }
  return {name:cleanName(suppliedName),accountId:null};
}
