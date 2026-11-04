import {readFile, writeFile, mkdir} from "node:fs/promises";
import path from "node:path";
import {pathToFileURL} from "node:url";

export async function prepareDesktopRelease(root, previousRef, rendererRef) {
    const directory = path.join(root, ".release");
    const release = JSON.parse(await readFile(path.join(directory, "metadata.json"), "utf8"));
    const pkg = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
    if (!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(release.version)) {
        throw new Error("A stable release version is required.");
    }
    const compare = release.version.localeCompare(pkg.version, "en", {numeric: true});
    if (compare < 0 || (compare === 0 && previousRef !== rendererRef)) {
        throw new Error(
            "New renderer changes require a new release version. Prepare a release in Showcode first.",
        );
    }
    for (const filename of ["package.json", "package-lock.json"]) {
        const file = path.join(root, filename);
        const source = await readFile(file, "utf8");
        const data = JSON.parse(source);
        data.version = release.version;
        if (filename === "package-lock.json") data.packages[""].version = release.version;
        const indentation = source.match(/\n( +)"/)?.[1].length ?? 4;
        await writeFile(file, `${JSON.stringify(data, null, indentation)}\n`);
    }
    await writeReleaseNotes(root, release);
    return release.version;
}

export async function writeReleaseNotes(root, release) {
    await mkdir(path.join(root, ".release"), {recursive: true});
    await writeFile(
        path.join(root, ".release/notes.md"),
        `# ${release.title}\n\n${release.description}\n\n${release.content}\n`,
    );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    const version = await prepareDesktopRelease(process.cwd(), process.argv[2], process.argv[3]);
    if (process.env.GITHUB_OUTPUT)
        await writeFile(process.env.GITHUB_OUTPUT, `version=${version}\n`, {flag: "a"});
    console.log(`Prepared desktop release ${version}`);
}
