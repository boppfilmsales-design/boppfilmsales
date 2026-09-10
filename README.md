# Asia Pacific Industry Group — mirrored website (apigcl.com / boppfilmsales.com)

This project is a self-hosted mirror of the legacy PHP website
**www.apigcl.com / www.boppfilmsales.com** with a special focus on the
**News** section, plus a rebuilt administration back office.

## What mirrors the legacy site

| Legacy page | New page |
| --- | --- |
| `news.php?c_id=41` (Industry News) | `/news?category=industry-news` |
| `news.php?c_id=49` (Company News) | `/news?category=company-news` |
| `news.php?c_id=52` (Employees Literary) | `/news?category=employees-literary` |
| `news.php?p=2&c_id=52` | `/news?category=employees-literary&p=2` |
| `show.php?c_id=52&i_id=503` | `/news/employees-literary/<id>` |
| `news.php` / `show.php` (old links) | 302 redirects to the new URLs (`src/app/news.php`, `src/app/show.php`) |
| legacy back office | `/admin` (username `xgxadmin`, password `xgxadmin`) |

The listing page reproduces the legacy layout: breadcrumb bar, red `NEWS`
heading with the 92×5px underline, the three grey/red category tabs, the
260×260 thumbnail, the light grey `#f8f8f8` article card (title, `Time:`
line, two-line summary, `MORE` link) and the legacy pagination bar
(`first / previous / numbers / next / end`).

The detail page reproduces the legacy `show.php` layout: breadcrumb,
centred red title, `Time：YYYY-MM-DD` divider and a 500px minimum height
content area, followed by previous/next article navigation.

## Content

All 92 news records (Industry News 12, Company News 2, Employees Literary 78)
including their article bodies and referenced images were scraped from the
legacy site by `scripts/scrape-news.py` into:

- `src/data/news-seed.json` — titles, dates, summaries, bodies, image names
- `public/uploads/news/*` — locally hosted copies of the article images

The data is loaded into PostgreSQL automatically on first request
(`src/db/seed.ts`, idempotent: tables are created if missing and rows are only
inserted when the news table is empty).

## Back office

`/admin` provides login (scrypt-hashed password stored in `admin_users`), a
dashboard with per-column counters, filters, paging, publish/draft toggle,
delete, and a create/edit form supporting both plain text and HTML source
content.

REST endpoints used by the back office:

- `POST /api/admin/login`, `POST /api/admin/logout`
- `GET|POST /api/admin/posts`, `GET|PUT|DELETE /api/admin/posts/:id`
- `GET|PATCH /api/admin/categories`
- Public read-only feed: `GET /api/news?category=industry-news&p=1`

## Development

```bash
npm run dev          # start the app
npx drizzle-kit push # create/refresh the PostgreSQL tables
python3 scripts/scrape-news.py   # re-scrape the legacy news columns (optional)
```
