const enUS = {
  // Common
  'common.save': 'Save',
  'common.saving': 'Saving...',
  'common.cancel': 'Cancel',
  'common.delete': 'Delete',
  'common.run': 'Run',
  'common.stop': 'Stop',
  'common.back': '← Back',
  'common.refresh': 'Refresh',
  'common.loading': 'Loading...',
  'common.enabled': 'Enabled',
  'common.disabled': 'Disabled',
  'common.comingSoon': 'Coming Soon',

  // Sidebar
  'nav.workflows': 'Workflows',
  'nav.logs': 'Logs',
  'nav.settings': 'Settings',

  // Workflow List
  'workflows.title': 'Workflows',
  'workflows.new': '+ New Workflow',
  'workflows.empty': 'No workflows yet. Create one to get started.',
  'workflows.nodes': '{count} nodes',
  'workflows.noDesc': 'No description',

  // Workflow Editor
  'editor.namePlaceholder': 'Workflow name',
  'editor.repeatCount': 'Repeat Count',
  'editor.repeatForever': 'Loop Forever',
  'editor.nodeList': 'Nodes',

  // Node Types
  'node.find_image': 'Find Image',
  'node.click': 'Click',
  'node.key_press': 'Key Press',
  'node.type_text': 'Type Text',
  'node.wait': 'Wait',
  'node.condition': 'Condition',
  'node.loop': 'Loop',

  // Node Details
  'node.click.image': 'Click image',
  'node.click.image.offset': 'Click image (offset {x},{y})',
  'node.click.coord': 'At ({x}, {y})',
  'node.click.window': 'Relative to window',
  'node.find_image.paste': 'Paste or select image',
  'node.wait.detail': 'Wait {ms}ms',
  'node.loop.detail': 'Max {max} times',
  'node.click.left': 'Left',
  'node.click.right': 'Right',
  'node.click.middle': 'Middle',

  // Node Config Panel - Click
  'config.clickMode': 'Click Mode',
  'config.clickMode.image': 'Image position (center)',
  'config.clickMode.coord': 'Coordinates',
  'config.clickMode.window': 'Window mode',
  'config.offsetType': 'Offset Type',
  'config.offsetType.px': 'Pixels (px)',
  'config.offsetType.pct': 'Percent (%)',
  'config.x': 'X',
  'config.y': 'Y',
  'config.button': 'Button',
  'config.button.left': 'Left',
  'config.button.right': 'Right',
  'config.button.middle': 'Middle',
  'config.offsetX': 'X Offset',
  'config.offsetY': 'Y Offset',
  'config.windowTitle': 'Window Title',
  'config.windowTitle.placeholder': 'Window title keyword',

  // Node Config Panel - General
  'config.key': 'Key',
  'config.text': 'Text',
  'config.waitMs': 'Wait (ms)',
  'config.saveToVar': 'Save to variable',
  'config.maxIterations': 'Max Iterations',
  'config.stopWhen': 'Stop When',
  'config.stopWhen.found': 'Image Found',
  'config.stopWhen.notFound': 'Image Not Found',
  'config.intervalMs': 'Interval (ms)',
  'config.confidence': 'Confidence',

  // Template Image
  'template.pasteHint': 'Click to paste screenshot, or drop image',
  'template.selectFile': 'Select Image',
  'template.replace': 'Replace Image',
  'template.uploading': 'Uploading...',

  // Logs
  'logs.title': 'Execution Logs',
  'logs.empty': 'No logs yet.',
  'logs.workflow': 'Workflow: {id}',
  'logs.duration': 'Duration: {seconds}s',
  'logs.detail': 'Log Detail — {status}',
  'logs.liveStream': 'Live Stream',
  'logs.waiting': 'Waiting for events...',
  'logs.status.running': 'running',
  'logs.status.success': 'success',
  'logs.status.failed': 'failed',

  // Settings
  'settings.title': 'Settings',
  'settings.language': 'Language',
  'settings.language.desc': 'Choose interface language',
  'settings.imageEngine': 'Image Recognition Engine',
  'settings.imageEngine.desc': 'Choose the default image recognition method',
  'settings.inputMethod': 'Input Control Method',
  'settings.inputMethod.desc': 'Choose the default keyboard/mouse control method',
  'settings.hotkeys': 'Hotkeys',
  'settings.hotkeys.desc': 'Customize keyboard shortcuts',
  'settings.autoStart': 'Auto Start',
  'settings.autoStart.desc': 'Launch AutoFlow on system startup',
  'settings.autoUpdate': 'Auto Update',
  'settings.autoUpdate.desc': 'Automatically download updates',
  'settings.tray': 'System Tray',
  'settings.tray.desc': 'Minimize to system tray',
} as const

export default enUS
