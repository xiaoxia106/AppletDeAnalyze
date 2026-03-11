import webview
import subprocess
import time
import os
import threading
import sys

# 获取当前目录
current_dir = os.path.dirname(os.path.abspath(__file__))

# 启动Node.js服务器
def start_node_server():
    print("启动Node.js服务器...")
    # 检查是否有node命令
    try:
        # 启动服务器
        server_process = subprocess.Popen(
            ["node", "server.js"],
            cwd=current_dir,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            encoding='utf-8'
        )
        
        # 读取服务器输出
        while True:
            try:
                line = server_process.stdout.readline()
                if line:
                    print(line.strip())
                    # 检查服务器是否启动成功
                    if "服务器运行在" in line:
                        print("Node.js服务器启动成功！")
                        break
                if server_process.poll() is not None:
                    # 服务器启动失败
                    error_output = server_process.stderr.read()
                    print(f"服务器启动失败: {error_output}")
                    sys.exit(1)
            except UnicodeDecodeError:
                # 忽略编码错误，继续读取
                continue
        
        # 继续读取服务器输出
        def read_output():
            while True:
                try:
                    line = server_process.stdout.readline()
                    if line:
                        print(line.strip())
                except UnicodeDecodeError:
                    # 忽略编码错误，继续读取
                    continue
        
        # 启动一个线程读取服务器输出
        output_thread = threading.Thread(target=read_output)
        output_thread.daemon = True
        output_thread.start()
        
        return server_process
    except FileNotFoundError:
        print("错误: 未找到node命令，请确保已安装Node.js")
        sys.exit(1)

# 主函数
def main():
    # 启动Node.js服务器
    server_process = start_node_server()
    
    # 等待服务器完全启动
    time.sleep(2)
    
    # 创建webview窗口
    print("创建WebView窗口...")
    window = webview.create_window(
        "小程序反编译工具",
        "http://localhost:3000",
        width=1200,
        height=800,
        resizable=True,
        min_size=(800, 600)
    )
    
    # 运行webview
    webview.start()
    
    # 当窗口关闭时，终止服务器
    print("关闭服务器...")
    server_process.terminate()
    server_process.wait()
    print("服务器已关闭")

if __name__ == "__main__":
    main()