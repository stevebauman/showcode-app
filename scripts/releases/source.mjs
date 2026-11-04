import {readFile, writeFile} from "node:fs/promises";
import {pathToFileURL} from "node:url";

export function releaseMetadata(source) {
    if (source.draft || source.prerelease || !source.published_at) {
        throw new Error("Only published stable releases can ship desktop updates.");
    }
    const version = source.tag_name?.replace(/^v/, "");
    if (!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(version)) {
        throw new Error("Use a stable release tag such as v3.0.1.");
    }
    if (!Number.isSafeInteger(source.id) || source.id <= 0 || !source.body?.trim()) {
        throw new Error("The GitHub release must have an ID and release notes.");
    }
    const publishedAt = new Intl.DateTimeFormat("en-CA", {timeZone: "America/Toronto"}).format(
        new Date(source.published_at),
    );
    return {
        id: `github-release-${source.id}`,
        version,
        publishedAt,
        title: source.name?.trim() || `Showcode ${version}`,
        description: `Showcode ${version} is now available.`,
        announce: true,
        content: source.body.trim(),
        tag: source.tag_name,
        sourceUrl: source.html_url,
    };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    const metadata = releaseMetadata(JSON.parse(await readFile(process.argv[2], "utf8")));
    await writeFile(process.argv[3], `${JSON.stringify(metadata, null, 4)}\n`);
    if (process.env.GITHUB_OUTPUT) {
        await writeFile(
            process.env.GITHUB_OUTPUT,
            `tag=${metadata.tag}\nversion=${metadata.version}\n`,
            {flag: "a"},
        );
    }
}
