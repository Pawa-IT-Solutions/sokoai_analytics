import { createServer } from 'node:http';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BigQuery } from '@google-cloud/bigquery';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DIST_DIR = path.join(__dirname, 'dist');
const INDEX_FILE = path.join(DIST_DIR, 'index.html');
const PORT = Number(process.env.PORT || 8080);

const client = new BigQuery();
const CACHE_TTL_MS = 60 * 1000;
const predictionsCache = new Map();

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.mjs': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.webp': 'image/webp',
    '.txt': 'text/plain; charset=utf-8',
    '.map': 'application/json; charset=utf-8',
};

function getCache(key) {
    const entry = predictionsCache.get(key);
    if (!entry) {
        return null;
    }
    if (Date.now() > entry.expiresAt) {
        predictionsCache.delete(key);
        return null;
    }
    return entry.value;
}

function setCache(key, value) {
    predictionsCache.set(key, {
        value,
        expiresAt: Date.now() + CACHE_TTL_MS,
    });
}

function sendJson(res, statusCode, body) {
    res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(body));
}

async function sendFile(res, filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    const content = await fs.readFile(filePath);
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
}

async function handleCustomerOrderDetails(res) {
    try {
        const query = `
      SELECT
        order_number,
        customer_name,
        product_name,
        category,
        city,
        status,
        payment_method,
        unit_cost,
        quantity,
        CAST(order_date AS STRING) AS order_date
      FROM \`pawait-data-hub.cloud_mastery.customer_order_details\`
    `;

        const [rows] = await client.query({ query, useLegacySql: false });

        const normalized = rows.map((row) => ({
            order_number: row.order_number ?? '',
            customer_name: row.customer_name ?? '',
            product_name: row.product_name ?? '',
            category: row.category ?? '',
            city: row.city ?? '',
            status: row.status ?? '',
            payment_method: row.payment_method ?? '',
            unit_cost: row.unit_cost ?? 0,
            quantity: row.quantity ?? 0,
            order_date: row.order_date ?? '',
        }));

        sendJson(res, 200, normalized);
    } catch (error) {
        sendJson(res, 500, {
            error: 'Failed to fetch customer_order_details from BigQuery',
            details: error?.message ?? 'Unknown error',
        });
    }
}

async function handlePredictions(reqUrl, res) {
    try {
        const parsedUrl = new URL(reqUrl ?? '/', 'http://localhost');
        const page = Math.max(1, Number.parseInt(parsedUrl.searchParams.get('page') ?? '1', 10) || 1);
        const pageSize = Math.min(200, Math.max(10, Number.parseInt(parsedUrl.searchParams.get('pageSize') ?? '50', 10) || 50));
        const sortByParam = parsedUrl.searchParams.get('sortBy') ?? 'unique_session_id';
        const sortDirParam = (parsedUrl.searchParams.get('sortDir') ?? 'asc').toLowerCase();
        const sortDir = sortDirParam === 'desc' ? 'DESC' : 'ASC';
        const sortColumns = {
            unique_session_id: 'unique_session_id',
            prob: 'prob',
            predicted: 'predicted',
            actual: 'actual',
            classification: 'classification',
            time_on_site: 'time_on_site',
            pageviews: 'pageviews',
            latest_ecommerce_progress: 'latest_ecommerce_progress',
            bounces: 'bounces',
            source: 'source',
        };
        const sortBy = sortColumns[sortByParam] ? sortByParam : 'unique_session_id';
        const offset = (page - 1) * pageSize;
        const cacheKey = `predictions:${page}:${pageSize}:${sortBy}:${sortDir}`;

        const cached = getCache(cacheKey);
        if (cached) {
            sendJson(res, 200, cached);
            return;
        }

        const rowsQuery = `
      WITH base AS (
        SELECT
          CAST(unique_session_id AS STRING) AS unique_session_id,
          SAFE_CAST(time_on_site AS FLOAT64) AS time_on_site,
          SAFE_CAST(pageviews AS INT64) AS pageviews,
          SAFE_CAST(latest_ecommerce_progress AS INT64) AS latest_ecommerce_progress,
          CAST(bounces AS STRING) AS bounces,
          CAST(source AS STRING) AS source,
          CAST(predicted_will_buy_on_return_visit AS STRING) AS predicted_label,
          CAST(will_buy_on_return_visit AS STRING) AS actual_label,
          (
            SELECT SAFE_CAST(p.prob AS FLOAT64)
            FROM UNNEST(predicted_will_buy_on_return_visit_probs) p
            WHERE SAFE_CAST(p.label AS STRING) = '1'
            LIMIT 1
          ) AS prob
        FROM \`pawait-data-hub.cloud_mastery.predictions\`
      )
      SELECT
        unique_session_id,
        IFNULL(prob, 0.0) AS prob,
        CAST(predicted_label = '1' AS INT64) AS predicted,
        CAST(actual_label = '1' AS INT64) AS actual,
        CASE
          WHEN predicted_label = '1' AND actual_label = '1' THEN 'True Positive'
          WHEN predicted_label = '1' AND actual_label != '1' THEN 'False Positive'
          WHEN predicted_label != '1' AND actual_label != '1' THEN 'True Negative'
          ELSE 'False Negative'
        END AS classification,
        IFNULL(time_on_site, 0) AS time_on_site,
        IFNULL(pageviews, 0) AS pageviews,
        IFNULL(latest_ecommerce_progress, 0) AS latest_ecommerce_progress,
        IFNULL(bounces, '0') AS bounces,
        IFNULL(source, 'unknown') AS source
      FROM base
      ORDER BY ${sortColumns[sortBy]} ${sortDir}, unique_session_id ASC
      LIMIT @pageSize OFFSET @offset
    `;

        const summaryQuery = `
      WITH base AS (
        SELECT
          CAST(predicted_will_buy_on_return_visit AS STRING) AS predicted_label,
          CAST(will_buy_on_return_visit AS STRING) AS actual_label,
          (
            SELECT SAFE_CAST(p.prob AS FLOAT64)
            FROM UNNEST(predicted_will_buy_on_return_visit_probs) p
            WHERE SAFE_CAST(p.label AS STRING) = '1'
            LIMIT 1
          ) AS prob
        FROM \`pawait-data-hub.cloud_mastery.predictions\`
      ),
      calib AS (
        SELECT
          CASE
            WHEN IFNULL(prob, 0.0) < 0.2 THEN '0-20%'
            WHEN IFNULL(prob, 0.0) < 0.4 THEN '20-40%'
            WHEN IFNULL(prob, 0.0) < 0.6 THEN '40-60%'
            WHEN IFNULL(prob, 0.0) < 0.8 THEN '60-80%'
            ELSE '80-100%'
          END AS bin,
          AVG(IFNULL(prob, 0.0)) AS avg_pred,
          AVG(CASE WHEN actual_label = '1' THEN 1 ELSE 0 END) AS actual_rate,
          COUNT(*) AS count
        FROM base
        GROUP BY bin
      )
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN predicted_label = '1' AND actual_label = '1' THEN 1 ELSE 0 END) AS tp,
        SUM(CASE WHEN predicted_label = '1' AND actual_label != '1' THEN 1 ELSE 0 END) AS fp,
        SUM(CASE WHEN predicted_label != '1' AND actual_label != '1' THEN 1 ELSE 0 END) AS tn,
        SUM(CASE WHEN predicted_label != '1' AND actual_label = '1' THEN 1 ELSE 0 END) AS fn,
        AVG(IFNULL(prob, 0.0)) AS avgProb,
        SUM(CASE WHEN IFNULL(prob, 0.0) < 0.2 THEN 1 ELSE 0 END) AS b0,
        SUM(CASE WHEN IFNULL(prob, 0.0) >= 0.2 AND IFNULL(prob, 0.0) < 0.4 THEN 1 ELSE 0 END) AS b1,
        SUM(CASE WHEN IFNULL(prob, 0.0) >= 0.4 AND IFNULL(prob, 0.0) < 0.6 THEN 1 ELSE 0 END) AS b2,
        SUM(CASE WHEN IFNULL(prob, 0.0) >= 0.6 AND IFNULL(prob, 0.0) < 0.8 THEN 1 ELSE 0 END) AS b3,
        SUM(CASE WHEN IFNULL(prob, 0.0) >= 0.8 THEN 1 ELSE 0 END) AS b4,
        (
          SELECT ARRAY_AGG(STRUCT(bin, avg_pred, actual_rate, count)
            ORDER BY CASE bin
              WHEN '0-20%' THEN 1
              WHEN '20-40%' THEN 2
              WHEN '40-60%' THEN 3
              WHEN '60-80%' THEN 4
              ELSE 5
            END)
          FROM calib
        ) AS calibration
      FROM base
    `;

        const [[rows], [summaryRows]] = await Promise.all([
            client.query({
                query: rowsQuery,
                params: { pageSize, offset },
                useLegacySql: false,
            }),
            client.query({
                query: summaryQuery,
                useLegacySql: false,
            }),
        ]);

        const summary = summaryRows?.[0] ?? {};
        const total = Number(summary.total ?? 0);
        const result = {
            page,
            pageSize,
            sortBy,
            sortDir: sortDir.toLowerCase(),
            total,
            totalPages: total > 0 ? Math.ceil(total / pageSize) : 1,
            rows: rows.map((row) => ({
                unique_session_id: row.unique_session_id,
                prob: Number(row.prob ?? 0),
                predicted: Number(row.predicted ?? 0) === 1,
                actual: Number(row.actual ?? 0) === 1,
                classification: row.classification,
                time_on_site: Number(row.time_on_site ?? 0),
                pageviews: Number(row.pageviews ?? 0),
                latest_ecommerce_progress: Number(row.latest_ecommerce_progress ?? 0),
                bounces: String(row.bounces ?? '0'),
                source: row.source ?? 'unknown',
            })),
            summary: {
                tp: Number(summary.tp ?? 0),
                fp: Number(summary.fp ?? 0),
                tn: Number(summary.tn ?? 0),
                fn: Number(summary.fn ?? 0),
                avgProb: Number(summary.avgProb ?? 0),
                buckets: [
                    Number(summary.b0 ?? 0),
                    Number(summary.b1 ?? 0),
                    Number(summary.b2 ?? 0),
                    Number(summary.b3 ?? 0),
                    Number(summary.b4 ?? 0),
                ],
                calibration: Array.isArray(summary.calibration)
                    ? summary.calibration.map((item) => ({
                        bin: item.bin,
                        avgPred: Number(item.avg_pred ?? 0),
                        actualRate: Number(item.actual_rate ?? 0),
                        count: Number(item.count ?? 0),
                    }))
                    : [],
            },
        };

        setCache(cacheKey, result);
        sendJson(res, 200, result);
    } catch (error) {
        sendJson(res, 500, {
            error: 'Failed to fetch predictions from BigQuery',
            details: error?.message ?? 'Unknown error',
        });
    }
}

async function handleStatic(reqUrl, res) {
    const parsedUrl = new URL(reqUrl ?? '/', 'http://localhost');
    const pathname = decodeURIComponent(parsedUrl.pathname || '/');

    let target = pathname === '/' ? INDEX_FILE : path.join(DIST_DIR, pathname);
    target = path.normalize(target);

    if (!target.startsWith(DIST_DIR)) {
        sendJson(res, 403, { error: 'Forbidden' });
        return;
    }

    try {
        const stat = await fs.stat(target);
        if (stat.isDirectory()) {
            await sendFile(res, INDEX_FILE);
            return;
        }
        await sendFile(res, target);
    } catch {
        await sendFile(res, INDEX_FILE);
    }
}

const server = createServer(async (req, res) => {
    const method = req.method || 'GET';
    const reqUrl = req.url || '/';
    const parsedUrl = new URL(reqUrl, 'http://localhost');
    const pathname = parsedUrl.pathname;

    if (pathname === '/healthz') {
        sendJson(res, 200, { ok: true });
        return;
    }

    if (pathname === '/api/customer-order-details') {
        if (method !== 'GET') {
            sendJson(res, 405, { error: 'Method not allowed' });
            return;
        }
        await handleCustomerOrderDetails(res);
        return;
    }

    if (pathname === '/api/predictions') {
        if (method !== 'GET') {
            sendJson(res, 405, { error: 'Method not allowed' });
            return;
        }
        await handlePredictions(reqUrl, res);
        return;
    }

    await handleStatic(reqUrl, res);
});

server.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`SokoAI server listening on port ${PORT}`);
});
