"""Native Android checks using only ADB/UIAutomator and the local test account.

Run against the workspace emulator, never an implicitly selected physical phone.
Screenshots and UI dumps stay in .local/. Credentials are read, never logged.
"""
import json, re, shlex, subprocess, time, xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SERIAL = 'emulator-5554'

def adb(*args, timeout=30):
    return subprocess.run(['adb', '-s', SERIAL, *args], capture_output=True, check=True, timeout=timeout).stdout

def nodes():
    adb('shell', 'uiautomator', 'dump', '--compressed', '/sdcard/inteliagent-ui.xml')
    raw = adb('exec-out', 'cat', '/sdcard/inteliagent-ui.xml')
    (ROOT/'.local/android-ui.xml').write_bytes(raw)
    return [node.attrib for node in ET.fromstring(raw).iter('node')]

def bounds(node):
    return tuple(map(int, re.findall(r'\d+', node['bounds'])))

def find(label, tree=None):
    ordered = sorted(tree or nodes(), key=lambda node: (node.get('class') != 'android.widget.EditText', node.get('checkable') != 'true', node.get('clickable') != 'true'))
    for node in ordered:
        if label in [node.get('text'), node.get('content-desc'), node.get('resource-id')]:
            x1,y1,x2,y2 = bounds(node)
            if x2-x1>5 and y2-y1>15: return node
    return None

def scroll(up=False):
    adb('shell','input','swipe','540', '450' if up else '1100', '540', '1100' if up else '450', '350')
    time.sleep(.3)

def locate(label, attempts=8, scroll_to=False):
    for _ in range(attempts):
        node = find(label)
        if node: return node
        if scroll_to: scroll()
        else: time.sleep(.5)
    raise AssertionError(f'Control not reachable: {label}')

def tap(label, scroll_to=False):
    node = locate(label, scroll_to=scroll_to)
    # A search value can equal a row title. Prefer the actual row/button when
    # tapping; field entry uses fill() and deliberately prefers EditText.
    alternatives = [item for item in nodes() if item.get('class') != 'android.widget.EditText']
    node = find(label, alternatives) or node
    x1,y1,x2,y2 = bounds(node)
    adb('shell','input','tap',str((x1+x2)//2),str((y1+y2)//2))
    time.sleep(.3)

def fill(label, value):
    node = locate(label, scroll_to=True)
    if node.get('class') != 'android.widget.EditText':
        label_y = sum(bounds(node)[1::2])/2
        inputs = [item for item in nodes() if item.get('class') == 'android.widget.EditText']
        assert inputs, f'No editable field for {label}'
        node = min(inputs, key=lambda item: abs(sum(bounds(item)[1::2])/2-label_y))
    assert node.get('enabled') == 'true', f'Field is disabled: {label}'
    x1,y1,x2,y2 = bounds(node)
    adb('shell','input','tap',str((x1+x2)//2),str((y1+y2)//2))
    length = len(node.get('text','')) + 4
    adb('shell','input','keyevent','123')
    adb('shell','input','keyevent',*(['67']*min(length,300)))
    adb('shell','input','text',shlex.quote(str(value).replace(' ','%s')))
    time.sleep(.25)

def back():
    ime = adb('shell','dumpsys','input_method').decode(errors='replace')
    if 'mInputShown=true' in ime or 'mIsInputViewShown=true' in ime:
        adb('shell','input','keyevent','4')

def screenshot(name):
    # Wait for IME/layout animations so evidence shows a stable screen.
    time.sleep(.6)
    path = ROOT / '.local' / (name + '.png')
    path.write_bytes(adb('exec-out','screencap','-p'))
    return path

def describe():
    for node in nodes():
        if node.get('text') or node.get('content-desc') or node.get('resource-id'):
            text = '<password>' if node.get('password')=='true' else node.get('text','')
            print(text, node.get('content-desc',''), node.get('resource-id',''), node['bounds'])

if __name__ == '__main__':
    describe()
