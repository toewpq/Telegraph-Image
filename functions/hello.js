export const config = {
  runtime: 'edge',
};

export async function onRequest(context) {
  return new Response('hello,api', {
    headers: { 'content-type': 'text/plain' }
  });
}
