#!/usr/bin/env node
// Cloudflare Workers 安全混淆配置（与 https://hx.crush.ccwu.cc/ 同款）。
// 关键约束（不可改）：
//   - controlFlowFlattening: false  → 否则 CF 触发 CPU 超时 (error 1101)
//   - deadCodeInjection:    false   → 防止文件过大超 1MB 限制
const fs = require('fs');
const path = require('path');
const JavaScriptObfuscator = require('javascript-obfuscator');

const [, , inputArg, outputArg] = process.argv;
if (!inputArg || !outputArg) {
    console.error('usage: node scripts/obfuscate.js <input.js> <output.js>');
    process.exit(1);
}

const src = fs.readFileSync(inputArg, 'utf8');
const result = JavaScriptObfuscator.obfuscate(src, {
    compact: true,
    controlFlowFlattening: false,
    deadCodeInjection: false,
    stringArray: true,
    stringArrayEncoding: ['base64'],
    identifierNamesGenerator: 'hexadecimal',
});

fs.mkdirSync(path.dirname(outputArg), { recursive: true });
fs.writeFileSync(outputArg, result.getObfuscatedCode());
console.log(`obfuscated ${inputArg} -> ${outputArg} (${(fs.statSync(outputArg).size / 1024).toFixed(1)} KiB)`);
