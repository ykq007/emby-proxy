// 为自托管 libSQL（sqld）生成鉴权密钥对 + Worker 用的访问令牌。
// 用法：node scripts/libsql-keygen.mjs
//   SQLD_AUTH_JWT_KEY → 给 VPS 上的 sqld（公钥，只能验签）
//   LIBSQL_AUTH_TOKEN → 给 Worker（wrangler secret put LIBSQL_AUTH_TOKEN）
// 私钥用完即弃，不落盘：要换令牌就重跑一次，同时更新两边。
import { generateKeyPairSync, sign } from 'node:crypto';

const b64url = (buf) => Buffer.from(buf).toString('base64url');
const { publicKey, privateKey } = generateKeyPairSync('ed25519');
const rawPublic = publicKey.export({ format: 'jwk' }).x; // 32 字节公钥，已是 base64url

const header = b64url(JSON.stringify({ alg: 'EdDSA', typ: 'JWT' }));
const payload = b64url(JSON.stringify({ a: 'rw', iat: Math.floor(Date.now() / 1000) }));
const signature = b64url(sign(null, Buffer.from(`${header}.${payload}`), privateKey));

console.log(`SQLD_AUTH_JWT_KEY=${rawPublic}`);
console.log(`LIBSQL_AUTH_TOKEN=${header}.${payload}.${signature}`);
