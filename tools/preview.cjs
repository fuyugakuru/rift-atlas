// Локальный просмотр через HTTP: нужен для YouTube и авторизации.
const http=require('http'),fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..');
const refreshStats=()=>require('./update-champion-stats.cjs').update({maxAgeMs:6*3600000}).catch(error=>console.warn('Stats: last good snapshot retained:',error.message));
refreshStats();
setInterval(refreshStats,6*3600000).unref();
const refreshPatches=()=>require('./update-patches.cjs').update().then(()=>require('./update-balance.cjs').update()).catch(error=>console.warn('Patches: previous feed retained:',error.message));
refreshPatches();setInterval(refreshPatches,3600000).unref();
const refreshMatchups=()=>require('./update-matchup-stats.cjs').update({maxAgeMs:24*3600000}).catch(error=>console.warn('Matchups: saved snapshots retained:',error.message));
refreshMatchups();setInterval(refreshMatchups,24*3600000).unref();
http.createServer((req,res)=>{
 let name;try{name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400);return res.end();}
 if(name==='/')name='/index.html';
 const file=path.resolve(root,'.'+name);
 if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
 fs.readFile(file,(error,bytes)=>{if(error){res.writeHead(404);return res.end('Not found');}res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp'})[path.extname(file)]||'application/octet-stream');if(name==='/champion-stats.json')res.setHeader('Cache-Control','no-cache');res.end(bytes);});
}).listen(8128,'127.0.0.1',()=>console.log('Rift Atlas: http://127.0.0.1:8128\nKeep this window open while using the website.'));
