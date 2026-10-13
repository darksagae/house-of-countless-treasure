import './build.js';
import http from'node:http';import{readFile}from'node:fs/promises';import path from'node:path';import handler from'../api/studio.js';
const types={'.html':'text/html','.css':'text/css','.js':'text/javascript','.json':'application/json','.webp':'image/webp'};
http.createServer(async(req,res)=>{const url=new URL(req.url,'http://localhost');if(url.pathname==='/api/studio'){
 res.status=n=>{res.statusCode=n;return res};res.json=data=>{res.setHeader('Content-Type','application/json');res.end(JSON.stringify(data))};let total=0,parts=[];for await(const part of req){total+=part.length;if(total>3000000){res.status(413).json({error:'Upload too large.'});return}parts.push(part)}req.body=Buffer.concat(parts).toString();return handler(req,res)}
 const file=url.pathname==='/'?'index.html':url.pathname.slice(1);if(file.includes('..')){res.writeHead(403);return res.end()}
 try{const content=await readFile(file==='auth.js'?path.join('dist',file):path.join('public',file));res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');res.end(content)}catch{res.writeHead(404);res.end('Not found')}}).listen(Number(process.env.PORT)||8310,'127.0.0.1',()=>console.log('Studio preview at http://127.0.0.1:'+(Number(process.env.PORT)||8310)));
