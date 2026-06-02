/**
 * Migration script: Move local uploads to AWS S3 and update database entries.
 * Run with: node scripts/migrateToS3.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const fs = require('node:fs/promises');
const path = require('node:path');
const mongoose = require('mongoose');
const s3Service = require('../services/s3Service');
const Media = require('../models/Media');

async function run() {
  if (!s3Service.isConfigured()) {
    console.error('❌ AWS S3 is not configured in .env. Please fill out S3 variables first.');
    process.exit(1);
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ MONGODB_URI is not defined in .env');
    process.exit(1);
  }

  console.log('🔄 Connecting to MongoDB...');
  await mongoose.connect(uri);
  console.log('✅ Connected to MongoDB.');

  // Find all Media items with local storage
  const localMedia = await Media.find({ storage: 'local' });
  console.log(`📁 Found ${localMedia.length} media files with storage = 'local'`);

  if (localMedia.length === 0) {
    console.log('✅ No files to migrate.');
    await mongoose.disconnect();
    return;
  }

  let successCount = 0;
  let failCount = 0;
  let skipCount = 0;

  for (let i = 0; i < localMedia.length; i++) {
    const media = localMedia[i];
    const relativePath = media.url.replace(/^[\\/]/, '');
    const absolutePath = path.join(__dirname, '..', relativePath);

    console.log(`\n[${i + 1}/${localMedia.length}] Processing file: ${media.fileName} (${media.url})`);

    // Verify if local file exists
    try {
      await fs.access(absolutePath);
    } catch (err) {
      console.warn(`⚠️ Local file not found at ${absolutePath}. Skipping migration for this record.`);
      skipCount++;
      continue;
    }

    try {
      console.log(`   Reading file buffer...`);
      const fileBuffer = await fs.readFile(absolutePath);

      console.log(`   Uploading to AWS S3...`);
      const s3Url = await s3Service.uploadToS3(fileBuffer, media.fileName, media.mimeType);
      console.log(`   Uploaded successfully. S3 URL: ${s3Url}`);

      console.log(`   Updating database record...`);
      media.storage = 's3';
      media.url = s3Url;
      await media.save();

      console.log(`   Deleting local file...`);
      await fs.unlink(absolutePath);
      console.log(`   Deleted local file successfully.`);

      successCount++;
    } catch (err) {
      console.error(`❌ Failed to migrate ${media.fileName}:`, err.message);
      failCount++;
    }
  }

  console.log('\n======================================');
  console.log('📊 Migration Summary:');
  console.log(`   Total Found: ${localMedia.length}`);
  console.log(`   Migrated Successfully: ${successCount}`);
  console.log(`   Failed: ${failCount}`);
  console.log(`   Skipped (Not found locally): ${skipCount}`);
  console.log('======================================');

  await mongoose.disconnect();
  console.log('🔌 Disconnected from MongoDB.');
}

run().catch((err) => {
  console.error('❌ Migration crashed:', err);
  process.exit(1);
});
