#!/usr/bin/env node
import { APIGatewayClient, GetRestApisCommand } from '@aws-sdk/client-api-gateway'
import { S3Client, ListBucketsCommand } from '@aws-sdk/client-s3'
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
const IMAGE_BUCKET_NAME_OVERRIDE = process.env.IMAGE_BUCKET_NAME || ''

async function resolveApiBaseUrl() {
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
    throw new Error(`API named "${API_NAME}" not found at ${AWS_ENDPOINT_URL}`)
  }

  // LocalStack execute-api shim path for API Gateway v1
  return `${AWS_ENDPOINT_URL}/_aws/execute-api/${match.id}/${STAGE}/`
}

function guessImageBucketWebsiteUrlFromName(bucketName) {
  // LocalStack S3 website endpoint pattern
  return `${AWS_ENDPOINT_URL}/${bucketName}/`
}

async function resolveImageBucketWebsiteUrl() {
  if (IMAGE_BUCKET_NAME_OVERRIDE) {
    return guessImageBucketWebsiteUrlFromName(IMAGE_BUCKET_NAME_OVERRIDE)
  }

  const s3 = new S3Client({
    region: REGION,
    endpoint: AWS_ENDPOINT_URL,
    forcePathStyle: true,
    credentials: {
      accessKeyId: 'test',
      secretAccessKey: 'test',
    },
  })

  const res = await s3.send(new ListBucketsCommand({}))
  const buckets = res.Buckets || []

  // Heuristic match for the assets bucket name created by CDK:
  // e.g., swagstoremainstack-assetsswagstoreimageasse-xxxxxxxx
  const candidate = buckets
    .map((b) => b.Name)
    .filter(Boolean)
    .find((name) =>
      name.includes('assetsswagstoreimageasse') ||
      name.includes('swagstoreimageassets') ||
      name.includes('imageassets')
    )

  if (!candidate) {
    throw new Error('Could not find image assets S3 bucket. Set IMAGE_BUCKET_NAME env var to override.')
  }

  return guessImageBucketWebsiteUrlFromName(candidate)
}

async function main() {
  try {
    const [apiBaseUrl, imageBucketUrl] = await Promise.all([
      resolveApiBaseUrl(),
      resolveImageBucketWebsiteUrl(),
    ])

    const envPath = join(projectRoot, '.env')
    const contents = `VITE_API_BASE_URL=${apiBaseUrl}\nVITE_IMAGE_BUCKET_URL=${imageBucketUrl}\n`
    writeFileSync(envPath, contents, 'utf8')
    console.log(`Wrote VITE_API_BASE_URL to ${envPath}: ${apiBaseUrl}`)
    console.log(`Wrote VITE_IMAGE_BUCKET_URL to ${envPath}: ${imageBucketUrl}`)
  } catch (err) {
    console.error('Failed to inject environment:', err?.message || err)
    process.exit(1)
  }
}

main()


