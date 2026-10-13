import {rm,mkdir,cp}from'node:fs/promises';
import {build} from 'esbuild';
await rm('dist',{recursive:true,force:true});await mkdir('dist');await cp('public','dist',{recursive:true});
await build({entryPoints:['public/auth-client.js'],outfile:'dist/auth.js',bundle:true,format:'esm',platform:'browser',target:['es2022'],minify:true,legalComments:'linked'});
console.log('Studio and account client built.');
