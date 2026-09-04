import { getRawDb } from "@/db";

export type GameMode="casual"|"detective";
export type SessionRow={id:string;code:string;status:string;phase:number;case_json:string|null;killer_count:number;game_mode:GameMode;host_player_id:string|null;created_at:string};
export type PlayerRow={id:string;session_id:string;name:string;token_hash:string;is_host:number;role_index:number|null;accusation:string|null;created_at:string};
export type PlayerActionRow={id:string;session_id:string;player_id:string;phase:number;action_type:string;target_player_id:string|null;result:string;public_effect:string|null;created_at:string};
export type AbilityUseRow={id:string;session_id:string;player_id:string;ability_id:string;target_player_id:string|null;result:string;created_at:string};
export type InterrogationRow={id:string;session_id:string;initiator_player_id:string;invitee_player_id:string;status:string;invite_expires_at:string;ends_at:string|null;created_at:string};
export type InterrogationMessageRow={id:string;interrogation_id:string;sender_player_id:string;body:string;created_at:string};

export async function hashToken(token:string){const bytes=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(token));return [...new Uint8Array(bytes)].map(x=>x.toString(16).padStart(2,"0")).join("")}
export function cleanName(value:unknown){return typeof value==="string"?value.trim().replace(/\s+/g," ").slice(0,24):""}
export function cleanCode(value:string){return value.toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,5)}
export function makeToken(){return `${crypto.randomUUID()}${crypto.randomUUID()}`.replaceAll("-","")}
export function parseAccusation(value:string|null){
  if(!value)return [];
  try{
    const parsed=JSON.parse(value) as unknown;
    if(Array.isArray(parsed))return [...new Set(parsed.filter((item):item is string=>typeof item==="string"))].sort();
  }catch{}
  return [value];
}
export async function uniqueCode(){const db=getRawDb(),chars="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";for(let tries=0;tries<12;tries++){let code="";for(let i=0;i<5;i++)code+=chars[Math.floor(Math.random()*chars.length)];const found=await db.prepare("SELECT id FROM game_sessions WHERE code = ?").bind(code).first();if(!found)return code}throw new Error("Could not create a unique room code.")}
export async function authenticate(code:string,token:string){const db=getRawDb(),tokenHash=await hashToken(token);const row=await db.prepare(`SELECT s.id,s.code,s.status,s.phase,s.case_json,s.killer_count,s.game_mode,s.host_player_id,s.created_at,p.id AS p_id,p.session_id,p.name,p.token_hash,p.is_host,p.role_index,p.accusation,p.created_at AS p_created_at FROM game_sessions s JOIN players p ON p.session_id=s.id WHERE s.code=? AND p.token_hash=?`).bind(cleanCode(code),tokenHash).first<Record<string,unknown>>();if(!row)return null;const session:SessionRow={id:String(row.id),code:String(row.code),status:String(row.status),phase:Number(row.phase),case_json:row.case_json?String(row.case_json):null,killer_count:Number(row.killer_count??1),game_mode:row.game_mode==="casual"?"casual":"detective",host_player_id:row.host_player_id?String(row.host_player_id):null,created_at:String(row.created_at)};const player:PlayerRow={id:String(row.p_id),session_id:String(row.session_id),name:String(row.name),token_hash:String(row.token_hash),is_host:Number(row.is_host),role_index:row.role_index===null?null:Number(row.role_index),accusation:row.accusation?String(row.accusation):null,created_at:String(row.p_created_at)};return{session,player}}
export const noStoreHeaders={"Cache-Control":"no-store, max-age=0"};
