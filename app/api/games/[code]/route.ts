import { getRawDb } from "@/db";
import { authenticate, cleanCode, noStoreHeaders, parseAccusation, type AbilityUseRow, type InterrogationMessageRow, type InterrogationRow, type PlayerActionRow, type PlayerRow } from "@/lib/game-server";
import { gameLanguage, killerActionTypes, localizeMystery, maxKillerCount, resolvePlayerAction, resolveRoleAbility, votingPhase, type GameLanguage, type MysteryAbilityId, type MysteryCase, type PlayerActionType } from "@/lib/mystery";

const actionLabels:Record<GameLanguage,Record<PlayerActionType,string>>={
  en:{search_scene:"Search the scene",analyze_evidence:"Analyze evidence",check_records:"Check records",interrogate:"Probe an alibi",plant_false_lead:"Plant a false trail",anonymous_tip:"Send an anonymous tip",forge_alibi:"Forge an alibi",delay_investigation:"Delay an investigation"},
  sq:{search_scene:"Kontrollo skenën",analyze_evidence:"Analizo provat",check_records:"Kontrollo regjistrat",interrogate:"Kontrollo një alibi",plant_false_lead:"Vendos një gjurmë të rreme",anonymous_tip:"Dërgo një mesazh anonim",forge_alibi:"Falsifiko një alibi",delay_investigation:"Vono një hetim"},
};

export async function GET(request:Request,{params}:{params:Promise<{code:string}>}){
  const language=gameLanguage(request.headers.get("x-game-language"));
  try{
    const code=cleanCode((await params).code),token=request.headers.get("x-player-token")??"",auth=await authenticate(code,token);
    if(!auth)return Response.json({error:language==="sq"?"Sesioni yt i lojtarit nuk është i vlefshëm.":"Your player session is not valid."},{status:401,headers:noStoreHeaders});
    const db=getRawDb();
    const result=await db.prepare("SELECT id,session_id,name,token_hash,is_host,role_index,accusation,created_at FROM players WHERE session_id=? ORDER BY created_at,id").bind(auth.session.id).all<PlayerRow>();
    const rows=result.results??[];
    const sourceMystery=auth.session.case_json?JSON.parse(auth.session.case_json) as MysteryCase:null;
    const mystery=sourceMystery?localizeMystery(sourceMystery,language):null;
    const mode=sourceMystery?.mode??auth.session.game_mode;
    const actionResult=auth.session.status==="lobby"?{results:[] as PlayerActionRow[]}:await db.prepare("SELECT id,session_id,player_id,phase,action_type,target_player_id,result,public_effect,created_at FROM player_actions WHERE session_id=? ORDER BY phase,created_at,id").bind(auth.session.id).all<PlayerActionRow>();
    const actions=actionResult.results??[],currentActions=actions.filter(action=>Number(action.phase)===auth.session.phase);
    const abilityResult=auth.session.status==="lobby"?{results:[] as AbilityUseRow[]}:await db.prepare("SELECT id,session_id,player_id,ability_id,target_player_id,result,created_at FROM ability_uses WHERE session_id=? ORDER BY created_at,id").bind(auth.session.id).all<AbilityUseRow>();
    const abilityUses=abilityResult.results??[];
    const interrogationResult=auth.session.status==="lobby"?{results:[] as InterrogationRow[]}:await db.prepare("SELECT id,session_id,initiator_player_id,invitee_player_id,status,invite_expires_at,ends_at,created_at FROM interrogations WHERE session_id=? AND (initiator_player_id=? OR invitee_player_id=?) ORDER BY created_at,id").bind(auth.session.id,auth.player.id,auth.player.id).all<InterrogationRow>();
    const interrogationRows=interrogationResult.results??[];
    const messageResult=auth.session.status==="lobby"?{results:[] as InterrogationMessageRow[]}:await db.prepare(`SELECT m.id,m.interrogation_id,m.sender_player_id,m.body,m.created_at FROM interrogation_messages m JOIN interrogations i ON i.id=m.interrogation_id WHERE i.session_id=? AND (i.initiator_player_id=? OR i.invitee_player_id=?) ORDER BY m.created_at,m.id`).bind(auth.session.id,auth.player.id,auth.player.id).all<InterrogationMessageRow>();
    const messageRows=messageResult.results??[];
    const roleIndexFor=(playerId:string|null)=>rows.find(row=>row.id===playerId)?.role_index??null;
    const targetCharacter=(playerId:string|null)=>{const roleIndex=roleIndexFor(playerId);return mystery&&roleIndex!==null?mystery.roles[roleIndex]?.characterName??null:null};
    const players=rows.map(player=>{
      const accusationTargetIds=auth.session.status==="revealed"?parseAccusation(player.accusation):null;
      return{id:player.id,name:player.name,isHost:Boolean(player.is_host),character:mystery&&player.role_index!==null?{name:mystery.roles[player.role_index].characterName,job:mystery.roles[player.role_index].job}:null,actionSubmitted:mode==="detective"&&currentActions.some(action=>action.player_id===player.id),abilityUsed:mode==="detective"&&abilityUses.some(use=>use.player_id===player.id),accusationSubmitted:Boolean(player.accusation),accusationTargetIds,accusationTargetId:accusationTargetIds?.[0]??null};
    });
    const ownRole=mystery&&auth.player.role_index!==null?mystery.roles[auth.player.role_index]:null;
    const resolveAction=(action:PlayerActionRow)=>{
      if(!mystery)return{result:action.result,publicEffect:action.public_effect};
      const actorRoleIndex=roleIndexFor(action.player_id),targetRoleIndex=roleIndexFor(action.target_player_id);
      if(actorRoleIndex===null)return{result:action.result,publicEffect:action.public_effect};
      return resolvePlayerAction(mystery,actorRoleIndex,Number(action.phase),action.action_type as PlayerActionType,targetRoleIndex,language);
    };
    const ownActions=actions.filter(action=>action.player_id===auth.player.id).map(action=>{
      const actionType=action.action_type as PlayerActionType,delayed=Number(action.phase)===auth.session.phase&&actions.some(other=>Number(other.phase)===Number(action.phase)&&other.action_type==="delay_investigation"&&other.target_player_id===auth.player.id),resolution=resolveAction(action);
      return{phase:Number(action.phase),type:actionType,label:actionLabels[language][actionType]??(language==="sq"?"Veprim privat":"Private action"),result:delayed?(language==="sq"?"Hetimi yt u përgjua. Rezultati do të hapet kur të publikohet pakoja tjetër e provave.":"Your investigation was intercepted. The result will unlock when the next evidence packet opens."):resolution.result,delayed,targetCharacter:targetCharacter(action.target_player_id),covert:killerActionTypes.includes(actionType)};
    });
    const ownAbilityUse=abilityUses.find(use=>use.player_id===auth.player.id);
    let abilityResultText=ownAbilityUse?.result??"";
    if(ownAbilityUse&&mystery&&auth.player.role_index!==null)abilityResultText=resolveRoleAbility(mystery,auth.player.role_index,Math.max(1,auth.session.phase),ownAbilityUse.ability_id as MysteryAbilityId,roleIndexFor(ownAbilityUse.target_player_id),language);
    const now=Date.now();
    const interrogations=interrogationRows.map(channel=>{
      const status=channel.status==="pending"&&Date.parse(channel.invite_expires_at)<=now?"expired":channel.status==="active"&&(!channel.ends_at||Date.parse(channel.ends_at)<=now)?"expired":channel.status;
      const partnerId=channel.initiator_player_id===auth.player.id?channel.invitee_player_id:channel.initiator_player_id,partner=rows.find(row=>row.id===partnerId);
      return{id:channel.id,status,isInitiator:channel.initiator_player_id===auth.player.id,partner:{id:partnerId,name:partner?.name??(language==="sq"?"Lojtar i panjohur":"Unknown player"),character:targetCharacter(partnerId)},inviteExpiresAt:channel.invite_expires_at,endsAt:channel.ends_at,createdAt:channel.created_at,messages:messageRows.filter(message=>message.interrogation_id===channel.id).map(message=>({id:message.id,senderPlayerId:message.sender_player_id,senderName:rows.find(row=>row.id===message.sender_player_id)?.name??(language==="sq"?"Lojtar":"Player"),isMine:message.sender_player_id===auth.player.id,body:message.body,createdAt:message.created_at}))};
    });
    const publicEvents=actions.filter(action=>Boolean(action.public_effect)).map(action=>({phase:Number(action.phase),text:String(resolveAction(action).publicEffect??action.public_effect)}));
    const culpritIndices=mystery?.roles.flatMap((role,index)=>role.culprit?[index]:[])??[],culpritPlayers=culpritIndices.map(index=>rows.find(player=>player.role_index===index)).filter((player):player is PlayerRow=>Boolean(player)),culpritPlayerIds=culpritPlayers.map(player=>player.id).sort(),killerCount=culpritIndices.length||auth.session.killer_count;
    const totalVotes=rows.length;
    const correctBallots=rows.filter(player=>{const targets=parseAccusation(player.accusation);return targets.length===culpritPlayerIds.length&&targets.every((id,index)=>id===culpritPlayerIds[index])}).length;
    const requiredVotes=Math.floor(totalVotes/2)+1,detectivesWin=correctBallots>=requiredVotes;
    const solution=auth.session.status==="revealed"&&mystery?{culprits:culpritIndices.map((roleIndex,index)=>({playerId:culpritPlayers[index]?.id??"",playerName:culpritPlayers[index]?.name??(language==="sq"?"Lojtar i panjohur":"Unknown player"),character:mystery.roles[roleIndex].characterName})),motive:mystery.motive,method:mystery.method,twist:mystery.twist,timeline:mystery.timeline,inspiration:mystery.inspiration??null,detectivesWin,correctBallots,totalVotes,requiredVotes}:null;
    return Response.json({
      room:{code:auth.session.code,status:auth.session.status,phase:auth.session.phase,killerCount,maxKillers:maxKillerCount(rows.length),mode,votingPhase:votingPhase(mode),evidencePackets:mystery?.evidence.length??votingPhase(mode)},
      me:{id:auth.player.id,name:auth.player.name,isHost:Boolean(auth.player.is_host),role:ownRole,accusation:auth.player.accusation,accusationSubmitted:Boolean(auth.player.accusation),actions:ownActions,currentAction:ownActions.find(action=>action.phase===auth.session.phase)??null,abilityUse:ownAbilityUse?{abilityId:ownAbilityUse.ability_id,result:abilityResultText,targetCharacter:targetCharacter(ownAbilityUse.target_player_id),createdAt:ownAbilityUse.created_at}:null,interrogationUsed:interrogationRows.some(channel=>channel.initiator_player_id===auth.player.id)},
      players,interrogations,case:mystery?{title:mystery.title,setting:mystery.setting,victim:mystery.victim,incident:mystery.incident,evidence:mystery.evidence.slice(0,auth.session.phase)}:null,
      roundActions:{submitted:mode==="detective"?currentActions.length:0,total:mode==="detective"?rows.length:0},publicEvents,solution,allSubmitted:rows.length>=3&&rows.every(player=>Boolean(player.accusation)),
    },{headers:noStoreHeaders});
  }catch(error){
    console.error(error);
    return Response.json({error:language==="sq"?"Dhoma nuk mund të sinkronizohej.":"The room could not be synchronized."},{status:500,headers:noStoreHeaders});
  }
}
