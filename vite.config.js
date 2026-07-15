import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { BigQuery } from '@google-cloud/bigquery'
import { VertexAI, HarmBlockThreshold, HarmCategory } from '@google-cloud/vertexai'

const env = globalThis.process?.env ?? {}
const PROJECT_ID = env.GOOGLE_CLOUD_PROJECT || 'pawait-data-hub'
const VERTEX_LOCATION = env.VERTEX_LOCATION || 'us-central1'
const VERTEX_AI_MODEL_NAME = env.VERTEX_AI_MODEL_NAME || 'gemini-2.5-flash'
const MAX_VERTEX_RETRIES = 3

function toNumberOrNull(value) {
  if (value === null || value === undefined) return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function normalizeSegmentationRows(rows) {
  const byCentroid = new Map()

  for (const row of rows) {
    const centroidId = Number(row.centroid_id)
    if (!Number.isFinite(centroidId)) continue

    if (!byCentroid.has(centroidId)) {
      byCentroid.set(centroidId, {
        centroid_id: centroidId,
        features: {},
      })
    }

    const centroid = byCentroid.get(centroidId)
    const featureName = String(row.feature ?? '').trim()
    if (!featureName) continue

    if (!centroid.features[featureName]) {
      centroid.features[featureName] = {
        numerical_value: null,
        categorical_values: [],
      }
    }

    const feature = centroid.features[featureName]
    const numericalValue = toNumberOrNull(row.numerical_value)
    if (numericalValue !== null) {
      feature.numerical_value = numericalValue
    }

    const categoryFromStruct = row.categorical_value?.category
    const valueFromStruct = row.categorical_value?.value
    const category = categoryFromStruct ?? row.category ?? null
    const value = toNumberOrNull(valueFromStruct ?? row.value ?? null)

    if (category && value !== null) {
      feature.categorical_values.push({ category: String(category), value })
    }
  }

  return [...byCentroid.values()]
    .sort((a, b) => a.centroid_id - b.centroid_id)
    .map((centroid) => {
      const features = Object.entries(centroid.features)
        .map(([feature, values]) => ({
          feature,
          numerical_value: values.numerical_value,
          categorical_values: [...values.categorical_values].sort((a, b) => b.value - a.value),
        }))
        .sort((a, b) => a.feature.localeCompare(b.feature))

      return {
        centroid_id: centroid.centroid_id,
        features,
      }
    })
}

function buildSegmentPrompt(centroids) {
  return [
    'You are an ecommerce analytics strategist for SokoAI.',
    'Task: Use the centroid metrics below to create concise customer segment narratives and a practical operational playbook.',
    'Constraints:',
    '- Keep language business-ready and concise.',
    '- Ground every claim in provided metrics only.',
    '- Output valid JSON only.',
    '- Write behavioral_profile as one paragraph of 3-4 sentences.',
    '- Write operational_playbook as one paragraph (not bullets, not numbered lists).',
    '- Start operational_playbook with a short strategy label followed by a colon (example: Card Optimization: ...).',
    '- Provide dashboard-ready copy labels.',
    '',
    'Return this exact JSON schema:',
    '{',
    '  "segments": [',
    '    {',
    '      "centroid_id": 1,',
    '      "segment_name": "string",',
    '      "segment_tagline": "string",',
    '      "behavioral_profile": "string",',
    '      "operational_playbook": "string",',
    '      "ui_labels": {',
    '        "risk_level": "Low|Medium|High",',
    '        "value_tier": "Low|Medium|High",',
    '        "primary_channel_label": "string"',
    '      }',
    '    }',
    '  ]',
    '}',
    '',
    'Centroid input JSON:',
    JSON.stringify(centroids),
  ].join('\n')
}

function parseVertexJsonResponse(result) {
  const text = result?.response?.candidates?.[0]?.content?.parts
    ?.map((part) => part.text ?? '')
    .join('')
    .trim()

  if (!text) {
    throw new Error('Vertex AI returned an empty response')
  }

  try {
    const parsed = JSON.parse(text)
    if (!Array.isArray(parsed?.segments)) {
      throw new Error('Vertex AI response missing segments array')
    }
    return parsed
  } catch {
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('Vertex AI did not return valid JSON')
    }
    const parsed = JSON.parse(jsonMatch[0])
    if (!Array.isArray(parsed?.segments)) {
      throw new Error('Vertex AI response missing segments array')
    }
    return parsed
  }
}

async function generateSegmentNarratives(centroids) {
  const vertexAI = new VertexAI({ project: PROJECT_ID, location: VERTEX_LOCATION })
  const model = vertexAI.getGenerativeModel({
    model: VERTEX_AI_MODEL_NAME,
    safetySettings: [
      { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
    ],
    generationConfig: {
      temperature: 0.3,
      topP: 1,
      topK: 40,
      maxOutputTokens: 4096,
      responseMimeType: 'application/json',
    },
  })

  const prompt = buildSegmentPrompt(centroids)
  let lastError = null

  for (let attempt = 1; attempt <= MAX_VERTEX_RETRIES; attempt += 1) {
    try {
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      })
      return parseVertexJsonResponse(result)
    } catch (error) {
      lastError = error
      if (attempt < MAX_VERTEX_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 400))
      }
    }
  }

  throw new Error(lastError?.message ?? 'Unknown Vertex AI error')
}

function customerOrderDetailsApiPlugin() {
  const CACHE_TTL_MS = 60 * 1000
  const predictionsCache = new Map()

  const getCache = (key) => {
    const entry = predictionsCache.get(key)
    if (!entry) return null
    if (Date.now() > entry.expiresAt) {
      predictionsCache.delete(key)
      return null
    }
    return entry.value
  }

  const setCache = (key, value) => {
    predictionsCache.set(key, {
      value,
      expiresAt: Date.now() + CACHE_TTL_MS,
    })
  }

  return {
    name: 'customer-order-details-api',
    configureServer(server) {
      server.middlewares.use('/api/customer-order-details', async (req, res) => {
        if (req.method !== 'GET') {
          res.statusCode = 405
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'Method not allowed' }))
          return
        }

        try {
          const client = new BigQuery()
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
          `

          const [rows] = await client.query({ query, useLegacySql: false })

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
          }))

          res.statusCode = 200
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(normalized))
        } catch (error) {
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(
            JSON.stringify({
              error: 'Failed to fetch customer_order_details from BigQuery',
              details: error?.message ?? 'Unknown error',
            })
          )
        }
      })

      server.middlewares.use('/api/predictions', async (req, res) => {
        if (req.method !== 'GET') {
          res.statusCode = 405
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'Method not allowed' }))
          return
        }

        try {
          const parsedUrl = new URL(req.url ?? '/', 'http://localhost')
          const page = Math.max(1, Number.parseInt(parsedUrl.searchParams.get('page') ?? '1', 10) || 1)
          const pageSize = Math.min(200, Math.max(10, Number.parseInt(parsedUrl.searchParams.get('pageSize') ?? '50', 10) || 50))
          const sortByParam = parsedUrl.searchParams.get('sortBy') ?? 'unique_session_id'
          const sortDirParam = (parsedUrl.searchParams.get('sortDir') ?? 'asc').toLowerCase()
          const sortDir = sortDirParam === 'desc' ? 'DESC' : 'ASC'
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
          }
          const sortBy = sortColumns[sortByParam] ? sortByParam : 'unique_session_id'
          const offset = (page - 1) * pageSize
          const cacheKey = `predictions:${page}:${pageSize}:${sortBy}:${sortDir}`

          const cached = getCache(cacheKey)
          if (cached) {
            res.statusCode = 200
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify(cached))
            return
          }

          const client = new BigQuery()

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
          `

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
          `

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
          ])

          const summary = summaryRows?.[0] ?? {}
          const total = Number(summary.total ?? 0)
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
          }

          setCache(cacheKey, result)
          res.statusCode = 200
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(result))
        } catch (error) {
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(
            JSON.stringify({
              error: 'Failed to fetch predictions from BigQuery',
              details: error?.message ?? 'Unknown error',
            })
          )
        }
      })

      server.middlewares.use('/api/segment-ai-copy', async (req, res) => {
        if (req.method !== 'GET') {
          res.statusCode = 405
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'Method not allowed' }))
          return
        }

        try {
          const parsedUrl = new URL(req.url ?? '/', 'http://localhost')
          const forceRefresh = parsedUrl.searchParams.get('refresh') === '1'
          const cacheKey = 'segment-ai-copy'

          if (!forceRefresh) {
            const cached = getCache(cacheKey)
            if (cached) {
              res.statusCode = 200
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ ...cached, cache: 'hit' }))
              return
            }
          }

          const client = new BigQuery()
          const query = `
            SELECT
              centroid_id,
              feature,
              categorical_value,
              numerical_value
            FROM \`pawait-data-hub.cloud_mastery.customer_segmentation\`
            ORDER BY centroid_id, feature
          `

          const [rows] = await client.query({ query, useLegacySql: false })
          const centroids = normalizeSegmentationRows(rows)
          const aiResult = await generateSegmentNarratives(centroids)

          const result = {
            generatedAt: new Date().toISOString(),
            model: VERTEX_AI_MODEL_NAME,
            segments: aiResult.segments,
            source: {
              table: 'pawait-data-hub.cloud_mastery.customer_segmentation',
              centroidCount: centroids.length,
            },
          }

          setCache(cacheKey, result)
          res.statusCode = 200
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ ...result, cache: forceRefresh ? 'refresh' : 'miss' }))
        } catch (error) {
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(
            JSON.stringify({
              error: 'Failed to generate segment AI copy',
              details: error?.message ?? 'Unknown error',
            })
          )
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), customerOrderDetailsApiPlugin()],
})
