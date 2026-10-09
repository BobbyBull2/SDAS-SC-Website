// Shared by the browser and local bundle importer. Never accept remote image URLs.
export function validateManifest(value, allowProvisional = false) {
  if (!value || value.schemaVersion !== 1 || value.guildId !== '1518410019249459236' ||
      value.channelId !== '1519105573067686000' || value.emojiId !== '1557915851922083880' ||
      value.completeHistory !== true || !Array.isArray(value.images) || value.images.length > 25 ||
      (!allowProvisional && value.publicationApproved !== true)) throw Error('Unapproved or invalid screenshot manifest');
  const ids = new Set();
  for (const item of value.images) {
    if (!item || !/^[0-9]{1,20}-[0-9]{1,20}$/.test(item.id) || ids.has(item.id) ||
        !/^[a-f0-9]{64}$/.test(item.sha256) ||
        item.file !== `images/${item.id}-${item.sha256}.webp` ||
        !Number.isInteger(item.width) || !Number.isInteger(item.height) ||
        item.width < 1 || item.height < 1 || item.width > 2560 || item.height > 2560 ||
        !['provisional', 'officer-verified'].includes(item.approval) ||
        !Array.isArray(item.verifiedApproverIds) ||
        !item.verifiedApproverIds.every(id => typeof id === 'string' && /^[0-9]{1,20}$/.test(id)) ||
        (item.approval === 'officer-verified' && !item.verifiedApproverIds.length) ||
        (item.approval === 'provisional' && item.verifiedApproverIds.length) ||
        (!allowProvisional && item.approval !== 'officer-verified')) throw Error('Invalid screenshot entry');
    ids.add(item.id);
  }
  return value;
}
