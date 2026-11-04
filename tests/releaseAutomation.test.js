import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {mkdtemp, mkdir, readFile, writeFile, rm} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {test} from "node:test";
import {stringify} from "yaml";
import {prepareDesktopRelease} from "../scripts/releases/prepare.mjs";
import {validateArtifacts} from "../scripts/releases/artifacts.mjs";

test("desktop releases update both versions and reuse the approved notes", async (t) => {
    const root = await mkdtemp(path.join(os.tmpdir(), "showcode-desktop-release-"));
    t.after(() => rm(root, {recursive: true, force: true}));
    await mkdir(path.join(root, ".release"));
    await writeFile(
        path.join(root, ".release/metadata.json"),
        JSON.stringify({
            version: "3.0.1",
            title: "Smoother editing",
            description: "Small improvements.",
            content: "**Fixed**\n\n- Editor transitions.",
        }),
    );
    await writeFile(path.join(root, "package.json"), JSON.stringify({version: "3.0.0"}));
    await writeFile(
        path.join(root, "package-lock.json"),
        JSON.stringify({version: "3.0.0", packages: {"": {version: "3.0.0"}}}),
    );

    assert.equal(await prepareDesktopRelease(root, "old", "approved"), "3.0.1");
    assert.equal(JSON.parse(await readFile(path.join(root, "package.json"))).version, "3.0.1");
    assert.equal(
        JSON.parse(await readFile(path.join(root, "package-lock.json"))).packages[""].version,
        "3.0.1",
    );
    assert.match(
        await readFile(path.join(root, ".release/notes.md"), "utf8"),
        /# Smoother editing\n\nSmall improvements\.\n\n\*\*Fixed\*\*/,
    );
    assert.equal(await prepareDesktopRelease(root, "approved", "approved"), "3.0.1");
    await assert.rejects(
        prepareDesktopRelease(root, "approved", "different"),
        /new release version/,
    );
});

test("desktop releases cannot downgrade the packaged version", async (t) => {
    const root = await mkdtemp(path.join(os.tmpdir(), "showcode-desktop-downgrade-"));
    t.after(() => rm(root, {recursive: true, force: true}));
    await mkdir(path.join(root, ".release"));
    await writeFile(path.join(root, ".release/metadata.json"), JSON.stringify({version: "3.0.9"}));
    await writeFile(path.join(root, "package.json"), JSON.stringify({version: "3.0.10"}));
    await assert.rejects(prepareDesktopRelease(root, "same", "same"), /new release version/);
    assert.equal(JSON.parse(await readFile(path.join(root, "package.json"))).version, "3.0.10");
});

test("release validation requires all platforms and verifies updater hashes before upload", async (t) => {
    const root = await mkdtemp(path.join(os.tmpdir(), "showcode-artifacts-"));
    t.after(() => rm(root, {recursive: true, force: true}));
    const filenames = [
        "Showcode-3.0.1-mac-arm64.dmg",
        "Showcode-3.0.1-mac-x64.dmg",
        "Showcode-3.0.1-mac-arm64.zip",
        "Showcode-3.0.1-mac-x64.zip",
        "Showcode-3.0.1-win-x64.exe",
        "Showcode-3.0.1-linux-x64.AppImage",
    ];
    for (const file of filenames) await writeFile(path.join(root, file), file);
    const entry = (file) => ({
        url: file,
        size: Buffer.byteLength(file),
        sha512: createHash("sha512").update(file).digest("base64"),
    });
    for (const [manifest, assets] of [
        ["latest-mac.yml", filenames.slice(0, 4)],
        ["latest.yml", [filenames[4]]],
        ["latest-linux.yml", [filenames[5]]],
    ])
        await writeFile(
            path.join(root, manifest),
            stringify({version: "3.0.1", files: assets.map(entry)}),
        );

    await validateArtifacts(root, "3.0.1");
    assert.match(
        await readFile(path.join(root, "SHA256SUMS.txt"), "utf8"),
        /Showcode-3\.0\.1-mac-arm64\.zip/,
    );
    await writeFile(path.join(root, filenames[4]), "corrupted installer");
    await assert.rejects(validateArtifacts(root, "3.0.1"), /incorrect checksum or size/);
    await rm(path.join(root, filenames[0]));
    await assert.rejects(validateArtifacts(root, "3.0.1"), /Missing release artifact/);
});
