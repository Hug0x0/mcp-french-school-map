# mcp-french-school-map

MCP server for French education data: school directory, geocoded establishments, IPS, Parcoursup and exam dataset discovery.

## Tools

Run the MCP and call `french_school_map_get_sources` first to inspect source coverage. This server also exposes domain-specific tools for the topic described above.

## Install

```bash
npm install
npm run build
npm test
npm run dev
```

## Claude Desktop

```json
{
  "mcpServers": {
    "french-school-map": {
      "command": "npx",
      "args": ["mcp-french-school-map"]
    }
  }
}
```

## Sources

- data.education.gouv.fr: https://data.education.gouv.fr/
- Annuaire de l’éducation dataset: https://www.data.gouv.fr/datasets/annuaire-de-leducation
- Education open-data API listing: https://www.data.gouv.fr/dataservices/api-donnees-ouvertes-de-leducation-nationale
- data.gouv.fr API: https://doc.data.gouv.fr/api/reference/

## Publishing

See [docs/publishing.md](docs/publishing.md).

## Glama / Docker

The repo includes `Dockerfile` and `glama.json`.

Build steps:

```json
["npm install", "npm run build"]
```

CMD arguments:

```json
["node", "dist/index.js"]
```

## Safety

This MCP helps agents discover and summarize public sources. It is not an official authority. Verify decisions against the competent public service or original data producer.

## License

MIT
