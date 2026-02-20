#!/usr/bin/env python3
"""
Dayce PWA 難読化スクリプト
- index.html 内の <script>...</script> ブロックを抽出して難読化
- 外部 .js ファイルも難読化
- src属性付き<script>やインラインイベントハンドラは触らない
"""

import re
import subprocess
import sys
import os
import tempfile
import json

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# 難読化設定（軽量: 動作に影響しにくい設定）
OBF_OPTIONS = {
    "compact": True,
    "controlFlowFlattening": False,  # 重い処理を避ける
    "deadCodeInjection": False,
    "debugProtection": False,
    "disableConsoleOutput": False,
    "identifierNamesGenerator": "hexadecimal",
    "log": False,
    "numbersToExpressions": True,
    "renameGlobals": False,  # グローバル変数名は変えない（HTML内のonclick等と連携するため）
    "selfDefending": False,
    "simplify": True,
    "splitStrings": False,
    "stringArray": True,
    "stringArrayCallsTransform": True,
    "stringArrayEncoding": ["base64"],
    "stringArrayIndexShift": True,
    "stringArrayRotate": True,
    "stringArrayShuffle": True,
    "stringArrayWrappersCount": 1,
    "stringArrayWrappersChainedCalls": True,
    "stringArrayWrappersParametersMaxCount": 2,
    "stringArrayWrappersType": "variable",
    "stringArrayThreshold": 0.75,
    "unicodeEscapeSequence": False
}

def obfuscate_js(js_code):
    """JS コードを難読化して返す"""
    if not js_code.strip():
        return js_code

    # 一時ファイルに書き出し
    with tempfile.NamedTemporaryFile(mode='w', suffix='.js', delete=False, encoding='utf-8') as f:
        f.write(js_code)
        input_path = f.name

    output_path = input_path.replace('.js', '_obf.js')
    config_path = input_path.replace('.js', '_config.json')

    # 設定ファイル書き出し
    with open(config_path, 'w') as f:
        json.dump(OBF_OPTIONS, f)

    try:
        result = subprocess.run(
            ['javascript-obfuscator', input_path, '--output', output_path, '--config', config_path],
            capture_output=True, text=True, timeout=120
        )
        if result.returncode != 0:
            print(f"  WARNING: obfuscation failed: {result.stderr[:200]}")
            return js_code

        with open(output_path, 'r', encoding='utf-8') as f:
            return f.read()
    except subprocess.TimeoutExpired:
        print("  WARNING: obfuscation timed out")
        return js_code
    finally:
        for p in [input_path, output_path, config_path]:
            if os.path.exists(p):
                os.unlink(p)


def obfuscate_html(html_path):
    """index.html 内の <script> ブロックを難読化"""
    print(f"Processing {html_path}...")

    with open(html_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # <script> ... </script> を見つける（src属性なしのもののみ）
    pattern = re.compile(
        r'(<script(?:\s+[^>]*?)?>)(.*?)(</script>)',
        re.DOTALL
    )

    count = 0
    def replace_script(match):
        nonlocal count
        open_tag = match.group(1)
        js_body = match.group(2)
        close_tag = match.group(3)

        # src属性があるスクリプトはスキップ
        if 'src=' in open_tag:
            return match.group(0)

        # 空のスクリプトはスキップ
        if not js_body.strip():
            return match.group(0)

        # 非常に短いスクリプト（50文字未満）はスキップ
        if len(js_body.strip()) < 50:
            return match.group(0)

        count += 1
        print(f"  Obfuscating script block #{count} ({len(js_body)} chars)...")
        obfuscated = obfuscate_js(js_body)
        return open_tag + obfuscated + close_tag

    new_content = pattern.sub(replace_script, content)
    print(f"  Total: {count} script blocks obfuscated")

    with open(html_path, 'w', encoding='utf-8') as f:
        f.write(new_content)

    print(f"  Done: {html_path}")


def obfuscate_file(js_path):
    """外部 .js ファイルを難読化"""
    print(f"Processing {js_path}...")

    with open(js_path, 'r', encoding='utf-8') as f:
        original = f.read()

    obfuscated = obfuscate_js(original)

    with open(js_path, 'w', encoding='utf-8') as f:
        f.write(obfuscated)

    ratio = len(obfuscated) / len(original) if original else 0
    print(f"  Done: {len(original)} -> {len(obfuscated)} chars ({ratio:.1f}x)")


if __name__ == '__main__':
    # 1. index.html
    obfuscate_html(os.path.join(BASE_DIR, 'index.html'))

    # 2. 外部JSファイル（sw系は除く）
    js_files = ['cloud-sync.js', 'goals-v2.js', 'goal-ai-breakdown.js', 'voice-input-extra.js']
    for js in js_files:
        path = os.path.join(BASE_DIR, js)
        if os.path.exists(path):
            obfuscate_file(path)

    print("\n✅ All done!")
