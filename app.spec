# app_without_node.spec
import os
import sys

current_dir = os.path.dirname(os.path.abspath(sys.argv[0]))

a = Analysis(
    ['app.py'],
    pathex=[current_dir],
    binaries=[],
    datas=[
        # 包含必要的文件和文件夹
        ('server.js', '.'),
        ('index.html', '.'),
        ('dist', 'dist'),
		('node_modules', 'node_modules'),
		('node.exe', '.'),
    ],
    hiddenimports=[
        'webview',
        'webview.platforms.winforms'  # Windows 平台
    ],
    hookspath=[],
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=None,
    noarchive=False
)
pyz = PYZ(a.pure, a.zipped_data, cipher=None)
exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='AppletDeAnalyze_v1.2',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,
    disable_windowed_traceback=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None
)