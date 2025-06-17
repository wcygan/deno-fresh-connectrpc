#!/usr/bin/env -S deno run -A --watch=static/,routes/

import dev from "@fresh/core/dev";

await dev({
  main: "./main.ts",
});