import { getRawDb } from "@/db";
import { resolvePlayerIdentity } from "@/lib/account-auth";
import { cleanCode, hashToken, makeToken, noStoreHeaders } from "@/lib/game-server";
import { gameLanguage } from "@/lib/mystery";

export async function POST(request:Request,{params}:{params:Promise<{code:string}>}){
  const sq=gameLanguage(request.headers.get("x-game-language"))==="sq";
  try{
    const code=cleanCode((await params).code),body=await request.json() as {name?:unknown;asGuest?:unknown},identity=await resolvePlayerIdentity(request,body.name,body.asGuest),name=identity.name,db=getRawDb();
    if(name.length<2)return Response.json({error:sq?"Shkruaj një emër me të paktën 2 shkronja.":"Enter a name with at least 2 characters."},{status:400,headers:noStoreHeaders});
    const session=await db.prepare("SELECT id,status FROM game_sessions WHERE code=?").bind(code).first<{id:string;status:string}>();
    if(!session)return Response.json({error:sq?"Dhoma nuk u gjet. Kontrollo kodin pesëshkronjësh.":"Room not found. Check the five-character code."},{status:404,headers:noStoreHeaders});
    if(identity.accountId){
      const existing=await db.prepare("SELECT id FROM players WHERE session_id=? AND account_id=?").bind(session.id,identity.accountId).first<{id:string}>();
      if(existing){
        const token=makeToken(),tokenHash=await hashToken(token);
        await db.prepare("UPDATE players SET token_hash=?,name=? WHERE id=?").bind(tokenHash,name,existing.id).run();
        return Response.json({code,token},{headers:noStoreHeaders});
      }
    }
    if(session.status!=="lobby")return Response.json({error:sq?"Kjo lojë ka nisur tashmë.":"This game has already started."},{status:409,headers:noStoreHeaders});
    const count=await db.prepare("SELECT COUNT(*) AS total FROM players WHERE session_id=?").bind(session.id).first<{total:number}>();
    if(Number(count?.total??0)>=10)return Response.json({error:sq?"Kjo dhomë ka tashmë dhjetë lojtarë.":"This room already has ten players."},{status:409,headers:noStoreHeaders});
    const duplicate=await db.prepare("SELECT id FROM players WHERE session_id=? AND lower(name)=lower(?)").bind(session.id,name).first();
    if(duplicate)return Response.json({error:sq?"Ky emër po përdoret tashmë në këtë dhomë.":"That name is already being used in this room."},{status:409,headers:noStoreHeaders});
    const playerId=crypto.randomUUID(),token=makeToken(),tokenHash=await hashToken(token);
    await db.prepare("INSERT INTO players (id,session_id,account_id,name,token_hash,is_host) VALUES (?,?,?,?,?,0)").bind(playerId,session.id,identity.accountId,name,tokenHash).run();
    return Response.json({code,token},{status:201,headers:noStoreHeaders});
  }catch(error){console.error(error);return Response.json({error:sq?"Nuk mund të hyje në dhomë. Provo përsëri.":"The room could not be joined. Try again."},{status:500,headers:noStoreHeaders})}
}
