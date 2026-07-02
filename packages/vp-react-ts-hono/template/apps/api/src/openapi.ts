import { createItemSchema, itemSchema } from '@app/contracts'
import * as z from 'zod/v4-mini'

// The OpenAPI document is generated from the shared Zod contracts (`z.toJSONSchema`) so the schemas
// stay the single source of truth — the docs never drift from what the api actually validates. Served
// raw at `/docs.json` and rendered by Swagger UI at `/docs` (see src/app.ts).
const itemJson = z.toJSONSchema(itemSchema)
const createItemJson = z.toJSONSchema(createItemSchema)

export const openApiDocument = {
  openapi: '3.1.0',
  info: { title: '__PROJECT_NAME__ API', version: '1.0.0' },
  paths: {
    '/api/health': {
      get: {
        summary: 'Health check',
        responses: { '200': { description: 'Service is up' } }
      }
    },
    '/api/items': {
      get: {
        summary: 'List items',
        responses: {
          '200': {
            description: 'All items',
            content: { 'application/json': { schema: { type: 'array', items: itemJson } } }
          }
        }
      },
      post: {
        summary: 'Create an item',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: createItemJson } }
        },
        responses: {
          '201': { description: 'Created', content: { 'application/json': { schema: itemJson } } },
          '400': { description: 'Validation error' }
        }
      }
    }
  }
}
