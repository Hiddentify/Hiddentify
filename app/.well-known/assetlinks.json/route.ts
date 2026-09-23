const fingerprintPattern=/^([0-9A-F]{2}:){31}[0-9A-F]{2}$/;

export function GET(){
  const fingerprints=(process.env.ANDROID_APP_SHA256_FINGERPRINT??"")
    .split(",")
    .map(value=>value.trim().toUpperCase())
    .filter(value=>fingerprintPattern.test(value));

  if(fingerprints.length===0){
    return Response.json({error:"Android app verification is not configured."},{
      status:404,
      headers:{"Cache-Control":"no-store"},
    });
  }

  return Response.json([{
    relation:["delegate_permission/common.handle_all_urls"],
    target:{
      namespace:"android_app",
      package_name:"space.hiddentify.app",
      sha256_cert_fingerprints:fingerprints,
    },
  }],{
    headers:{
      "Cache-Control":"public, max-age=3600, s-maxage=3600",
      "Content-Type":"application/json",
    },
  });
}
