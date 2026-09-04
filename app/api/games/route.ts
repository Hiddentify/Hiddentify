import { getRawDb } from "@/db";
import { resolvePlayerIdentity } from "@/lib/account-auth";
import { hashToken, makeToken, noStoreHeaders, uniqueCode } from "@/lib/game-server";
import { gameLanguage } from "@/lib/mystery";

export async function POST(request:Request){
  const sq=gameLanguage(request.headers.get("x-game-language"))==="sq";
  try{
    const body=await request.json() as {name?:unknown;asGuest?:unknown},identity=await resolvePlayerIdentity(request,body.name,body.asGuest),name=identity.name;
    if(name.length<2)return Response.json({error:sq?"Shkruaj një emër me të paktën 2 shkronja.":"Enter a name with at least 2 characters."},{status:400,headers:noStoreHeaders});
    const db=getRawDb(),sessionId=crypto.randomUUID(),playerId=crypto.randomUUID(),code=await uniqueCode(),token=makeToken(),tokenHash=await hashToken(token);
    await db.batch([
      db.prepare("INSERT INTO game_sessions (id,code,status,phase,host_player_id) VALUES (?,?, 'lobby',0,?)").bind(sessionId,code,playerId),
      db.prepare("INSERT INTO players (id,session_id,account_id,name,token_hash,is_host) VALUES (?,?,?,?,?,1)").bind(playerId,sessionId,identity.accountId,name,tokenHash),
    ]);
    return Response.json({code,token},{status:201,headers:noStoreHeaders});
  }catch(error){console.error(error);return Response.json({error:sq?"Dhoma nuk mund të krijohej. Provo përsëri.":"The room could not be created. Try again."},{status:500,headers:noStoreHeaders})}
}
