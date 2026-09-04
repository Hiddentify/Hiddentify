import { accountForRequest } from "@/lib/account-auth";
import { noStoreHeaders } from "@/lib/game-server";

export async function GET(request:Request){
  try{
    const {identity,account}=await accountForRequest(request);
    return Response.json({signedIn:Boolean(identity),identity:identity?{email:identity.email,displayName:identity.displayName}:null,account},{headers:noStoreHeaders});
  }catch(error){
    console.error(error);
    return Response.json({signedIn:false,identity:null,account:null},{headers:noStoreHeaders});
  }
}
