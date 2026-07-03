import { getFormattedCFTraffic } from './traffic.js';

export async function getCFTraffic(env, type) {
    return getFormattedCFTraffic(env, type);
}
