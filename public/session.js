// Neon injects the signed JWT into getSession().data.session.token.
// Do not call Better Auth's separate /token route: Neon manages token refresh.
export function verifiedSession(result) {
  if (result?.error) throw new Error('Your account could not be refreshed. Please try again.');
  const data = result?.data;
  return data?.user?.id && data?.session?.token ? data : null;
}

export function sessionToken(session) {
  const token = session?.session?.token;
  if (typeof token !== 'string' || token.split('.').length !== 3) {
    throw new Error('Your account token could not be loaded. Please sign in again.');
  }
  return token;
}
