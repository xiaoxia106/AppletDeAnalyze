# 小程序反编译工具 (AppletDeAnalyze)

一个基于 Node.js + pywebview 的微信小程序反编译工具。

## 环境

- **Python**：3.8+
- **Node.js**：12+

## 安装

1. 克隆或下载项目到本地
2. 安装依赖：
   ```bash
   # 安装 Python 依赖
   pip install pywebview
   # 安装 Node.js 依赖
   npm install
3. 运行应用
   ```python app.py```

## 使用

在小程序列表中选择目标小程序，点击【反编译】按钮。等待反编译完成，成功后会显示「✓ 已反编译」标记，反编译结果默认保存在 output 目录中。

点击【打开】按钮会自动打开对应的反编译输出目录，查看反编译后的代码和资源文件。

点击【删除Appid目录】按钮会删除源小程序目录文件。

点击【删除反编译目录】 按钮会删除反编译输出目录（同时移除「已反编译」标记）。

勾选【格式化代码】反编译后的文件会格式输出，不过在反编译速度上会变慢。

勾选【JS分析】结合burpsuite+HaE插件实现敏感信息提取。首先在burpsuite中设置proxy settings中代理端口，再点击反编译按钮会将反编译后的js代码代理到burpsuite中。


