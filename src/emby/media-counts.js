// 媒体计数（Media count）的唯一归属模块：九个计数字段的字段表与
// 形状/总数/差值/Emby 响应映射，全部从 MEDIA_COUNT_FIELDS 派生。
// 新增一种计数类型时只改这里（emby_media_counts* 建表列除外）。
export const MEDIA_COUNT_FIELDS = [
    'movies', 'series', 'episodes', 'artists', 'albums',
    'songs', 'music_videos', 'box_sets', 'books',
];

// Emby /Items/Counts 响应键 → 字段名
const EMBY_COUNT_KEYS = {
    movies: 'MovieCount',
    series: 'SeriesCount',
    episodes: 'EpisodeCount',
    artists: 'ArtistCount',
    albums: 'AlbumCount',
    songs: 'SongCount',
    music_videos: 'MusicVideoCount',
    box_sets: 'BoxSetCount',
    books: 'BookCount',
};

export function mapItemCounts(data) {
    if (!data) return null;
    const out = {};
    for (const f of MEDIA_COUNT_FIELDS) out[f] = Number(data[EMBY_COUNT_KEYS[f]] || 0) | 0;
    return out;
}

// 状态卡片的 counts 形状：九字段 + updated_at（live 表带、每日表为 0）。
export function countsShape(row) {
    if (!row) return null;
    const out = {};
    for (const f of MEDIA_COUNT_FIELDS) out[f] = row[f] | 0;
    out.updated_at = row.updated_at | 0;
    return out;
}

export function countsTotal(row) {
    let total = 0;
    for (const f of MEDIA_COUNT_FIELDS) total += row[f] | 0;
    return total;
}

export function countsDelta(todayCounts, yesterdayCounts) {
    if (!todayCounts || !yesterdayCounts) return null;
    const out = {};
    for (const f of MEDIA_COUNT_FIELDS) out[f] = (todayCounts[f] | 0) - (yesterdayCounts[f] | 0);
    return out;
}
