Add-Type -AssemblyName PresentationCore
$player = New-Object System.Windows.Media.MediaPlayer
$player.Open('C:\Users\anura\Downloads\VSExtensions\Fahh\resources\packs\default\faultline.mp3')
Start-Sleep -Milliseconds 200
$player.Volume = 0.5
$player.Play()
Start-Sleep -Seconds 3
Write-Output 'Done'
