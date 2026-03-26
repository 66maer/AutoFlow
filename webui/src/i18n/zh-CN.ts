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
  'editor.repeatCount': '执行次数',
  'editor.repeatForever': '无限循环',
  'editor.nodeList': '节点列表',

  // Node Types
  'node.find_image': '找图',
  'node.click': '点击',
  'node.key_press': '按键',
  'node.type_text': '输入文本',
  'node.wait': '等待',
  'node.condition': '条件判断',
  'node.loop': '循环',

  // Node Details (shown on node body)
  'node.click.image': '点击图片',
  'node.click.image.offset': '点击图片 (偏移 {x},{y})',
  'node.click.coord': '坐标 ({x}, {y})',
  'node.click.window': '窗口相对位置',
  'node.find_image.paste': '粘贴或选择图片',
  'node.wait.detail': '等待 {ms}ms',
  'node.loop.detail': '最多 {max} 次',
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

  // Template Image
  'template.pasteHint': '点击此处粘贴截图，或拖入图片',
  'template.selectFile': '选择图片',
  'template.replace': '更换图片',
  'template.uploading': '上传中...',

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
