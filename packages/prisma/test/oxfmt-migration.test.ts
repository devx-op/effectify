import { spawn } from "node:child_process"
import { readFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import { describe, expect, it } from "vitest"

import * as FormatterModule from "../src/services/formatter-service.js"
import { FormatError } from "../src/services/formatter-service.js"

type FormatOptions = Record<string, unknown>

interface OxfmtModule {
  format: (
    fileName: string,
    sourceText: string,
    options?: FormatOptions,
  ) => Promise<{ code: string; errors: Array<{ message: string }> }>
}

interface ParityFixture {
  typescript: Array<{
    name: string
    fileName: string
    source: string
    expected: string
    options?: FormatOptions
    note?: string
  }>
  json: {
    fileName: string
    source: string
    expected: string
  }
  markdown: {
    fileName: string
    source: string
    expected: string
  }
  range: {
    fileName: string
    source: string
    start: { line: number; character: number }
    end: { line: number; character: number }
    expectedReplacement: string
  }
}

const packageDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const workspaceRoot = path.resolve(packageDir, "../..")

const readJson = async <A>(filePath: string): Promise<A> => JSON.parse(await readFile(filePath, "utf8")) as A

const loadOxfmt = async (): Promise<OxfmtModule> => {
  const packageName = "oxfmt"
  return import(/* @vite-ignore */ packageName) as Promise<OxfmtModule>
}

const fixturePromise = readJson<ParityFixture>(path.join(packageDir, "test/fixtures/oxfmt-parity.json"))

const loadRepositoryFormatOptions = async (): Promise<FormatOptions> => {
  const config = await readJson<Record<string, unknown>>(path.join(workspaceRoot, ".oxfmtrc.json"))
  const { $schema: _schema, ignorePatterns: _ignorePatterns, ...options } = config
  return options
}

const inspectLspRangeFormatting = async (
  fixture: ParityFixture["range"],
): Promise<{
  capabilities: Record<string, unknown>
  rangeFormattingError: string
}> => {
  const executable = path.join(workspaceRoot, "node_modules/.bin/oxfmt")
  const child = spawn(executable, ["--lsp"], {
    cwd: workspaceRoot,
    stdio: ["pipe", "pipe", "pipe"],
  })

  let sequence = 0
  let stdout = Buffer.alloc(0)
  const pending = new Map<number, { resolve: (value: unknown) => void; reject: (error: Error) => void }>()

  const send = (message: unknown) => {
    const body = JSON.stringify(message)
    child.stdin.write(`Content-Length: ${Buffer.byteLength(body)}\r\n\r\n${body}`)
  }

  const request = (method: string, params: unknown) =>
    new Promise<unknown>((resolve, reject) => {
      const id = ++sequence
      pending.set(id, { resolve, reject })
      send({ jsonrpc: "2.0", id, method, params })
    })

  const consume = () => {
    while (true) {
      const headerEnd = stdout.indexOf("\r\n\r\n")
      if (headerEnd === -1) return
      const header = stdout.subarray(0, headerEnd).toString("utf8")
      const contentLength = Number(/Content-Length: (\d+)/i.exec(header)?.[1])
      const messageEnd = headerEnd + 4 + contentLength
      if (stdout.length < messageEnd) return
      const message = JSON.parse(stdout.subarray(headerEnd + 4, messageEnd).toString("utf8")) as {
        id?: number
        result?: unknown
        error?: { message: string }
      }
      stdout = stdout.subarray(messageEnd)
      if (message.id !== undefined) {
        const waiter = pending.get(message.id)
        pending.delete(message.id)
        if (message.error) waiter?.reject(new Error(message.error.message))
        else waiter?.resolve(message.result)
      }
    }
  }

  child.stdout.on("data", (chunk: Buffer) => {
    stdout = Buffer.concat([stdout, chunk])
    consume()
  })
  child.once("error", (error) => {
    for (const waiter of pending.values()) waiter.reject(error)
    pending.clear()
  })

  const stderr: Array<string> = []
  child.stderr.on("data", (chunk) => stderr.push(String(chunk)))

  try {
    const initializeResult = (await request("initialize", {
      processId: process.pid,
      rootUri: `file://${workspaceRoot}`,
      capabilities: {},
    })) as { capabilities?: Record<string, unknown> }
    send({ jsonrpc: "2.0", method: "initialized", params: {} })
    const uri = `file://${path.join(workspaceRoot, fixture.fileName)}`
    send({
      jsonrpc: "2.0",
      method: "textDocument/didOpen",
      params: {
        textDocument: {
          uri,
          languageId: "typescript",
          version: 1,
          text: fixture.source,
        },
      },
    })
    let rangeFormattingError = ""
    try {
      await request("textDocument/rangeFormatting", {
        textDocument: { uri },
        range: { start: fixture.start, end: fixture.end },
        options: { tabSize: 2, insertSpaces: true },
      })
    } catch (error) {
      rangeFormattingError = error instanceof Error ? error.message : String(error)
    }
    return {
      capabilities: initializeResult.capabilities ?? {},
      rangeFormattingError,
    }
  } finally {
    child.kill()
    if (pending.size > 0) {
      const error = new Error(stderr.join("") || "oxfmt LSP exited early")
      for (const waiter of pending.values()) waiter.reject(error)
    }
  }
}

describe("Oxfmt Node API migration", () => {
  it("exposes the real asynchronous { code } API through the Prisma formatter", async () => {
    expect(FormatterModule).toHaveProperty("formatTypeScript")
    const formatTypeScript = (
      FormatterModule as typeof FormatterModule & {
        formatTypeScript: (fileName: string, sourceText: string) => Promise<string>
      }
    ).formatTypeScript
    await expect(formatTypeScript("fixture.ts", "const value=1\n")).resolves.toBe("const value = 1\n")
    await expect(formatTypeScript("broken.ts", "const =")).rejects.toMatchObject({
      _tag: "FormatError",
      message: "Format error: Unexpected token",
    })
  })

  it("preserves the underlying formatter failure without recursive error messages", () => {
    const cause = new Error("invalid source")
    const error = new FormatError({ error: cause })

    expect(error.message).toBe("Format error: invalid source")
    expect(error.error).toBe(cause)
  })

  it("formats ASI, accepted operator placement, and generated Prisma output", async () => {
    const { format } = await loadOxfmt()
    const fixture = await fixturePromise
    const options = await loadRepositoryFormatOptions()

    for (const example of fixture.typescript) {
      const result = await format(example.fileName, example.source, {
        ...options,
        ...example.options,
      })
      expect(result).toEqual({ code: example.expected, errors: [] })
    }
  })

  it("does not sort package.json and preserves Markdown wrapping", async () => {
    const { format } = await loadOxfmt()
    const fixture = await fixturePromise
    const options = await loadRepositoryFormatOptions()

    await expect(format(fixture.json.fileName, fixture.json.source, options)).resolves.toEqual({
      code: fixture.json.expected,
      errors: [],
    })
    await expect(format(fixture.markdown.fileName, fixture.markdown.source, options)).resolves.toEqual({
      code: fixture.markdown.expected,
      errors: [],
    })
  })

  it("formats supported web files and characterizes Eta as unsupported", async () => {
    const { format } = await loadOxfmt()
    const options = await loadRepositoryFormatOptions()

    await expect(format("fixture.css", "a{color:red}", options)).resolves.toEqual({
      code: "a {\n  color: red;\n}\n",
      errors: [],
    })
    await expect(format("fixture.scss", "$color:red;a{color:$color}", options)).resolves.toEqual({
      code: "$color: red;\na {\n  color: $color;\n}\n",
      errors: [],
    })
    await expect(format("fixture.html", "<div><span>x</span></div>", options)).resolves.toEqual({
      code: "<div><span>x</span></div>\n",
      errors: [],
    })
    await expect(format("fixture.eta", "<div><%= it.value %></div>", options)).resolves.toMatchObject({
      code: "<div><%= it.value %></div>",
      errors: [{ severity: "Error", message: "Unsupported file type: fixture.eta" }],
    })
  })

  it("records full-document LSP support and the accepted range limitation", async () => {
    const fixture = (await fixturePromise).range
    const { capabilities, rangeFormattingError } = await inspectLspRangeFormatting(fixture)

    expect(capabilities.documentFormattingProvider).toBe(true)
    expect(capabilities.documentRangeFormattingProvider).toBeUndefined()
    expect(rangeFormattingError).toBe("Method not found")
  }, 10_000)
})

describe("Oxfmt repository configuration", () => {
  it("maps the dprint formatting rules without enabling sorting", async () => {
    const config = await readJson<Record<string, unknown>>(path.join(workspaceRoot, ".oxfmtrc.json"))

    expect(config).toMatchObject({
      printWidth: 120,
      tabWidth: 2,
      useTabs: false,
      semi: false,
      singleQuote: false,
      trailingComma: "all",
      arrowParens: "always",
      endOfLine: "lf",
      proseWrap: "preserve",
      sortImports: false,
      sortPackageJson: false,
    })
  })

  it("preserves exclusions while allowing supported legacy web formats", async () => {
    const config = await readJson<{ ignorePatterns: Array<string> }>(path.join(workspaceRoot, ".oxfmtrc.json"))

    expect(config.ignorePatterns).toEqual(
      expect.arrayContaining([
        "**/dist/**",
        "**/build/**",
        "**/.nx/**",
        "**/node_modules/**",
        "**/coverage/**",
        "**/.verdaccio/**",
        "**/.vscode/**",
        "**/.trae/**",
        "**/.husky/**",
        "**/public/**",
        "**/storybook-static/**",
        "**/migrations.json",
        "**/pnpm-lock.yaml",
        "**/tsconfig.tsbuildinfo",
        "**/sqlite.db",
        "**/docker-compose.yml",
        "**/routeTree.gen.ts",
        "**/*.{less,vue,svelte,astro,yaml,yml,toml,graphql,gql,eta}",
      ]),
    )
    expect(config.ignorePatterns.join("\n")).not.toMatch(/css|scss|html/)
  })

  it("selects supported changed files and explicitly blocks unsupported Eta files", async () => {
    const moduleUrl = pathToFileURL(path.join(workspaceRoot, "tools/format-changed.mjs")).href
    const { selectFormatCandidates, selectUnsupportedCandidates } = (await import(/* @vite-ignore */ moduleUrl)) as {
      selectFormatCandidates: (files: Array<string>) => Array<string>
      selectUnsupportedCandidates: (files: Array<string>) => Array<string>
    }
    const changedFiles = [
      "src/example.ts",
      "src/example.ts",
      "docs/guide.mdx",
      "package.json",
      "styles/legacy.css",
      "styles/theme.scss",
      "templates/page.html",
      "templates/page.eta",
      "config/legacy.yml",
    ]

    expect(selectFormatCandidates(changedFiles)).toEqual([
      "docs/guide.mdx",
      "package.json",
      "src/example.ts",
      "styles/legacy.css",
      "styles/theme.scss",
      "templates/page.html",
    ])
    expect(selectUnsupportedCandidates(changedFiles)).toEqual(["templates/page.eta"])
  })

  it("runs oxlint before oxfmt for scripts and formatter-only checks for other supported files", async () => {
    const rootPackage = await readJson<{
      nx: { targets: Record<string, { options: { command: string } }> }
      "lint-staged": Record<string, Array<string>>
    }>(path.join(workspaceRoot, "package.json"))

    expect(rootPackage["lint-staged"]["*.{js,jsx,ts,tsx}"]).toEqual(["pnpm exec oxlint --fix", "pnpm exec oxfmt"])
    expect(rootPackage["lint-staged"]["*.{json,jsonc,md,mdx,css,scss,html}"]).toEqual(["pnpm exec oxfmt"])
    expect(rootPackage.nx.targets["format:all:check"].options.command).toContain("css,scss,html")
  })

  it("uses the complete GitHub push range with a safe initial-push fallback", async () => {
    const workflow = await readFile(path.join(workspaceRoot, ".github/workflows/ci.yml"), "utf8")

    expect(workflow).not.toContain('BASE="HEAD~1"')
    expect(workflow).toContain('BEFORE="${{ github.event.before }}"')
    expect(workflow).toContain('DEFAULT_BASE="origin/${{ github.event.repository.default_branch }}"')
    expect(workflow).toContain('"0000000000000000000000000000000000000000"')
    expect(workflow).toContain('git cat-file -e "${BEFORE}^{commit}"')
    expect(workflow).toContain('git cat-file -e "${DEFAULT_BASE}^{commit}"')
    expect(workflow.match(/BASE="\$BEFORE"/g)).toHaveLength(4)
  })

  it("pins compatible current oxfmt and oxlint releases for every consumer", async () => {
    const [workspace, rootPackage, prismaPackage, nxConfig, installedOxfmt, installedOxlint] = await Promise.all([
      readFile(path.join(workspaceRoot, "pnpm-workspace.yaml"), "utf8"),
      readJson<{ devDependencies: Record<string, string> }>(path.join(workspaceRoot, "package.json")),
      readJson<{ dependencies: Record<string, string>; devDependencies: Record<string, string> }>(
        path.join(packageDir, "package.json"),
      ),
      readJson<{ plugins: Array<{ plugin: string; options?: Record<string, unknown> } | string> }>(
        path.join(workspaceRoot, "nx.json"),
      ),
      readJson<{ version: string; engines: { node: string }; exports: Record<string, unknown> }>(
        path.join(workspaceRoot, "node_modules/oxfmt/package.json"),
      ),
      readJson<{ version: string; engines: { node: string }; exports: Record<string, unknown> }>(
        path.join(workspaceRoot, "node_modules/oxlint/package.json"),
      ),
    ])

    expect(workspace).toMatch(/^\s{2}oxfmt: 0\.60\.0$/m)
    expect(workspace).toMatch(/^\s{2}oxlint: 1\.75\.0$/m)
    expect(rootPackage.devDependencies).toMatchObject({ oxfmt: "catalog:", oxlint: "catalog:" })
    expect(prismaPackage.dependencies.oxfmt).toBe("catalog:")
    expect(prismaPackage.devDependencies.oxlint).toBe("catalog:")
    expect(nxConfig.plugins).toContainEqual({
      plugin: "nx-oxlint",
      options: {
        lintTargetName: "lint",
        additionalArguments: "--no-error-on-unmatched-pattern",
      },
    })
    expect(installedOxfmt).toMatchObject({
      version: "0.60.0",
      engines: { node: "^20.19.0 || >=22.12.0" },
      exports: { ".": expect.any(Object) },
    })
    expect(installedOxlint).toMatchObject({
      version: "1.75.0",
      engines: { node: "^20.19.0 || >=22.12.0" },
      exports: { ".": expect.any(Object) },
    })
  })
})
