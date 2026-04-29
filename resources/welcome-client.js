(function () {
    'use strict';
    var vscodeApi = typeof acquireVsCodeApi === 'function' ? acquireVsCodeApi() : { postMessage: function () {} };
    var visualizer = document.getElementById('visualizer');
    var audio = document.getElementById('fahh-audio');
    var testBtn = document.getElementById('test-btn');
    var resetBtn = document.getElementById('reset-btn');
    var soundSelect = document.getElementById('sound-select');

    function updateAudioSource() {
        if (soundSelect && audio) {
            var selectedSound = soundSelect.value;
            var currentSrc = audio.src;
            var newSrc = currentSrc.substring(0, currentSrc.lastIndexOf('/') + 1) + selectedSound;
            if (currentSrc !== newSrc) {
                audio.src = newSrc;
                audio.load(); // Reload the audio element with the new source
            }
        }
    }

    function triggerTest() {
        try {
            if (!audio) {
                vscodeApi.postMessage({ command: 'error', text: 'Audio element not found.' });
                return;
            }
            updateAudioSource();
            audio.currentTime = 0;
            var playPromise = audio.play();
            if (playPromise && typeof playPromise.then === 'function') {
                playPromise.then(function () {
                    if (visualizer) {
                        visualizer.classList.add('active');
                        setTimeout(function () { visualizer.classList.remove('active'); }, 2000);
                    }
                }).catch(function (err) {
                    vscodeApi.postMessage({ command: 'error', text: 'Audio playback failed: ' + (err && err.message ? err.message : String(err)) });
                });
            }
        } catch (err) {
            vscodeApi.postMessage({ command: 'error', text: 'Error executing test: ' + (err && err.message ? err.message : String(err)) });
        }
    }

    function triggerReset() {
        var ok = typeof confirm === 'function'
            ? confirm('Are you sure you want to reset all user preferences to their default values?')
            : true;
        if (ok) {
            vscodeApi.postMessage({ command: 'reset' });
        }
    }

    function saveSoundSelection() {
        if (soundSelect) {
            vscodeApi.postMessage({ command: 'setSound', sound: soundSelect.value });
        }
    }

    if (testBtn) { testBtn.addEventListener('click', triggerTest); }
    if (resetBtn) { resetBtn.addEventListener('click', triggerReset); }
    if (soundSelect) { 
        soundSelect.addEventListener('change', saveSoundSelection);
        // Initialize audio source on load
        updateAudioSource();
    }

    // Expose for test harness
    if (typeof window !== 'undefined') {
        window.__fahhWelcome = { triggerTest: triggerTest, triggerReset: triggerReset, updateAudioSource: updateAudioSource };
    }
})();
