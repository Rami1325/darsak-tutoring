/*
 * Lets a plain Node script import modules marked `server-only`.
 *
 * That package is a build-time guard: it throws the moment it is loaded
 * outside a React Server Component, which is exactly what stops a client
 * bundle from pulling in a database client or a private key. A regression
 * script is neither a server component nor a client bundle, so the guard has
 * nothing to protect and only gets in the way.
 *
 * The obvious alternative — running Node with `--conditions=react-server`,
 * which resolves the package to its own empty stub — cannot be used here: that
 * condition also swaps React for its server build, which has no
 * `createContext`, and next-intl's navigation helpers need one.
 *
 *   node --require ./scripts/server-only-stub.cjs ...
 */
const Module = require("node:module");
const path = require("node:path");

const resolve = Module._resolveFilename;

// The package ships an empty.js beside index.js but does not export the
// subpath, so it is reached by resolving the package and swapping the file.
let empty;

Module._resolveFilename = function (request, ...rest) {
  if (request === "server-only") {
    empty ??= path.join(path.dirname(resolve.call(this, request, ...rest)), "empty.js");
    return empty;
  }
  return resolve.call(this, request, ...rest);
};
