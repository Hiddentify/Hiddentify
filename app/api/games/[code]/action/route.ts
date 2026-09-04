import { getRawDb } from "@/db";
import { authenticate, cleanCode, noStoreHeaders, type PlayerRow } from "@/lib/game-server";
import { generateMystery, investigationActionTypes, killerActionTypes, maxKillerCount, randomRoleOrder, resolvePlayerAction, resolveRoleAbility, votingPhase, type MysteryAbilityId, type MysteryCase, type PlayerActionType } from "@/lib/mystery";

const targetActions:PlayerActionType[]=["interrogate","plant_false_lead","anonymous_tip","forge_alibi","delay_investigation"];
const otherPlayerActions:PlayerActionType[]=["interrogate","plant_false_lead","anonymous_tip","delay_investigation"];
const abilityTypes:MysteryAbilityId[]=["forensic_focus","timeline_anchor","confidant","alibi_audit","credential_trace","evidence_preview","scene_recall","motive_map","pattern_link","witness_check"];
const INVITE_WINDOW_MS=45_000,INTERROGATION_MS=120_000;
function isPlayerActionType(value:unknown):value is PlayerActionType{return typeof value==="string"&&[...investigationActionTypes,...killerActionTypes].includes(value as PlayerActionType)}
function isAbilityType(value:unknown):value is MysteryAbilityId{return typeof value==="string"&&abilityTypes.includes(value as MysteryAbilityId)}
function cleanMessage(value:unknown){return typeof value==="string"?value.trim().replace(/\s+/g," ").slice(0,280):""}

export async function POST(request:Request,{params}:{params:Promise<{code:string}>}){
  try{
    const code=cleanCode((await params).code),token=request.headers.get("x-player-token")??"",auth=await authenticate(code,token);
    if(!auth)return Response.json({error:"Your player session is not valid."},{status:401,headers:noStoreHeaders});
    const body=await request.json() as {action?:string;targetPlayerId?:string;targetPlayerIds?:unknown;killerCount?:unknown;gameMode?:unknown;actionType?:unknown;interrogationId?:string;accepted?:boolean;message?:unknown},db=getRawDb();
    if(body.action==="set_game_mode"){
      if(!auth.player.is_host)return Response.json({error:"Only the host can choose the game mode."},{status:403,headers:noStoreHeaders});
      if(auth.session.status!=="lobby")return Response.json({error:"The game mode cannot change after the case starts."},{status:409,headers:noStoreHeaders});
      if(body.gameMode!=="casual"&&body.gameMode!=="detective")return Response.json({error:"Choose Casual or Detective mode."},{status:400,headers:noStoreHeaders});
      await db.prepare("UPDATE game_sessions SET game_mode=? WHERE id=? AND status='lobby'").bind(body.gameMode,auth.session.id).run();
      return Response.json({ok:true},{headers:noStoreHeaders});
    }
    if(body.action==="set_killer_count"){
      if(!auth.player.is_host)return Response.json({error:"Only the host can choose the number of killers."},{status:403,headers:noStoreHeaders});
      if(auth.session.status!=="lobby")return Response.json({error:"The killer count cannot change after the case starts."},{status:409,headers:noStoreHeaders});
      const countRow=await db.prepare("SELECT COUNT(*) AS total FROM players WHERE session_id=?").bind(auth.session.id).first<{total:number}>(),playerCount=Number(countRow?.total??0),killerCount=Number(body.killerCount);
      if(!Number.isInteger(killerCount)||killerCount<1||killerCount>maxKillerCount(playerCount))return Response.json({error:`Choose between 1 and ${maxKillerCount(playerCount)} killers for this lobby size.`},{status:400,headers:noStoreHeaders});
      await db.prepare("UPDATE game_sessions SET killer_count=? WHERE id=? AND status='lobby'").bind(killerCount,auth.session.id).run();
      return Response.json({ok:true},{headers:noStoreHeaders});
    }
    if(body.action==="start"){
      if(!auth.player.is_host)return Response.json({error:"Only the host can start the case."},{status:403,headers:noStoreHeaders});
      if(auth.session.status!=="lobby")return Response.json({error:"The case has already started."},{status:409,headers:noStoreHeaders});
      const result=await db.prepare("SELECT id,session_id,name,token_hash,is_host,role_index,accusation,created_at FROM players WHERE session_id=? ORDER BY created_at,id").bind(auth.session.id).all<PlayerRow>(),players=result.results??[];
      if(players.length<3)return Response.json({error:"At least three players must join."},{status:409,headers:noStoreHeaders});
      if(auth.session.killer_count>maxKillerCount(players.length))return Response.json({error:"Choose fewer killers for this lobby size."},{status:409,headers:noStoreHeaders});
      const historyResult=await db.prepare("SELECT fingerprint,setting FROM case_history ORDER BY created_at DESC,id DESC LIMIT 60").all<{fingerprint:string;setting:string}>(),history=historyResult.results??[],recentFingerprints=history.map(row=>row.fingerprint),recentSettings=history.map(row=>row.setting);
      const mystery=generateMystery(players.length,auth.session.killer_count,recentFingerprints,recentSettings,auth.session.game_mode),roleOrder=randomRoleOrder(players.length),statements=[db.prepare("UPDATE game_sessions SET status='playing',phase=0,case_json=? WHERE id=? AND status='lobby'").bind(JSON.stringify(mystery),auth.session.id),db.prepare("INSERT INTO case_history (id,fingerprint,setting,method,twist) VALUES (?,?,?,?,?)").bind(crypto.randomUUID(),mystery.fingerprint??crypto.randomUUID(),mystery.setting,mystery.method,mystery.twist),...players.map((p,i)=>db.prepare("UPDATE players SET role_index=?,accusation=NULL WHERE id=?").bind(roleOrder[i],p.id))];
      await db.batch(statements); return Response.json({ok:true},{headers:noStoreHeaders});
    }
    if(body.action==="advance"){
      if(!auth.player.is_host)return Response.json({error:"Only the host can release evidence."},{status:403,headers:noStoreHeaders});
      if(auth.session.status!=="playing")return Response.json({error:"The case is not active."},{status:409,headers:noStoreHeaders});
      const next=Math.min(votingPhase(auth.session.game_mode),auth.session.phase+1);await db.prepare("UPDATE game_sessions SET phase=? WHERE id=?").bind(next,auth.session.id).run();return Response.json({ok:true},{headers:noStoreHeaders});
    }
    if(body.action==="ability"){
      if(auth.session.game_mode==="casual")return Response.json({error:"Role powers are available in Detective mode."},{status:409,headers:noStoreHeaders});
      if(auth.session.status!=="playing"||auth.session.phase<1||auth.session.phase>3)return Response.json({error:"Role abilities are available during evidence rounds 1–3."},{status:409,headers:noStoreHeaders});
      if(auth.player.role_index===null||!auth.session.case_json)return Response.json({error:"Your character has not been assigned."},{status:409,headers:noStoreHeaders});
      const mystery=JSON.parse(auth.session.case_json) as MysteryCase,ownRole=mystery.roles[auth.player.role_index],ability=ownRole.ability;
      if(!ability||!isAbilityType(ability.id))return Response.json({error:"This older case does not include role abilities. Start a new case to use them."},{status:409,headers:noStoreHeaders});
      const existing=await db.prepare("SELECT id FROM ability_uses WHERE session_id=? AND player_id=?").bind(auth.session.id,auth.player.id).first();
      if(existing)return Response.json({error:"You have already used your role ability in this case."},{status:409,headers:noStoreHeaders});
      let targetRoleIndex:number|null=null,targetPlayerId:string|null=null;
      if(ability.needsTarget){
        if(!body.targetPlayerId||body.targetPlayerId===auth.player.id)return Response.json({error:"Choose another player as the target."},{status:400,headers:noStoreHeaders});
        const target=await db.prepare("SELECT id,role_index FROM players WHERE id=? AND session_id=?").bind(body.targetPlayerId,auth.session.id).first<{id:string;role_index:number|null}>();
        if(!target||target.role_index===null)return Response.json({error:"Choose a valid suspect."},{status:400,headers:noStoreHeaders});
        targetRoleIndex=Number(target.role_index);targetPlayerId=target.id;
      }
      const result=resolveRoleAbility(mystery,auth.player.role_index,auth.session.phase,ability.id,targetRoleIndex);
      await db.prepare("INSERT INTO ability_uses (id,session_id,player_id,ability_id,target_player_id,result) VALUES (?,?,?,?,?,?)").bind(crypto.randomUUID(),auth.session.id,auth.player.id,ability.id,targetPlayerId,result).run();
      return Response.json({ok:true},{headers:noStoreHeaders});
    }
    if(body.action==="invite_interrogation"){
      if(auth.session.game_mode==="casual")return Response.json({error:"Private interrogations are available in Detective mode."},{status:409,headers:noStoreHeaders});
      if(auth.session.status!=="playing"||auth.session.phase<1||auth.session.phase>3)return Response.json({error:"Private interrogations can be opened during evidence rounds 1–3."},{status:409,headers:noStoreHeaders});
      if(!body.targetPlayerId||body.targetPlayerId===auth.player.id)return Response.json({error:"Choose another player to interrogate."},{status:400,headers:noStoreHeaders});
      const target=await db.prepare("SELECT id FROM players WHERE id=? AND session_id=?").bind(body.targetPlayerId,auth.session.id).first<{id:string}>();
      if(!target)return Response.json({error:"Choose a valid player."},{status:400,headers:noStoreHeaders});
      const alreadyInvited=await db.prepare("SELECT id FROM interrogations WHERE session_id=? AND initiator_player_id=?").bind(auth.session.id,auth.player.id).first();
      if(alreadyInvited)return Response.json({error:"You have already opened your one private interrogation for this case."},{status:409,headers:noStoreHeaders});
      const now=new Date(),nowIso=now.toISOString();
      const busyChannel=await db.prepare(`SELECT id FROM interrogations WHERE session_id=? AND (initiator_player_id IN (?,?) OR invitee_player_id IN (?,?)) AND ((status='pending' AND invite_expires_at>?) OR (status='active' AND ends_at>?)) LIMIT 1`).bind(auth.session.id,auth.player.id,target.id,auth.player.id,target.id,nowIso,nowIso).first();
      if(busyChannel)return Response.json({error:"One of you is already handling another private interrogation."},{status:409,headers:noStoreHeaders});
      await db.prepare("INSERT INTO interrogations (id,session_id,initiator_player_id,invitee_player_id,status,invite_expires_at) VALUES (?,?,?,?, 'pending',?)").bind(crypto.randomUUID(),auth.session.id,auth.player.id,target.id,new Date(now.getTime()+INVITE_WINDOW_MS).toISOString()).run();
      return Response.json({ok:true},{headers:noStoreHeaders});
    }
    if(body.action==="respond_interrogation"){
      if(auth.session.game_mode==="casual")return Response.json({error:"Private interrogations are available in Detective mode."},{status:409,headers:noStoreHeaders});
      if(auth.session.status!=="playing"||auth.session.phase<1||auth.session.phase>3)return Response.json({error:"This case is no longer accepting interrogation responses."},{status:409,headers:noStoreHeaders});
      const channel=await db.prepare("SELECT id,status,invite_expires_at FROM interrogations WHERE id=? AND session_id=? AND invitee_player_id=?").bind(body.interrogationId??"",auth.session.id,auth.player.id).first<{id:string;status:string;invite_expires_at:string}>();
      if(!channel)return Response.json({error:"That interrogation invitation is unavailable."},{status:404,headers:noStoreHeaders});
      if(channel.status!=="pending"||Date.parse(channel.invite_expires_at)<=Date.now()){
        if(channel.status==="pending")await db.prepare("UPDATE interrogations SET status='expired' WHERE id=? AND status='pending'").bind(channel.id).run();
        return Response.json({error:"That interrogation invitation has expired."},{status:409,headers:noStoreHeaders});
      }
      if(body.accepted===true){
        const endsAt=new Date(Date.now()+INTERROGATION_MS).toISOString();
        await db.prepare("UPDATE interrogations SET status='active',ends_at=? WHERE id=? AND status='pending'").bind(endsAt,channel.id).run();
      }else await db.prepare("UPDATE interrogations SET status='declined' WHERE id=? AND status='pending'").bind(channel.id).run();
      return Response.json({ok:true},{headers:noStoreHeaders});
    }
    if(body.action==="send_interrogation_message"){
      if(auth.session.game_mode==="casual")return Response.json({error:"Private interrogations are available in Detective mode."},{status:409,headers:noStoreHeaders});
      if(auth.session.status!=="playing")return Response.json({error:"This case is no longer accepting private messages."},{status:409,headers:noStoreHeaders});
      const message=cleanMessage(body.message);
      if(!message)return Response.json({error:"Write a message before sending it."},{status:400,headers:noStoreHeaders});
      const channel=await db.prepare("SELECT id,status,ends_at,initiator_player_id,invitee_player_id FROM interrogations WHERE id=? AND session_id=? AND (initiator_player_id=? OR invitee_player_id=?)").bind(body.interrogationId??"",auth.session.id,auth.player.id,auth.player.id).first<{id:string;status:string;ends_at:string|null;initiator_player_id:string;invitee_player_id:string}>();
      if(!channel)return Response.json({error:"That private channel is unavailable."},{status:404,headers:noStoreHeaders});
      if(channel.status!=="active"||!channel.ends_at||Date.parse(channel.ends_at)<=Date.now())return Response.json({error:"This private interrogation has ended."},{status:409,headers:noStoreHeaders});
      const count=await db.prepare("SELECT COUNT(*) AS total FROM interrogation_messages WHERE interrogation_id=?").bind(channel.id).first<{total:number}>();
      if(Number(count?.total??0)>=40)return Response.json({error:"This interrogation has reached its message limit."},{status:409,headers:noStoreHeaders});
      await db.prepare("INSERT INTO interrogation_messages (id,interrogation_id,sender_player_id,body) VALUES (?,?,?,?)").bind(crypto.randomUUID(),channel.id,auth.player.id,message).run();
      return Response.json({ok:true},{headers:noStoreHeaders});
    }
    if(body.action==="investigate"){
      if(auth.session.game_mode==="casual")return Response.json({error:"Private investigation actions are available in Detective mode."},{status:409,headers:noStoreHeaders});
      if(auth.session.status!=="playing"||auth.session.phase<1||auth.session.phase>3)return Response.json({error:"Investigation actions are available during evidence rounds 1–3."},{status:409,headers:noStoreHeaders});
      if(auth.player.role_index===null||!auth.session.case_json)return Response.json({error:"Your character has not been assigned."},{status:409,headers:noStoreHeaders});
      if(!isPlayerActionType(body.actionType))return Response.json({error:"Choose a valid investigation action."},{status:400,headers:noStoreHeaders});
      const mystery=JSON.parse(auth.session.case_json) as MysteryCase,ownRole=mystery.roles[auth.player.role_index],isKillerAction=killerActionTypes.includes(body.actionType);
      if(isKillerAction&&!ownRole.culprit)return Response.json({error:"That covert action is available only to the killer."},{status:403,headers:noStoreHeaders});
      const existing=await db.prepare("SELECT id FROM player_actions WHERE session_id=? AND player_id=? AND phase=?").bind(auth.session.id,auth.player.id,auth.session.phase).first();
      if(existing)return Response.json({error:"You have already used your action for this evidence round."},{status:409,headers:noStoreHeaders});
      let targetRoleIndex:number|null=null;
      if(targetActions.includes(body.actionType)){
        if(!body.targetPlayerId||(otherPlayerActions.includes(body.actionType)&&body.targetPlayerId===auth.player.id))return Response.json({error:"Choose a valid player as the target."},{status:400,headers:noStoreHeaders});
        const target=await db.prepare("SELECT id,role_index FROM players WHERE id=? AND session_id=?").bind(body.targetPlayerId,auth.session.id).first<{id:string;role_index:number|null}>();
        if(!target||target.role_index===null)return Response.json({error:"Choose a valid suspect."},{status:400,headers:noStoreHeaders});
        targetRoleIndex=Number(target.role_index);
      }
      const resolution=resolvePlayerAction(mystery,auth.player.role_index,auth.session.phase,body.actionType,targetRoleIndex);
      await db.prepare("INSERT INTO player_actions (id,session_id,player_id,phase,action_type,target_player_id,result,public_effect) VALUES (?,?,?,?,?,?,?,?)").bind(crypto.randomUUID(),auth.session.id,auth.player.id,auth.session.phase,body.actionType,targetActions.includes(body.actionType)?body.targetPlayerId??null:null,resolution.result,resolution.publicEffect).run();
      return Response.json({ok:true},{headers:noStoreHeaders});
    }
    if(body.action==="accuse"){
      if(auth.session.status!=="playing"||auth.session.phase<votingPhase(auth.session.game_mode))return Response.json({error:"Accusations are not open yet."},{status:409,headers:noStoreHeaders});
      if(!auth.session.case_json)return Response.json({error:"The case file is unavailable."},{status:409,headers:noStoreHeaders});
      const mystery=JSON.parse(auth.session.case_json) as MysteryCase,requiredTargets=mystery.roles.filter(role=>role.culprit).length||1,rawTargets=Array.isArray(body.targetPlayerIds)?body.targetPlayerIds:body.targetPlayerId?[body.targetPlayerId]:[],targetPlayerIds=[...new Set(rawTargets.filter((value):value is string=>typeof value==="string"))].sort();
      if(targetPlayerIds.length!==requiredTargets)return Response.json({error:`Choose exactly ${requiredTargets} ${requiredTargets===1?"suspect":"suspects"}.`},{status:400,headers:noStoreHeaders});
      const playerResult=await db.prepare("SELECT id FROM players WHERE session_id=?").bind(auth.session.id).all<{id:string}>(),validIds=new Set((playerResult.results??[]).map(player=>player.id));
      if(!targetPlayerIds.every(id=>validIds.has(id)))return Response.json({error:"Choose only players from this room."},{status:400,headers:noStoreHeaders});
      await db.prepare("UPDATE players SET accusation=? WHERE id=? AND accusation IS NULL").bind(JSON.stringify(targetPlayerIds),auth.player.id).run();return Response.json({ok:true},{headers:noStoreHeaders});
    }
    if(body.action==="reveal"){
      if(!auth.player.is_host)return Response.json({error:"Only the host can reveal the solution."},{status:403,headers:noStoreHeaders});
      if(auth.session.status!=="playing"||auth.session.phase<votingPhase(auth.session.game_mode))return Response.json({error:"Finish the investigation first."},{status:409,headers:noStoreHeaders});
      const voteRow=await db.prepare("SELECT COUNT(*) AS total, SUM(CASE WHEN accusation IS NOT NULL THEN 1 ELSE 0 END) AS submitted FROM players WHERE session_id=?").bind(auth.session.id).first<{total:number;submitted:number}>();
      if(Number(voteRow?.submitted??0)<Number(voteRow?.total??0))return Response.json({error:"Wait until every player has locked a vote."},{status:409,headers:noStoreHeaders});
      await db.prepare("UPDATE game_sessions SET status='revealed' WHERE id=?").bind(auth.session.id).run();return Response.json({ok:true},{headers:noStoreHeaders});
    }
    return Response.json({error:"Unknown game action."},{status:400,headers:noStoreHeaders});
  }catch(error){console.error(error);return Response.json({error:"That action could not be completed."},{status:500,headers:noStoreHeaders})}
}
