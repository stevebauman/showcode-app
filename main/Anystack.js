const { autoUpdater } = require("electron-updater");
const log = require("electron-log");

autoUpdater.logger = log;

const Anystack = new (require("@anystack/electron-license"))(
  {
    api: {
      key: "TG6bZak5SKKMix62JGUuJfhkuqcEHAqd",
      productId: "03a84e20-7d70-4f59-88bb-3c5bea5c6d13",
    },
    license: {
      requireEmail: false,
      encryptionKey: "jN6okKotbfz0wErG7e0ShczvtJXivTaB",
    },
    prompt: {
      title: "Showcode",
      logo: "https://showcode.app/app-icon.svg",
    },
  },
  autoUpdater
);

module.exports = Anystack;
