import assert from "node:assert/strict";
import {mkdtemp, readFile, rm} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {mock, test} from "node:test";

const getPath = mock.fn();
mock.module("electron", {
    namedExports: {app: {getPath, getVersion: () => "3.0.0"}},
});

const {getReleaseNotesState, acknowledgeReleaseNotes} = await import("../main/releaseNotes.js");

test("a new profile includes the installed version and no acknowledged releases", async (t) => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "showcode-release-notes-"));
    t.after(() => rm(directory, {recursive: true, force: true}));
    getPath.mock.mockImplementation(() => directory);

    assert.deepEqual(await getReleaseNotesState(), {
        version: "3.0.0",
        seenReleases: [],
        showAfterUpdate: true,
    });
    assert.deepEqual(getPath.mock.calls.at(-1).arguments, ["userData"]);
});

test("acknowledgements preserve earlier releases and the automatic display preference", async (t) => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "showcode-release-notes-"));
    t.after(() => rm(directory, {recursive: true, force: true}));
    getPath.mock.mockImplementation(() => directory);

    await acknowledgeReleaseNotes(["first-release"], true);
    await acknowledgeReleaseNotes(["first-release", "workspace-refresh"], false);

    assert.deepEqual(await getReleaseNotesState(), {
        version: "3.0.0",
        seenReleases: ["first-release", "workspace-refresh"],
        showAfterUpdate: false,
    });
    assert.deepEqual(JSON.parse(await readFile(path.join(directory, "release-notes.json"))), {
        seenReleases: ["first-release", "workspace-refresh"],
        showAfterUpdate: false,
    });
});

test("invalid acknowledgements leave the saved state intact", async (t) => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "showcode-release-notes-"));
    t.after(() => rm(directory, {recursive: true, force: true}));
    getPath.mock.mockImplementation(() => directory);
    await acknowledgeReleaseNotes(["workspace-refresh"], true);

    await assert.rejects(acknowledgeReleaseNotes("workspace-refresh", false), TypeError);
    await assert.rejects(acknowledgeReleaseNotes([42], true), TypeError);
    await assert.rejects(acknowledgeReleaseNotes([], "false"), TypeError);
    assert.equal((await getReleaseNotesState()).showAfterUpdate, true);
});
