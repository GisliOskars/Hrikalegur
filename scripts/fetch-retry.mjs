const retryableStatuses = new Set([403, 408, 425, 429]);

export async function fetchWithRetry(url, options = {}, settings = {}) {
  const attempts = settings.attempts ?? 3;
  const delays = settings.delays ?? [1500, 4000];
  const fetchImpl = settings.fetchImpl ?? fetch;
  const sleep = settings.sleep ?? ((milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)));
  let lastError;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetchImpl(url, options);
      if (response.ok || (!retryableStatuses.has(response.status) && response.status < 500)) return response;
      lastError = new Error(`stöðukóði ${response.status}`);
      if (attempt === attempts - 1) return response;
    } catch (error) {
      lastError = error;
      if (attempt === attempts - 1) throw error;
    }
    await sleep(delays[Math.min(attempt, delays.length - 1)] ?? 0);
  }
  throw lastError;
}
