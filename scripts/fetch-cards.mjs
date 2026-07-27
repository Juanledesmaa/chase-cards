// Fetches all Riftbound cards (product type "Cards" only) from TCGplayer's
// search API and writes them to cards.json for the static page to consume.
import { writeFile } from 'node:fs/promises';

const API = 'https://mp-search-api.tcgplayer.com/v1/search/request?q=&isList=false';
const PAGE = 48;

async function fetchPage(from) {
  const res = await fetch(API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
      Accept: 'application/json',
      Origin: 'https://www.tcgplayer.com',
      Referer: 'https://www.tcgplayer.com/'
    },
    body: JSON.stringify({
      algorithm: 'sales_synonym_v2',
      from,
      size: PAGE,
      filters: { term: { productLineName: ['riftbound'], productTypeName: ['Cards'] } },
      listingSearch: {
        context: { cart: {} },
        filters: { term: { sellerStatus: 'Live', channelId: 0 }, range: { quantity: { gte: 1 } }, exclude: { channelExclusion: 0 } }
      },
      context: { cart: {}, shippingCountry: 'US' },
      settings: { useFuzzySearch: false },
      sort: { field: 'market-price', order: 'desc' }
    })
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return (await res.json()).results[0];
}

const cards = [];
let from = 0, total = Infinity;
while (from < total) {
  const data = await fetchPage(from);
  total = data.totalResults;
  if (!data.results.length) break;
  for (const c of data.results) {
    cards.push({
      id: c.productId,
      name: c.productName,
      set: c.setName || '',
      rarity: c.rarityName || '',
      price: c.marketPrice ?? null
    });
  }
  from += data.results.length;
  console.log(`${from}/${total}`);
}

if (cards.length === 0) throw new Error('No cards fetched — aborting so the old cards.json is kept.');
await writeFile('cards.json', JSON.stringify({ updated: new Date().toISOString(), cards }));
console.log(`Wrote cards.json with ${cards.length} cards`);
