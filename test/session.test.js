import {test} from 'node:test';
import assert from 'node:assert/strict';
import {verifiedSession,sessionToken} from '../public/session.js';

test('a cached empty response does not appear signed in',()=>{
  for(const data of [null,{}, {user:null,session:null},{user:{id:'one'},session:null}]) {
    assert.equal(verifiedSession({data}),null);
  }
});
test('the Neon session JWT is used for API access after restoring a session',()=>{
  const data={user:{id:'one'},session:{token:'header.payload.signature'}};
  assert.equal(sessionToken(verifiedSession({data})),data.session.token);
});
test('failed refreshes and missing JWTs never send null or an opaque token to the API',()=>{
  assert.throws(()=>verifiedSession({error:{message:'offline'}}));
  for(const value of [null,{}, {session:{token:'opaque-session-cookie'}}]) assert.throws(()=>sessionToken(value));
});
