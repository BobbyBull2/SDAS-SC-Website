// Preview-only SDAS Issue Council role verification.
// Verifies Discord OAuth token against the actual member guild and saves the
// same trusted membership mapping used by SDFM. No fleet or live site changes.
import {createClient} from "npm:@supabase/supabase-js@2";
const originAllowlist=new Set(["https://issue-council-review.sdas-sc-website.pages.dev","http://localhost:5173","http://127.0.0.1:5173"]);
const guildId="1518410019249459236";
function respond(status:number,data:unknown,origin:string){
 return new Response(JSON.stringify(data),{status,headers:{
  "Content-Type":"application/json","Cache-Control":"no-store",
  "Access-Control-Allow-Origin":originAllowlist.has(origin)?origin:"https://issue-council-review.sdas-sc-website.pages.dev",
  "Access-Control-Allow-Methods":"POST, OPTIONS",
  "Access-Control-Allow-Headers":"authorization, apikey, content-type","Vary":"Origin"
 }});
}
Deno.serve(async(request:Request)=>{
 const origin=request.headers.get("origin")||"";
 if(request.method==="OPTIONS")return respond(originAllowlist.has(origin)?204:403,{},origin);
 if(request.method!=="POST")return respond(405,{error:"Method not allowed."},origin);
 if(!originAllowlist.has(origin))return respond(403,{error:"Preview origin is not allowed."},origin);
 try{
  const bearer=request.headers.get("Authorization")?.replace(/^Bearer\s+/i,"");
  if(!bearer)return respond(401,{error:"Sign in with Discord first."},origin);
  const url=Deno.env.get("SUPABASE_URL"),serviceKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if(!url||!serviceKey)return respond(503,{error:"SDAS verification service is unavailable."},origin);
  const admin=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:{user},error:userError}=await admin.auth.getUser(bearer);
  if(userError||!user)return respond(401,{error:"Your login has expired. Reconnect Discord."},origin);
  const identity=user.identities?.find(i=>i.provider==="discord");
  if(!identity)return respond(403,{error:"Discord sign-in is required."},origin);
  const input=await request.json().catch(()=>({}));
  const token=input?.provider_token;
  if(typeof token!=="string"||token.length<20)return respond(400,{error:"Reconnect Discord to grant guild membership permission."},origin);
  const headers={Authorization:"Bearer "+token};
  const who=await fetch("https://discord.com/api/v10/users/@me",{headers});
  if(!who.ok)return respond(401,{error:"Discord authorization expired. Reconnect Discord."},origin);
  const discordUser=await who.json();
  if(String(discordUser.id)!==String(identity.id))return respond(403,{error:"Discord identity does not match session."},origin);
  const guild=await fetch("https://discord.com/api/v10/users/@me/guilds/"+guildId+"/member",{headers});
  if(!guild.ok)return respond(403,{error:guild.status===404?"You are not an SDAS Discord guild member.":"Unable to confirm SDAS Discord roles. Reconnect Discord."},origin);
  const membership=await guild.json();
  const discordRoles=new Set(Array.isArray(membership?.roles)?membership.roles.map(String):[]);
  const {data:config,error:configError}=await admin.from("sdas_role_config")
    .select("super_admin_role_id,board_member_role_id,patch_role_id,prospect_role_id")
    .eq("singleton",true).single();
  if(configError||!config)return respond(503,{error:"SDAS Discord role configuration is unavailable."},origin);
  const mappings=[
   ["admin","super_admin","super_admin_role_id"],
   ["officer","board_member","board_member_role_id"],
   ["member","patch","patch_role_id"],
   ["prospect","prospect","prospect_role_id"]
  ] as const;
  const recognized=mappings.find(([, , configName])=>config[configName]&&discordRoles.has(String(config[configName])));
  if(!recognized)return respond(403,{error:"Access requires an SDAS Patch, Board Member, Super Admin or Prospect role."},origin);
  const [role,rank]=recognized;
  const name=String(user.user_metadata?.full_name||user.user_metadata?.name||"Pilot").slice(0,80);
  const {error:profileError}=await admin.from("pilot_profiles").upsert({user_id:user.id,display_name:name},{onConflict:"user_id",ignoreDuplicates:true});
  if(profileError)return respond(503,{error:"Unable to verify pilot profile."},origin);
  const checked=new Date().toISOString();
  const {error:saveError}=await admin.from("sdas_memberships").upsert({
   user_id:user.id,role,discord_rank:rank,verified_at:checked,last_role_checked_at:checked
  },{onConflict:"user_id"});
  if(saveError)return respond(503,{error:"Unable to save verified Discord membership."},origin);
  return respond(200,{verified:true,role,discord_rank:rank,can_submit:role!=="prospect"},origin);
 }catch{return respond(503,{error:"Discord verification temporarily unavailable."},origin)}
});
