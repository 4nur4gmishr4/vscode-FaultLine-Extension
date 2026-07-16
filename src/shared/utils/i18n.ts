/**
 * Internationalization (i18n) utility for multi-language support.
 * Provides translation strings for all supported languages.
 */

/**
 * Translation strings for all supported languages.
 */
const translations: Record<string, Record<string, string>> = {
    en: {
        // General
        extensionName: 'FaultLine',
        enabled: 'Enabled',
        disabled: 'Disabled',
        
        // Commands
        testSound: 'Test sound',
        testSuccessSound: 'Test success sound',
        toggle: 'Toggle FaultLine',
        toggleWorkspace: 'Toggle FaultLine for workspace',
        selectSound: 'Select custom sound',
        selectSoundFolder: 'Select sound folder',
        resetSound: 'Reset to default sound',
        pickSoundPack: 'Pick sound pack',
        stop: 'Stop sound',
        snooze: 'Snooze FaultLine',
        showOutput: 'Show output log',
        resetSettings: 'Reset all settings',
        
        // Messages
        soundUpdated: 'FaultLine sound updated.',
        soundFolderSet: 'FaultLine sound folder set. Sounds will be random from this folder.',
        soundReset: 'FaultLine sound reset to default.',
        soundPackSelected: 'Sound pack "{{name}}" selected.',
        snoozed: 'FaultLine snoozed for {{minutes}} minutes.',
        settingsReset: 'FaultLine settings have been reset.',
        toggledOn: 'FaultLine enabled.',
        toggledOff: 'FaultLine disabled.',
        toggledOnWorkspace: 'FaultLine enabled for this workspace.',
        toggledOffWorkspace: 'FaultLine disabled for this workspace.',
        soundsOn: 'FaultLine sounds ON.',
        soundsOff: 'FaultLine sounds OFF.',
        factoryResetDone: 'FaultLine has been factory reset.',
        noRecentErrors: 'FaultLine: No recent errors to explain.',
        invalidSoundFile: 'FaultLine: invalid or missing sound file. Only built-in pack names are allowed.',
        
        // Status
        noSoundResolved: 'FaultLine: no sound file resolved.',
        noSuccessSoundResolved: 'FaultLine: no success sound resolved.',
        playbackFailed: 'FaultLine playback failed: {{message}}. Open "FaultLine: Show Output Log" for details.',
        playbackFailedShort: 'FaultLine playback failed: {{message}}',
        soundPlayed: 'FaultLine played: {{path}}',
        successPlayed: 'FaultLine success played: {{path}}',
        noSoundPacks: 'No sound packs installed. Use custom sound instead.',
        
        // Confirmation
        resetSettingsConfirm: 'Are you sure you want to reset all FaultLine settings to default?',
        factoryResetConfirm: 'This will reset all settings, clear failure history/state, and delete stored API keys. Proceed?',
    },
    
    es: {
        extensionName: 'FaultLine',
        enabled: 'Activado',
        disabled: 'Desactivado',
        testSound: 'Probar sonido',
        testSuccessSound: 'Probar sonido de éxito',
        toggle: 'Alternar FaultLine',
        toggleWorkspace: 'Alternar FaultLine para el espacio de trabajo',
        selectSound: 'Seleccionar sonido personalizado',
        selectSoundFolder: 'Seleccionar carpeta de sonidos',
        resetSound: 'Restablecer al sonido predeterminado',
        pickSoundPack: 'Elegir paquete de sonidos',
        stop: 'Detener sonido',
        snooze: 'Silenciar FaultLine',
        showOutput: 'Mostrar registro de salida',
        resetSettings: 'Restablecer todas las configuraciones',
        soundUpdated: 'Sonido de FaultLine actualizado.',
        soundFolderSet: 'Carpeta de sonidos de FaultLine configurada. Los sonidos serán aleatorios de esta carpeta.',
        soundReset: 'Sonido de FaultLine restablecido al predeterminado.',
        soundPackSelected: 'Paquete de sonidos "{{name}}" seleccionado.',
        snoozed: 'FaultLine silenciado por {{minutes}} minutos.',
        settingsReset: 'Las configuraciones de FaultLine han sido restablecidas.',
        noSoundResolved: 'FaultLine: no se resolvió ningún archivo de sonido.',
        noSuccessSoundResolved: 'FaultLine: no se resolvió ningún sonido de éxito.',
        playbackFailed: 'La reproducción de FaultLine falló: {{message}}. Abra "FaultLine: Mostrar registro de salida" para detalles.',
        soundPlayed: 'FaultLine reprodujo: {{path}}',
        successPlayed: 'Éxito de FaultLine reproducido: {{path}}',
        resetSettingsConfirm: '¿Estás seguro de que quieres restablecer todas las configuraciones de FaultLine al predeterminado?',
    },
    
    fr: {
        extensionName: 'FaultLine',
        enabled: 'Activé',
        disabled: 'Désactivé',
        testSound: 'Tester le son',
        testSuccessSound: 'Tester le son de succès',
        toggle: 'Basculer FaultLine',
        toggleWorkspace: 'Basculer FaultLine pour l\'espace de travail',
        selectSound: 'Sélectionner un son personnalisé',
        selectSoundFolder: 'Sélectionner le dossier de sons',
        resetSound: 'Réinitialiser au son par défaut',
        pickSoundPack: 'Choisir un pack de sons',
        stop: 'Arrêter le son',
        snooze: 'Mettre FaultLine en sourdine',
        showOutput: 'Afficher le journal de sortie',
        resetSettings: 'Réinitialiser tous les paramètres',
        soundUpdated: 'Son FaultLine mis à jour.',
        soundFolderSet: 'Dossier de sons FaultLine défini. Les sons seront aléatoires de ce dossier.',
        soundReset: 'Son FaultLine réinitialisé par défaut.',
        soundPackSelected: 'Pack de sons "{{name}}" sélectionné.',
        snoozed: 'FaultLine mis en sourdine pendant {{minutes}} minutes.',
        settingsReset: 'Les paramètres FaultLine ont été réinitialisés.',
        noSoundResolved: 'FaultLine: aucun fichier son résolu.',
        noSuccessSoundResolved: 'FaultLine: aucun son de succès résolu.',
        playbackFailed: 'La lecture FaultLine a échoué: {{message}}. Ouvrez "FaultLine: Afficher le journal de sortie" pour détails.',
        soundPlayed: 'FaultLine a joué: {{path}}',
        successPlayed: 'Succès FaultLine joué: {{path}}',
        resetSettingsConfirm: 'Êtes-vous sûr de vouloir réinitialiser tous les paramètres FaultLine par défaut?',
    },
    
    de: {
        extensionName: 'FaultLine',
        enabled: 'Aktiviert',
        disabled: 'Deaktiviert',
        testSound: 'Sound testen',
        testSuccessSound: 'Erfolgs-Sound testen',
        toggle: 'FaultLine umschalten',
        toggleWorkspace: 'FaultLine für Arbeitsbereich umschalten',
        selectSound: 'Benutzerdefinierten Sound auswählen',
        selectSoundFolder: 'Sound-Ordner auswählen',
        resetSound: 'Auf Standard-Sound zurücksetzen',
        pickSoundPack: 'Sound-Pack auswählen',
        stop: 'Sound stoppen',
        snooze: 'FaultLine stummschalten',
        showOutput: 'Ausgabeprotokoll anzeigen',
        resetSettings: 'Alle Einstellungen zurücksetzen',
        soundUpdated: 'FaultLine-Sound aktualisiert.',
        soundFolderSet: 'FaultLine-Sound-Ordner festgelegt. Sounds werden zufällig aus diesem Ordner gewählt.',
        soundReset: 'FaultLine-Sound auf Standard zurückgesetzt.',
        soundPackSelected: 'Sound-Pack "{{name}}" ausgewählt.',
        snoozed: 'FaultLine für {{minutes}} Minuten stummgeschaltet.',
        settingsReset: 'FaultLine-Einstellungen wurden zurückgesetzt.',
        noSoundResolved: 'FaultLine: keine Sound-Datei gefunden.',
        noSuccessSoundResolved: 'FaultLine: kein Erfolgs-Sound gefunden.',
        playbackFailed: 'FaultLine-Wiedergabe fehlgeschlagen: {{message}}. Öffnen Sie "FaultLine: Ausgabeprotokoll anzeigen" für Details.',
        soundPlayed: 'FaultLine abgespielt: {{path}}',
        successPlayed: 'FaultLine-Erfolg abgespielt: {{path}}',
        resetSettingsConfirm: 'Sind Sie sicher, dass Sie alle FaultLine-Einstellungen auf Standard zurücksetzen möchten?',
    },
    
    ja: {
        extensionName: 'FaultLine',
        enabled: '有効',
        disabled: '無効',
        testSound: 'サウンドをテスト',
        testSuccessSound: '成功サウンドをテスト',
        toggle: 'FaultLineを切り替え',
        toggleWorkspace: 'ワークスペースでFaultLineを切り替え',
        selectSound: 'カスタムサウンドを選択',
        selectSoundFolder: 'サウンドフォルダを選択',
        resetSound: 'デフォルトサウンドにリセット',
        pickSoundPack: 'サウンドパックを選択',
        stop: 'サウンドを停止',
        snooze: 'FaultLineをスヌーズ',
        showOutput: '出力ログを表示',
        resetSettings: 'すべての設定をリセット',
        soundUpdated: 'FaultLineサウンドを更新しました。',
        soundFolderSet: 'FaultLineサウンドフォルダを設定しました。このフォルダからランダムにサウンドが再生されます。',
        soundReset: 'FaultLineサウンドをデフォルトにリセットしました。',
        soundPackSelected: 'サウンドパック "{{name}}" を選択しました。',
        snoozed: 'FaultLineを{{minutes}}分間スヌーズしました。',
        settingsReset: 'FaultLineの設定をリセットしました。',
        noSoundResolved: 'FaultLine: サウンドファイルが見つかりません。',
        noSuccessSoundResolved: 'FaultLine: 成功サウンドが見つかりません。',
        playbackFailed: 'FaultLineの再生に失敗しました: {{message}}。「FaultLine: 出力ログを表示」を開いて詳細を確認してください。',
        soundPlayed: 'FaultLine再生: {{path}}',
        successPlayed: 'FaultLine成功再生: {{path}}',
        resetSettingsConfirm: 'すべてのFaultLine設定をデフォルトにリセットしてもよろしいですか？',
    },
    
    'zh-CN': {
        extensionName: 'FaultLine',
        enabled: '已启用',
        disabled: '已禁用',
        testSound: '测试声音',
        testSuccessSound: '测试成功声音',
        toggle: '切换FaultLine',
        toggleWorkspace: '为工作区切换FaultLine',
        selectSound: '选择自定义声音',
        selectSoundFolder: '选择声音文件夹',
        resetSound: '重置为默认声音',
        pickSoundPack: '选择声音包',
        stop: '停止声音',
        snooze: '暂停FaultLine',
        showOutput: '显示输出日志',
        resetSettings: '重置所有设置',
        soundUpdated: 'FaultLine声音已更新。',
        soundFolderSet: 'FaultLine声音文件夹已设置。声音将从该文件夹随机播放。',
        soundReset: 'FaultLine声音已重置为默认。',
        soundPackSelected: '已选择声音包 "{{name}}"。',
        snoozed: 'FaultLine已暂停{{minutes}}分钟。',
        settingsReset: 'FaultLine设置已重置。',
        noSoundResolved: 'FaultLine: 未找到声音文件。',
        noSuccessSoundResolved: 'FaultLine: 未找到成功声音。',
        playbackFailed: 'FaultLine播放失败: {{message}}。打开"FaultLine: 显示输出日志"查看详情。',
        soundPlayed: 'FaultLine播放: {{path}}',
        successPlayed: 'FaultLine成功播放: {{path}}',
        resetSettingsConfirm: '确定要将所有FaultLine设置重置为默认值吗？',
    },
    
    'zh-TW': {
        extensionName: 'FaultLine',
        enabled: '已啟用',
        disabled: '已停用',
        testSound: '測試聲音',
        testSuccessSound: '測試成功聲音',
        toggle: '切換FaultLine',
        toggleWorkspace: '為工作區切換FaultLine',
        selectSound: '選擇自訂聲音',
        selectSoundFolder: '選擇聲音資料夾',
        resetSound: '重設為預設聲音',
        pickSoundPack: '選擇聲音包',
        stop: '停止聲音',
        snooze: '暫停FaultLine',
        showOutput: '顯示輸出日誌',
        resetSettings: '重設所有設定',
        soundUpdated: 'FaultLine聲音已更新。',
        soundFolderSet: 'FaultLine聲音資料夾已設定。聲音將從該資料夾隨機播放。',
        soundReset: 'FaultLine聲音已重設為預設。',
        soundPackSelected: '已選擇聲音包 "{{name}}"。',
        snoozed: 'FaultLine已暫停{{minutes}}分鐘。',
        settingsReset: 'FaultLine設定已重設。',
        noSoundResolved: 'FaultLine: 未找到聲音檔案。',
        noSuccessSoundResolved: 'FaultLine: 未找到成功聲音。',
        playbackFailed: 'FaultLine播放失敗: {{message}}。開啟"FaultLine: 顯示輸出日誌"查看詳情。',
        soundPlayed: 'FaultLine播放: {{path}}',
        successPlayed: 'FaultLine成功播放: {{path}}',
        resetSettingsConfirm: '確定要將所有FaultLine設定重設為預設值嗎？',
    },
    
    ko: {
        extensionName: 'FaultLine',
        enabled: '활성화됨',
        disabled: '비활성화됨',
        testSound: '사운드 테스트',
        testSuccessSound: '성공 사운드 테스트',
        toggle: 'FaultLine 전환',
        toggleWorkspace: '워크스페이스에서 FaultLine 전환',
        selectSound: '사용자 지정 사운드 선택',
        selectSoundFolder: '사운드 폴더 선택',
        resetSound: '기본 사운드로 재설정',
        pickSoundPack: '사운드 팩 선택',
        stop: '사운드 중지',
        snooze: 'FaultLine 일시 중지',
        showOutput: '출력 로그 표시',
        resetSettings: '모든 설정 재설정',
        soundUpdated: 'FaultLine 사운드가 업데이트되었습니다.',
        soundFolderSet: 'FaultLine 사운드 폴더가 설정되었습니다. 사운드가 이 폴더에서 무작위로 재생됩니다.',
        soundReset: 'FaultLine 사운드가 기본값으로 재설정되었습니다.',
        soundPackSelected: '사운드 팩 "{{name}}"을(를) 선택했습니다.',
        snoozed: 'FaultLine가 {{minutes}}분 동안 일시 중지되었습니다.',
        settingsReset: 'FaultLine 설정이 재설정되었습니다.',
        noSoundResolved: 'FaultLine: 사운드 파일을 찾을 수 없습니다.',
        noSuccessSoundResolved: 'FaultLine: 성공 사운드를 찾을 수 없습니다.',
        playbackFailed: 'FaultLine 재생 실패: {{message}}. "FaultLine: 출력 로그 표시"를 열어 세부 정보를 확인하세요.',
        soundPlayed: 'FaultLine 재생: {{path}}',
        successPlayed: 'FaultLine 성공 재생: {{path}}',
        resetSettingsConfirm: '모든 FaultLine 설정을 기본값으로 재설정하시겠습니까?',
    },
    
    'pt-BR': {
        extensionName: 'FaultLine',
        enabled: 'Ativado',
        disabled: 'Desativado',
        testSound: 'Testar som',
        testSuccessSound: 'Testar som de sucesso',
        toggle: 'Alternar FaultLine',
        toggleWorkspace: 'Alternar FaultLine para o workspace',
        selectSound: 'Selecionar som personalizado',
        selectSoundFolder: 'Selecionar pasta de sons',
        resetSound: 'Redefinir para som padrão',
        pickSoundPack: 'Escolher pacote de sons',
        stop: 'Parar som',
        snooze: 'Silenciar FaultLine',
        showOutput: 'Mostrar log de saída',
        resetSettings: 'Redefinir todas as configurações',
        soundUpdated: 'Som do FaultLine atualizado.',
        soundFolderSet: 'Pasta de sons do FaultLine definida. Os sons serão aleatórios desta pasta.',
        soundReset: 'Som do FaultLine redefinido para o padrão.',
        soundPackSelected: 'Pacote de sons "{{name}}" selecionado.',
        snoozed: 'FaultLine silenciado por {{minutes}} minutos.',
        settingsReset: 'As configurações do FaultLine foram redefinidas.',
        noSoundResolved: 'FaultLine: nenhum arquivo de som resolvido.',
        noSuccessSoundResolved: 'FaultLine: nenhum som de sucesso resolvido.',
        playbackFailed: 'A reprodução do FaultLine falhou: {{message}}. Abra "FaultLine: Mostrar log de saída" para detalhes.',
        soundPlayed: 'FaultLine reproduzido: {{path}}',
        successPlayed: 'Sucesso do FaultLine reproduzido: {{path}}',
        resetSettingsConfirm: 'Tem certeza de que deseja redefinir todas as configurações do FaultLine para o padrão?',
    },
    
    ru: {
        extensionName: 'FaultLine',
        enabled: 'Включено',
        disabled: 'Отключено',
        testSound: 'Тестировать звук',
        testSuccessSound: 'Тестировать звук успеха',
        toggle: 'Переключить FaultLine',
        toggleWorkspace: 'Переключить FaultLine для рабочей области',
        selectSound: 'Выбрать пользовательский звук',
        selectSoundFolder: 'Выбрать папку со звуками',
        resetSound: 'Сбросить на стандартный звук',
        pickSoundPack: 'Выбрать пакет звуков',
        stop: 'Остановить звук',
        snooze: 'Отложить FaultLine',
        showOutput: 'Показать журнал вывода',
        resetSettings: 'Сбросить все настройки',
        soundUpdated: 'Звук FaultLine обновлен.',
        soundFolderSet: 'Папка звуков FaultLine установлена. Звуки будут случайными из этой папки.',
        soundReset: 'Звук FaultLine сброшен на стандартный.',
        soundPackSelected: 'Пакет звуков "{{name}}" выбран.',
        snoozed: 'FaultLine отложен на {{minutes}} минут.',
        settingsReset: 'Настройки FaultLine были сброшены.',
        noSoundResolved: 'FaultLine: файл звука не найден.',
        noSuccessSoundResolved: 'FaultLine: звук успеха не найден.',
        playbackFailed: 'Воспроизведение FaultLine не удалось: {{message}}. Откройте "FaultLine: Показать журнал вывода" для деталей.',
        soundPlayed: 'FaultLine воспроизвел: {{path}}',
        successPlayed: 'Успех FaultLine воспроизведен: {{path}}',
        resetSettingsConfirm: 'Вы уверены, что хотите сбросить все настройки FaultLine на стандартные?',
    },
    
    it: {
        extensionName: 'FaultLine',
        enabled: 'Attivato',
        disabled: 'Disattivato',
        testSound: 'Testa suono',
        testSuccessSound: 'Testa suono successo',
        toggle: 'Attiva/disattiva FaultLine',
        toggleWorkspace: 'Attiva/disattiva FaultLine per workspace',
        selectSound: 'Seleziona suono personalizzato',
        selectSoundFolder: 'Seleziona cartella suoni',
        resetSound: 'Reimposta suono predefinito',
        pickSoundPack: 'Scegli pacchetto suoni',
        stop: 'Ferma suono',
        snooze: 'Metti in pausa FaultLine',
        showOutput: 'Mostra log output',
        resetSettings: 'Reimposta tutte le impostazioni',
        soundUpdated: 'Suono FaultLine aggiornato.',
        soundFolderSet: 'Cartella suoni FaultLine impostata. I suoni saranno casuali da questa cartella.',
        soundReset: 'Suono FaultLine reimpostato al predefinito.',
        soundPackSelected: 'Pacchetto suoni "{{name}}" selezionato.',
        snoozed: 'FaultLine messo in pausa per {{minutes}} minuti.',
        settingsReset: 'Le impostazioni FaultLine sono state reimpostate.',
        noSoundResolved: 'FaultLine: nessun file audio risolto.',
        noSuccessSoundResolved: 'FaultLine: nessun suono successo risolto.',
        playbackFailed: 'Riproduzione FaultLine fallita: {{message}}. Apri "FaultLine: Mostra log output" per dettagli.',
        soundPlayed: 'FaultLine riprodotto: {{path}}',
        successPlayed: 'Successo FaultLine riprodotto: {{path}}',
        resetSettingsConfirm: 'Sei sicuro di voler reimpostare tutte le impostazioni FaultLine ai valori predefiniti?',
    },
    
    nl: {
        extensionName: 'FaultLine',
        enabled: 'Ingeschakeld',
        disabled: 'Uitgeschakeld',
        testSound: 'Test geluid',
        testSuccessSound: 'Test succesgeluid',
        toggle: 'Schakel FaultLine',
        toggleWorkspace: 'Schakel FaultLine voor workspace',
        selectSound: 'Selecteer aangepast geluid',
        selectSoundFolder: 'Selecteer geluidenmap',
        resetSound: 'Reset naar standaard geluid',
        pickSoundPack: 'Kies geluidenpakket',
        stop: 'Stop geluid',
        snooze: 'Slaapstand FaultLine',
        showOutput: 'Toon output log',
        resetSettings: 'Reset alle instellingen',
        soundUpdated: 'FaultLine geluid bijgewerkt.',
        soundFolderSet: 'FaultLine geluidenmap ingesteld. Geluiden worden willekeurig uit deze map gekozen.',
        soundReset: 'FaultLine geluid gereset naar standaard.',
        soundPackSelected: 'Geluidenpakket "{{name}}" geselecteerd.',
        snoozed: 'FaultLine in slaapstand voor {{minutes}} minuten.',
        settingsReset: 'FaultLine instellingen zijn gereset.',
        noSoundResolved: 'FaultLine: geen geluidsbestand gevonden.',
        noSuccessSoundResolved: 'FaultLine: geen succesgeluid gevonden.',
        playbackFailed: 'FaultLine afspelen mislukt: {{message}}. Open "FaultLine: Toon output log" voor details.',
        soundPlayed: 'FaultLine afgespeeld: {{path}}',
        successPlayed: 'FaultLine succes afgespeeld: {{path}}',
        resetSettingsConfirm: 'Weet u zeker dat u alle FaultLine instellingen wilt resetten naar standaard?',
    }
};

/**
 * Current language code.
 */
let currentLanguage = 'en';

/**
 * Set the current language for translations.
 * @param language - Language code (e.g., 'en', 'es', 'fr')
 */
export function setLanguage(language: string): void {
    currentLanguage = language;
}

/**
 * Get the current language code.
 * @returns Current language code
 */
export function getLanguage(): string {
    return currentLanguage;
}

/**
 * Get a translation string for the given key.
 * Falls back to English if the key is not found in the current language.
 * @param key - Translation key
 * @param params - Optional parameters for string interpolation
 * @returns Translated string
 */
export function t(key: string, params?: Record<string, string | number>): string {
    const lang = translations[currentLanguage] || translations.en;
    let value = lang[key] || translations.en[key] || key;
    
    if (params) {
        for (const [param, replacement] of Object.entries(params)) {
            value = value.replace(`{{${param}}}`, String(replacement));
        }
    }
    
    return value;
}

/**
 * Check if a language is supported.
 * @param language - Language code to check
 * @returns True if supported, false otherwise
 */
export function isLanguageSupported(language: string): boolean {
    return language in translations;
}

/**
 * Get all supported language codes.
 * @returns Array of supported language codes
 */
export function getSupportedLanguages(): string[] {
    return Object.keys(translations);
}
