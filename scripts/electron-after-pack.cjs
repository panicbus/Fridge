const { execSync } = require('node:child_process');
const path = require('node:path');

exports.default = async function afterPack(context) {
  const appName = context.packager.appInfo.productFilename;
  const appPath = path.join(context.appOutDir, `${appName}.app`);

  console.log(`Clearing extended attributes on ${appPath} before signing...`);
  execSync(`xattr -cr "${appPath}"`, { stdio: 'inherit' });
};
