# Irodori-TTS 導入スクリプト（Windows + NVIDIA GPU 用）
# install.bat から呼ばれる。何度実行しても大丈夫（2回目以降は更新になる）。

$ErrorActionPreference = 'Stop'
$InstallDir = Join-Path $env:USERPROFILE 'Irodori-TTS'
$Model = 'Aratako/Irodori-TTS-v4.1-Small'

function Step($msg) { Write-Host "`n=== $msg ===" -ForegroundColor Cyan }
function Fail($msg) {
    Write-Host "`n[エラー] $msg" -ForegroundColor Red
    exit 1
}
function Refresh-Path {
    $env:Path = [Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' +
        [Environment]::GetEnvironmentVariable('Path', 'User') + ';' +
        (Join-Path $env:USERPROFILE '.local\bin')
}

Step '1/6 GPU の確認'
if (-not (Get-Command nvidia-smi -ErrorAction SilentlyContinue)) {
    Fail 'NVIDIA のドライバが見つかりません。https://www.nvidia.co.jp/drivers から最新版を入れてから、もう一度実行してください。'
}
nvidia-smi --query-gpu=name,driver_version,memory.total --format=csv,noheader
$driver = (nvidia-smi --query-gpu=driver_version --format=csv,noheader | Select-Object -First 1).Trim()
if ([int]($driver.Split('.')[0]) -lt 570) {
    Write-Warning "ドライバ $driver は古い可能性があります（CUDA 12.8 には 570 以降が必要）。GPU が使えなかったら、ドライバを更新してください。"
}

Step '2/6 Git の確認'
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host 'Git をインストールします...'
    winget install --id Git.Git -e --source winget --accept-package-agreements --accept-source-agreements
    Refresh-Path
    if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
        Fail 'Git を入れられませんでした。https://git-scm.com/download/win から手動で入れて、もう一度実行してください。'
    }
}
git --version

Step '3/6 uv の確認'
if (-not (Get-Command uv -ErrorAction SilentlyContinue)) {
    Write-Host 'uv をインストールします...'
    powershell -NoProfile -ExecutionPolicy ByPass -Command "irm https://astral.sh/uv/install.ps1 | iex"
    Refresh-Path
    if (-not (Get-Command uv -ErrorAction SilentlyContinue)) {
        Fail 'uv を入れられませんでした。PC を再起動してから、もう一度実行してください。'
    }
}
uv --version

Step "4/6 Irodori-TTS の取得（$InstallDir）"
if (Test-Path (Join-Path $InstallDir '.git')) {
    git -C $InstallDir pull --ff-only
} else {
    git clone https://github.com/Aratako/Irodori-TTS.git $InstallDir
}
if ($LASTEXITCODE -ne 0) { Fail 'Irodori-TTS をダウンロードできませんでした。ネット接続を確認してください。' }
Set-Location $InstallDir

Step '5/6 ライブラリのインストール（数GBあるので10分以上かかることがあります）'
uv sync --extra cu128
if ($LASTEXITCODE -ne 0) { Fail 'ライブラリのインストールに失敗しました。上のメッセージを確認してください。' }

uv run --no-sync python -c "import sys, torch; ok = torch.cuda.is_available(); print('GPU:', torch.cuda.get_device_name(0) if ok else 'not available'); sys.exit(0 if ok else 1)"
if ($LASTEXITCODE -ne 0) {
    Fail 'PyTorch から GPU が見えません。NVIDIA ドライバを最新にしてから、もう一度実行してください。'
}

Step '6/6 モデルのダウンロードとテスト音声の生成'
New-Item -ItemType Directory -Force -Path (Join-Path $InstallDir 'outputs') | Out-Null
$wav = Join-Path $InstallDir 'outputs\install_test.wav'
uv run --no-sync python infer.py `
    --hf-checkpoint $Model `
    --text 'こんにちは。Irodori TTS のインストールが完了しました。' `
    --no-ref `
    --output-wav $wav
if ($LASTEXITCODE -ne 0 -or -not (Test-Path $wav)) { Fail 'テスト音声を作れませんでした。上のメッセージを確認してください。' }

Write-Host "`nインストール完了。テスト音声：$wav" -ForegroundColor Green
Write-Host 'これからは start.bat をダブルクリックすると使えます。' -ForegroundColor Green
Start-Process $wav
