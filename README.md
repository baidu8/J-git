-git 🚀
一个为开发者打造的轻量级、极速 GitHub 仓库管理与文件上传 Chrome 插件。

🌟 核心功能
⚡ 极速上传：支持文件点击选择或直接拖拽上传。

🔄 自动覆盖：智能检测同名文件并自动获取 SHA，实现无感版本更新。

📂 全能管理：在插件内直接完成仓库（Repo）与分支（Branch）的新建、重命名、删除。

🔍 智能搜索：内置实时搜索框，即便拥有上百个仓库也能秒速定位。

📋 批量复制：上传完成后，所有文件链接自动按顺序复制到剪贴板（每行一个）。

🌙 暗黑模式：原生适配系统深色/浅色主题，保护视力。

🔗Logo 门户：点击左上角 J-git 标志，一键直达当前操作的仓库页面。

📸 界面预览
![](https://github.com/baidu8/J-git/blob/main/J-git-h.png)
![](https://github.com/baidu8/J-git/blob/main/J-git-b.png)
🛠️ 安装指南
下载本项目仓库到本地。

打开 Chrome 浏览器，访问 chrome://extensions/。

在右上角开启 “开发者模式”。

点击 “加载已解压的扩展程序”，选择本项目所在的文件夹。

在工具栏固定 J-git，即可开始使用！

📖 使用指南
1. 授权设置
点击插件右上角的 “设置 Token”。请确保你的 GitHub Personal Access Token (PAT) 至少拥有以下权限：

repo (全选：用于读写仓库及上传文件)

delete_repo (可选：若需在插件内删除仓库则必选)

2. 快速上传
使用搜索框或下拉列表选择目标 仓库 和 分支。

将文件拖入中间的 上传区。

点击 “开始上传”。

上传完成后，直接在你的文档（如 Markdown）中 Ctrl + V 粘贴链接。

3. 注意事项
单文件限制：受 GitHub API 限制，建议单个文件大小不超过 25MB。

数据安全：你的 Token 仅加密存储在浏览器本地（Chrome Storage），不会上传到任何第三方服务器。

📜 开源协议
本项目基于 MIT License 协议开源。

✨ 觉得好用？别忘了给一个 Star 鼓励一下！

💡 接下来你可以：
替换链接：记得把 README 里的 [](https://github.com/baidu8/J-git) 替换为你真实的仓库地址。

添加 License：如果需要，我可以帮你再写一份标准的 MIT License 文本。