import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const MAX_VERSION_CODE = 2_100_000_000;
const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDirectory, '..', '..');
const androidDirectory = resolve(projectRoot, 'android');

const argumentsFromUser = process.argv.slice(2);
const verifyOnly = argumentsFromUser[0] === '--verify';
const versionArguments = verifyOnly ? argumentsFromUser.slice(1) : argumentsFromUser;

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

if (versionArguments.length !== 1 || !/^\d+$/.test(versionArguments[0])) {
  fail('Provide exactly one positive decimal versionCode.');
} else {
  const versionCode = Number(versionArguments[0]);
  if (!Number.isSafeInteger(versionCode) || versionCode < 1 || versionCode > MAX_VERSION_CODE) {
    fail(`The versionCode must be between 1 and ${MAX_VERSION_CODE}.`);
  } else if (!existsSync(resolve(androidDirectory, 'gradlew.bat'))) {
    fail('Android Gradle wrapper was not found.');
  } else {
    const task = verifyOnly ? ':app:verifyProductionReleaseConfig' : ':app:assembleRelease';
    const initScript = '../scripts/android/production-signing.init.gradle';
    const versionProperty = `-PappjorgeProductionVersionCode=${versionCode}`;
    const child = process.platform === 'win32'
      ? spawn(
          'cmd.exe',
          [
            '/d',
            '/s',
            '/c',
            `call gradlew.bat -I ${initScript} ${versionProperty} ${task}`,
          ],
          { cwd: androidDirectory, stdio: 'inherit' },
        )
      : spawn(
          './gradlew',
          ['-I', initScript, versionProperty, task],
          { cwd: androidDirectory, stdio: 'inherit' },
        );

    child.on('error', () => {
      fail('Could not start Gradle for production configuration.');
    });
    child.on('exit', (code) => {
      process.exitCode = code ?? 1;
    });
  }
}
