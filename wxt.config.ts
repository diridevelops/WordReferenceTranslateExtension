import { loadEnv } from "vite";
import { defineConfig, type ConfigEnv, type UserManifest } from "wxt";

function loadAppEnv(mode: string) {
  const env = loadEnv(mode, process.cwd(), "");
  const changelogItems = (env.WRT_CHANGELOG_ITEMS ?? "")
    .split("||")
    .map((item) => item.trim())
    .filter(Boolean);

  return {
    addonId: env.WXT_FIREFOX_ADDON_ID?.trim() ?? "",
    strictMinVersion: env.WXT_FIREFOX_STRICT_MIN_VERSION?.trim() || "115.0",
    authorName: env.WRT_EXTENSION_AUTHOR_NAME?.trim() ?? "",
    authorEmail: env.WRT_EXTENSION_AUTHOR_EMAIL?.trim() ?? "",
    authorWebsite: env.WRT_EXTENSION_AUTHOR_WEBSITE?.trim() ?? "",
    repoUrl: env.WRT_EXTENSION_REPO_URL?.trim() ?? "",
    donationUrl: env.WRT_EXTENSION_DONATION_URL?.trim() ?? "",
    changelogItems,
  };
}

function buildManifest(env: ConfigEnv): UserManifest {
  const appEnv = loadAppEnv(env.mode);
  const optionalPageOrigins = ["http://*/*", "https://*/*"];

  if (env.browser === "firefox" && env.manifestVersion === 3 && !appEnv.addonId) {
    throw new Error(
      "Firefox MV3 builds require WXT_FIREFOX_ADDON_ID in .env or the current shell environment.",
    );
  }

  const manifest: UserManifest = {
    default_locale: "en",
    name: "__MSG_extensionName__",
    description: "__MSG_extensionDescription__",
    version: "3.0.0",
    permissions: ["storage", "contextMenus", "scripting", "cookies"],
    host_permissions: ["https://www.wordreference.com/*"],
    icons: {
      16: "/icons/icon/icon-16.png",
      32: "/icons/icon/icon-32.png",
      48: "/icons/icon/icon-48.png",
      96: "/icons/icon/icon-96.png",
      128: "/icons/icon/icon-128.png",
    },
    web_accessible_resources: [
      {
        resources: [
          "/icons/*",
          "/content-scripts/*.css",
          "/in-page-popup.html",
          "/assets/*",
          "/chunks/*",
        ],
        matches: ["http://*/*", "https://*/*"],
      },
    ],
  };

  if (appEnv.authorEmail) {
    (manifest as unknown as { author?: string }).author = appEnv.authorEmail;
  }

  if (env.browser === "firefox") {
    manifest.optional_permissions = [...optionalPageOrigins] as unknown as NonNullable<
      UserManifest["optional_permissions"]
    >;
  } else {
    manifest.optional_host_permissions = [...optionalPageOrigins];
  }

  if (env.browser === "firefox" && env.manifestVersion === 3) {
    manifest.browser_specific_settings = {
      gecko: {
        id: appEnv.addonId,
        strict_min_version: appEnv.strictMinVersion,
      },
    };
  }

  return manifest;
}

export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  outDir: ".output",
  srcDir: "src",
  zip: {
    includeSources: [".env"],
  },
  vite: (env) => {
    const appEnv = loadAppEnv(env.mode);
    return {
      define: {
        __WRT_EXTENSION_AUTHOR_NAME__: JSON.stringify(appEnv.authorName),
        __WRT_EXTENSION_AUTHOR_EMAIL__: JSON.stringify(appEnv.authorEmail),
        __WRT_EXTENSION_AUTHOR_WEBSITE__: JSON.stringify(appEnv.authorWebsite),
        __WRT_EXTENSION_REPO_URL__: JSON.stringify(appEnv.repoUrl),
        __WRT_EXTENSION_DONATION_URL__: JSON.stringify(appEnv.donationUrl),
        __WRT_CHANGELOG_ITEMS__: JSON.stringify(appEnv.changelogItems),
      },
    };
  },
  hooks: {
    "build:manifestGenerated": (
      _wxt: unknown,
      manifest: {
        host_permissions?: string[] | undefined;
        options_ui?: { open_in_tab?: boolean } | undefined;
      },
    ) => {
      manifest.host_permissions = (manifest.host_permissions ?? []).filter(
        (permission: string) => permission === "https://www.wordreference.com/*",
      );
      if (manifest.options_ui) {
        manifest.options_ui.open_in_tab = true;
      }
    },
  },
  manifest: buildManifest,
});
