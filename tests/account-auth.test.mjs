import assert from "node:assert/strict";
import path from "node:path";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const root=fileURLToPath(new URL("..",import.meta.url));
const vite=await createServer({appType:"custom",configFile:false,root,resolve:{alias:{"@":root,"cloudflare:workers":path.join(root,"tests/cloudflare-workers-stub.mjs")}},server:{middlewareMode:true,hmr:false}});
const {cleanUsername,platformIdentity,usernameKey}=await vite.ssrLoadModule("/lib/account-auth.ts");

after(async()=>{await vite.close()});

test("reads the platform identity without trusting client profile fields",()=>{
  const request=new Request("https://hiddentify.space/api/auth/me",{headers:{
    "oai-authenticated-user-id":"user-123",
    "oai-authenticated-user-email":"PLAYER@EXAMPLE.COM",
    "oai-authenticated-user-full-name":encodeURIComponent("Player One"),
    "oai-authenticated-user-full-name-encoding":"percent-encoded-utf-8",
  }});
  assert.deepEqual(platformIdentity(request),{id:"user-123",email:"player@example.com",displayName:"Player One"});
  assert.equal(platformIdentity(new Request("https://hiddentify.space")),null);
});

test("normalizes usernames for room-safe uniqueness",()=>{
  assert.equal(cleanUsername("  Night   Owl  "),"Night Owl");
  assert.equal(cleanUsername("<>"),"");
  assert.equal(usernameKey("NIGHT OWL"),usernameKey("night owl"));
});
