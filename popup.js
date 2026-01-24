let selectedFiles = [];
let allRepos = [];

// --- 1. 初始化与品牌逻辑 ---
document.addEventListener('DOMContentLoaded', async () => {
    const data = await chrome.storage.local.get(['github_token', 'last_repo', 'last_branch']);
    if (data.github_token) {
        setLoginUI(true);
        loadRepos(data.last_repo, data.last_branch);
    }

    const donateBtn = document.getElementById('donate-btn');
    const donateModal = document.getElementById('donate-modal');
    const closeDonate = document.getElementById('close-donate');

    donateBtn.onclick = (e) => {
        e.preventDefault();
        donateModal.style.display = 'flex';
    };

    closeDonate.onclick = () => {
        donateModal.style.display = 'none';
    };

    donateModal.onclick = (e) => {
        if (e.target === donateModal) donateModal.style.display = 'none';
    };

    document.getElementById('brand-link').onclick = () => {
        const repo = document.getElementById('repo-select').value;
        const url = repo ? `https://github.com/${repo}` : 'https://github.com/';
        chrome.tabs.create({ url: url });
    };

    const projectLink = document.getElementById('project-link');
    if (projectLink) {
        projectLink.onclick = (e) => {
            e.preventDefault(); 
            chrome.tabs.create({ url: projectLink.href });
        };
    }

    document.getElementById('limit-info').onclick = (e) => {
        e.preventDefault();
        alert(
            "🚀 J-git 完整使用与限制指南\n" +
            "————————————————————\n" +
            "📦 【如何使用】\n" +
            "1. 授权：点击右上角设置 Token (需包含 repo 权限，删除需 delete_repo)。\n" +
            "2. 选择：在搜索框输入关键词秒找仓库，点击 🔄 强制同步数据。\n" +
            "3. 上传：支持单/多文件拖拽，点击【开始上传】自动触发。\n" +
            "4. 快捷：上传后链接自动入剪贴板；点击左上角 Logo 直达仓库页。\n\n" +
            "⚠️ 【限制与须知】\n" +
            "1. 自动覆盖：已开启！同名文件将直接更新版本，请谨慎操作。\n" +
            "2. 文件大小：受 API 限制，建议单文件不超过 25MB 以保证稳定。\n" +
            "3. 同步延迟：GitHub 缓存可能导致重命名后下拉框数据没变，请手动刷新。\n" +
            "4. 空仓库说明：新建仓库会默认创建 README.md 以初始化分支。\n" +
            "5. 安全提示：Token 仅保存在浏览器本地，请妥善保管。"
        );
    };

    // 新增：新建文件夹按钮逻辑
    document.getElementById('add-folder-btn').onclick = () => {
        const newFolderName = prompt("请输入新文件夹名称 (例如: images/assets):");
        if (newFolderName) {
            const folderSelect = document.getElementById('folder-select');
            const cleanPath = newFolderName.replace(/^\/+|\/+$/g, ''); // 去除首尾斜杠
            const option = new Option(`[新] ${cleanPath}`, cleanPath);
            option.selected = true;
            folderSelect.appendChild(option);
        }
    };
});

// --- 2. 仓库管理逻辑 ---

async function loadRepos(preSelectRepo = null, preSelectBranch = null) {
    const { github_token } = await chrome.storage.local.get('github_token');
    const repoSelect = document.getElementById('repo-select');
    if (!github_token) return;

    repoSelect.innerHTML = '<option>数据加载中...</option>';
    try {
        const res = await fetch(`https://api.github.com/user/repos?per_page=100&sort=updated&t=${Date.now()}`, {
            headers: { 'Authorization': `token ${github_token}` }
        });
        allRepos = await res.json();
        renderRepoOptions(allRepos, preSelectRepo);
        if (preSelectRepo) loadBranches(preSelectRepo, preSelectBranch);
    } catch (e) { repoSelect.innerHTML = '<option>加载失败</option>'; }
}

function renderRepoOptions(repos, selectedValue) {
    const repoSelect = document.getElementById('repo-select');
    repoSelect.innerHTML = '<option value="">选择仓库</option>';
    repos.forEach(repo => {
        const opt = document.createElement('option');
        opt.value = repo.full_name;
        opt.innerText = repo.full_name;
        if (selectedValue === repo.full_name) opt.selected = true;
        repoSelect.appendChild(opt);
    });
}

document.getElementById('repo-search').oninput = (e) => {
    const keyword = e.target.value.toLowerCase();
    const filtered = allRepos.filter(r => r.full_name.toLowerCase().includes(keyword));
    renderRepoOptions(filtered, document.getElementById('repo-select').value);
};

// --- 3. 分支与文件夹管理逻辑 ---

async function loadBranches(repo, preSelectBranch = null) {
    const { github_token } = await chrome.storage.local.get('github_token');
    const branchSelect = document.getElementById('branch-select');
    branchSelect.innerHTML = '<option>加载中...</option>';
    try {
        const res = await fetch(`https://api.github.com/repos/${repo}/branches?t=${Date.now()}`, {
            headers: { 'Authorization': `token ${github_token}` }
        });
        const branches = await res.json();
        branchSelect.innerHTML = '';
        branches.forEach(br => {
            const opt = document.createElement('option');
            opt.value = br.name; opt.innerText = br.name;
            if (preSelectBranch === br.name) opt.selected = true;
            else if (!preSelectBranch && (br.name === 'main' || br.name === 'master')) opt.selected = true;
            branchSelect.appendChild(opt);
        });
        // 分支加载完成后，触发文件夹加载
        loadFolders();
    } catch (e) { branchSelect.innerHTML = '<option>获取失败</option>'; }
}

async function loadFolders() {
    const repo = document.getElementById('repo-select').value;
    const branch = document.getElementById('branch-select').value;
    const folderSelect = document.getElementById('folder-select');
    const { github_token } = await chrome.storage.local.get('github_token');

    if (!repo || !branch) return;
    folderSelect.innerHTML = '<option value="">根目录 / (加载中...)</option>';

    try {
        const branchRes = await fetch(`https://api.github.com/repos/${repo}/branches/${branch}`, {
            headers: { 'Authorization': `token ${github_token}` }
        });
        const branchData = await branchRes.json();
        const treeSha = branchData.commit.commit.tree.sha;

        const treeRes = await fetch(`https://api.github.com/repos/${repo}/git/trees/${treeSha}?recursive=1`, {
            headers: { 'Authorization': `token ${github_token}` }
        });
        const treeData = await treeRes.json();

        const folders = treeData.tree.filter(item => item.type === 'tree');
        folderSelect.innerHTML = '<option value="">根目录 /</option>';
        folders.forEach(f => {
            const opt = new Option(f.path, f.path);
            folderSelect.appendChild(opt);
        });
    } catch (e) {
        folderSelect.innerHTML = '<option value="">根目录 /</option>';
    }
}

// --- 4. 上传逻辑 (支持文件夹与自动覆盖) ---

const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');

dropZone.onclick = () => fileInput.click();
dropZone.ondragover = (e) => { e.preventDefault(); dropZone.classList.add('active'); };
dropZone.ondragleave = () => dropZone.classList.remove('active');
dropZone.ondrop = (e) => { e.preventDefault(); dropZone.classList.remove('active'); handleFiles(e.dataTransfer.files); };
fileInput.onchange = (e) => handleFiles(e.target.files);

function handleFiles(files) {
    selectedFiles = Array.from(files);
    if (selectedFiles.length > 0) {
        document.getElementById('file-list').innerText = `已选文件: ${selectedFiles.length} 个`;
        document.getElementById('action-btns').classList.add('show');
    }
}

document.getElementById('upload-btn').onclick = async () => {
    const btn = document.getElementById('upload-btn');
    const { github_token } = await chrome.storage.local.get('github_token');
    const repo = document.getElementById('repo-select').value;
    const branch = document.getElementById('branch-select').value;
    const folder = document.getElementById('folder-select').value;
    
    if (!repo || !branch) return alert("请选择完整路径");

    btn.disabled = true; btn.innerText = "处理中...";
    try {
        let urlList = [];
        
        for (const file of selectedFiles) {
            const base64 = await new Promise(r => { 
                const rd = new FileReader(); 
                rd.readAsDataURL(file); 
                rd.onload = () => r(rd.result.split(',')[1]); 
            });

            // 构造最终的 GitHub 存储路径
            const finalPath = folder ? `${folder}/${file.name}` : file.name;

            // 自动覆盖逻辑 (获取 SHA)
            let fileSha = null;
            try {
                const checkRes = await fetch(`https://api.github.com/repos/${repo}/contents/${finalPath}?ref=${branch}`, {
                    headers: { 'Authorization': `token ${github_token}` }
                });
                if (checkRes.ok) {
                    const fileData = await checkRes.json();
                    fileSha = fileData.sha;
                }
            } catch (e) {}

            const uploadBody = {
                message: `J-git upload: ${finalPath}`,
                content: base64,
                branch: branch
            };
            if (fileSha) uploadBody.sha = fileSha;

            const uploadRes = await fetch(`https://api.github.com/repos/${repo}/contents/${finalPath}`, {
                method: 'PUT',
                headers: { 'Authorization': `token ${github_token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(uploadBody)
            });

            if (uploadRes.ok) {
                const fileUrl = `https://cdn.jsdelivr.net/gh/${repo}@${branch}/${finalPath}`;
                urlList.push(fileUrl);
            }
        }

        if (urlList.length > 0) {
            const copyText = urlList.join('\n');
            navigator.clipboard.writeText(copyText).then(() => {
                alert(`🎉 成功上传 ${urlList.length} 个文件！\n链接已全部复制到剪贴板。`);
            }).catch(() => alert(`🎉 上传成功！`));
        }
        resetUI();
        // 上传完成后刷新文件夹列表（以防新建了文件夹）
        loadFolders();
    } catch (e) { 
        alert("上传失败，请检查网络或 Token 权限。"); 
    } finally { 
        btn.disabled = false; btn.innerText = "开始上传"; 
    }
};

// --- 5. 辅助工具 ---

document.getElementById('login-btn').onclick = () => {
    const token = prompt("请输入 GitHub Token:");
    if (token) chrome.storage.local.set({ github_token: token.trim() }, () => { setLoginUI(true); loadRepos(); });
};

function setLoginUI(isLoggedIn) { 
    const btn = document.getElementById('login-btn');
    btn.innerText = isLoggedIn ? "已登录" : "设置 Token";
    if (isLoggedIn) btn.classList.add('active');
}

function resetUI() { 
    selectedFiles = []; 
    document.getElementById('file-list').innerText = ""; 
    document.getElementById('action-btns').classList.remove('show'); 
    fileInput.value = "";
}

document.getElementById('repo-select').onchange = (e) => { 
    if(e.target.value) { 
        loadBranches(e.target.value); 
        chrome.storage.local.set({ last_repo: e.target.value });
    }
};

document.getElementById('branch-select').onchange = (e) => {
    if(e.target.value) {
        chrome.storage.local.set({ last_branch: e.target.value });
        loadFolders(); // 分支切换，刷新文件夹
    }
};

document.getElementById('refresh-repos').onclick = () => loadRepos();
document.getElementById('cancel-btn').onclick = resetUI;