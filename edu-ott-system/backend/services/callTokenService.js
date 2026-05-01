const crypto = require('node:crypto');
const env = require('../config/env');

/**
 * Generate a ZegoCloud Kit Token (04 version) on the server.
 *
 * This replaces the client-side `generateKitTokenForTest` that was
 * exposing the server secret in browser bundles.
 *
 * References:
 *   https://www.zegocloud.com/docs/uikit/callkit-web/quick-start/token-authentication
 *
 * Token layout (version 04):
 *   "04" + base64( json({ ver, appID, … }) + expire + iv + encrypted(userId) )
 */

const TOKEN_VERSION = '04';
const TOKEN_LIFETIME_SECONDS = 3600; // 1 hour

function makeNonce() {
  return crypto.randomInt(0, 2147483647);
}

/**
 * Build a ZEGOCLOUD token (server-to-server safe).
 *
 * @param {string} userId  – unique user identifier
 * @param {string} roomId  – (optional) room to scope the token to
 * @returns {string} kitToken  ready to pass to ZegoUIKitPrebuilt.create()
 */
function generateZegoToken(userId, roomId = '') {
  const appId = env.zegoAppId;
  const serverSecret = env.zegoServerSecret;

  if (!appId || !serverSecret) {
    throw new Error('ZEGO_APP_ID / ZEGO_SERVER_SECRET not configured');
  }

  const now = Math.floor(Date.now() / 1000);
  const expire = now + TOKEN_LIFETIME_SECONDS;
  const nonce = makeNonce();

  // Payload that gets encrypted
  const payloadJson = JSON.stringify({
    app_id: appId,
    user_id: userId,
    nonce,
    ctime: now,
    expire,
    payload: roomId || '',
  });

  // AES-CBC-128 encryption
  const key = Buffer.alloc(16);
  Buffer.from(serverSecret, 'utf8').copy(key);

  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-128-cbc', key, iv);
  cipher.setAutoPadding(true);
  const encrypted = Buffer.concat([cipher.update(payloadJson, 'utf8'), cipher.final()]);

  // Pack everything
  const expireBuf = Buffer.alloc(8);
  expireBuf.writeBigInt64BE(BigInt(expire));

  const body = Buffer.concat([expireBuf, iv, encrypted]);
  const token = TOKEN_VERSION + body.toString('base64');

  // Wrap as kit token (same format the SDK generates)
  const kitTokenPayload = Buffer.from(
    JSON.stringify({
      app_id: appId,
      token,
      user_id: userId,
      user_name: userId, // caller can rename via query
    }),
  ).toString('base64');

  return TOKEN_VERSION + kitTokenPayload;
}

module.exports = { generateZegoToken };
