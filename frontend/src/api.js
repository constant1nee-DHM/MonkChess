const asJson = async (response) => {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || `Request failed (${response.status})`);
  return body;
};

export const getMeta = () => fetch('/api/meta').then(asJson);

export const getFirstMoves = () => fetch('/api/first-moves').then(asJson);

export const getOpenings = (side, firstMove) =>
  fetch(`/api/openings?side=${side}&firstMove=${firstMove}`).then(asJson);

export const getVariation = (id, side) =>
  fetch(`/api/variations/${encodeURIComponent(id)}?side=${side}`).then(asJson);

export const importDataset = (payload, filename) =>
  fetch('/api/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ payload, filename }),
  }).then(asJson);
