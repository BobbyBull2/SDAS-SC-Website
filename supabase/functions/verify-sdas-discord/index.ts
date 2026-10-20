import { createClient } from "npm:@supabase/supabase-js@2";
const allowedOrigins=new Set(["https://fleet-terminal-review.sdas-sc-website.pages.dev","https://sdas.space"]);
const guildId="1518410019249459236";
function reply(status:number,payload:unknown,origin:string){
 return new Response(JSON.stringify(payload),{status,headers:{
  "Content-Type":"application/json",
  "Access-Control-Allow-Origin":allowedOrigins.has(origin)?origin:"https://fleet-terminal-review.sdas-sc-website.pages.dev",
  "Access-Control-Allow-Headers":"authorization, apikey, content-type",
  "Access-Control-Allow-Methods":"POST, OPTIONS",
  "Cache-Control":"no-store",
  "Vary":"Origin"
 }});
}
Deno.serve(async(req:Request)=>{
 const origin=req.headers.get("origin")||"";
 if(req.method==="OPTIONS")return reply(200,{},origin);
 if(req.method!=="POST")return reply(405,{error:"Method not allowed"},origin);
 if(!allowedOrigins.has(origin))return reply(403,{error:"Origin not allowed"},origin);
 try{
  const accessToken=req.headers.get("Authorization")?.replace(/^Bearer\s+/i,"");
  if(!accessToken)return reply(401,{error:"Login required"},origin);
  const url=Deno.env.get("SUPABASE_URL"),service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if(!url||!service)return reply(503,{error:"Verification service is not configured"},origin);
  const db=createClient(url,service,{auth:{autoRefreshToken:false,persistSession:false}});
  const {data:{user},error:userError}=await db.auth.getUser(accessToken);
  if(userError||!user)return reply(401,{error:"Invalid login session"},origin);
  const discordIdentity=user.identities?.find(i=>i.provider==="discord");
  if(!discordIdentity)return reply(403,{error:"Discord sign-in required"},origin);

  const payload=await req.json().catch(()=>({}));
  const providerToken=payload?.provider_token;
  if(typeof providerToken!=="string"||providerToken.length<20)
   return reply(400,{error:"Discord authorization missing. Sign out, then sign in again to grant role access."},origin);
  const headers={Authorization:"Bearer "+providerToken};
  const discordMeRes=await fetch("https://discord.com/api/v10/users/@me",{headers});
  if(!discordMeRes.ok)return reply(401,{error:"Discord authorization expired. Please sign in again."},origin);
  const discordMe=await discordMeRes.json();
  if(String(discordIdentity.id)!==String(discordMe.id))
   return reply(403,{error:"Discord identity does not match the logged-in pilot"},origin);

  const {data:config,error:configError}=await db.from("sdas_role_config")
    .select("super_admin_role_id,board_member_role_id,patch_role_id,enforce_roles")
    .eq("singleton",true).single();
  if(configError||!config)return reply(503,{error:"Role configuration unavailable"},origin);
  const mappingReady=Boolean(config.super_admin_role_id&&config.board_member_role_id&&config.patch_role_id);
  let discordMember=false;
  let mappedRole:null|"admin"|"officer"|"member"=null;
  let roleCheckAvailable=false;
  // Request the server-scoped member object to read authoritative Discord role IDs.
  const memberRes=await fetch("https://discord.com/api/v10/users/@me/guilds/"+guildId+"/member",{headers});
  if(memberRes.ok){
   const member=await memberRes.json();
   const roles=Array.isArray(member?.roles)?member.roles.map(String):[];
   discordMember=true;roleCheckAvailable=true;
   if(config.super_admin_role_id&&roles.includes(config.super_admin_role_id))mappedRole="admin";
   else if(config.board_member_role_id&&roles.includes(config.board_member_role_id))mappedRole="officer";
   else if(config.patch_role_id&&roles.includes(config.patch_role_id))mappedRole="member";
  }else if(config.enforce_roles){
   // 403 can mean missing OAuth scope; 404 means not in the guild.
   if(memberRes.status===404){
    await db.from("sdas_memberships").delete().eq("user_id",user.id);
    return reply(403,{verified:false,restricted:true,error:"This Discord account is not an SDAS server member"},origin);
   }
   return reply(403,{verified:false,restricted:true,
    error:"Unable to read SDAS roles. Sign out and sign back in with the Discord role permission."},origin);
  }else{
   // Transitional fallback until Fox's role IDs are configured.
   const guildsRes=await fetch("https://discord.com/api/v10/users/@me/guilds",{headers});
   if(!guildsRes.ok)return reply(403,{error:"Discord server lookup failed. Please reconnect Discord."},origin);
   const guilds=await guildsRes.json();
   discordMember=Array.isArray(guilds)&&guilds.some(g=>String(g?.id)===guildId);
  }
  if(!discordMember){
   await db.from("sdas_memberships").delete().eq("user_id",user.id);
   return reply(403,{verified:false,restricted:true,error:"This Discord account is not an SDAS server member"},origin);
  }
  if(config.enforce_roles&&!mappedRole){
   await db.from("sdas_memberships").delete().eq("user_id",user.id);
   return reply(403,{verified:false,restricted:true,error:"Fleet Terminal access is restricted to SDAS Patch, Board Member, or Super Admin roles."},origin);
  }
  // Do not overwrite names chosen by pilots in the profile editor.
  const name=String(user.user_metadata?.full_name||user.user_metadata?.name||"Pilot").slice(0,80);
  const {error:profileError}=await db.from("pilot_profiles")
   .upsert({user_id:user.id,display_name:name},{onConflict:"user_id",ignoreDuplicates:true});
  if(profileError)return reply(503,{error:"Unable to ensure pilot profile"},origin);
  const {data:existing,error:readError}=await db.from("sdas_memberships").select("role").eq("user_id",user.id).maybeSingle();
  if(readError)return reply(503,{error:"Could not read membership"},origin);
  const role=config.enforce_roles?mappedRole:(existing?.role||"member");
  const {error:saveError}=await db.from("sdas_memberships").upsert({
   user_id:user.id,role,
   verified_at:new Date().toISOString(),
   last_role_checked_at:roleCheckAvailable?new Date().toISOString():null
  },{onConflict:"user_id"});
  if(saveError)return reply(503,{error:"Could not save verified membership"},origin);
  return reply(200,{verified:true,role,role_enforced:config.enforce_roles,
   role_mapping_ready:mappingReady,roles_checked:roleCheckAvailable},origin);
 }catch(e){return reply(503,{error:"Discord role verification temporarily unavailable"},origin)}
});
