# B3 Market Data

Source CSVs from B3 (per symbol, per granularity, per day).

```
b3/<SYMBOL>/<granularity>/<YYYY-MM-DD>.csv
```

Header: `t,o,h,l,c,v` (ISO timestamp + numeric OHLCV).

After dropping new CSVs, run:

```
bun scripts/ingest-market.ts
```

to refresh `market/hashes/` and `market/manifests/datasets.json`.

These files are the **only** source of OHLC in the project. Consume via
`@/market/canonicalFeed` — never read CSVs or inline candles elsewhere.
