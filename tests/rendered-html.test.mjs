import assert from "node:assert/strict";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the AI Arms Race game shell", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>AI Arms Race/);
  assert.match(html, /class="game-page"/);
  assert.match(html, /START DISRUPTING/);
  assert.match(html, /THIS GAME IS SATIRE\. THE INCENTIVES ARE REAL\./);
  assert.match(html, /Arcade game area/);
  assert.match(html, /class="game-sound"/);
  assert.match(html, /View AI Arms Race source code on GitHub/);
  assert.doesNotMatch(
    html,
    /codex-preview|react-loading-skeleton|class="topbar"|fullscreen-exit|FULLSCREEN/,
  );
});
