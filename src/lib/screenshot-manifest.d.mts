export type Screenshot = { id:string; file:string; sha256:string; width:number; height:number; approval:'provisional'|'officer-verified'|'reaction-approved'; verifiedApproverIds:string[] };
export type ScreenshotManifest = { schemaVersion:1; publicationApproved:boolean; images:Screenshot[] };
export function validateManifest(value:unknown, allowProvisional?:boolean):ScreenshotManifest;
