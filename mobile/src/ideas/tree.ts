import type { IdeaResponse } from '../api/types';

/** 웹 IdeaDumpPage.jsx buildTreeRows 이식 — 검색 시 강제 펼침·자손 매칭 조상 유지·고아 루트 승격 */
export type TreeRow = {
  idea: IdeaResponse;
  depth: number;
  childCount: number;
  isExpanded: boolean;
};

export function buildTreeRows(ideas: IdeaResponse[], query: string, expandedIds: Set<string>): TreeRow[] {
  const keyword = query.trim().toLowerCase();
  const byParent = new Map<string, IdeaResponse[]>();
  const byId = new Map<string, IdeaResponse>();

  ideas.forEach((idea) => {
    byId.set(idea.ideaId, idea);
    const key = idea.parentIdeaId || 'root';
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key)!.push(idea);
  });

  const matches = (idea: IdeaResponse): boolean => {
    if (!keyword) return true;
    return Boolean(
      idea.title?.toLowerCase().includes(keyword) || idea.content?.toLowerCase().includes(keyword),
    );
  };

  const hasMatchingDescendant = (idea: IdeaResponse): boolean => {
    if (matches(idea)) return true;
    return (byParent.get(idea.ideaId) ?? []).some(hasMatchingDescendant);
  };

  const rows: TreeRow[] = [];
  const visit = (idea: IdeaResponse, depth: number) => {
    if (!hasMatchingDescendant(idea)) return;
    const children = byParent.get(idea.ideaId) ?? [];
    const isExpanded = Boolean(keyword) || expandedIds.has(idea.ideaId);
    rows.push({ idea, depth, childCount: children.length, isExpanded });
    if (isExpanded) children.forEach((child) => visit(child, depth + 1));
  };

  (byParent.get('root') ?? []).forEach((idea) => visit(idea, 0));
  ideas
    .filter((idea) => idea.parentIdeaId && !byId.has(idea.parentIdeaId))
    .forEach((idea) => visit(idea, 0));

  return rows;
}
