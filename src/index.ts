#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const CONFIG = {
  "name": "mcp-french-school-map",
  "prefix": "french_school_map",
  "description": "MCP server for French education data: school directory, geocoded establishments, IPS, Parcoursup and exam dataset discovery.",
  "sources": [
    {
      "title": "data.education.gouv.fr",
      "url": "https://data.education.gouv.fr/"
    },
    {
      "title": "Annuaire de l’éducation dataset",
      "url": "https://www.data.gouv.fr/datasets/annuaire-de-leducation"
    },
    {
      "title": "Education open-data API listing",
      "url": "https://www.data.gouv.fr/dataservices/api-donnees-ouvertes-de-leducation-nationale"
    },
    {
      "title": "data.gouv.fr API",
      "url": "https://doc.data.gouv.fr/api/reference/"
    }
  ]
} as const;

interface ToolResult {
  [key: string]: unknown;
  content: Array<{ type: 'text'; text: string }>;
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}

function jsonResult(data: Record<string, unknown>): ToolResult {
  return {
    content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
    structuredContent: data,
  };
}

function errorResult(message: string): ToolResult {
  const data = { error: message };
  return {
    content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
    structuredContent: data,
    isError: true,
  };
}

function textFromHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json,*/*',
      'User-Agent': `${CONFIG.name}/0.1 (+https://github.com/Hug0x0/${CONFIG.name})`,
    },
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} while fetching ${url}`);
  }
  return response.json() as Promise<T>;
}

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      Accept: 'text/html,text/plain,application/xml,*/*',
      'User-Agent': `${CONFIG.name}/0.1 (+https://github.com/Hug0x0/${CONFIG.name})`,
    },
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} while fetching ${url}`);
  }
  return response.text();
}

function dataGouvDatasetSummary(dataset: Record<string, unknown>) {
  return {
    id: dataset.id,
    slug: dataset.slug,
    title: dataset.title,
    page: dataset.page,
    organization: dataset.organization && typeof dataset.organization === 'object'
      ? (dataset.organization as Record<string, unknown>).name
      : undefined,
    resources_count: Array.isArray(dataset.resources) ? dataset.resources.length : undefined,
  };
}

async function searchDataGouv(query: string, pageSize: number) {
  const url = new URL('https://www.data.gouv.fr/api/1/datasets/');
  url.searchParams.set('q', query);
  url.searchParams.set('page_size', String(pageSize));
  const data = await fetchJson<{ data?: Array<Record<string, unknown>>; total?: number }>(url.toString());
  return {
    query,
    total: data.total,
    datasets: (data.data ?? []).map(dataGouvDatasetSummary),
  };
}

function normalizePortalUrl(portalUrl: string): string {
  return portalUrl.replace(/\/$/, '');
}

async function odsRecords(portalUrl: string, dataset: string, params: Record<string, string | number | undefined>) {
  const url = new URL(`${normalizePortalUrl(portalUrl)}/api/explore/v2.1/catalog/datasets/${encodeURIComponent(dataset)}/records`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') url.searchParams.set(key, String(value));
  }
  return fetchJson<Record<string, unknown>>(url.toString());
}

const server = new McpServer({ name: CONFIG.name, version: '0.1.0' });

server.tool(
  `${CONFIG.prefix}_get_sources`,
  'List curated sources used by this MCP.',
  {},
  async () => jsonResult({ server: CONFIG.name, description: CONFIG.description, sources: CONFIG.sources })
);

server.tool(
  `${CONFIG.prefix}_fetch_source_excerpt`,
  'Fetch a short text excerpt from a curated source by index or title keyword.',
  {
    source_key: z.string().describe('Source index, title keyword, or URL fragment.'),
    max_chars: z.number().int().min(200).max(4000).default(1200),
  },
  async ({ source_key, max_chars }) => {
    const normalized = source_key.toLowerCase();
    const source = CONFIG.sources.find((item, index) =>
      String(index + 1) === normalized ||
      item.title.toLowerCase().includes(normalized) ||
      item.url.toLowerCase().includes(normalized)
    );
    if (!source) return errorResult(`Unknown source: ${source_key}`);
    try {
      const text = await fetchText(source.url);
      return jsonResult({ source, excerpt: textFromHtml(text).slice(0, max_chars) });
    } catch (error) {
      return errorResult(error instanceof Error ? error.message : 'Failed to fetch source excerpt');
    }
  }
);


server.tool('french_school_map_search_schools', 'Search the national education directory on data.education.gouv.fr.', {
  query: z.string().optional().describe('Free-text search, e.g. school name or commune.'),
  commune: z.string().optional().describe('Commune name filter.'),
  type: z.string().optional().describe('Type filter, e.g. Ecole, Collège, Lycée.'),
  limit: z.number().int().min(1).max(100).default(20),
}, async ({ query, commune, type, limit }) => {
  try {
    const conditions = [query ? `search('${query.replace(/'/g, "''")}')` : undefined, commune ? `nom_commune = '${commune.replace(/'/g, "''")}'` : undefined, type ? `type_etablissement = '${type.replace(/'/g, "''")}'` : undefined].filter(Boolean).join(' AND ');
    const data = await odsRecords('https://data.education.gouv.fr', 'fr-en-annuaire-education', { where: conditions, limit });
    return jsonResult({ source: 'data.education.gouv.fr/fr-en-annuaire-education', result: data });
  } catch (error) { return errorResult(error instanceof Error ? error.message : 'Failed to search schools'); }
});

server.tool('french_school_map_search_education_datasets', 'Search data.gouv.fr for education datasets such as IPS, Parcoursup, exam results, sectorization and school directory.', {
  query: z.string().default('IPS établissements scolaires'),
  page_size: z.number().int().min(1).max(50).default(10),
}, async ({ query, page_size }) => {
  try { return jsonResult(await searchDataGouv(query, page_size)); } catch (error) { return errorResult(error instanceof Error ? error.message : 'Failed to search education datasets'); }
});

server.tool('french_school_map_school_context', 'Build a source-oriented school comparison context for a commune or address query.', {
  place: z.string().describe('Commune, address, or local area.'),
}, async ({ place }) => jsonResult({
  place,
  recommended_datasets: [
    'Annuaire de l’éducation',
    'IPS collèges/lycées',
    'Parcoursup formations',
    'Résultats examens',
    'Sectorisation when available locally',
  ],
  queries: [`annuaire éducation ${place}`, `IPS collège lycée ${place}`, `Parcoursup ${place}`, `résultats examens ${place}`],
}));


async function main(): Promise<void> {
  await server.connect(new StdioServerTransport());
  console.error(`${CONFIG.name} running on stdio`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
