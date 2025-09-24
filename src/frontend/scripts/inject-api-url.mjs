#!/usr/bin/env node
import { APIGatewayClient, GetRestApisCommand } from '@aws-sdk/client-api-gateway'
import { writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const projectRoot = join(__dirname, '..')

const API_NAME = process.env.API_NAME || 'LocalStack Swag Store API'
const AWS_ENDPOINT_URL = process.env.AWS_ENDPOINT_URL || 'http://localhost:4566'
const REGION = process.env.AWS_REGION || 'us-east-1'
const STAGE = process.env.API_STAGE || 'v1'

async function main() {
  try {
    const client = new APIGatewayClient({
      region: REGION,
      endpoint: AWS_ENDPOINT_URL,
      credentials: {
        accessKeyId: 'test',
        secretAccessKey: 'test',
      },
    })

    const res = await client.send(new GetRestApisCommand({ limit: 500 }))
    const items = res.items || []
    const match = items.find((i) => i.name === API_NAME)
    if (!match?.id) {
      console.error(`API named "${API_NAME}" not found at ${AWS_ENDPOINT_URL}`)
      process.exit(1)
    }

    const base = `http://localhost:4566/_aws/execute-api/${match.id}/${STAGE}/`
    const envPath = join(projectRoot, '.env')
    writeFileSync(envPath, `VITE_API_BASE_URL=${base}\n`, 'utf8')
    console.log(`Wrote VITE_API_BASE_URL to ${envPath}: ${base}`)
  } catch (err) {
    console.error('Failed to inject API URL:', err?.message || err)
    process.exit(1)
  }
}

main()


