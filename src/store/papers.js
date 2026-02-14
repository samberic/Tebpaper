import { randomUUID } from 'crypto';

// In-memory store for anonymous papers.
// Papers are lost on server restart — this is intentional for now.
const papers = new Map();

export function savePaper(viewData) {
  const id = randomUUID();
  papers.set(id, viewData);
  return id;
}

export function getPaper(id) {
  return papers.get(id) || null;
}
