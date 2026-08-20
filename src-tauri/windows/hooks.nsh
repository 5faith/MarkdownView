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
