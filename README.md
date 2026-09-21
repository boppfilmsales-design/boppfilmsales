# Asia Pacific Industry Group — 1:1 mirror of apigcl.com / boppfilmsales.com

This project is a complete, bilingual (English + Chinese) mirror of the legacy PHP
website **www.apigcl.com** / **www.boppfilmsales.com**, rebuilt as a Next.js app
with a PostgreSQL back office.

Everything that is visible on the legacy site lives in this repository:

| Legacy area | Mirrored as | Content |
| --- | --- | --- |
| `product.php?top_id=<f>&c_id=<f>` | `/products/<family>` | 18 product families |
| `product.php?top_id=<f>&c_id=<sub>` | `/products/<family>/list/<sub>` | 87 sub categories, paginated 10 per page like the source |
| `product_show.php?c_id=<sub>&i_id=<item>` | `/products/<family>/<item>` | 159 product pages (gallery, product code, wholesale price, Description / TECHNICAL PARAMETERS / OFFER DETAILS tabs, related products) |
| `about.php?c_id=<c>` | `/about?id=<c>` | 7 columns (About Us, Main Products, Culture, Branch Companies, Factory & Warehouse, Course, SEAGULL_LFI_TEST) |
| `honor.php?c_id=<c>` | `/honor?id=<c>` | Honor, Certificate, To Customer, Certification Report |
| `product_lines.php?c_id=<c>` | `/product-lines?id=<c>` | 10 production-line columns |
| `service.php?c_id=<c>` | `/service?id=<c>` | Useful Links, Company Announcement, Useful Knowledge, Vessel Shipping Lines |
| `case.php?c_id=<c>` | `/cases?id=<c>` | Development Cases, To Buyers, To Markets, To Ourselves |
| `down.php` | `/downloads` | Company Notice / Technology Data / Certificate / MSDS download tables |
| `show.php?c_id=<c>&i_id=<i>` | `/entry/<kind>/<c>/<i>` | 63 content entries (honour cards, cases, production lines, service articles) |
| `news.php?c_id=41|49|52` | `/news?category=…` | 92 mirrored news articles (database backed) |
| Chinese site (`/ch/...`) | `/zh/...` | every page has a Chinese counterpart driven by the scraped Chinese text |

Layout: the product list pages reproduce the legacy family table (active family in
red), the `›` sub-category list, the red group heading and the 10-per-page pager
(`N row / first / previous / 1 2 3 / next / end`). The product detail page reproduces
`product_show.php`: breadcrumb, magnifier gallery with thumbnails, product box
(product code, wholesale price, family, Share facebook / Collection, Check Details,
Chat Now, technical PDF list) and the three legacy tabs.

All images, PDF data sheets and body HTML are hosted locally under `public/` — the
site never hot-links the legacy server.

## Data model — `src/data/site-seed.json`

```jsonc
{
  "products": [ { "sourceId": 34, "name": "BOPET Film (Polyester Film)", "nameZh": "…",
                  "itemIds": [357, 358, …],            // family listing order of the source
                  "subs": [ { "sourceId": 66, "name": "…", "nameZh": "…",
                              "itemIds": [102, 130, …], "items": [ … ] } ] } ],
  "items":    { "66:130": { "sourceId": 130, "catId": 66, "title": "…", "titleZh": "…",
                             "code": "3920620000", "price": "2.95", "gallery": [ … ],
                             "description|descriptionZh|technical|technicalZh|offer|offerZh": "<html>",
                             "pdfs": [ { "file": "/downloads/…pdf", "label": "…" } ] } },
  "contents": [ { "kind": "honor", "sourceId": 17, "name": "Certificate", "items": [ …cards… ],
                  "entries": [ { "title": "…", "titleZh": "…", "bodyHtml": "…", "bodyHtmlZh": "…" } ] } ]
}
```

`src/lib/site.ts` is the only place that reads this file; every page goes through it.

## Re-scraping the legacy site

```bash
python scripts/scrape-catalog.py   # 18 families / 87 subs / 159 products (EN + ZH) -> scripts/source-catalog.json
python scripts/scrape-content.py   # 33 content columns + 63 entries (EN + ZH)      -> scripts/source-content.json
python scripts/build-seed.py       # merges both into src/data/site-seed.json + src/data/valid-files.json
python scripts/scrape-news.py      # refreshes src/data/news-seed.json
```

Every downloaded page/image/PDF is cached in `.source-cache/` (git-ignored), so the
scripts can be re-run safely while the legacy server is still online.

## Legacy URL protection

`src/app/[legacy]/route.ts` permanently redirects every old `*.php` URL:

| Legacy URL | Redirects to |
| --- | --- |
| `/index.php` | `/` |
| `/product.php?top_id=34&c_id=34` | `/products/34` |
| `/product.php?top_id=34&c_id=66` | `/products/34/list/66` |
| `/product_show.php?c_id=66&i_id=130` | `/products/34/130` |
| `/product_detail.php?i_id=130` | `/products/34/130` |
| `/about.php?c_id=13` · `/about_list_txt.php?c_id=202` | `/about?id=13` · `/about?id=202` |
| `/about_list_img.php?c_id=16` · `/honor.php?c_id=17` | `/honor?id=16` · `/honor?id=17` |
| `/product_lines.php?c_id=45` | `/product-lines?id=45` |
| `/service.php?c_id=141` | `/service?id=141` |
| `/case.php?top_id=145&c_id=145` | `/cases?id=145` |
| `/down.php` | `/downloads` |
| `/show.php?c_id=145&i_id=135` | `/entry/cases/145/135` |
| `/show.php?c_id=52&i_id=503` | `/news/employees-literary/<db id>` |
| `/news.php?c_id=41&p=2` | `/news?category=industry-news&p=2` |

## Back office

`/admin` (username `xgxadmin`, password `xgxadmin`) provides login, a dashboard with
per-column counters, paging, publish/draft toggle, delete and a create/edit form
supporting both plain text and HTML source content.

REST endpoints used by the back office:

- `POST /api/admin/login`, `POST /api/admin/logout`
- `GET|POST /api/admin/posts`, `GET|PUT|DELETE /api/admin/posts/:id`
- `GET|PATCH /api/admin/categories`
- Public read-only feed: `GET /api/news?category=industry-news&p=1`

## Development

```bash
npm install
npm run dev          # http://localhost:3000
npm run build        # 307 static pages (18 families, 87 sub categories, 159 products, 35 entries)
npx drizzle-kit push # create/refresh the PostgreSQL tables
```

## Deployment (Cloudflare Workers + Neon Postgres)

| Setting | Value |
| --- | --- |
| Repository | `boppfilmsales-design/boppfilmsales` |
| Branch | `main` |
| Build command | `npm run build` |
| Install command | `npm install` |
| Node version | 20 or 22 |

Environment variables (Cloudflare dashboard → Settings → Variables):

| Key | Value |
| --- | --- |
| `DATABASE_URL` | Neon Postgres connection string |
| `ADMIN_USERNAME` | `xgxadmin` |
| `ADMIN_PASSWORD` | your own strong password |
| `SESSION_SECRET` | any long random string |

The first request creates the `news_categories`, `news_posts` and `admin_users`
tables and loads the 92 mirrored news articles from `src/data/news-seed.json`.

After deploying, point both domains (`www.apigcl.com`, `www.boppfilmsales.com`) at
the Worker under **Custom domains**.

