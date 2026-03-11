const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const querystring = require('querystring');
const { exec } = require('child_process');
const WebSocket = require('ws');

// 数据库配置
const dbPath = path.join(__dirname, 'applet-cache.json');

// 初始化数据库
function initDatabase() {
  if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(dbPath, JSON.stringify({}));
  }
}

// 从数据库查询小程序信息
function getAppletInfoFromDB(appid) {
  try {
    const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    return db[appid] || null;
  } catch (error) {
    console.error('读取数据库失败:', error);
    return null;
  }
}

// 保存小程序信息到数据库
function saveAppletInfoToDB(appid, info) {
  try {
    const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    db[appid] = {
      ...info,
      cachedAt: Date.now()
    };
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
  } catch (error) {
    console.error('保存数据库失败:', error);
  }
}

// 检查缓存是否过期（7天）
function isCacheExpired(cachedAt) {
  if (!cachedAt) return true;
  const cacheAge = Date.now() - cachedAt;
  const maxAge = 30 * 24 * 60 * 60 * 1000; // 7天
  return cacheAge > maxAge;
}

// 获取小程序信息（带缓存）
async function getAppletInfo(appid) {
  // 先从数据库查询
  const cached = getAppletInfoFromDB(appid);
  if (cached && !isCacheExpired(cached.cachedAt)) {
    console.log(`从缓存获取小程序信息: ${appid}`);
    return cached;
  }

  // 缓存未命中或已过期，调用API
  console.log(`调用API获取小程序信息: ${appid}`);
  return new Promise((resolve, reject) => {
    const postData = `appid=${appid}`;
    const options = {
      hostname: 'kainy.cn',
      port: 443,
      path: '/api/weapp/info/',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = require('https').request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (result.code === 0 && result.data) {
            // 保存到数据库
            saveAppletInfoToDB(appid, result.data);
            resolve(result.data);
          } else {
            resolve(null);
          }
        } catch (error) {
          console.error('解析API响应失败:', error);
          resolve(null);
        }
      });
    });

    req.on('error', (error) => {
      console.error('获取小程序信息失败:', error);
      resolve(null);
    });

    req.write(postData);
    req.end();
  });
}

// 配置文件路径
const configPath = path.join(__dirname, 'config.json');
// 已反编译小程序存储路径
const decompiledPath = path.join(__dirname, 'decompiled.json');

// 读取配置
const readConfig = () => {
  try {
    if (fs.existsSync(configPath)) {
      const data = fs.readFileSync(configPath, 'utf8');
      return JSON.parse(data);
    }
    return {};
  } catch (error) {
    console.error('读取配置失败:', error);
    return {};
  }
};

// 写入配置
const writeConfig = (config) => {
  try {
    // 确保目录存在
    const configDir = path.dirname(configPath);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  } catch (error) {
    console.error('写入配置失败:', error);
  }
};

// 获取上次选择的目录
const getLastSelectedDirectory = () => {
  const config = readConfig();
  return config.lastSelectedDirectory || null;
};

// 保存上次选择的目录
const saveLastSelectedDirectory = (directory) => {
  const config = readConfig();
  config.lastSelectedDirectory = directory;
  writeConfig(config);
};

// 读取已反编译小程序列表
const readDecompiledApplets = () => {
  try {
    if (fs.existsSync(decompiledPath)) {
      const data = fs.readFileSync(decompiledPath, 'utf8');
      return JSON.parse(data);
    }
    return [];
  } catch (error) {
    console.error('读取已反编译小程序列表失败:', error);
    return [];
  }
};

// 写入已反编译小程序列表
const writeDecompiledApplets = (applets) => {
  try {
    fs.writeFileSync(decompiledPath, JSON.stringify(applets, null, 2));
  } catch (error) {
    console.error('写入已反编译小程序列表失败:', error);
  }
};

// 添加已反编译小程序
const addDecompiledApplet = (appid) => {
  const applets = readDecompiledApplets();
  if (!applets.includes(appid)) {
    applets.push(appid);
    writeDecompiledApplets(applets);
  }
};

// 移除已反编译小程序
const removeDecompiledApplet = (appid) => {
  const applets = readDecompiledApplets();
  const index = applets.indexOf(appid);
  if (index > -1) {
    applets.splice(index, 1);
    writeDecompiledApplets(applets);
  }
};

// 查找本地头像
function findLocalAvatar(appid, packagesDir) {
  try {
    // 从packages目录路径中提取基础路径
    const baseDir = path.dirname(packagesDir);
    const iconDir = path.join(baseDir, 'icon');
    
    // 检查icon目录是否存在
    if (!fs.existsSync(iconDir)) {
      return null;
    }
    
    // 读取icon目录下的所有文件
    const files = fs.readdirSync(iconDir);
    
    // 查找以appid开头的图片文件
    const avatarFile = files.find(file => 
      file.startsWith(appid + '_') && 
      (file.endsWith('.png') || file.endsWith('.jpg') || file.endsWith('.jpeg') || file.endsWith('.webp'))
    );
    
    if (avatarFile) {
      return path.join(iconDir, avatarFile);
    }
    
    return null;
  } catch (error) {
    console.error('查找本地头像失败:', error);
    return null;
  }
}

// 查找自定义头像（程序根目录下logo.svg）
function findCustomAvatar() {
  try {
    const customAvatarPath = path.join(__dirname, 'logo.svg');
    
    // 检查自定义头像是否存在
    if (fs.existsSync(customAvatarPath)) {
      return customAvatarPath;
    }
    
    return null;
  } catch (error) {
    console.error('查找自定义头像失败:', error);
    return null;
  }
}

// 获取小程序头像（按优先级）
async function getAppletAvatar(appid, packagesDir, apiAvatar) {
  // 优先级1：使用API返回的头像（来自缓存或API）
  if (apiAvatar) {
    console.log(`使用API头像: ${apiAvatar}`);
    return apiAvatar;
  }
  
  // 优先级2：查找程序根目录下的logo.png
  const customAvatar = findCustomAvatar();
  if (customAvatar) {
    console.log(`使用自定义头像: ${customAvatar}`);
    return customAvatar;
  }
  
  return '';
}

// 分析目录
async function analyzeDirectory(dirPath) {
  try {
    // 检查目录是否存在
    if (!fs.existsSync(dirPath)) {
      throw new Error(`目录不存在: ${dirPath}`);
    }

    const applets = [];
    
    // 读取packages目录下的所有文件夹（这些是appid）
    const appidDirs = fs.readdirSync(dirPath, { withFileTypes: true })
      .filter(file => file.isDirectory())
      .map(file => file.name);
    
    // 遍历每个appid文件夹
    for (const appid of appidDirs) {
      const appidPath = path.join(dirPath, appid);
      
      // 调用API获取小程序信息
      const appletInfo = await getAppletInfo(appid);
      
      // 获取头像（按优先级）
      const avatar = await getAppletAvatar(appid, dirPath, appletInfo?.avatar || '');
      
      // 读取appid文件夹下的所有子文件夹（这些是随机数文件夹）
      const randomDirs = fs.readdirSync(appidPath, { withFileTypes: true })
        .filter(file => file.isDirectory())
        .map(file => file.name);
      
      // 遍历每个随机数文件夹
      for (const randomDir of randomDirs) {
        const randomPath = path.join(appidPath, randomDir);
        
        // 查找.wxapkg文件
        const files = fs.readdirSync(randomPath, { withFileTypes: true });
        const wxapkgFiles = files.filter(file => file.isFile() && file.name.endsWith('.wxapkg'));
        
        // 如果找到.wxapkg文件，添加到小程序列表
        if (wxapkgFiles.length > 0) {
          const wxapkgFile = wxapkgFiles[0];
          const wxapkgPath = path.join(randomPath, wxapkgFile.name);
          
          // 使用API获取的信息，如果没有则使用默认值
          applets.push({
            appid: appid,
            randomDir: randomDir,
            name: appletInfo?.nickname || `小程序 ${appid}`,
            description: appletInfo?.description || `版本: ${randomDir}`,
            avatar: avatar,
            principal_name: appletInfo?.principal_name || '',
            path: wxapkgPath,
            decompilePath: randomPath, // 反编译路径
            size: fs.statSync(wxapkgPath).size,
            modified: fs.statSync(wxapkgPath).mtime
          });
        }
      }
    }

    return {
      success: true,
      applets: applets
    };
  } catch (error) {
    console.error('分析目录错误:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// 打开目录
async function openDirectory(dirPath) {
  try {
    const { exec } = require('child_process');
    
    // 处理相对路径，转换为绝对路径
    let targetPath = dirPath;
    if (!targetPath.startsWith('C:') && !targetPath.startsWith('D:') && !targetPath.startsWith('/')) {
      // 如果是相对路径，转换为绝对路径
      targetPath = path.join(__dirname, targetPath);
    }
    
    console.log('打开目录:', targetPath);
    
    // 根据操作系统打开目录
    if (process.platform === 'win32') {
      exec(`explorer "${targetPath}"`);
    } else if (process.platform === 'darwin') {
      exec(`open "${targetPath}"`);
    } else {
      exec(`xdg-open "${targetPath}"`);
    }
    
    return { success: true };
  } catch (error) {
    console.error('打开目录错误:', error);
    return { success: false, error: error.message };
  }
}

// 删除目录
async function deleteDirectory(dirPath) {
  try {
    // 处理相对路径，转换为绝对路径
    let targetPath = dirPath;
    if (!targetPath.startsWith('C:') && !targetPath.startsWith('D:') && !targetPath.startsWith('/')) {
      // 如果是相对路径，转换为绝对路径
      targetPath = path.join(__dirname, targetPath);
    }
    
    // 确保路径编码正确
    targetPath = decodeURIComponent(targetPath);
    
    console.log('删除目录:', targetPath);
    
    // 检查目录是否存在
    if (!fs.existsSync(targetPath)) {
      return { success: false, error: '目录不存在' };
    }
    
    // 删除目录（递归删除）
    fs.rmSync(targetPath, { recursive: true, force: true });
    
    console.log('目录删除成功:', targetPath);
    return { success: true };
  } catch (error) {
    console.error('删除目录错误:', error);
    return { success: false, error: error.message };
  }
}

// 获取目录状态
async function getDirectoryStatus(dirPath) {
  try {
    if (!fs.existsSync(dirPath)) {
      return {
        success: false,
        error: '目录不存在'
      };
    }
    
    // 计算目录的修改时间和文件数量
    let fileCount = 0;
    let maxMtime = 0;
    
    function traverse(dir) {
      const files = fs.readdirSync(dir, { withFileTypes: true });
      for (const file of files) {
        const filePath = path.join(dir, file.name);
        const stats = fs.statSync(filePath);
        fileCount++;
        
        // 更新最大修改时间
        const mtime = stats.mtime.getTime();
        if (mtime > maxMtime) {
          maxMtime = mtime;
        }
        
        if (file.isDirectory()) {
          traverse(filePath);
        }
      }
    }
    
    traverse(dirPath);
    
    return {
      success: true,
      stats: {
        mtime: maxMtime,
        fileCount: fileCount
      }
    };
  } catch (error) {
    console.error('获取目录状态失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// 反编译函数
async function decompile(options) {
  return new Promise((resolve, reject) => {
    try {
      const { appid, outputDir, wxapkgPath, decompilePath, depth = 1, format = true, analyze = false, analyzePort = 8000, proxyPort = 8888 } = options;
      
      console.log('=== 开始反编译 ===');
      console.log('接收到的参数:', options);
      
      // 使用decompilePath作为反编译路径（packages/{appid}/{随机数文件夹}）
      const targetPath = decompilePath || wxapkgPath;
      
      // 验证targetPath
      if (!targetPath) {
        throw new Error('缺少反编译路径参数');
      }
      
      if (!fs.existsSync(targetPath)) {
        throw new Error(`路径不存在: ${targetPath}`);
      }
      
      // 确保appid存在
      if (!appid) {
        throw new Error('缺少appid参数');
      }
      
      // 设置默认输出路径：output/{appid}
      const defaultOutputDir = path.join(__dirname, 'output', appid);
      
      // 如果用户指定了输出目录，自动添加appid子文件夹
      let finalOutputDir;
      if (outputDir) {
        finalOutputDir = path.join(outputDir, appid);
      } else {
        finalOutputDir = defaultOutputDir;
      }
      
      // 确保输出目录存在
      if (!fs.existsSync(path.dirname(finalOutputDir))) {
        fs.mkdirSync(path.dirname(finalOutputDir), { recursive: true });
      }
      
      console.log('=== 反编译配置 ===');
      console.log('目标路径:', targetPath);
      console.log('AppID:', appid);
      console.log('输出目录:', finalOutputDir);
      console.log('深度:', depth);
      console.log('格式化:', format);
      console.log('分析:', analyze);
      
      // 构建命令行参数
      let cmdArgs = [];
      
      // 添加format参数
      if (format) {
        cmdArgs.push('-f');
      }
      
      // 添加depth参数
      cmdArgs.push('-d', depth.toString());
      
      // 添加output参数（加上双引号避免路径中有空格）
      cmdArgs.push('-o', `"${finalOutputDir}"`);
      
      // 添加analyze参数
      if (analyze) {
        cmdArgs.push('-a');
        cmdArgs.push('--analyze-port', analyzePort.toString());
        cmdArgs.push('--proxy-port', proxyPort.toString());
      }
      
      // 添加反编译路径（加上双引号避免路径中有空格）
      cmdArgs.push(`"${targetPath}"`);
      
      // 构建完整命令
      const fullCmd = `node dist/index.js wx ${cmdArgs.join(' ')}`;
      
      console.log('=== 执行命令 ===');
      console.log('完整命令:', fullCmd);
      console.log('工作目录:', __dirname);
      
      // 执行命令（异步）
      exec(fullCmd, {
        cwd: __dirname,
        encoding: 'utf8',
        timeout: 120000, // 2分钟超时
      }, (error, stdout, stderr) => {
        console.log('=== 反编译完成 ===');
        if (stdout) {
          console.log('标准输出:', stdout);
        }
        if (stderr) {
          console.log('标准错误:', stderr);
        }
        console.log('输出目录:', finalOutputDir);
        
        if (error) {
          console.error('=== 反编译错误 ===');
          console.error('错误信息:', error.message);
          console.error('错误堆栈:', error.stack);
          resolve({
            success: false,
            error: error.message || '反编译失败'
          });
        } else {
          resolve({
            success: true,
            message: '反编译成功',
            output: stdout,
            outputPath: finalOutputDir
          });
        }
      });
    } catch (error) {
      console.error('=== 反编译错误 ===');
      console.error('错误信息:', error.message);
      console.error('错误堆栈:', error.stack);
      
      resolve({
        success: false,
        error: error.message || '反编译失败'
      });
    }
  });
}

// 处理HTTP请求
function handleRequest(req, res) {
  // 设置CORS头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // 处理OPTIONS请求
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }
  
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  
  // 处理API请求
  if (pathname.startsWith('/api/')) {
    // 处理头像代理请求
    if (pathname.startsWith('/api/avatar')) {
      handleAvatarProxy(req, res, pathname);
    } else {
      handleApiRequest(req, res, pathname);
    }
  } else {
    // 处理静态文件请求
    serveStaticFile(req, res, pathname);
  }
}

// 处理API请求
async function handleApiRequest(req, res, pathname) {
  let body = '';
  req.on('data', chunk => {
    body += chunk.toString();
  });
  
  req.on('end', async () => {
    let data = {};
    try {
      data = JSON.parse(body);
    } catch (e) {
      // 尝试解析为查询字符串
      data = querystring.parse(body);
    }
    
    let result;
    
    switch (pathname) {
      case '/api/analyze/directory':
        // 启动目录监听
        watchDirectory(data.dirPath);
        // 分析目录
        result = await analyzeDirectory(data.dirPath);
        break;
      case '/api/decompile/wxapkg':
        result = await decompile(data);
        break;
      case '/api/shell/openDirectory':
        result = await openDirectory(data.dirPath);
        break;
      case '/api/fs/deleteDirectory':
        result = await deleteDirectory(data.dirPath);
        break;
      case '/api/get/lastSelectedDirectory':
        const lastPath = getLastSelectedDirectory();
        const exists = lastPath ? fs.existsSync(lastPath) : false;
        result = {
          success: true,
          path: lastPath,
          exists: exists
        };
        break;
      case '/api/save/lastSelectedDirectory':
        saveLastSelectedDirectory(data.directory);
        result = { success: true };
        break;
      case '/api/get/directoryStatus':
        result = await getDirectoryStatus(data.dirPath);
        break;
      case '/api/get/decompiledApplets':
        result = {
          success: true,
          applets: readDecompiledApplets()
        };
        break;
      case '/api/add/decompiledApplet':
        addDecompiledApplet(data.appid);
        result = { success: true };
        break;
      case '/api/remove/decompiledApplet':
        removeDecompiledApplet(data.appid);
        result = { success: true };
        break;
      default:
        result = { success: false, error: 'API路径不存在' };
    }
    
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(result));
  });
}

// 服务静态文件
function serveStaticFile(req, res, pathname) {
  // 默认为index.html
  const filePath = pathname === '/' ? '/index.html' : pathname;
  const fullPath = path.join(__dirname, filePath);
  
  // 检查文件是否存在
  if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
    // 根据文件扩展名设置Content-Type
    const ext = path.extname(fullPath);
    let contentType = 'text/plain';
    
    switch (ext) {
      case '.html':
        contentType = 'text/html';
        break;
      case '.css':
        contentType = 'text/css';
        break;
      case '.js':
        contentType = 'application/javascript';
        break;
      case '.json':
        contentType = 'application/json';
        break;
      case '.png':
        contentType = 'image/png';
        break;
      case '.jpg':
      case '.jpeg':
        contentType = 'image/jpeg';
        break;
      case '.svg':
        contentType = 'image/svg+xml';
        break;
    }
    
    res.setHeader('Content-Type', contentType);
    fs.createReadStream(fullPath).pipe(res);
  } else {
    res.statusCode = 404;
    res.end('File not found');
  }
}

// 初始化数据库
initDatabase();

// 创建HTTP服务器
const server = http.createServer(handleRequest);

// 创建WebSocket服务器
const wss = new WebSocket.Server({ server });

// 客户端连接列表
const clients = new Set();

// 监听WebSocket连接
wss.on('connection', (ws) => {
  console.log('新的WebSocket连接');
  clients.add(ws);
  
  // 监听连接关闭
  ws.on('close', () => {
    console.log('WebSocket连接关闭');
    clients.delete(ws);
  });
  
  // 监听错误
  ws.on('error', (error) => {
    console.error('WebSocket错误:', error);
    clients.delete(ws);
  });
});

// 向所有客户端发送消息
function broadcast(message) {
  const data = JSON.stringify(message);
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}

// 目录监听器
let directoryWatchers = new Map();

// 目录变化防抖定时器
let directoryChangeTimers = new Map();

// 监听目录变化
function watchDirectory(dirPath) {
  try {
    // 清除之前的监听器
    if (directoryWatchers.has(dirPath)) {
      directoryWatchers.get(dirPath).close();
    }
    
    console.log(`开始监听目录: ${dirPath}`);
    
    // 监听目录变化
    const watcher = fs.watch(dirPath, { recursive: true }, async (eventType, filename) => {
      // 只处理创建事件
      if (eventType === 'change' || eventType === 'rename') {
        console.log(`目录变化: ${eventType} - ${filename}`);
        
        // 清除之前的定时器
        if (directoryChangeTimers.has(dirPath)) {
          clearTimeout(directoryChangeTimers.get(dirPath));
        }
        
        // 设置新的定时器，3秒后处理
        directoryChangeTimers.set(dirPath, setTimeout(async () => {
          try {
            console.log('执行目录分析...');
            // 重新分析目录
            const result = await analyzeDirectory(dirPath);
            if (result.success) {
              // 发送消息到所有客户端
              broadcast({
                type: 'directory:changed',
                data: result
              });
              console.log('目录分析完成，已发送更新通知');
            }
          } catch (error) {
            console.error('分析目录失败:', error);
          }
        }, 3000));
      }
    });
    
    // 保存监听器
    directoryWatchers.set(dirPath, watcher);
  } catch (error) {
    console.error('监听目录失败:', error);
  }
}

// 停止监听目录
function stopWatchingDirectory(dirPath) {
  if (directoryWatchers.has(dirPath)) {
    directoryWatchers.get(dirPath).close();
    directoryWatchers.delete(dirPath);
    console.log(`停止监听目录: ${dirPath}`);
  }
  
  // 清除定时器
  if (directoryChangeTimers.has(dirPath)) {
    clearTimeout(directoryChangeTimers.get(dirPath));
    directoryChangeTimers.delete(dirPath);
  }
}

// 处理头像代理请求
function handleAvatarProxy(req, res, pathname) {
  try {
    // 从URL中提取原始头像URL
    const parsedUrl = url.parse(req.url, true);
    const avatarUrl = parsedUrl.query.url;
    
    if (!avatarUrl) {
      res.statusCode = 400;
      res.end('缺少头像URL参数');
      return;
    }
    
    console.log(`代理头像请求: ${avatarUrl}`);
    
    // 解析头像URL
    const parsedAvatarUrl = url.parse(avatarUrl);
    const protocol = parsedAvatarUrl.protocol === 'https:' ? require('https') : require('http');
    
    // 发起请求获取头像
    const options = {
      hostname: parsedAvatarUrl.hostname,
      port: parsedAvatarUrl.port,
      path: parsedAvatarUrl.path,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    };
    
    const proxyReq = protocol.request(options, (proxyRes) => {
      // 设置响应头
      res.setHeader('Content-Type', proxyRes.headers['content-type'] || 'image/jpeg');
      res.setHeader('Access-Control-Allow-Origin', '*');
      
      // 转发响应数据
      proxyRes.pipe(res);
    });
    
    proxyReq.on('error', (error) => {
      console.error('代理头像请求失败:', error);
      res.statusCode = 500;
      res.end('代理头像请求失败');
    });
    
    proxyReq.end();
  } catch (error) {
    console.error('处理头像代理请求失败:', error);
    res.statusCode = 500;
    res.end('处理头像代理请求失败');
  }
}

// 启动服务器
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});

module.exports = server;