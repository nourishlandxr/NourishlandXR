param([string]$NodePath='C:/Program Files/nodejs/node.exe',[string]$FfmpegPath='C:/Program Files/Virtual Desktop Streamer/ffmpeg.exe')
$ErrorActionPreference='Stop'
$taskRoot=Split-Path $PSScriptRoot -Parent
$taskVoiceDir=Join-Path $taskRoot '.tmp/welcome-voice-prototype'
$taskTemp=Join-Path $taskRoot '.tmp/welcome-narration'
New-Item -ItemType Directory -Force -Path $taskVoiceDir,$taskTemp | Out-Null
$taskJson=Join-Path $taskTemp 'lessons.json'
Push-Location $taskRoot
try { & $NodePath --input-type=module -e "import {WELCOME_PRACTICE_LESSONS as lessons,WELCOME_PRACTICE_RESPONSES as responses} from './app/services/welcomePracticeContent.js';import fs from 'node:fs';fs.writeFileSync('.tmp/welcome-narration/lessons.json',JSON.stringify([...lessons,...responses]));"; if($LASTEXITCODE){throw 'Cannot read narration content.'} }
finally { Pop-Location }
Add-Type -AssemblyName System.Speech
$taskSpeech=New-Object System.Speech.Synthesis.SpeechSynthesizer
try {
    $taskSpeech.SelectVoice('Microsoft Zira Desktop'); $taskSpeech.Rate=-1
    foreach($taskLesson in (Get-Content -LiteralPath $taskJson -Raw -Encoding UTF8 | ConvertFrom-Json)) {
        $taskWave=Join-Path $taskTemp ($taskLesson.id+'.wav')
        $taskMp3=Join-Path $taskVoiceDir ($taskLesson.id+'.mp3')
        $taskSpeech.SetOutputToWaveFile($taskWave); $taskSpeech.Speak($taskLesson.spoken); $taskSpeech.SetOutputToNull()
        & $FfmpegPath -hide_banner -loglevel error -y -i $taskWave -ac 1 -ar 24000 -codec:a libmp3lame -b:a 64k $taskMp3
        if($LASTEXITCODE){throw ('Cannot encode '+$taskLesson.id)}
        Write-Output ('Narration: '+$taskLesson.id)
    }
} finally { $taskSpeech.Dispose() }
