import { Client } from 'minio';
import { logger } from '../utils/logger';
import crypto from 'crypto';

let minioClient: Client | null = null;

export function getMinioClient(): Client {
  if (minioClient) return minioClient;

  const endPoint = process.env.MINIO_ENDPOINT || 'localhost';
  const port = parseInt(process.env.MINIO_PORT || '9000');
  const useSSL = process.env.MINIO_USE_SSL === 'true';
  const accessKey = process.env.MINIO_ACCESS_KEY || 'minioadmin';
  const secretKey = process.env.MINIO_SECRET_KEY || 'minioadmin';

  minioClient = new Client({
    endPoint,
    port,
    useSSL,
    accessKey,
    secretKey,
  });

  minioClient.on('error', (err) => {
    logger.error({ err }, 'MinIO client error');
  });

  return minioClient;
}

export async function ensureBucket(bucketName: string): Promise<void> {
  const client = getMinioClient();
  const exists = await client.bucketExists(bucketName);
  if (!exists) {
    await client.makeBucket(bucketName, 'us-east-1');
    // Configura política pública para leitura de objetos (opcional)
    const policy = {
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Principal: '*',
          Action: ['s3:GetObject'],
          Resource: [`arn:aws:s3:::${bucketName}/*`],
        },
      ];
      await client.setBucketPolicy(bucketName, JSON.stringify(policy));
  }
}

// Inicializa buckets na inicialização
export async function initializeMinio(): Promise<void> {
  const buckets = [
    process.env.MINIO_BUCKET || 'entregafacil',
    'entregas',
    'assinaturas',
    'tiles',
  ];

  for (const bucket of buckets) {
    try {
      await ensureBucket(bucket);
    } catch (error) {
      console.error(`Failed to ensure bucket ${bucket}:`, error);
    }
  }
}

// Gera URL pré-assinada para upload direto do cliente (opcional)
export async function generatePresignedUploadUrl(
  bucketName: string,
  objectName: string,
  expirySeconds: number = 3600
): Promise<string> {
  const client = getMinioClient();
  return client.presignedPutObject(bucketName, objectName, expirySeconds);
}

// Gera presigned POST policy para upload direto do mobile (melhor para arquivos grandes)
export async function generatePresignedPostPolicy(
  bucketName: string,
  conditions: Record<string, string>,
  expirySeconds: number = 3600
): Promise<{ postURL: string; policy: string; signature: string }> {
  // MinIO JS SDK doesn't have built-in presignedPostPolicy
  // Implementamos manualmente usando AWS S3 v4 signature
  // Referência: https://docs.aws.amazon.com/AmazonS3/latest/API/sigv4-HTTPPOSTConstructPolicy.html
  
  const endPoint = process.env.MINIO_ENDPOINT || 'localhost';
  const port = parseInt(process.env.MINIO_PORT || '9000');
  const useSSL = process.env.MINIO_USE_SSL === 'true';
  const accessKey = process.env.MINIO_ACCESS_KEY || 'minioadmin';
  const secretKey = process.env.MINIO_SECRET_KEY || 'minioadmin';
  const region = 'us-east-1';
  
  const protocol = useSSL ? 'https' : 'http';
  const host = `${endPoint}:${port}`;
  const postURL = `${protocol}://${host}/${bucketName}`;
  
  // Policy document
  const now = new Date();
  const expiration = new Date(now.getTime() + expirySeconds * 1000);
  
  const policyDoc: any = {
    expiration: expiration.toISOString(),
    conditions: [
      { bucket: bucketName },
      ['starts-with', '$key', ''],
      ['starts-with', '$Content-Type', ''],
      ['content-length-range', 0, 52428800], // 50MB max
    ],
  };
  
  // Adiciona condições customizadas
  Object.entries(conditions).forEach(([key, value]) => {
    if (key.startsWith('x-amz-meta-')) {
      policyDoc.conditions.push({ [key]: value });
    }
  });
  
  const policyBase64 = Buffer.from(JSON.stringify(policyDoc)).toString('base64');
  
  // Sign policy com AWS v4 signature usando Node.js crypto
  const dateStamp = now.toISOString().split('T')[0].replace(/-/g, '');
  const credentialScope = `${dateStamp}/${region}/s3/aws4_request`;
  
  // Criar signing key usando HMAC SHA256
  const kDate = hmacSha256(`AWS4${secretKey}`, dateStamp);
  const kRegion = hmacSha256(kDate, region);
  const kService = hmacSha256(kRegion, 's3');
  const kSigning = hmacSha256(kService, 'aws4_request');
  
  const signature = hmacSha256(kSigning, policyBase64);
  const signatureHex = signature.toString('hex');
  
  return {
    postURL,
    policy: policyBase64,
    signature: signatureHex,
  };
}

// Helper para HMAC SHA256 usando Node.js crypto
function hmacSha256(key: Buffer | string, data: string): Buffer {
  return crypto.createHmac('sha256', key).update(data).digest();
}

// Gera URL pré-assinada para download
export async function generatePresignedDownloadUrl(
  bucketName: string,
  objectName: string,
  expirySeconds: number = 3600
): Promise<string> {
  const client = getMinioClient();
  return client.presignedGetObject(bucketName, objectName, expirySeconds);
}

// Upload de buffer
export async function uploadBuffer(
  bucketName: string,
  objectName: string,
  buffer: Buffer,
  contentType: string = 'application/octet-stream'
): Promise<void> {
  const client = getMinioClient();
  await client.putObject(
    bucketName,
    objectName,
    buffer,
    buffer.length,
    { 'Content-Type': 'image/jpeg' } // Default, pode ser sobrescrito
  );
}

// Download de objeto
export async function downloadObject(
  bucketName: string,
  objectName: string
): Promise<Buffer> {
  const client = getMinioClient();
  const stream = await client.getObject(bucketName, objectName);
  
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

// Remove objeto
export async function removeObject(bucketName: string, objectName: string): Promise<void> {
  const client = getMinioClient();
  await client.removeObject(bucketName, objectName);
}

// Lista objetos
export async function listObjects(bucketName: string, prefix: string = '', recursive: boolean = true): Promise<string[]> {
  const client = getMinioClient();
  const objects: string[] = [];
  
  const stream = client.listObjects(bucketName, prefix, recursive);
  for await (const obj of stream) {
    if (obj.name) objects.push(obj.name);
  }
  return objects;
}

export const minioClient = {
  putObject: async (bucketName: string, objectName: string, buffer: Buffer, size: number, metaData: any) => {
    const client = getMinioClient();
    await client.putObject(bucketName, objectName, buffer, size, metaData);
  },
  presignedGetObject: async (bucketName: string, objectName: string, expiry: number) => {
    const client = getMinioClient();
    return client.presignedGetObject(bucketName, objectName, expiry);
  },
  presignedPutObject: async (bucketName: string, objectName: string, expiry: number) => {
    const client = getMinioClient();
    return client.presignedPutObject(bucketName, objectName, expiry);
  },
  getObject: async (bucketName: string, objectName: string) => {
    const client = getMinioClient();
    return client.getObject(bucketName, objectName);
  },
  removeObject: async (bucketName: string, objectName: string) => {
    const client = getMinioClient();
    return client.removeObject(bucketName, objectName);
  },
  listObjects: async (bucketName: string, prefix: string, recursive: boolean) => {
    const client = getMinioClient();
    return client.listObjects(bucketName, prefix, recursive);
  },
};