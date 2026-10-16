/**
 * Object storage adapter for finished video assets.
 *
 * s3 mode   — any S3-compatible endpoint (AWS S3, Cloudflare R2, Backblaze,
 *             MinIO) via @aws-sdk/client-s3.
 * local mode — dev fallback writing under the OS temp dir and served by
 *             express.static at config.storage.local.urlPrefix.
 *
 * When neither mode can actually store bytes, every call throws — the
 * pipeline must never pretend an upload succeeded.
 */
var fs = require('fs');
var path = require('path');
var videoConfig = require('../../config/video');

var s3Client = null;
var s3Bucket = null;

function getS3Client() {
  if (s3Client) return { client: s3Client, bucket: s3Bucket };
  var cfg = videoConfig.get().storage.s3;
  if (!cfg.bucket || !cfg.accessKeyId || !cfg.secretAccessKey) {
    throw new Error('Object storage is not configured (OBJECT_STORAGE_BUCKET, OBJECT_STORAGE_ACCESS_KEY, OBJECT_STORAGE_SECRET_KEY)');
  }
  var { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
  var client = new S3Client({
    region: cfg.region || 'auto',
    endpoint: cfg.endpoint || undefined,
    forcePathStyle: Boolean(cfg.endpoint),
    credentials: {
      accessKeyId: cfg.accessKeyId,
      secretAccessKey: cfg.secretAccessKey,
    },
  });
  s3Client = client;
  s3Bucket = cfg.bucket;
  return { client: client, bucket: s3Bucket, PutObjectCommand: PutObjectCommand };
}

function localPathFor(key) {
  var cfg = videoConfig.get().storage.local;
  var safeKey = String(key).replace(/\.\./g, '').replace(/^\/+/, '');
  var full = path.join(cfg.dir, safeKey);
  if (!full.startsWith(path.resolve(cfg.dir))) {
    throw new Error('Invalid storage key');
  }
  return full;
}

function publicUrlFor(key) {
  var storage = videoConfig.get().storage;
  if (storage.mode === 's3') {
    var s3 = storage.s3;
    if (s3.publicBaseUrl) return `${s3.publicBaseUrl}/${key}`;
    if (s3.endpoint) return `${s3.endpoint.replace(/\/$/, '')}/${s3.bucket}/${key}`;
    return `https://${s3.bucket}.s3.amazonaws.com/${key}`;
  }
  return `${storage.local.urlPrefix}/${key}`;
}

async function putObject(key, buffer, contentType) {
  var storage = videoConfig.get().storage;
  if (storage.mode === 's3') {
    var s3 = getS3Client();
    var command = new s3.PutObjectCommand({
      Bucket: s3.bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType || 'application/octet-stream',
    });
    await s3.client.send(command);
    return { key: key, url: publicUrlFor(key), storage: 's3' };
  }

  var full = localPathFor(key);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, buffer);
  return { key: key, url: publicUrlFor(key), storage: 'local' };
}

async function putFile(key, filePath, contentType) {
  var buffer = fs.readFileSync(filePath);
  return putObject(key, buffer, contentType);
}

function getStorageMode() {
  return videoConfig.get().storage.mode;
}

module.exports = { putObject, putFile, publicUrlFor, getStorageMode };
