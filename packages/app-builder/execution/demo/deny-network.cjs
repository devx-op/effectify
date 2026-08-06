#!/usr/bin/env node
"use strict"

const { spawnSync } = require("node:child_process")
const http = require("node:http")
const https = require("node:https")
const net = require("node:net")
const tls = require("node:tls")

const deny = () => {
  throw new Error("Network access is disabled for the POSIX smoke harness")
}

const localIpc = (value) => {
  if (typeof value === "number") return true
  if (typeof value === "string") return value.includes("/")
  if (typeof value !== "object" || value === null) return false
  if (typeof value.path === "string") return true
  return value.host === undefined || value.host === "localhost" || value.host === "127.0.0.1" || value.host === "::1"
}

const guardConnection = (connect) =>
  function guardedConnection(...args) {
    if (localIpc(args[0])) return connect.apply(this, args)
    return deny()
  }

if (process.env.EFFECTIFY_DENY_NETWORK === "1") {
  http.request = deny
  http.get = deny
  https.request = deny
  https.get = deny
  net.connect = guardConnection(net.connect)
  net.createConnection = guardConnection(net.createConnection)
  net.Socket.prototype.connect = guardConnection(net.Socket.prototype.connect)
  tls.connect = deny
  global.fetch = deny
  module.exports = { deny }
} else {
  const separator = process.argv.indexOf("--")
  const command = process.argv.slice(separator + 1)
  if (separator === -1 || command.length === 0) {
    console.error("Usage: deny-network.cjs -- <command> [args...]")
    process.exitCode = 64
  } else {
    const existing = process.env.NODE_OPTIONS ?? ""
    const result = spawnSync(command[0], command.slice(1), {
      env: {
        ...process.env,
        EFFECTIFY_DENY_NETWORK: "1",
        NODE_OPTIONS: `${existing} --require=${__filename}`.trim(),
      },
      stdio: "inherit",
    })
    process.exitCode = result.status ?? 1
  }
}
