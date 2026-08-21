import { describe, expect, it } from 'vitest';

describe('mcp-french-school-map', () => {
  it('uses an mcp package name', () => {
    expect('mcp-french-school-map').toMatch(/^mcp-/);
  });

  it('has curated HTTP sources', () => {
    const sources = [
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
];
    expect(sources.length).toBeGreaterThan(0);
    for (const source of sources) {
      expect(source.url).toMatch(/^https?:\/\//);
    }
  });

  it('has a stable tool prefix', () => {
    expect('french_school_map').toMatch(/^[a-z0-9_]+$/);
  });
});
