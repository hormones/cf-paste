const { unstable_dev } = require("wrangler");

// This is a proxy for `wrangler dev` that allows us to customize the dev server.
// We are using it to bypass the worker for the scheduled event trigger endpoint.
// This prevents the trigger request from being caught by the worker's router.
module.exports = {
  // We want to bypass the worker for the scheduled event trigger endpoint.
  // This is the endpoint that `wrangler dev --test-scheduled` uses to trigger
  // the scheduled event.
  async "serve"(...args) {
    const dev = await unstable_dev(args[0], {
      ...args[1],
      // Let's proxy the /cdn-cgi/ path to the upstream dev server
      // so it doesn't get caught by the worker's router.
      "proxy": {
        "/cdn-cgi/": "http://localhost:8787"
      }
    });
    // await the dev server to exit
    await dev.proxy();
  }
};
