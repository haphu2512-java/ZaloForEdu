const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const crypto = require('node:crypto');
const env = require('../config/env');

const isConfigured = () => {
  return Boolean(
    env.awsAccessKeyId &&
    env.awsSecretAccessKey &&
    env.awsRegion &&
    env.awsS3Bucket
  );
};

let s3Client = null;

const getS3Client = () => {
  if (!isConfigured()) {
    throw new Error('AWS S3 is not fully configured. Please set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, and AWS_S3_BUCKET in your environment.');
  }
  if (!s3Client) {
    s3Client = new S3Client({
      region: env.awsRegion,
      credentials: {
        accessKeyId: env.awsAccessKeyId,
        secretAccessKey: env.awsSecretAccessKey,
      },
    });
  }
  return s3Client;
};

/**
 * Upload file buffer to S3 bucket
 * @param {Buffer} fileBuffer
 * @param {string} fileName
 * @param {string} mimeType
 * @returns {Promise<string>} Public URL of the uploaded file
 */
const uploadToS3 = async (fileBuffer, fileName, mimeType) => {
  const client = getS3Client();
  const fileExtension = fileName.includes('.') ? fileName.substring(fileName.lastIndexOf('.')) : '';
  const uniqueKey = `uploads/${Date.now()}-${crypto.randomUUID()}${fileExtension}`;

  const command = new PutObjectCommand({
    Bucket: env.awsS3Bucket,
    Key: uniqueKey,
    Body: fileBuffer,
    ContentType: mimeType,
  });

  await client.send(command);

  // Return the public URL
  // https://<bucket>.s3.<region>.amazonaws.com/<key>
  return `https://${env.awsS3Bucket}.s3.${env.awsRegion}.amazonaws.com/${uniqueKey}`;
};

/**
 * Delete file from S3 bucket
 * @param {string} fileUrl
 * @returns {Promise<void>}
 */
const deleteFromS3 = async (fileUrl) => {
  const client = getS3Client();
  
  // Extract key from URL
  const prefix = `https://${env.awsS3Bucket}.s3.${env.awsRegion}.amazonaws.com/`;
  if (!fileUrl.startsWith(prefix)) {
    console.warn(`URL does not match S3 bucket prefix: ${fileUrl}`);
    return;
  }
  
  const key = fileUrl.substring(prefix.length);

  const command = new DeleteObjectCommand({
    Bucket: env.awsS3Bucket,
    Key: key,
  });

  await client.send(command);
};

module.exports = {
  isConfigured,
  uploadToS3,
  deleteFromS3,
};
