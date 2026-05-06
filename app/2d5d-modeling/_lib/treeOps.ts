import type { Group } from "./types";

// Returns true if reparenting `groupId` under `newParentId` would form a
// cycle (newParentId is groupId itself or a descendant of groupId).
export const wouldCreateCycle = (
  groups: Group[],
  groupId: string,
  newParentId: string,
): boolean => {
  if (groupId === newParentId) return true;
  // Walk descendants of groupId; if newParentId is among them, cycle.
  const descendants = new Set<string>([groupId]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const g of groups) {
      if (
        g.parentId !== null &&
        descendants.has(g.parentId) &&
        !descendants.has(g.id)
      ) {
        descendants.add(g.id);
        grew = true;
      }
    }
  }
  return descendants.has(newParentId);
};
