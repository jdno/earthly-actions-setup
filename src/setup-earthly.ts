import * as os from "os";
import * as fs from "fs";
import * as path from "path";
import * as semver from "semver";

import * as io from "@actions/io";
import * as core from "@actions/core";
import * as tc from "@actions/tool-cache";

import { getVersionObject } from "./lib/get-version";
import { restoreCache } from "./cache-restore";

const IS_WINDOWS = process.platform === "win32";

async function run() {
  try {
    const nodeArchToReleaseArch = {
      x64: "amd64",
      arm: "arm64",
    };
    const nodePlatformToReleasePlatform = {
      darwin: "darwin",
      freebsd: "freebsd",
      linux: "linux",
      openbsd: "openbsd",
      win32: "windows",
    };
    const runnerPlatform = os.platform();
    const pkgName = "earthly";

    if (!(runnerPlatform in nodePlatformToReleasePlatform)) {
      throw new Error(
        `Unsupported operating system - ${pkgName} is only released for ${Object.keys(
          nodePlatformToReleasePlatform
        ).join(", ")}`
      );
    }

    const releasePlatform = nodePlatformToReleasePlatform[runnerPlatform];
    const osArch = os.arch();
    const releaseArch = nodeArchToReleaseArch[os.arch()] || osArch;

    const range = core.getInput("version");
    const isValidSemVer = semver.valid(range) != null;
    var tag_name: string;
    if (isValidSemVer) {
      core.info(`Using provided strict version ${range}`);
      if (range[0] === "v") {
        tag_name = range;
      } else {
        tag_name = `v${range}`;
      }
    } else {
      // only grab the version from the api if the version provided by the user
      // doesn't appear to be a valid semver
      const prerelease = core.getInput("prerelease").toUpperCase() === 'TRUE';
      const useCache = core.getInput("use-cache").toUpperCase() === 'TRUE';
      core.info(`Configured range: ${range}; allow prerelease: ${prerelease}; use cache: ${useCache}`);
      const version = await getVersionObject(range, prerelease);
      tag_name = version.tag_name;
    }

    const destination = path.join(os.homedir(), `.${pkgName}`);
    core.info(`Install destination is ${destination}`);

    const installationDir = path.join(destination, "bin");
    const installationPath = path.join(
      installationDir,
      `${pkgName}${IS_WINDOWS ? ".exe" : ""}`
    );
    core.info(`Matched version: ${tag_name}`);

    // first see if earthly is in the toolcache (installed locally)
    const toolcacheDir = tc.find(
      pkgName,
      semver.clean(tag_name) || tag_name.substring(1),
      os.arch()
    );

    if (toolcacheDir) {
      core.addPath(toolcacheDir);
      core.info(`using earthly from toolcache (${toolcacheDir})`);
      return;
    }

    // then try to restore earthly from the github action cache
    core.addPath(installationDir);
    const restored = await restoreCache(
      installationPath,
      semver.clean(tag_name) || tag_name.substring(1)
    );
    if (restored) {
      await fs.promises.chmod(installationPath, 0o755);
      return;
    }

    // finally, dowload earthly release binary
    await io
      .rmRF(installationDir)
      .catch()
      .then(() => {
        core.info(`Successfully deleted pre-existing ${installationDir}`);
      });

    const buildURL = `https://github.com/earthly/earthly/releases/download/${tag_name
      }/${pkgName}-${releasePlatform}-${releaseArch}${IS_WINDOWS ? ".exe" : ""}`;

    core.info(`downloading ${buildURL}`);
    const downloaded = await tc.downloadTool(buildURL, installationPath);
    core.debug(`successfully downloaded ${buildURL} to ${downloaded}`);

    await fs.promises.chmod(installationPath, 0o755);

    await tc.cacheDir(
      path.join(destination, "bin"),
      pkgName,
      semver.clean(tag_name) || tag_name.substring(1),
      os.arch()
    );
    core.exportVariable("FORCE_COLOR", "1");
  } catch (error: unknown) {
    if (error instanceof Error) {
      core.setFailed(error.message);
    } else {
      core.setFailed(String(error));
    }
  }
}

run();
