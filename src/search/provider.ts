export type EmbeddingProvider = {
  name: string;
  apiBase: string;
  model: string;
  dimensions: number;
  headers: (key: string) => Record<string, string>;
};

const openai: EmbeddingProvider = {
  name: 'openai',
  apiBase: 'https://api.openai.com/v1',
  model: 'text-embedding-3-small',
  dimensions: 1536,
  headers: (key) => ({
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
  }),
};

const vercel: EmbeddingProvider = {
  name: 'vercel',
  apiBase: 'https://ai-gateway.vercel.sh/v1',
  model: 'openai/text-embedding-3-small',
  dimensions: 1536,
  headers: (key) => ({
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
  }),
};

/**
 * Parse an Ollama key string in the format:
 *   OLLAMA::host::model::dimensions
 *
 * Example:
 *   OLLAMA::http://192.168.1.50:11434::embeddinggemma::768
 */
function parseOllamaKey(key: string): EmbeddingProvider {
  const ollamaFormatHelp =
    'Invalid Ollama key format. Expected: OLLAMA::host::model::dimensions\n' +
    'Example: OLLAMA::http://192.168.1.50:11434::embeddinggemma::768';

  const parts = key.split('::');
  if (parts.length !== 4) {
    throw new Error(ollamaFormatHelp);
  }
  const [, host, model, dimsStr] = parts;
  const dimensions = parseInt(dimsStr, 10);
  if (!host || !model || isNaN(dimensions) || dimensions <= 0) {
    throw new Error(ollamaFormatHelp);
  }

  const apiBase = host.replace(/\/+$/, '') + '/v1';

  return {
    name: 'ollama',
    apiBase,
    model,
    dimensions,
    headers: () => ({ 'Content-Type': 'application/json' }),
  };
}

export function detectProvider(key: string): EmbeddingProvider {
  if (key.startsWith('REPLAY_LAT_LLM_KEY::')) {
    const replayUrl = key.slice('REPLAY_LAT_LLM_KEY::'.length);
    return {
      name: 'replay',
      apiBase: replayUrl,
      model: 'replay',
      dimensions: 1536,
      headers: () => ({ 'Content-Type': 'application/json' }),
    };
  }
  if (key.startsWith('OLLAMA::')) {
    return parseOllamaKey(key);
  }
  if (key.startsWith('sk-ant-')) {
    throw new Error(
      "Anthropic doesn't offer an embedding model. Set LAT_LLM_KEY to an OpenAI (sk-...), Vercel AI Gateway (vck_...), or Ollama (OLLAMA::host::model::dimensions) key.",
    );
  }
  if (key.startsWith('vck_')) return vercel;
  if (key.startsWith('sk-')) return openai;
  throw new Error(
    `Unrecognized LAT_LLM_KEY prefix. Supported: OpenAI (sk-...), Vercel AI Gateway (vck_...), Ollama (OLLAMA::host::model::dimensions).`,
  );
}
