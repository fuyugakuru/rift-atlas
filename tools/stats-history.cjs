function mergeHistory(history, snapshots) {
  if (history && (history.schema !== 1 || history.region !== 'CN' || !history.series)) throw Error('Invalid history; refusing to overwrite it');
  const result = { schema: 1, region: 'CN', series: { ...(history?.series || {}) } };
  for (const snapshot of snapshots.filter(Boolean)) {
    for (const row of snapshot.rows || []) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(row.date) || !Number.isFinite(row.win) || row.win < 0 || row.win > 100) throw Error('Invalid history point');
      const key = [row.champion, row.rank, row.lane].join('|');
      const dates = new Map((result.series[key] || []).map(point => [point.date, point]));
      const point = { ...(dates.get(row.date) || {}), date: row.date, win: row.win };
      for (const metric of ['pick','ban']) if (Number.isFinite(row[metric]) && row[metric]>=0 && row[metric]<=100) point[metric]=row[metric];
      dates.set(row.date, point);
      result.series[key] = [...dates].sort(([a],[b])=>a.localeCompare(b)).slice(-90).map(([,point])=>point);
    }
  }
  return result;
}
module.exports = { mergeHistory };
