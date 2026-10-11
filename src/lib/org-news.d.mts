export type OrgNewsPost={id:string;title:string;body:string;discordUrl?:string;publishedAt?:string;imageUrl?:string;imageAlt?:string};
export type OrgNewsFeed={mode:'demo'|'live';items:OrgNewsPost[]};
export function parseOrgNews(value:unknown):OrgNewsFeed;
