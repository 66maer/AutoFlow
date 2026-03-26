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
  'editor.descPlaceholder': 'Add description...',
  'editor.repeatCount': 'Repeat Count',
  'editor.repeatForever': 'Loop Forever',
  'editor.nodeList': 'Nodes',

  // Workflow List
  'workflows.globalStopKey': 'Global Stop Key',
  'workflows.runTimes': 'Run',
  'workflows.runTimesUnit': 'times',
  'workflows.infinite': 'Infinite',
  'workflows.running': 'Running',
  'workflows.runCount': 'Run #{current}',
  'workflows.confirmDelete': 'Delete workflow "{name}"?',

  // Node Categories
  'category.sensor': 'Sensor',
  'category.action': 'Action',
  'category.control': 'Control',

  // Node Types
  'node.find_image': 'Find Image',
  'node.click': 'Click',
  'node.key_press': 'Key Press',
  'node.type_text': 'Type Text',
  'node.wait': 'Wait',
  'node.condition': 'Condition',
  'node.branch': 'Branch',
  'node.loop': 'Loop',

  // Node Details
  'node.click.image': 'Click image',
  'node.click.image.offset': 'Click image (offset {x},{y})',
  'node.click.coord': 'At ({x}, {y})',
  'node.click.window': 'Relative to window',
  'node.find_image.paste': 'Paste or select image',
  'node.find_image.timeout': 'Timeout {ms}ms',
  'node.wait.detail': 'Wait {ms}ms',
  'node.loop.detail': 'Max {max} times',
  'node.loop.infinite': 'Infinite loop',
  'node.combo': 'Combo Action',
  'node.combo.steps': '{count} steps',
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
  'config.timeoutEnabled': 'Enable Timeout',
  'config.timeoutMs': 'Timeout (ms)',
  'config.retryIntervalMs': 'Retry Interval (ms)',
  'config.loopMode': 'Loop Mode',
  'config.loopMode.count': 'Fixed Count',
  'config.loopMode.infinite': 'Infinite',
  'config.loopCount': 'Loop Count',
  'config.loopHint': 'Body: connect nodes to repeat each iteration. Last body node can loop back to this node.\nDone: node to execute after loop finishes.',

  // Branch Config
  'config.branchCondition': 'Condition',
  'config.branchCondition.lastMatch': 'Last Find Image Result',
  'config.branchCondition.variable': 'Variable Value',
  'config.branchVariable': 'Variable Name',
  'config.branchVariable.placeholder': 'Enter variable name',
  'config.branchHint': 'True: left output when condition is met.\nFalse: right output when condition is not met.',

  // Key Recorder
  'config.keyRecorder.placeholder': 'Click to record key',
  'config.keyRecorder.hint': 'Press a key...',
  'config.keyRecorder.record': 'Record',
  'config.keyRecorder.stop': 'Stop',
  'config.keyRecorder.selectKey': '-- Select key --',

  // Combo Node
  'config.combo.addStep': '+ Add Step',
  'config.combo.stepAction': 'Action',
  'config.combo.action.key_down': 'Key Down',
  'config.combo.action.key_up': 'Key Up',
  'config.combo.action.click': 'Click',
  'config.combo.action.wait': 'Wait',
  'config.combo.action.type_text': 'Type Text',

  // Template Image
  'template.pasteHint': 'Click to paste screenshot, or drop image',
  'template.selectFile': 'Select Image',
  'template.replace': 'Replace Image',
  'template.uploading': 'Uploading...',

  // Handle tooltips
  'handle.branch.true': 'Path when condition is true',
  'handle.branch.true.short': 'Yes',
  'handle.branch.false': 'Path when condition is false',
  'handle.branch.false.short': 'No',
  'handle.loop.body': 'Loop body: connect nodes to execute each iteration',
  'handle.loop.body.short': 'Body',
  'handle.loop.done': 'Done: node to execute after loop finishes',
  'handle.loop.done.short': 'Done',
  'handle.loop.back': 'Loop back: connect the last body node here',
  'handle.loop.back.short': 'Back',
  'handle.timeout.success': 'Path when image is found',
  'handle.timeout.timeout': 'Path when timeout is reached',

  // Context Menu
  'ctx.copy': 'Copy',
  'ctx.cut': 'Cut',
  'ctx.paste': 'Paste',
  'ctx.delete': 'Delete',
  'ctx.selectAll': 'Select All',
  'ctx.undo': 'Undo',
  'ctx.redo': 'Redo',
  'ctx.add': 'Add',
  'ctx.addAfter': 'Add after:',

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
