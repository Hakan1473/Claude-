export type TermCategory = 'medication' | 'chronic' | 'surgery' | 'allergy' | 'complaint' | 'family' | 'habit';

export interface TermExplanation {
  term: string;
  category: TermCategory;
  recognized: boolean;
  title: string;
  subtitle: string;
  summary: string;
  fields: { label: string; value: string }[];
}

// Session cache + in-flight de-duplication: tapping the same pill twice never costs a second request
const cache = new Map<string, TermExplanation>();
const inflight = new Map<string, Promise<TermExplanation>>();

export function explainTerm(term: string, category: TermCategory): Promise<TermExplanation> {
  const key = `${category}:${term.trim().toLocaleLowerCase('tr')}`;
  const cached = cache.get(key);
  if (cached) return Promise.resolve(cached);
  const pending = inflight.get(key);
  if (pending) return pending;

  const request = fetch('/api/explain-term', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ term, category }),
  })
    .then(async (res) => {
      if (!res.ok) throw new Error('Açıklama şu anda alınamadı');
      const data = (await res.json()) as TermExplanation;
      cache.set(key, data);
      return data;
    })
    .finally(() => inflight.delete(key));

  inflight.set(key, request);
  return request;
}
