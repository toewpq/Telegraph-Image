export async function onRequest(context) {
  const { env } = context;

  try {
    const { results } = await env.DB.prepare(
      "SELECT name FROM sqlite_master WHERE type='table';"
    ).all();

    return new Response(
      JSON.stringify({
        status: "success",
        tables: results.map(r => r.name)
      }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        status: "error",
        message: error.message,
        stack: error.stack
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
