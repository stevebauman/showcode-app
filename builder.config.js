// Set release flag based on Yarn script OR Github Action input
// NOTE: Github Action envs ("INPUT_RELEASE") are all-caps https://docs.github.com/en/actions/creating-actions/metadata-syntax-for-github-actions#inputs

const getEnv = (name, expectedVal) => {
  // Returns the value for an environment variable (or `null` if it's not defined)
  // We assume the env vars are uppercase
  const getEnv = (name) => process.env[name.toUpperCase()] || null;

  // Set the variable
  // Try looking for the name on its own, as well as the Github Actions version ("INPUT_")
  const value = getEnv(name) || getEnv(`INPUT_${name}`);

  if (!value) {
    console.log(`"${name}" variable is not defined`);
  }

  // Either return true/false if user expected a certain value
  if (expectedVal) {
    // Return boolean
    return value === expectedVal;
  } else {
    // Or, if no expectedVal is set: return the value by itself
    return value;
  }
};

const isRelease = getEnv("RELEASE", "true"); // Controls whether the app will be codesigned, notarized, published

console.log(`Is release? ${isRelease}`);

const ICONS_DIR = "build/icons/";

const windowsOS = {
  win: {
    icon: ICONS_DIR + "icon.ico",
    publisherName: "Steve Bauman",
    target: "nsis",
    verifyUpdateCodeSignature: false, // Don't codesign https://github.com/electron-userland/electron-builder/issues/2786#issuecomment-383813995
  },

  nsis: {
    differentialPackage: true,
  },
};

const linuxOS = {
  linux: {
    icon: ICONS_DIR,
    target: "AppImage",
  },
};

const macOS = {
  mac: {
    target: {
      // target: 'default' is required
      // It creates dmg + zip files for Mac builds
      // This is expected for auto-updates to work properly
      // Waiting on: https://github.com/electron-userland/electron-builder/issues/2199
      target: "default",
      // Build for M1 chips (arm64) + Intel (x64) chips
      arch: ["arm64", "x64"],
    },
    icon: ICONS_DIR + "con.icns",
    entitlements: "build/entitlements.mac.plist", // Required for MacOS Catalina
    entitlementsInherit: "build/entitlements.mac.plist", // Required for MacOS Catalina
  },
  afterSign: isRelease ? "scripts/notarize.js" : null, // Notarize Mac (ONLY for deploys)
  afterAllArtifactBuild: isRelease
    ? "scripts/fixMacDistributionArchive.js"
    : null,
  dmg: {
    sign: false, // Required for MacOS Catalina
    contents: [
      {
        x: 410,
        y: 150,
        type: "link",
        path: "/Applications",
      },
      {
        x: 130,
        y: 150,
        type: "file",
      },
    ],
  },
};

module.exports = {
  name: "Showcode",
  publish: false,
  productName: "Showcode",
  appId: "com.showcode.app",
  description: "Create beautiful images of code.",
  homepage: "https://showcode.app",
  projectUrl: "https://github.com/stevebauman/showcode",
  repository: "https://github.com/stevebauman/showcode",
  artifactName: "${productName}-${version}-${os}-${arch}.${ext}",
  directories: {
    output: "build",
  },
  // default files: https://www.electron.build/configuration/contents
  files: [
    "package.json",
    {
      from: "dist/main/",
      to: "dist/main/",
    },
    {
      from: "dist/renderer",
      to: "dist/renderer/",
    },
  ],
  extraResources: [
    {
      from: "./src/extraResources",
      to: ".",
    },
    {
      from: "./node_modules/@unlocksh/electron-license/license",
      to: "license",
      filter: "**/*",
    },
  ],
  ...windowsOS,
  ...linuxOS,
  ...macOS,
};
