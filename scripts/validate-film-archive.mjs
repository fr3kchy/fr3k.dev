import {readFileSync, existsSync} from "node:fs";
import {join} from "node:path";
import {fileURLToPath} from "node:url";
import {dirname} from "node:path";
import assert from "node:assert/strict";
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const archive = JSON.parse(readFileSync(join(root,"data/films-120s.json"),"utf8"));
const html = readFileSync(join(root,"films/index.html"),"utf8");
const home = readFileSync(join(root,"index.html"),"utf8");
const media = readFileSync(join(root,"media.html"),"utf8");
const tag = "https://github.com/fr3kchy/fr3k.dev/releases/download/fr3k-films-120s-v1/";
assert.equal(archive.schema_version,1);
assert.equal(archive.count,17);
assert.equal(archive.films.length,17);
assert.equal(new Set(archive.films.map(x=>x.id)).size,17);
assert.equal((html.match(/class="film-card"/g)||[]).length,17,"17 players in archive");
for(const f of archive.films){
  assert.match(f.id,/^[a-z0-9-]+$/);
  assert.match(f.sha256,/^[a-f0-9]{64}$/);
  assert.ok(f.size_bytes>1000000 && f.size_bytes<50000000);
  assert.ok(f.duration_seconds>119 && f.duration_seconds<126);
  assert.equal(f.video_url,tag+f.id+".mp4");
  assert.equal(f.poster_url,tag+f.id+".webp");
  if(f.captions_url) assert.equal(f.captions_url,tag+f.id+".vtt");
  assert.ok(html.includes(f.video_url),"missing video "+f.id);
  assert.ok(html.includes(f.poster_url),"missing poster "+f.id);
}
assert.ok(home.includes('/films/'),"homepage must link films");
assert.ok(media.includes('/films/'),"media library must link films");
for(const banned of ["archive-bael","archive-baphomet","archive-lucifer","archive-moloch","archive-satan"]){
  assert.ok(!html.includes(banned),"private archive accidentally listed");
  assert.ok(!archive.films.some(f=>f.id===banned),"private archive in manifest");
}
assert.ok(existsSync(join(root,"assets/css/film-archive.css")));
assert.ok(existsSync(join(root,"assets/js/film-archive.js")));
console.log("PASS: 17 original 120s film URLs, hashes, posters, captions, route links and archived-title exclusions.");
