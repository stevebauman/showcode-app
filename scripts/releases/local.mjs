import {spawnSync} from "node:child_process";
import {readFile} from "node:fs/promises";
import path from "node:path";
import {fileURLToPath} from "node:url";

const root = fileURLToPath(new URL("../../", import.meta.url));
const npm = process.env.npm_execpath;
const output = path.join(root, "dist/local-preview");
const {version} = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));

function run(command, args, options = {}) {
    const result = spawnSync(command, args, {cwd: root, stdio: "inherit", ...options});
    if (result.error) throw result.error;
    if (result.status !== 0) process.exit(result.status || 1);
}

// A local preview never publishes or requires distribution signing credentials.
run(process.execPath, [npm, "ci"], {cwd: path.join(root, "showcode")});
run(process.execPath, [npm, "ci"]);
run(process.execPath, [npm, "run", "generate"]);
run(process.execPath, [npm, "test"]);
// Use the API so electron-builder.env cannot inject distribution credentials.
for (const name of [
    "CSC_LINK",
    "CSC_KEY_PASSWORD",
    "CSC_INSTALLER_LINK",
    "CSC_INSTALLER_KEY_PASSWORD",
    "CSC_KEYCHAIN",
    "WIN_CSC_LINK",
    "WIN_CSC_KEY_PASSWORD",
]) {
    delete process.env[name];
}
process.env.CSC_IDENTITY_AUTO_DISCOVERY = "false";
const {build, Platform, Arch} = await import("electron-builder");
await build({
    projectDir: root,
    targets: Platform.current().createTarget(["dir"], Arch[process.arch]),
    publish: "never",
    config: {
        directories: {output},
        extraMetadata: {version: `${version}-local.0`},
        mac: {identity: "-", notarize: false},
    },
});

const directory = path.join(
    output,
    process.platform === "darwin"
        ? process.arch === "arm64"
            ? "mac-arm64"
            : "mac"
        : process.platform === "win32"
          ? "win-unpacked"
          : "linux-unpacked",
);
console.log(`Local preview: ${directory}`);
if (process.argv.includes("--no-open")) process.exit(0);
if (process.platform === "darwin") run("open", [path.join(directory, "Showcode.app")]);
else if (process.platform === "win32")
    run(path.join(directory, "Showcode.exe"), [], {detached: true, stdio: "ignore"});
else console.log(`Run ${path.join(directory, "showcode")} to open the preview.`);
