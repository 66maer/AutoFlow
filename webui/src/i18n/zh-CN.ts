const zhCN = {
  // Common
  'common.save': '保存',
  'common.saving': '保存中...',
  'common.cancel': '取消',
  'common.delete': '删除',
  'common.run': '运行',
  'common.stop': '停止',
  'common.back': '← 返回',
  'common.refresh': '刷新',
  'common.loading': '加载中...',
  'common.enabled': '已启用',
  'common.disabled': '已禁用',
  'common.comingSoon': '即将推出',

  // Sidebar
  'nav.workflows': '工作流',
  'nav.logs': '日志',
  'nav.settings': '设置',

  // Workflow List
  'workflows.title': '工作流',
  'workflows.new': '+ 新建工作流',
  'workflows.empty': '还没有工作流，点击新建开始吧。',
  'workflows.nodes': '{count} 个节点',
  'workflows.noDesc': '暂无描述',

  // Workflow Editor
  'editor.namePlaceholder': '工作流名称',
  'editor.descPlaceholder': '添加描述...',
  'editor.repeatCount': '执行次数',
  'editor.repeatForever': '无限循环',
  'editor.nodeList': '节点列表',

  // Workflow List
  'workflows.globalStopKey': '全局停止键',
  'workflows.runTimes': '执行',
  'workflows.runTimesUnit': '次',
  'workflows.infinite': '无限',
  'workflows.running': '运行中',
  'workflows.runCount': '第 {current} 次',
  'workflows.confirmDelete': '确定要删除工作流「{name}」吗？',

  // Node Categories
  'category.sensor': '感知节点',
  'category.action': '动作节点',
  'category.control': '控制节点',

  // Node Types
  'node.find_image': '找图',
  'node.click': '点击',
  'node.key_press': '按键',
  'node.type_text': '输入文本',
  'node.wait': '等待',
  'node.condition': '条件判断',
  'node.branch': '条件分支',
  'node.loop': '循环',

  // Node Details (shown on node body)
  'node.click.image': '点击图片',
  'node.click.image.offset': '点击图片 (偏移 {x},{y})',
  'node.click.coord': '坐标 ({x}, {y})',
  'node.click.window': '窗口相对位置',
  'node.find_image.paste': '粘贴或选择图片',
  'node.find_image.timeout': '超时 {ms}ms',
  'node.wait.detail': '等待 {ms}ms',
  'node.loop.detail': '最多 {max} 次',
  'node.loop.infinite': '无限循环',
  'node.combo': '组合动作',
  'node.combo.steps': '{count} 个步骤',
  'node.click.left': '左键',
  'node.click.right': '右键',
  'node.click.middle': '中键',

  // Node Config Panel - Click
  'config.clickMode': '点击方式',
  'config.clickMode.image': '图片位置（默认中心）',
  'config.clickMode.coord': '坐标位置',
  'config.clickMode.window': '窗口模式',
  'config.offsetType': '偏移类型',
  'config.offsetType.px': '像素 (px)',
  'config.offsetType.pct': '百分比 (%)',
  'config.x': 'X',
  'config.y': 'Y',
  'config.button': '鼠标按键',
  'config.button.left': '左键',
  'config.button.right': '右键',
  'config.button.middle': '中键',
  'config.offsetX': 'X 偏移',
  'config.offsetY': 'Y 偏移',
  'config.windowTitle': '窗口标题',
  'config.windowTitle.placeholder': '输入窗口标题关键词',

  // Node Config Panel - General
  'config.key': '按键',
  'config.text': '文本内容',
  'config.waitMs': '等待时间 (ms)',
  'config.saveToVar': '结果保存到变量',
  'config.maxIterations': '最大循环次数',
  'config.stopWhen': '停止条件',
  'config.stopWhen.found': '找到图片时停止',
  'config.stopWhen.notFound': '未找到图片时停止',
  'config.intervalMs': '检查间隔 (ms)',
  'config.confidence': '匹配置信度',
  'config.timeoutEnabled': '启用超时',
  'config.timeoutMs': '超时时间 (ms)',
  'config.retryIntervalMs': '重试间隔 (ms)',
  'config.loopMode': '循环方式',
  'config.loopMode.count': '固定次数',
  'config.loopMode.infinite': '无限循环',
  'config.loopCount': '循环次数',
  'config.loopHint': '↻ 循环体：连接需要重复执行的节点。循环体末端节点可连回此循环节点。\n→ 完成：循环结束后执行的节点。',

  // Branch Config
  'config.branchCondition': '判断条件',
  'config.branchCondition.lastMatch': '上次找图结果',
  'config.branchCondition.variable': '变量值',
  'config.branchVariable': '变量名',
  'config.branchVariable.placeholder': '输入变量名',
  'config.branchHint': '✓ 条件为真时走左侧输出\n✗ 条件为假时走右侧输出',

  // Key Recorder
  'config.keyRecorder.placeholder': '点击录制按键',
  'config.keyRecorder.hint': '请按下按键...',
  'config.keyRecorder.record': '录制',
  'config.keyRecorder.stop': '停止',
  'config.keyRecorder.selectKey': '-- 选择按键 --',

  // Combo Node
  'config.combo.addStep': '+ 添加步骤',
  'config.combo.stepAction': '动作',
  'config.combo.action.key_down': '按下按键',
  'config.combo.action.key_up': '释放按键',
  'config.combo.action.click': '鼠标点击',
  'config.combo.action.wait': '等待',
  'config.combo.action.type_text': '输入文本',

  // Template Image
  'template.pasteHint': '点击此处粘贴截图，或拖入图片',
  'template.selectFile': '选择图片',
  'template.replace': '更换图片',
  'template.uploading': '上传中...',

  // Handle tooltips
  'handle.branch.true': '条件为真时走此路径',
  'handle.branch.true.short': '是',
  'handle.branch.false': '条件为假时走此路径',
  'handle.branch.false.short': '否',
  'handle.loop.body': '循环体：连接每次迭代执行的节点',
  'handle.loop.body.short': '循环',
  'handle.loop.done': '完成：循环结束后执行的节点',
  'handle.loop.done.short': '完成',
  'handle.loop.back': '回环：循环体末尾节点连接到此处',
  'handle.loop.back.short': '回环',
  'handle.timeout.success': '匹配成功时走此路径',
  'handle.timeout.timeout': '超时后走此路径',

  // Context Menu
  'ctx.copy': '复制',
  'ctx.cut': '剪切',
  'ctx.paste': '粘贴',
  'ctx.delete': '删除',
  'ctx.selectAll': '全选',
  'ctx.undo': '撤销',
  'ctx.redo': '重做',
  'ctx.add': '添加',
  'ctx.addAfter': '后接',

  // Logs
  'logs.title': '执行日志',
  'logs.empty': '暂无日志。',
  'logs.workflow': '工作流: {id}',
  'logs.duration': '耗时: {seconds}s',
  'logs.detail': '日志详情 — {status}',
  'logs.liveStream': '实时日志流',
  'logs.waiting': '等待事件...',
  'logs.status.running': '运行中',
  'logs.status.success': '成功',
  'logs.status.failed': '失败',

  // Settings
  'settings.title': '设置',
  'settings.language': '语言',
  'settings.language.desc': '选择界面语言',
  'settings.imageEngine': '图像识别引擎',
  'settings.imageEngine.desc': '选择默认的图像识别方案',
  'settings.inputMethod': '键鼠控制方案',
  'settings.inputMethod.desc': '选择默认的键鼠模拟方案',
  'settings.hotkeys': '快捷键设置',
  'settings.hotkeys.desc': '自定义快捷键绑定',
  'settings.autoStart': '开机自启',
  'settings.autoStart.desc': '系统启动时自动运行 AutoFlow',
  'settings.autoUpdate': '自动更新',
  'settings.autoUpdate.desc': '有新版本时自动下载更新',
  'settings.tray': '系统托盘',
  'settings.tray.desc': '最小化到系统托盘运行',
} as const

export default zhCN
