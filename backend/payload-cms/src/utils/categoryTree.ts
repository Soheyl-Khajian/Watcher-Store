// backend/payload-cms/src/utils/categoryTree.ts

import type { PayloadRequest } from 'payload';
import type { Category } from '../payload-types';

const PAGE_SIZE = 100;

// Loads every category the requester may read, page by page, so no category
// is missed however large the tree grows.
export async function findAllCategories(
  req: PayloadRequest,
): Promise<Category[]> {
  const categories: Category[] = [];
  let page = 1;
  let hasNextPage = true;

  while (hasNextPage) {
    const result = await req.payload.find({
      collection: 'categories',
      page,
      limit: PAGE_SIZE,
      depth: 0,
      overrideAccess: false,
      req,
    });

    categories.push(...result.docs);
    hasNextPage = result.hasNextPage;
    page += 1;
  }

  return categories;
}

// Returns rootId and the ids of all its descendants. Breadth-first with a
// visited set, so a cycle in the parent links cannot loop forever.
export function collectCategoryIds(
  categories: Category[],
  rootId: number,
): number[] {
  const childrenByParent = new Map<number, number[]>();

  for (const category of categories) {
    const parentId =
      typeof category.parent === 'object'
        ? category.parent?.id
        : category.parent;

    if (typeof parentId !== 'number') {
      continue;
    }

    const children = childrenByParent.get(parentId) ?? [];
    children.push(category.id);
    childrenByParent.set(parentId, children);
  }

  const visited = new Set<number>([rootId]);
  const queue = [rootId];

  while (queue.length > 0) {
    const parentId = queue.shift() as number;

    for (const childId of childrenByParent.get(parentId) ?? []) {
      if (!visited.has(childId)) {
        visited.add(childId);
        queue.push(childId);
      }
    }
  }

  return [...visited];
}
