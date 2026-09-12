import assert from "node:assert/strict";
import path from "node:path";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const root=fileURLToPath(new URL("..",import.meta.url));
const vite=await createServer({appType:"custom",configFile:false,root,resolve:{alias:{"@":root,"cloudflare:workers":path.join(root,"tests/cloudflare-workers-stub.mjs")}},server:{middlewareMode:true,hmr:false}});
const {cleanUsername,platformIdentity,usernameKey}=await vite.ssrLoadModule("/lib/account-auth.ts");

after(async()=>{await vite.close()});

test("verifies Supabase bearer tokens without trusting client profile fields",async()=>{
  process.env.NEXT_PUBLIC_SUPABASE_URL="https://project.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="publishable-test-key";
  const originalFetch=globalThis.fetch;
  globalThis.fetch=async(url,options)=>{
    assert.equal(url,"https://project.supabase.co/auth/v1/user");
    assert.equal(options.headers.apikey,"publishable-test-key");
    assert.equal(options.headers.Authorization,"Bearer verified-token");
    return Response.json({id:"user-123",email:"PLAYER@EXAMPLE.COM",user_metadata:{full_name:"Player One",username:"Night Owl"}});
  };
  try{
    const request=new Request("https://hiddentify.space/api/auth/me",{headers:{authorization:"Bearer verified-token"}});
    assert.deepEqual(await platformIdentity(request),{id:"user-123",email:"player@example.com",displayName:"Player One",suggestedUsername:"Night Owl"});
    assert.equal(await platformIdentity(new Request("https://hiddentify.space")),null);
  }finally{globalThis.fetch=originalFetch}
});

test("normalizes usernames for room-safe uniqueness",()=>{
  assert.equal(cleanUsername("  Night   Owl  "),"Night Owl");
  assert.equal(cleanUsername("<>"),"");
  assert.equal(usernameKey("NIGHT OWL"),usernameKey("night owl"));
});
