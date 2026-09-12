import { getRawDb } from "@/db";
import { platformIdentity, type AccountIdentity } from "@/lib/account-auth";
import { noStoreHeaders } from "@/lib/game-server";
import { logServerError } from "@/lib/server-log";

export async function GET(request:Request){
  try{
    const identity=await platformIdentity(request);
    if(!identity)return Response.json({signedIn:false,identity:null,account:null,accountService:true},{headers:noStoreHeaders});
    let account:AccountIdentity|null=null,accountService=true;
    try{
      account=await getRawDb().prepare("SELECT id,email,username FROM accounts WHERE platform_user_id=?").bind(identity.id).first<AccountIdentity>();
    }catch(error){
      accountService=false;
      logServerError("account_database_lookup_failed",error,request);
    }
    return Response.json({signedIn:true,identity:{email:identity.email,displayName:identity.displayName,suggestedUsername:identity.suggestedUsername},account,accountService},{headers:noStoreHeaders});
  }catch(error){
    logServerError("account_session_lookup_failed",error,request);
    return Response.json({error:"Account service is temporarily unavailable."},{status:503,headers:noStoreHeaders});
  }
}
