#!/usr/bin/env node

const sources = [
  [
    "data.education.gouv.fr",
    "https://data.education.gouv.fr/"
  ],
  [
    "Annuaire de l’éducation dataset",
    "https://www.data.gouv.fr/datasets/annuaire-de-leducation"
  ],
  [
    "Education open-data API listing",
    "https://www.data.gouv.fr/dataservices/api-donnees-ouvertes-de-leducation-nationale"
  ],
  [
    "data.gouv.fr API",
    "https://doc.data.gouv.fr/api/reference/"
  ]
];
let failures = 0;

for (const [title, url] of sources) {
  try {
    const response = await fetch(url, { headers: { Accept: 'text/html,application/json,*/*', 'User-Agent': 'mcp-french-school-map-smoke/0.1' } });
    const body = await response.text();
    const ok = response.ok && body.length > 50;
    console.log(`${ok ? 'OK' : 'FAIL'} ${response.status} ${title} ${url}`);
    if (!ok) failures += 1;
  } catch (error) {
    failures += 1;
    console.log(`FAIL ${title} ${url} ${error.message}`);
  }
}

process.exitCode = failures === 0 ? 0 : 1;
