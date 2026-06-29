Set Sound = CreateObject("WMPlayer.OCX.7")
Sound.URL = "C:\Users\anura\Downloads\VSExtensions\Fahh\resources\packs\default\faultline.mp3"
Sound.settings.volume = 50
Sound.controls.play
WScript.Sleep 500
While Sound.playState <> 1 And Sound.playState <> 8
    WScript.Sleep 100
Wend
WScript.Echo "Done"
