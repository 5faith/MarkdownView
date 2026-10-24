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

; 文件关联使用独立的文档图标：Tauri NSIS 模板（APP_ASSOCIATE）默认把每个扩展名
; ProgId 的 DefaultIcon 指向主程序 exe，Explorer 因此显示 app 图标。
; 安装完成后改指随包安装的 style3-dark-file-icon.ico（bundle.resources 拷到 $INSTDIR\icons）。
; ProgId 与 tauri.conf.json fileAssociations 的 name 一一对应，改名需同步这里。
!macro NSIS_HOOK_POSTINSTALL
  WriteRegStr SHCTX "Software\Classes\MarkdownView.md\DefaultIcon" "" "$INSTDIR\icons\style3-dark-file-icon.ico,0"
  WriteRegStr SHCTX "Software\Classes\MarkdownView.markdown\DefaultIcon" "" "$INSTDIR\icons\style3-dark-file-icon.ico,0"
  WriteRegStr SHCTX "Software\Classes\MarkdownView.mdown\DefaultIcon" "" "$INSTDIR\icons\style3-dark-file-icon.ico,0"
  WriteRegStr SHCTX "Software\Classes\MarkdownView.mkd\DefaultIcon" "" "$INSTDIR\icons\style3-dark-file-icon.ico,0"
  System::Call 'shell32::SHChangeNotify(i 0x08000000, i 0x1000, i 0, i 0)'
!macroend
