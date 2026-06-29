$player = New-Object -ComObject WMPlayer.OCX
$player.settings.volume = 50
$player.URL = 'C:\Users\anura\Downloads\VSExtensions\Fahh\resources\packs\default\faultline.mp3'
$player.controls.play()
Start-Sleep -Milliseconds 500
while ($player.playState -ne 1 -and $player.playState -ne 8) {
    Start-Sleep -Milliseconds 100
}
Write-Output 'Done'
