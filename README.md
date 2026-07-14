# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## BigQuery data source

The dashboard now attempts to load order data from:

`pawait-data-hub.cloud_mastery.customer_order_details`

via a Vite dev API route:

`GET /api/customer-order-details`

The Future Buyer Predictor loads data from:

`pawait-data-hub.cloud_mastery.predictions`

via:

`GET /api/predictions?page=1&pageSize=50`

The predictions endpoint includes:

- Server-side pagination (`page`, `pageSize`)
- Server-side in-memory TTL caching (per page)
- Client-side page caching in the predictor view

### Local setup

1. Create a Google Cloud service account with BigQuery read access.
2. Set credentials in your shell before running dev:

```bash
export GOOGLE_APPLICATION_CREDENTIALS="/absolute/path/to/service-account.json"
```

3. Run:

```bash
npm run dev
```

BigQuery is now the only data source for order details. If credentials or permissions are missing, the dashboard will show no order rows.
