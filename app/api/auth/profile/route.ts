import { getRawDb } from "@/db";
import { cleanUsername, platformIdentity, usernameKey } from "@/lib/account-auth";
import { noStoreHeaders } from "@/lib/game-server";
import { gameLanguage } from "@/lib/mystery";

export async function POST(request:Request){
  const sq=gameLanguage(request.headers.get("x-game-language"))==="sq",identity=await platformIdentity(request);
  if(!identity)return Response.json({error:sq?"Hyr në llogari para se të zgjedhësh username-in.":"Sign in before choosing your username."},{status:401,headers:noStoreHeaders});
  try{
    const body=await request.json() as {username?:unknown},username=cleanUsername(body.username);
    if(!username)return Response.json({error:sq?"Username-i duhet të ketë 2–24 karaktere.":"Username must contain 2–24 characters."},{status:400,headers:noStoreHeaders});
    const db=getRawDb(),key=usernameKey(username),duplicate=await db.prepare("SELECT id FROM accounts WHERE username_key=? AND platform_user_id<>?").bind(key,identity.id).first();
    if(duplicate)return Response.json({error:sq?"Ky username është marrë tashmë.":"This username is already taken."},{status:409,headers:noStoreHeaders});
    const existing=await db.prepare("SELECT id FROM accounts WHERE platform_user_id=?").bind(identity.id).first<{id:string}>(),id=existing?.id??crypto.randomUUID();
    await db.prepare(`INSERT INTO accounts (id,platform_user_id,email,username,username_key) VALUES (?,?,?,?,?) ON CONFLICT(platform_user_id) DO UPDATE SET email=excluded.email,username=excluded.username,username_key=excluded.username_key,updated_at=CURRENT_TIMESTAMP`).bind(id,identity.id,identity.email,username,key).run();
    return Response.json({account:{id,email:identity.email,username}},{headers:noStoreHeaders});
  }catch(error){
    console.error(error);
    const message=String(error);
    if(message.includes("UNIQUE constraint failed"))return Response.json({error:sq?"Ky email ose username po përdoret tashmë.":"That email or username is already in use."},{status:409,headers:noStoreHeaders});
    return Response.json({error:sq?"Profili nuk mund të ruhej. Provo përsëri.":"The profile could not be saved. Try again."},{status:500,headers:noStoreHeaders});
  }
}
