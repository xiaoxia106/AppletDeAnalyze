# 小程序反编译工具 (AppletDeAnalyze)

一个基于 Node.js + pywebview 的微信小程序反编译工具。


## 系统要求

- **Python**：3.8+
- **Node.js**：12+


## 安装方法

1. 克隆或下载项目到本地
2. 安装依赖：
   ```bash
   # 安装 Python 依赖
   pip install pywebview
   
   # 安装 Node.js 依赖
   npm install
3. 运行应用

   ```python app.py```

## 使用步骤

### 1.选择小程序目录
小程序目录通常位于：C:\Users\用户名\AppData\Roaming\Tencent\xwechat\radium\Applet\packages

### 2.反编译小程序
在小程序列表中选择目标小程序，点击「反编译」按钮。等待反编译完成，成功后会显示「✓ 已反编译」标记，反编译结果默认保存在 output 目录中。

### 3.查看反编译结果
点击「打开」按钮，会自动打开对应的反编译输出目录，查看反编译后的代码和资源文件。

### 4.管理小程序
- 删除Appid目录 ：删除源小程序目录
- 删除反编译目录 ：删除反编译输出目录（同时移除「已反编译」标记）

### 5.JS分析
勾选JS分析结合burpsuite+HaE插件实现敏感信息提取。首先在burpsuite中设置proxy settings中代理端口，再点击反编译按钮会将反编译后的js代码代理到burpsuite中。

