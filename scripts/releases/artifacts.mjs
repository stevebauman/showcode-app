import {createHash} from "node:crypto";
import {createReadStream} from "node:fs";
import {readFile, readdir, stat, writeFile} from "node:fs/promises";
import path from "node:path";
import {pathToFileURL} from "node:url";
import {parse} from "yaml";

async function checksum(filename, algorithm, encoding) {
    const hash = createHash(algorithm);
    for await (const chunk of createReadStream(filename)) hash.update(chunk);
    return hash.digest(encoding);
}

export async function validateArtifacts(directory, version) {
    const files = await readdir(directory);
    const required = [
        `Showcode-${version}-mac-arm64.dmg`,
        `Showcode-${version}-mac-x64.dmg`,
        `Showcode-${version}-mac-arm64.zip`,
        `Showcode-${version}-mac-x64.zip`,
        `Showcode-${version}-win-x64.exe`,
        `Showcode-${version}-linux-x64.AppImage`,
        "latest.yml",
        "latest-mac.yml",
        "latest-linux.yml",
    ];
    for (const filename of required) {
        if (!files.includes(filename) || !(await stat(path.join(directory, filename))).size) {
            throw new Error(`Missing release artifact: ${filename}`);
        }
    }
    for (const filename of ["latest.yml", "latest-mac.yml", "latest-linux.yml"]) {
        const manifest = parse(await readFile(path.join(directory, filename), "utf8"));
        if (manifest.version !== version || !manifest.files?.length) {
            throw new Error(`Invalid updater manifest: ${filename}`);
        }
        const platformFiles = {
            "latest.yml": [`Showcode-${version}-win-x64.exe`],
            "latest-mac.yml": [
                `Showcode-${version}-mac-arm64.zip`,
                `Showcode-${version}-mac-x64.zip`,
            ],
            "latest-linux.yml": [`Showcode-${version}-linux-x64.AppImage`],
        };
        for (const file of platformFiles[filename]) {
            if (!manifest.files.some((entry) => decodeURIComponent(entry.url) === file)) {
                throw new Error(`${filename} is missing updater metadata for ${file}`);
            }
        }
        for (const entry of manifest.files) {
            const basename = decodeURIComponent(entry.url);
            if (basename !== path.basename(basename) || !files.includes(basename)) {
                throw new Error(`${filename} references a missing artifact: ${entry.url}`);
            }
            const file = path.join(directory, basename);
            if (
                (await checksum(file, "sha512", "base64")) !== entry.sha512 ||
                (await stat(file)).size !== entry.size
            ) {
                throw new Error(`${filename} has an incorrect checksum or size for ${basename}`);
            }
        }
    }
    const checksums = await Promise.all(
        files
            .filter((file) => /\.(dmg|zip|exe|AppImage|blockmap|yml)$/.test(file))
            .sort()
            .map(
                async (file) =>
                    `${await checksum(path.join(directory, file), "sha256", "hex")}  ${file}`,
            ),
    );
    await writeFile(path.join(directory, "SHA256SUMS.txt"), `${checksums.join("\n")}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    await validateArtifacts(process.argv[2], process.argv[3]);
    console.log("All platform installers and updater manifests verified.");
}
