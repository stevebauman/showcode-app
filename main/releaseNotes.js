import {randomUUID} from "node:crypto";
import {readFile, rename, writeFile} from "node:fs/promises";
import path from "node:path";
import {app} from "electron";

function statePath() {
    return path.join(app.getPath("userData"), "release-notes.json");
}

export async function getReleaseNotesState() {
    let state = {seenReleases: [], showAfterUpdate: true};

    try {
        state = {...state, ...JSON.parse(await readFile(statePath(), "utf8"))};
    } catch (error) {
        if (error.code !== "ENOENT") throw error;
    }

    return {...state, version: app.getVersion()};
}

export async function acknowledgeReleaseNotes(releaseIds, showAfterUpdate) {
    if (
        !Array.isArray(releaseIds) ||
        !releaseIds.every((id) => typeof id === "string") ||
        typeof showAfterUpdate !== "boolean"
    ) {
        throw new TypeError("Release IDs and an update preference are required.");
    }

    const state = await getReleaseNotesState();
    const filename = statePath();
    const temporaryFile = `${filename}.${randomUUID()}.tmp`;

    await writeFile(
        temporaryFile,
        JSON.stringify({
            seenReleases: [...new Set([...state.seenReleases, ...releaseIds])],
            showAfterUpdate,
        }),
    );
    await rename(temporaryFile, filename);
}
