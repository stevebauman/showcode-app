import "dotenv/config";
import fs from "fs";
import path from "path";
import {notarize} from "@electron/notarize";

export default async function (params) {
    if (process.platform !== 'darwin') {
        return;
    }

    console.log('afterSign hook triggered', params);

    const appId = 'com.showcode.app';
    const appPath = path.join(params.appOutDir, `${params.packager.appInfo.productFilename}.app`);

    if (!fs.existsSync(appPath)) {
        console.log('skipping notarization - already exists');

        return;
    }

    console.log(`Notarizing ${appId} found at ${appPath}`);

    await notarize({
        tool: 'notarytool',
        appPath: appPath,
        appBundleId: appId,
        teamId: process.env.APPLE_TEAM_ID,
        appleId: process.env.APPLE_ID,
        appleIdPassword: process.env.APPLE_ID_PASSWORD,
    });

    console.log(`Done notarizing ${appId}`);
};
