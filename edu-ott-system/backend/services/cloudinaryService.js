const crypto = require('node:crypto');

const { v2: cloudinary } = require('cloudinary');

const env = require('../config/env');

const isConfigured = () =>
  Boolean(env.cloudinaryCloudName && env.cloudinaryApiKey && env.cloudinaryApiSecret);

const ensureConfigured = () => {
  if (!isConfigured()) {
    throw new Error('Cloudinary is not configured');
  }
};

const configureClient = () => {
  ensureConfigured();
  cloudinary.config({
    cloud_name: env.cloudinaryCloudName,
    api_key: env.cloudinaryApiKey,
    api_secret: env.cloudinaryApiSecret,
    secure: true,
  });
};

const normalizeResourceType = (resourceType) => {
  const raw = String(resourceType || 'auto').toLowerCase();
  if (['image', 'video', 'raw', 'auto'].includes(raw)) {
    return raw;
  }
  return 'auto';
};

const createSignedUploadParams = ({ folder, publicId, resourceType, userId }) => {
  configureClient();

  const resolvedFolder = folder || `${env.cloudinaryUploadFolder}/user-${userId}`;
  const resolvedPublicId = publicId || crypto.randomUUID();
  const resolvedResourceType = normalizeResourceType(resourceType);
  const timestamp = Math.floor(Date.now() / 1000);
  const expiresAt = timestamp + env.cloudinarySignatureTtlSeconds;
  const paramsToSign = {
    folder: resolvedFolder,
    public_id: resolvedPublicId,
    timestamp,
  };

  const signature = cloudinary.utils.api_sign_request(paramsToSign, env.cloudinaryApiSecret);

  return {
    cloudName: env.cloudinaryCloudName,
    apiKey: env.cloudinaryApiKey,
    timestamp,
    signature,
    folder: resolvedFolder,
    publicId: resolvedPublicId,
    resourceType: resolvedResourceType,
    uploadUrl: `https://api.cloudinary.com/v1_1/${env.cloudinaryCloudName}/${resolvedResourceType}/upload`,
    expiresInSeconds: env.cloudinarySignatureTtlSeconds,
    expiresAt,
  };
};

const destroyAsset = async ({ publicId, resourceType }) => {
  configureClient();
  return cloudinary.uploader.destroy(publicId, {
    resource_type: normalizeResourceType(resourceType),
    invalidate: true,
  });
};

module.exports = {
  isConfigured,
  createSignedUploadParams,
  destroyAsset,
};
