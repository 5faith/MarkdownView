!macro NSIS_HOOK_PREUNINSTALL
  MessageBox MB_YESNO|MB_ICONQUESTION "Do you want to delete all cache data?$\n$\nThis will remove your application data and cannot be undone." IDYES delete_cache IDNO skip_cache

  delete_cache:
    RMDir /r "$APPDATA\com.markdownview.app"
    RMDir /r "$LOCALAPPDATA\com.markdownview.app"
    DetailPrint "Cache data has been removed."
    Goto cache_done

  skip_cache:
    DetailPrint "Cache data was kept."

  cache_done:
!macroend

; 文件关联使用独立的文档图标：Tauri 默认把 .md 的 DefaultIcon 指向 exe，
; 这里改指随包安装的 file-icon.ico（bundle.resources 会拷到 $INSTDIR\icons）
!macro NSIS_HOOK_POSTINSTALL
  WriteRegStr SHCTX "Software\Classes\Markdown\DefaultIcon" "" "$INSTDIR\icons\style3-dark-file-icon.ico,0"
  System::Call 'shell32::SHChangeNotify(i 0x08000000, i 0x1000, i 0, i 0)'
!macroend
