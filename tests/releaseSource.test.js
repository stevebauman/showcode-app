import assert from "node:assert/strict";
import {test} from "node:test";
import {releaseMetadata} from "../scripts/releases/source.mjs";

test("the published tag and body supply the release version and unchanged Markdown", () => {
    const source = {
        id: 42,
        tag_name: "v3.0.1",
        name: "Smoother editing",
        body: "## What's Changed\n* Fix transitions by @stevebauman in #1",
        published_at: "2026-11-04T17:00:00Z",
        draft: false,
        prerelease: false,
        html_url: "https://github.com/stevebauman/showcode/releases/tag/v3.0.1",
    };
    assert.deepEqual(releaseMetadata(source), {
        id: "github-release-42",
        version: "3.0.1",
        publishedAt: "2026-11-04",
        title: "Smoother editing",
        description: "Showcode 3.0.1 is now available.",
        announce: true,
        content: source.body,
        tag: "v3.0.1",
        sourceUrl: source.html_url,
    });
});

test("drafts, prereleases, missing notes and invalid tags cannot start a desktop release", () => {
    const source = {
        id: 42,
        tag_name: "v3.0.1",
        body: "Notes",
        published_at: "2026-11-04T17:00:00Z",
        draft: false,
        prerelease: false,
    };
    assert.throws(() => releaseMetadata({...source, draft: true}), /published stable/);
    assert.throws(() => releaseMetadata({...source, prerelease: true}), /published stable/);
    assert.throws(
        () => releaseMetadata({...source, tag_name: "v3.0.1-beta.1"}),
        /stable release tag/,
    );
    assert.throws(() => releaseMetadata({...source, body: ""}), /release notes/);
});
