// Maintenance switch: change manually, then commit and deploy.
// Keep false during the draw and after publishing the final roster.
export const ALLOW_FINAL_TEAM_CHANGES = false;

export function draftPermissions(draft, published, allowChanges = ALLOW_FINAL_TEAM_CHANGES) {
  const complete = draft.step === 5;
  const allNamed = complete && draft.teams.every(team => !!team.name);
  const final = published?.finalized === true || allNamed;
  return {
    locked: final && !allowChanges,
    rosterLocked: complete && !allowChanges,
    canGenerate: !complete && (!final || allowChanges),
    canReset: draft.step > 0 && (!complete || allowChanges),
    canChooseName: team => !!team && complete && (!final || allowChanges) && (!team.name || allowChanges)
  };
}

export function publishedToDraft(published) {
  return { version: 1, step: 5, teams: published.teams.map(team => ({ id: team.id, name: team.name, players: team.players.map(player => player.id) })) };
}
