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

/**
 * 상위 아이디어 선택 목록 정렬 — 최상위 아이디어를 먼저 묶고, 각 묶음 안에서 제목 오름차순.
 * 트리의 어디에 붙일지 고르는 화면이라 뼈대가 되는 최상위가 먼저 보여야 한다.
 *
 * 부모가 목록에 없는 고아 아이디어는 buildTreeRows가 루트로 승격시키는 것과 같은 기준으로
 * 최상위로 본다. 정렬은 새 배열에 하므로 react-query 캐시 배열을 건드리지 않는다.
 */
export function sortParentCandidates(candidates: IdeaResponse[], all: IdeaResponse[]): IdeaResponse[] {
  const ids = new Set(all.map((i) => i.ideaId));
  const isTopLevel = (i: IdeaResponse) => !i.parentIdeaId || !ids.has(i.parentIdeaId);
  return [...candidates].sort((a, b) =>
    Number(isTopLevel(b)) - Number(isTopLevel(a))
    || (a.title ?? '').localeCompare(b.title ?? '', 'ko'));
}
