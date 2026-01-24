let selectedFiles = [];
let allRepos = [];

// --- 1. 初始化与品牌逻辑 ---
document.addEventListener('DOMContentLoaded', async () => {
    const data = await chrome.storage.local.get(['github_token', 'last_repo', 'last_branch']);
    if (data.github_token) {
        setLoginUI(true);
        loadRepos(data.last_repo, data.last_branch);
    }

    // 绑定基础事件
    document.getElementById('donate-btn').onclick = (e) => {
        e.preventDefault();
        document.getElementById('donate-modal').style.display = 'flex';
    };
    document.getElementById('close-donate').onclick = () => {
        document.getElementById('donate-modal').style.display = 'none';
    };
    document.getElementById('brand-link').onclick = () => {
        const repo = document.getElementById('repo-select').value;
        const url = repo ? `https://github.com/${repo}` : 'https://github.com/';
        chrome.tabs.create({ url: url });
    };
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

    // 文件夹行：新建文件夹
    document.getElementById('add-folder-btn').onclick = () => {
        const newFolderName = prompt("请输入新文件夹名称 (例如: img/assets):");
        if (newFolderName) {
            const folderSelect = document.getElementById('folder-select');
            const cleanPath = newFolderName.replace(/^\/+|\/+$/g, '');
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
        const opt = new Option(repo.full_name, repo.full_name);
        if (selectedValue === repo.full_name) opt.selected = true;
        repoSelect.appendChild(opt);
    });
}

document.getElementById('repo-search').oninput = (e) => {
    const keyword = e.target.value.toLowerCase();
    const filtered = allRepos.filter(r => r.full_name.toLowerCase().includes(keyword));
    renderRepoOptions(filtered, document.getElementById('repo-select').value);
};

// 新建仓库 - 强力修复版
document.getElementById('new-repo-btn').onclick = async () => {
    // 1. 使用 trim() 去掉首尾空格
    let rawInput = prompt("请输入新仓库名称 (建议使用纯英文和数字):");
    if (!rawInput) return;
    
    let cleanName = rawInput.trim();
    
    // 2. 这里的逻辑非常关键：强制检查是否有中文字符或特殊符号
    // GitHub 会把不支持的字符全部转为 "-"
    if (/[^\x00-\xff]/g.test(cleanName)) {
        alert("错误：仓库名不能包含中文，请使用英文、数字或连字符。");
        return;
    }

    const { github_token } = await chrome.storage.local.get('github_token');
    try {
        const res = await fetch('https://api.github.com/user/repos', {
            method: 'POST',
            headers: { 
                'Authorization': `token ${github_token}`, 
                'Content-Type': 'application/json' 
            },
            // 3. 确保变量名 cleanName 准确无误地传给 API
            body: JSON.stringify({ 
                name: cleanName, 
                auto_init: true 
            })
        });

        const data = await res.json();

        if (res.ok) {
            // 4. 成功后，必须使用 API 返回的官方全名 (data.full_name)
            const officialName = data.full_name;
            await chrome.storage.local.set({ last_repo: officialName });
            
            alert(`✅ 仓库 [ ${officialName} ] 创建成功！`);
            
            // 5. 给 GitHub 后端一点同步时间，然后刷新列表
            setTimeout(() => {
                loadRepos(officialName);
            }, 1500); 
        } else {
            // 弹出详细错误，比如名字已存在或 Token 权限不足
            alert("创建失败: " + (data.message || "未知原因"));
        }
    } catch (e) { 
        alert("请求异常，请检查网络"); 
    }
};

// 修改仓库名称
document.getElementById('edit-repo-btn').onclick = async () => {
    const repoSelect = document.getElementById('repo-select');
    const repo = repoSelect.value;
    if (!repo) return alert("请先选择仓库");
    const oldName = repo.split('/')[1];
    const newName = prompt("请输入新的仓库名称:", oldName);
    if (!newName || newName === oldName) return;

    const { github_token } = await chrome.storage.local.get('github_token');
    const res = await fetch(`https://api.github.com/repos/${repo}`, {
        method: 'PATCH',
        headers: { 'Authorization': `token ${github_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName })
    });
    if (res.ok) {
        const newPath = `${repo.split('/')[0]}/${newName}`;
        chrome.storage.local.set({ last_repo: newPath });
        setTimeout(() => loadRepos(newPath), 1000);
    } else { alert("重命名失败"); }
};

// 删除仓库
document.getElementById('delete-repo-btn').onclick = async () => {
    const repo = document.getElementById('repo-select').value;
    if (!repo) return alert("请选择仓库");
    if (prompt(`确认删除？请输入全名 [ ${repo} ]：`) !== repo) return;
    const { github_token } = await chrome.storage.local.get('github_token');
    const res = await fetch(`https://api.github.com/repos/${repo}`, {
        method: 'DELETE', headers: { 'Authorization': `token ${github_token}` }
    });
    if (res.status === 204) {
        chrome.storage.local.remove(['last_repo', 'last_branch']);
        setTimeout(() => loadRepos(), 1000);
    } else { alert("删除失败，请检查权限。"); }
};

// --- 3. 分支管理逻辑 ---

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
            const opt = new Option(br.name, br.name);
            if (preSelectBranch === br.name) opt.selected = true;
            else if (!preSelectBranch && (br.name === 'main' || br.name === 'master')) opt.selected = true;
            branchSelect.appendChild(opt);
        });
        loadFolders();
    } catch (e) { branchSelect.innerHTML = '<option>获取失败</option>'; }
}

// 新建分支
document.getElementById('new-branch-btn').onclick = async () => {
    const repo = document.getElementById('repo-select').value;
    const newBr = prompt("输入新分支名:");
    if (!repo || !newBr) return;
    const { github_token } = await chrome.storage.local.get('github_token');
    try {
        const repoRes = await fetch(`https://api.github.com/repos/${repo}`, { headers: { 'Authorization': `token ${github_token}` } });
        const repoData = await repoRes.json();
        const baseRes = await fetch(`https://api.github.com/repos/${repo}/git/refs/heads/${repoData.default_branch}`, { headers: { 'Authorization': `token ${github_token}` } });
        const baseData = await baseRes.json();
        const res = await fetch(`https://api.github.com/repos/${repo}/git/refs`, {
            method: 'POST',
            headers: { 'Authorization': `token ${github_token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ ref: `refs/heads/${newBr}`, sha: baseData.object.sha })
        });
        if (res.ok) {
            chrome.storage.local.set({ last_branch: newBr });
            setTimeout(() => loadBranches(repo, newBr), 1000);
        }
    } catch (e) { alert("创建失败"); }
};

// 修改分支名称 (之前丢掉的部分)
document.getElementById('edit-branch-btn').onclick = async () => {
    const repo = document.getElementById('repo-select').value;
    const branch = document.getElementById('branch-select').value;
    if (!repo || !branch) return alert("请先选择分支");
    const newBrName = prompt("请输入新的分支名称:", branch);
    if (!newBrName || newBrName === branch) return;

    const { github_token } = await chrome.storage.local.get('github_token');
    try {
        const res = await fetch(`https://api.github.com/repos/${repo}/branches/${branch}/rename`, {
            method: 'POST',
            headers: { 'Authorization': `token ${github_token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ new_name: newBrName })
        });
        if (res.ok) {
            chrome.storage.local.set({ last_branch: newBrName });
            setTimeout(() => loadBranches(repo, newBrName), 1000);
        } else { alert("该操作可能需要更多权限或 GitHub 暂不支持重命名此分支"); }
    } catch (e) { alert("重命名失败"); }
};

// 删除分支
document.getElementById('delete-branch-btn').onclick = async () => {
    const repo = document.getElementById('repo-select').value;
    const branch = document.getElementById('branch-select').value;
    if (branch === 'main' || branch === 'master') return alert("禁止删除主分支。");
    if (!confirm(`确定删除分支 [ ${branch} ]？`)) return;
    const { github_token } = await chrome.storage.local.get('github_token');
    const res = await fetch(`https://api.github.com/repos/${repo}/git/refs/heads/${branch}`, {
        method: 'DELETE', headers: { 'Authorization': `token ${github_token}` }
    });
    if (res.ok) {
        chrome.storage.local.remove('last_branch');
        setTimeout(() => loadBranches(repo), 1000);
    }
};

// 文件夹加载逻辑
async function loadFolders() {
    const repo = document.getElementById('repo-select').value;
    const branch = document.getElementById('branch-select').value;
    const folderSelect = document.getElementById('folder-select');
    const { github_token } = await chrome.storage.local.get('github_token');
    if (!repo || !branch) return;

    folderSelect.innerHTML = '<option value="">根目录 /</option>';
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
        folders.forEach(f => {
            folderSelect.appendChild(new Option(f.path, f.path));
        });
    } catch (e) { console.error("文件夹加载失败"); }
}

// --- 4. 上传逻辑 ---

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
                const rd = new FileReader(); rd.readAsDataURL(file); 
                rd.onload = () => r(rd.result.split(',')[1]); 
            });
            const finalPath = folder ? `${folder}/${file.name}` : file.name;
            let fileSha = null;
            try {
                const checkRes = await fetch(`https://api.github.com/repos/${repo}/contents/${finalPath}?ref=${branch}`, {
                    headers: { 'Authorization': `token ${github_token}` }
                });
                if (checkRes.ok) { const data = await checkRes.json(); fileSha = data.sha; }
            } catch (e) {}

            const body = { message: `J-git: ${finalPath}`, content: base64, branch };
            if (fileSha) body.sha = fileSha;

            const res = await fetch(`https://api.github.com/repos/${repo}/contents/${finalPath}`, {
                method: 'PUT',
                headers: { 'Authorization': `token ${github_token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            if (res.ok) {
                urlList.push(`https://cdn.jsdelivr.net/gh/${repo}@${branch}/${finalPath}`);
            }
        }
        if (urlList.length > 0) {
            navigator.clipboard.writeText(urlList.join('\n')).then(() => alert("🎉 上传并复制 CDN 链接成功！"));
        }
        resetUI();
        loadFolders();
    } catch (e) { alert("出错啦"); } finally { btn.disabled = false; btn.innerText = "开始上传"; }
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
    if(e.target.value) { loadBranches(e.target.value); chrome.storage.local.set({ last_repo: e.target.value }); }
};

document.getElementById('branch-select').onchange = (e) => {
    if(e.target.value) { chrome.storage.local.set({ last_branch: e.target.value }); loadFolders(); }
};

document.getElementById('refresh-repos').onclick = () => loadRepos();
document.getElementById('cancel-btn').onclick = resetUI;