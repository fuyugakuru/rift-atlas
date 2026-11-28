'use strict';
const fs=require('fs'),path=require('path'),root=path.resolve(__dirname,'..');
const catalog=JSON.parse(fs.readFileSync(path.join(root,'champion-catalog.json'))),videos=JSON.parse(fs.readFileSync(path.join(root,'profile-videos.json'))).videos,result={};
for(const champion of catalog){const src=videos[champion.id];if(!src)continue;const url=new URL(src);if(url.protocol!=='https:'||url.hostname!=='cmsassets.rgpub.io'||!url.pathname.endsWith('.mp4'))throw Error('Unexpected champion video: '+champion.id);result[champion.id]=src;}
fs.writeFileSync(path.join(root,'champion-motion-data.js'),'window.RIFT_CHAMPION_MOTION='+JSON.stringify(result,null,2)+';\n');
console.log('Champion animations: '+Object.keys(result).length+'/'+catalog.length);
