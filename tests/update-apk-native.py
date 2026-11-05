"""Check the updater on a running standalone Android APK, using an emulator.

python tests/update-apk-native.py mandatory --version 1.2.0 --build 8
python tests/update-apk-native.py current
The APK must already be installed; this test never installs or deletes data.
"""
import argparse
import os
import subprocess
import time
import uuid
import xml.etree.ElementTree as ET
from pathlib import Path

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('mode', choices=['mandatory', 'current'])
parser.add_argument('--serial', default='emulator-5554')
parser.add_argument('--version')
parser.add_argument('--build', type=int)
args = parser.parse_args()
if args.mode == 'mandatory' and (not args.version or not args.build):
    parser.error('mandatory requires --version and --build')
sdk = Path(os.environ.get('ANDROID_HOME', str(Path(os.environ['LOCALAPPDATA']) / 'Android/Sdk')))
adb_path = sdk / 'platform-tools/adb.exe'

def adb(*commands):
    return subprocess.run([str(adb_path), '-s', args.serial, *commands], capture_output=True, check=True, timeout=45).stdout

def snapshot():
    name = '/sdcard/update-test-' + uuid.uuid4().hex + '.xml'
    try:
        adb('shell', 'uiautomator', 'dump', '--compressed', name)
        return list(ET.fromstring(adb('exec-out', 'cat', name)).iter('node'))
    finally:
        adb('shell', 'rm', '-f', name)

adb('shell', 'am', 'force-stop', 'com.rian3054.inteliagentapp')
adb('shell', 'am', 'start', '-a', 'android.intent.action.MAIN', '-c', 'android.intent.category.LAUNCHER', '-n', 'com.rian3054.inteliagentapp/.MainActivity')
deadline = time.monotonic() + 50
last_error = ''
while time.monotonic() < deadline:
    try:
        nodes = snapshot()
        labels = [node.get('text', '') for node in nodes]
        blocked = 'Atualização obrigatória' in labels and 'Atualize para continuar' in labels
        if args.mode == 'mandatory':
            assert blocked, 'Mandatory update is not visible on the installed APK'
            assert any(f'Versão {args.version} · build {args.build}.' in label for label in labels), 'Wrong release displayed'
            assert any(node.get('content-desc') == 'Atualizar aplicativo' and node.get('clickable') == 'true' for node in nodes), 'Update button is not accessible'
            assert 'Planejamentos' not in labels, 'Underlying app should be hidden behind the mandatory update'
        else:
            assert not blocked, 'The updated APK is still blocked'
            assert 'Planejamentos' in labels, 'Existing session was not restored'
        print('Standalone Android updater passed:', args.mode)
        break
    except (AssertionError, subprocess.SubprocessError, ET.ParseError) as error:
        last_error = str(error)
        time.sleep(2)
else:
    raise AssertionError(last_error)
