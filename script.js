import { analysisRules } from './rules.js';

const themeToggle = document.getElementById('themeToggle');
const body = document.body;
const navButtons = document.querySelectorAll('.nav-btn');
const contentSections = document.querySelectorAll('.content-section');
const codeInput = document.getElementById('codeInput');
const languageSelect = document.getElementById('languageSelect');
const analyzeBtn = document.getElementById('analyzeBtn');
const resultsContainer = document.getElementById('resultsContainer');
const clearBtn = document.getElementById('clearBtn');
const fileInput = document.getElementById('fileInput');
const fileLabel = document.querySelector('.file-label');
const exportBtn = document.getElementById('exportBtn');
const learnModeBtn = document.getElementById('learnModeBtn');
const learnGrid = document.getElementById('learnGrid');
const learnModal = document.getElementById('learnModal');
const modalTitle = document.getElementById('modalTitle');
const modalBody = document.getElementById('modalBody');
const modalClose = document.getElementById('modalClose');
// Coach mode elements
const coachModeBtn = document.getElementById('coachModeBtn');
const coachModal = document.getElementById('coachModal');
const coachTitle = document.getElementById('coachTitle');
const coachBody = document.getElementById('coachBody');
const coachClose = document.getElementById('coachClose');
const coachPrev = document.getElementById('coachPrev');
const coachNext = document.getElementById('coachNext');
const coachProgress = document.getElementById('coachProgress');
// Repo scan elements
const repoUrlInput = document.getElementById('repoUrlInput');
const branchInput = document.getElementById('branchInput');
const scanRepoBtn = document.getElementById('scanRepoBtn');

// Holds last repo analysis for export
let lastRepoReport = null;
let lastIssuesSnapshot = null; // for single-file/text analyses

// Unified busy state and UI helpers
let isBusy = false;

function setBusy(flag) {
    isBusy = flag;
    if (analyzeBtn) analyzeBtn.disabled = flag;
    if (scanRepoBtn) scanRepoBtn.disabled = flag;
    if (clearBtn) clearBtn.disabled = flag;
    if (exportBtn) exportBtn.disabled = true; // re-enable after results
    if (learnModeBtn) learnModeBtn.disabled = true;
}

function showLoading(title, subtitle) {
    resultsContainer.innerHTML = `
        <div class="empty-state loading">
            <i class="fas fa-spinner fa-spin"></i>
            <h4>${title}</h4>
            ${subtitle ? `<p>${subtitle}</p>` : ''}
        </div>
    `;
}

function updateButtonsAfterResults(hasIssues) {
    if (exportBtn) exportBtn.disabled = !hasIssues;
    if (learnModeBtn) learnModeBtn.disabled = !hasIssues;
    if (coachModeBtn) coachModeBtn.disabled = !hasIssues;
}

themeToggle.addEventListener('click', () => {
    if (body.getAttribute('data-theme') === 'dark') {
        body.removeAttribute('data-theme');
        themeToggle.innerHTML = '<i class="fas fa-moon"></i> <span>Dark Mode</span>';
    } else {
        body.setAttribute('data-theme', 'dark');
        themeToggle.innerHTML = '<i class="fas fa-sun"></i> <span>Light Mode</span>';
    }
});

navButtons.forEach(button => {
    button.addEventListener('click', () => {
        const targetSectionId = button.dataset.section;
        navButtons.forEach(btn => btn.classList.remove('active'));
        contentSections.forEach(section => section.classList.remove('active'));
        button.classList.add('active');
        document.getElementById(targetSectionId).classList.add('active');

        if (targetSectionId === 'auditor') {
            updateResultsVisibility();
        }
    });
});

fileInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            codeInput.value = e.target.result;
            const extension = file.name.split('.').pop();
            if (extension === 'js') languageSelect.value = 'javascript';
            else if (extension === 'html') languageSelect.value = 'html';
            else if (extension === 'css') languageSelect.value = 'css';
            else languageSelect.value = 'javascript';
            fileLabel.querySelector('span').textContent = file.name;
        };
        reader.readAsText(file);
    }
});

fileLabel.addEventListener('dragover', (e) => {
    e.preventDefault();
    fileLabel.classList.add('drag-over');
});

fileLabel.addEventListener('dragleave', () => {
    fileLabel.classList.remove('drag-over');
});

fileLabel.addEventListener('drop', (e) => {
    e.preventDefault();
    fileLabel.classList.remove('drag-over');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        fileInput.files = files;
        fileInput.dispatchEvent(new Event('change'));
    }
});

clearBtn.addEventListener('click', () => {
    codeInput.value = '';
    resultsContainer.innerHTML = `
        <div class="empty-state">
            <i class="fas fa-search"></i>
            <h4>Ready to analyze your code?</h4>
            <p>Paste your code above and click "Analyze Code" to get started</p>
        </div>
    `;
    exportBtn.disabled = true;
    learnModeBtn.disabled = true;
    fileLabel.querySelector('span').textContent = 'Choose a file or drag it here';
    fileInput.value = '';
});

analyzeBtn.addEventListener('click', () => {
    if (isBusy) return;
    const code = codeInput.value;
    const language = languageSelect.value;
    lastRepoReport = null;
    setBusy(true);
    showLoading('Analyzing your code...', 'Please wait a moment.');

    if (!code.trim()) {
        resultsContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-pencil-alt"></i>
                <h4>No code to analyze!</h4>
                <p>Please paste some code into the input area.</p>
            </div>
        `;
        setBusy(false);
        return;
    }

    try {
        const issues = performAnalysis(code, language);
        lastIssuesSnapshot = issues;
        displayResults(issues);
        updateButtonsAfterResults(issues.length > 0);
    } catch (error) {
        console.error('Error during analysis:', error);
        resultsContainer.innerHTML = `
            <div class="empty-state error">
                <i class="fas fa-exclamation-triangle"></i>
                <h4>Analysis Error</h4>
                <p>An error occurred during analysis: ${error.message}</p>
                <p>Please check the console for more details.</p>
            </div>
        `;
    } finally {
        setBusy(false);
    }
});

// --- GitHub Repo Scan ---
scanRepoBtn.addEventListener('click', async () => {
    if (isBusy) return;
    lastRepoReport = null;
    const rawInput = (repoUrlInput?.value || '').trim();
    const overrideBranch = (branchInput?.value || '').trim();

    if (!rawInput) {
        resultsContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-pencil-alt"></i>
                <h4>No repo provided!</h4>
                <p>Enter owner/repo or a GitHub URL.</p>
            </div>
        `;
        return;
    }

    const parsed = parseRepoInput(rawInput);
    if (!parsed) {
        resultsContainer.innerHTML = `
            <div class="empty-state error">
                <i class="fas fa-exclamation-triangle"></i>
                <h4>Invalid GitHub reference</h4>
                <p>Use owner/repo or https://github.com/owner/repo[/tree/branch[/path]].</p>
            </div>
        `;
        return;
    }

    const { owner, repo, branch: branchFromUrl, path: basePath } = parsed;
    const ref = overrideBranch || branchFromUrl || await fetchDefaultBranch(owner, repo).catch(() => null);
    if (!ref) {
        resultsContainer.innerHTML = `
            <div class="empty-state error">
                <i class="fas fa-exclamation-triangle"></i>
                <h4>Could not resolve branch</h4>
                <p>Specify a branch or ensure the repo exists and is public.</p>
            </div>
        `;
        return;
    }

    setBusy(true);
    showLoading('Scanning repository…', `${owner}/${repo}@${ref}${basePath ? ' — ' + basePath : ''}`);

    try {
        const tree = await fetchGitTree(owner, repo, ref);
        const files = filterSupportedFiles(tree, basePath);
        if (files.length === 0) {
            resultsContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-folder-open"></i>
                    <h4>No analyzable files found</h4>
                    <p>We look for .js, .html, .css files${basePath ? ' under ' + basePath : ''}.</p>
                </div>
            `;
            setBusy(false);
            return;
        }

        const limited = files.slice(0, 300); // avoid huge scans
        const resultsByFile = await analyzeFilesInRepo(owner, repo, ref, limited);
        const summary = buildRepoSummary(resultsByFile);
        lastRepoReport = { owner, repo, ref, basePath: basePath || '', resultsByFile, summary };
        lastIssuesSnapshot = null;
        displayRepoResults(lastRepoReport);
        updateButtonsAfterResults(summary.totalIssues > 0);
    } catch (err) {
        console.error('Repo scan failed', err);
        resultsContainer.innerHTML = `
            <div class="empty-state error">
                <i class="fas fa-exclamation-triangle"></i>
                <h4>Scan Error</h4>
                <p>${escapeHTML(err?.message || 'Unknown error occurred while scanning repo.')}</p>
            </div>
        `;
    } finally {
        setBusy(false);
    }
});

function parseRepoInput(input) {
    try {
        // owner/repo
        if (/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(input)) {
            const [owner, repo] = input.split('/');
            return { owner, repo, branch: null, path: '' };
        }
        // URL
        const u = new URL(input);
        if (u.hostname !== 'github.com') return null;
        const parts = u.pathname.replace(/^\/+/, '').split('/');
        const owner = parts[0];
        const repo = parts[1] ? parts[1].replace(/\.git$/, '') : null;
        if (!owner || !repo) return null;
        if (parts[2] === 'tree' && parts[3]) {
            const branch = parts[3];
            const path = parts.slice(4).join('/');
            return { owner, repo, branch, path };
        }
        return { owner, repo, branch: null, path: '' };
    } catch (_) {
        return null;
    }
}

async function fetchDefaultBranch(owner, repo) {
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`);
    if (!res.ok) throw new Error('Failed to fetch repo metadata');
    const data = await res.json();
    return data.default_branch;
}

async function fetchGitTree(owner, repo, ref) {
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/${encodeURIComponent(ref)}?recursive=1`);
    if (!res.ok) throw new Error('Failed to fetch repository tree');
    const data = await res.json();
    if (!data.tree) throw new Error('Tree not available');
    return data.tree; // [{path, type, sha, url}]
}

function filterSupportedFiles(tree, basePath) {
    const supported = ['.js', '.html', '.css'];
    const prefix = basePath ? basePath.replace(/^\/+|\/+$/g, '') + '/' : '';
    return tree
        .filter(node => node.type === 'blob')
        .map(n => n.path)
        .filter(p => (!prefix || p.startsWith(prefix)) && supported.some(ext => p.toLowerCase().endsWith(ext)));
}

async function analyzeFilesInRepo(owner, repo, ref, paths) {
    const concurrency = 6;
    const queue = paths.slice();
    const resultsByFile = {};
    async function worker() {
        while (queue.length) {
            const filePath = queue.shift();
            try {
                const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${ref}/${filePath}`;
                const res = await fetch(rawUrl);
                if (!res.ok) continue;
                const text = await res.text();
                // skip very large files
                if (text.length > 200000) continue;
                const language = filePath.endsWith('.js') ? 'javascript' : filePath.endsWith('.html') ? 'html' : 'css';
                const issues = performAnalysis(text, language).map(it => ({ ...it, filePath }));
                if (issues.length) resultsByFile[filePath] = issues;
            } catch (e) {
                // ignore individual file failures
            }
        }
    }
    const workers = Array.from({ length: concurrency }, () => worker());
    await Promise.all(workers);
    return resultsByFile;
}

function buildRepoSummary(resultsByFile) {
    const summary = { error: 0, warning: 0, suggestion: 0, filesWithIssues: 0, totalIssues: 0 };
    Object.values(resultsByFile).forEach(arr => {
        if (arr.length) summary.filesWithIssues++;
        arr.forEach(issue => {
            summary.totalIssues++;
            summary[issue.severity]++;
        });
    });
    return summary;
}

function displayRepoResults(report) {
    const { owner, repo, ref, basePath, resultsByFile, summary } = report;
    const header = `${owner}/${repo}@${ref}${basePath ? ' — ' + basePath : ''}`;

    const files = Object.keys(resultsByFile).sort();
    if (files.length === 0) {
        resultsContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-check-circle"></i>
                <h4>No issues found in repo</h4>
                <p>${header}</p>
            </div>
        `;
        return;
    }

    const fileBlocks = files.map(fp => {
        const issues = resultsByFile[fp];
        // group within file by ruleId
        const byRule = issues.reduce((acc, issue) => {
            (acc[issue.ruleId] = acc[issue.ruleId] || { meta: issue, items: [] }).items.push(issue);
            return acc;
        }, {});
        const rulesHtml = Object.values(byRule).map(group => {
            const meta = group.meta;
            const items = group.items
                .sort((a, b) => a.lineNumber - b.lineNumber)
                .map(it => {
                    const snippet = it.snippet ? escapeHTML(it.snippet.length > 200 ? it.snippet.slice(0,200) + '…' : it.snippet) : '';
                    const hasSnippet = Boolean(snippet);
                    return `
                        <li class="occurrence compact">
                            <span class="loc">L${it.lineNumber}</span>
                            ${hasSnippet ? `<button class=\"snippet-btn\" title=\"View code\">Code</button>` : ''}
                            ${hasSnippet ? `<pre class=\"code-snippet hidden\"><code>${snippet}</code></pre>` : ''}
                        </li>
                    `;
                }).join('');
            return `
                <div class="rule-group" data-rule-id="${meta.ruleId}">
                    <div class="rule-group-header">
                        <span class="badge ${meta.severity}">${meta.severity}</span>
                        <strong class="rule-title">${escapeHTML(meta.title)}</strong>
                        <span class="count">${group.items.length} occurrence(s)</span>
                    </div>
                    <div class="rule-group-body" style="display:none">
                        <ul class="occurrence-list compact-list">${items}</ul>
                    </div>
                </div>
            `;
        }).join('');
        return `
            <div class="file-group">
                <div class="file-group-header">
                    <i class="fas fa-file-code"></i>
                    <span class="file-path">${escapeHTML(fp)}</span>
                    <span class="count">${issues.length} issue(s)</span>
                </div>
                <div class="file-group-body" style="display:none">
                    ${rulesHtml}
                </div>
            </div>
        `;
    }).join('');

    resultsContainer.innerHTML = `
        <div class="analysis-summary">
            <h3>Repo Analysis Complete</h3>
            <p>${header}</p>
            <ul class="type-summary">
                <li><strong>Total</strong>: ${summary.totalIssues} issues across ${Object.keys(resultsByFile).length} files</li>
                ${summary.error ? `<li><strong>Errors</strong>: ${summary.error}</li>` : ''}
                ${summary.warning ? `<li><strong>Warnings</strong>: ${summary.warning}</li>` : ''}
                ${summary.suggestion ? `<li><strong>Suggestions</strong>: ${summary.suggestion}</li>` : ''}
            </ul>
            <p>Click a file or rule to expand details.</p>
        </div>
        <div class="repo-issues">${fileBlocks}</div>
    `;

    attachFileGroupToggles();
    addLearnModeEventListeners();
    attachRuleGroupToggles();

    // Enable learn mode if there are issues
    try {
        const hasIssues = Object.keys(resultsByFile).length > 0;
        learnModeBtn.disabled = !hasIssues;
    } catch (_) {}
}

function attachFileGroupToggles() {
    document.querySelectorAll('.file-group-header').forEach(header => {
        header.addEventListener('click', () => {
            const body = header.nextElementSibling;
            if (!body) return;
            body.style.display = body.style.display === 'none' ? 'block' : 'none';
        });
    });
}

function performAnalysis(code, language) {
    const issuesFound = [];
    const rules = analysisRules[language];

    console.log('Starting analysis for language:', language);
    console.log('Code to analyze:', code.substring(0, 100) + '...');
    console.log('Available rules:', rules ? rules.length : 0);
    console.log('Rules object:', analysisRules);
    console.log('Language requested:', language);

    if (!rules) {
        console.error('No rules found for language:', language);
        return [];
    }

    if (rules) {
        rules.forEach(rule => {
            try {
                console.log(`Checking rule: ${rule.id}`);
                const ruleIssues = rule.check(code);
                console.log(`Rule ${rule.id} found ${ruleIssues.length} issues`);

                ruleIssues.forEach(issue => {
                    issuesFound.push({
                        ...issue,
                        severity: rule.severity,
                        type: rule.type,
                        title: rule.title,
                        description: rule.description,
                        suggestion: rule.suggestion,
                        ruleId: rule.id
                    });
                });
            } catch (e) {
                console.error(`Error applying rule ${rule.id}:`, e);
            }
        });
    }

    console.log('Total issues found:', issuesFound.length);
    return issuesFound;
}

function displayResults(issues) {
    console.log('displayResults called with issues:', issues);
    console.log('Number of issues:', issues.length);

    resultsContainer.innerHTML = '';

    if (issues.length === 0) {
        console.log('No issues found, showing empty state');
        resultsContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-check-circle"></i>
                <h4>Great job! No issues found.</h4>
                <p>Your code looks clean according to our current rules.</p>
            </div>
        `;
        return;
    }

    console.log('Issues found, creating consolidated analysis section');

    // Build summary counts
    const summary = { error: 0, warning: 0, suggestion: 0, total: issues.length };
    issues.forEach(issue => { summary[issue.severity]++; });

    // Merge related types (e.g., Maintainability + Readability) into a single section
    function getDisplayType(originalType) {
        if (originalType === 'Maintainability' || originalType === 'Readability') return 'Maintainability/Readability';
        return originalType;
    }

    // Group issues by display type, then by ruleId for compact display
    const issuesByType = issues.reduce((acc, issue) => {
        const displayType = getDisplayType(issue.type);
        if (!acc[displayType]) acc[displayType] = {};
        const bucket = acc[displayType];
        if (!bucket[issue.ruleId]) {
            bucket[issue.ruleId] = {
                meta: {
                    ruleId: issue.ruleId,
                    title: issue.title,
                    severity: issue.severity,
                    type: displayType,
                    description: issue.description,
                    suggestion: issue.suggestion
                },
                items: []
            };
        }
        bucket[issue.ruleId].items.push({
            lineNumber: issue.lineNumber,
            message: issue.message,
            snippet: issue.snippet || ''
        });
        return acc;
    }, {});

    // Minimal per-type summary (kept for potential future use, not rendered to reduce noise)
    const typeSummaryHtml = Object.entries(issuesByType).map(([type, ruleGroups]) => {
        const flatSeverities = Object.values(ruleGroups).flatMap(g => g.items.map(() => g.meta.severity));
        const counts = flatSeverities.reduce((c, sev) => { c[sev] = (c[sev] || 0) + 1; return c; }, {});
        const occurrences = flatSeverities.length;
        const ruleCount = Object.keys(ruleGroups).length;
        return `<li><strong>${type}</strong>: ${occurrences} in ${ruleCount} rule(s)</li>`;
    }).join('');

    // Order types to surface critical ones first (use merged label)
    const typeOrder = { 'Error': 0, 'Bug Risk': 1, 'Security': 2, 'Maintainability/Readability': 3, 'Best Practice': 4, 'Performance': 5, 'Accessibility': 6, 'Debugging': 7 };
    const groupsHtml = Object.entries(issuesByType)
        .sort((a, b) => (typeOrder[a[0]] ?? 99) - (typeOrder[b[0]] ?? 99))
        .map(([type, ruleGroups]) => {
                const ruleBlocks = Object.values(ruleGroups).map(group => {
                const sorted = group.items.sort((a, b) => a.lineNumber - b.lineNumber);
                const limit = 5;
                const visible = sorted.slice(0, limit);
                const hidden = sorted.slice(limit);
                const visibleHtml = visible.map(item => {
                    const message = item.message ? escapeHTML(truncateText(item.message, 100)) : '';
                    const snippet = item.snippet ? escapeHTML(truncateText(item.snippet, 140)) : '';
                    const hasSnippet = Boolean(snippet);
                    return `
                        <li class="occurrence compact">
                            <span class="loc">L${item.lineNumber}</span>
                            ${message ? `<span class=\"msg\">${message}</span>` : ''}
                            ${hasSnippet ? `<button class=\"snippet-btn\" title=\"View code\">Code</button>` : ''}
                            ${hasSnippet ? `<pre class=\"code-snippet hidden\"><code>${snippet}</code></pre>` : ''}
                        </li>
                    `;
                }).join('');
                const hiddenHtml = hidden.map(item => {
                    const message = item.message ? escapeHTML(truncateText(item.message, 100)) : '';
                    const snippet = item.snippet ? escapeHTML(truncateText(item.snippet, 140)) : '';
                    const hasSnippet = Boolean(snippet);
                                        return `
                        <li class="occurrence compact hidden-occ">
                            <span class="loc">L${item.lineNumber}</span>
                            ${message ? `<span class=\"msg\">${message}</span>` : ''}
                            ${hasSnippet ? `<button class=\"snippet-btn\" title=\"View code\">Code</button>` : ''}
                            ${hasSnippet ? `<pre class=\"code-snippet hidden\"><code>${snippet}</code></pre>` : ''}
                        </li>
                    `;
                }).join('');
                const moreBtn = hidden.length > 0
                    ? `<button class=\"show-more-btn\" data-count=\"${hidden.length}\">Show ${hidden.length} more</button>`
                    : '';
            return `
                <div class="rule-group" data-rule-id="${group.meta.ruleId}">
                    <div class="rule-group-header">
                        <span class="badge ${group.meta.severity}">${group.meta.severity}</span>
                        <strong class="rule-title">${escapeHTML(group.meta.title)}</strong>
                        <span class="count">${group.items.length} occurrence(s)</span>
                    </div>
                    <div class="rule-group-body" style="display:none">
                            <ul class="occurrence-list compact-list">${visibleHtml}${hiddenHtml}</ul>
                            ${moreBtn}
                    </div>
                </div>
            `;
        }).join('');
        return `
            <div class="type-group">
                <h4>${type}</h4>
                ${ruleBlocks}
            </div>
        `;
    }).join('');

    resultsContainer.innerHTML = `
        <div class="analysis-summary">
            <h3>Analysis</h3>
            <p class="summary-counts">
                <span class="badge error">E: ${summary.error}</span>
                <span class="badge warning">W: ${summary.warning}</span>
                <span class="badge suggestion">S: ${summary.suggestion}</span>
                <span class="total">• Total: ${summary.total}</span>
            </p>
        </div>
        <div class="consolidated-issues">${groupsHtml}</div>
    `;

    // Re-attach event listeners for consolidated entries
    addLearnModeEventListeners();
    attachRuleGroupToggles();
    attachOccurrenceToggles();
}

function escapeHTML(str) {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
}

function updateResultsVisibility() {
    if (!codeInput.value.trim() && resultsContainer.children.length === 0) {
        resultsContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-search"></i>
                <h4>Ready to analyze your code?</h4>
                <p>Paste your code above and click "Analyze Code" to get started</p>
            </div>
        `;
    }
}
updateResultsVisibility();

exportBtn.addEventListener('click', () => {
    let exportContent = `Code Auditor Analysis Report\n`;
    exportContent += `Date: ${new Date().toLocaleString()}\n`;

    if (lastRepoReport) {
        const { owner, repo, ref, basePath, resultsByFile, summary } = lastRepoReport;
        exportContent += `Repository: ${owner}/${repo}@${ref}${basePath ? '/' + basePath : ''}\n`;
        exportContent += `Totals: ${summary.totalIssues} issue(s) (errors=${summary.error}, warnings=${summary.warning}, suggestions=${summary.suggestion})\n\n`;
        const files = Object.keys(resultsByFile).sort();
        files.forEach(fp => {
            const issues = resultsByFile[fp];
            exportContent += `## File: ${fp} (${issues.length} issues)\n`;
            issues.forEach((issue, index) => {
                exportContent += `--- Issue ${index + 1} ---\n`;
                exportContent += `Type: ${issue.type} (${issue.severity.toUpperCase()})\n`;
                exportContent += `Rule: ${issue.ruleId}\n`;
                exportContent += `Location: Line ${issue.lineNumber}\n`;
                exportContent += `Description: ${issue.title}. ${issue.description}\n`;
                exportContent += `Suggestion: ${issue.suggestion}\n`;
                if (issue.snippet) {
                    exportContent += `Code Snippet: \n\`\`\`\n${issue.snippet}\n\`\`\`\n`;
                }
                exportContent += `\n`;
            });
            exportContent += `\n`;
        });
    } else {
    const code = codeInput.value;
    const language = languageSelect.value;
    const issues = performAnalysis(code, language);
    exportContent += `Language: ${language.toUpperCase()}\n\n`;
    if (issues.length === 0) {
        exportContent += `No issues found! Your code is clean.\n`;
    } else {
        issues.forEach((issue, index) => {
            exportContent += `--- Issue ${index + 1} ---\n`;
            exportContent += `Type: ${issue.type} (${issue.severity.toUpperCase()})\n`;
            exportContent += `Rule: ${issue.ruleId}\n`;
            exportContent += `Location: Line ${issue.lineNumber}\n`;
            exportContent += `Description: ${issue.title}. ${issue.description}\n`;
            exportContent += `Suggestion: ${issue.suggestion}\n`;
            if (issue.snippet) {
                exportContent += `Code Snippet: \n\`\`\`\n${issue.snippet}\n\`\`\`\n`;
            }
            exportContent += `\n`;
        });
        }
    }

    const blob = new Blob([exportContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `code_auditor_report_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
});

// ----- Coach Mode -----
let coachItems = [];
let coachIndex = 0;

function collectIssuesForCoachView() {
    // For text analysis: derive from latest rendered consolidated issues not stored, so re-run
    if (!lastRepoReport) {
        const code = codeInput.value;
        const language = languageSelect.value;
        return performAnalysis(code, language).map(attachRuleMeta);
    }
    // For repo: flatten report issues
    const arr = [];
    Object.values(lastRepoReport.resultsByFile || {}).forEach(list => {
        list.forEach(it => arr.push(attachRuleMeta(it)));
    });
    return arr;
}

function attachRuleMeta(issue) {
    const allRules = [...analysisRules.javascript, ...analysisRules.html, ...analysisRules.css];
    const meta = allRules.find(r => r.id === issue.ruleId);
    return { ...issue, _meta: meta || null };
}

function renderCoachStep() {
    if (!coachItems.length) {
        coachBody.innerHTML = '<p>No issues to coach on. Run an analysis first.</p>';
        coachProgress.textContent = '';
        return;
    }
    const item = coachItems[coachIndex];
    const meta = item._meta;
    const fileInfo = item.filePath
        ? `<div class="coach-subtle">File: <code>${escapeHTML(item.filePath)}</code>${item.lineNumber ? ` • Line ${item.lineNumber}` : ''}</div>`
        : '';
    const snippet = item.snippet
        ? `<pre class="code-example"><code>${escapeHTML(truncateText(item.snippet, 240))}</code></pre>`
        : '';
    const moreDetails = meta && meta.learn
        ? `<details class="coach-details"><summary>More details</summary>${meta.learn.content}</details>`
        : '';
    const title = escapeHTML(meta ? (meta.title || item.title || 'Issue') : (item.title || 'Issue'));
    const description = escapeHTML(truncateText(item.description || (meta ? meta.description : item.message || ''), 180));
    const suggestion = escapeHTML(truncateText(item.suggestion || (meta ? meta.suggestion : ''), 180));

    coachBody.innerHTML = `
        <div class="coach-lite">
            <div class="coach-row">
                <span class="badge ${item.severity}">${item.severity}</span>
                <strong>${title}</strong>
            </div>
            ${fileInfo}
            ${description ? `<p>${description}</p>` : ''}
            ${suggestion ? `<div class="coach-action"><strong>Fix</strong><p>${suggestion}</p></div>` : ''}
            ${snippet}
            ${moreDetails}
        </div>
    `;
    coachProgress.textContent = `${coachIndex + 1} of ${coachItems.length}`;
    coachPrev.disabled = coachIndex === 0;
    coachNext.disabled = coachIndex >= coachItems.length - 1;
}

function truncateText(text, maxLen) {
    if (!text) return '';
    const t = String(text);
    return t.length > maxLen ? t.slice(0, maxLen - 1) + '…' : t;
}

coachModeBtn.addEventListener('click', () => {
    coachItems = collectIssuesForCoachView();
    coachIndex = 0;
    renderCoachStep();
    coachModal.classList.add('active');
});

coachClose.addEventListener('click', () => coachModal.classList.remove('active'));
coachModal.addEventListener('click', (e) => { if (e.target === coachModal) coachModal.classList.remove('active'); });
coachPrev.addEventListener('click', () => { if (coachIndex > 0) { coachIndex--; renderCoachStep(); } });
coachNext.addEventListener('click', () => { if (coachIndex < coachItems.length - 1) { coachIndex++; renderCoachStep(); } });

function populateLearnGrid() {
    learnGrid.innerHTML = '';
    const allRules = [...analysisRules.javascript, ...analysisRules.html, ...analysisRules.css];
    const uniqueRules = {};
    allRules.forEach(rule => {
        if (!uniqueRules[rule.id]) {
            uniqueRules[rule.id] = rule;
        }
    });

    Object.values(uniqueRules).forEach(rule => {
        const learnCard = document.createElement('div');
        learnCard.classList.add('learn-card');
        learnCard.dataset.ruleId = rule.id;
        learnCard.innerHTML = `
            <h3>${rule.title}</h3>
            <p>${rule.description}</p>
            <span class="badge ${rule.severity}">${rule.type}</span>
        `;
        learnGrid.appendChild(learnCard);
    });

    addLearnModeEventListeners();
}

function addLearnModeEventListeners() {
    document.querySelectorAll('.learn-card').forEach(card => {
        card.addEventListener('click', () => {
            const ruleId = card.dataset.ruleId;
            if (ruleId) openLearnModal(ruleId);
        });
    });
}

function attachRuleGroupToggles() {
    document.querySelectorAll('.rule-group-header').forEach(header => {
        header.addEventListener('click', () => {
            const body = header.nextElementSibling;
            if (!body) return;
            body.style.display = body.style.display === 'none' ? 'block' : 'none';
        });
    });
}

function attachOccurrenceToggles() {
    // Toggle code snippet inline
    document.querySelectorAll('.occurrence .snippet-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const pre = btn.nextElementSibling;
            if (pre) pre.classList.toggle('hidden');
        });
    });
    // Show more within a rule group
    document.querySelectorAll('.rule-group .show-more-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const group = btn.closest('.rule-group');
            if (!group) return;
            group.querySelectorAll('.hidden-occ').forEach(li => li.classList.remove('hidden-occ'));
            btn.remove();
        });
    });
}

function openLearnModal(ruleId) {
    const allRules = [...analysisRules.javascript, ...analysisRules.html, ...analysisRules.css];
    const rule = allRules.find(r => r.id === ruleId);

    if (rule && rule.learn) {
        modalTitle.textContent = rule.learn.title;
        modalBody.innerHTML = rule.learn.content;
        learnModal.classList.add('active');
        return;
    }

    // Fallback educational content when learn is missing
    if (rule) {
        modalTitle.textContent = rule.title || 'Learn More';
        const description = escapeHTML(rule.description || '');
        const suggestion = escapeHTML(rule.suggestion || '');
        modalBody.innerHTML = `
            <div class="coach-tip">
                <h4>What this means</h4>
                <p>${description}</p>
            </div>
            <div class="coach-tip">
                <h4>How to fix it</h4>
                <p>${suggestion}</p>
            </div>
            <p style="color: var(--tm); margin-top: .5rem">No detailed lesson yet for this rule.</p>
        `;
        learnModal.classList.add('active');
    } else {
        console.warn('Learn content not found for rule:', ruleId);
    }
}

modalClose.addEventListener('click', () => {
    learnModal.classList.remove('active');
});

learnModal.addEventListener('click', (e) => {
    if (e.target === learnModal) {
        learnModal.classList.remove('active');
    }
});

learnModeBtn.addEventListener('click', () => {
    // Aggregate unique rules from either snapshot or repo report
    let uniqueRuleIds = new Set();
    if (lastRepoReport) {
        Object.values(lastRepoReport.resultsByFile || {}).forEach(list => {
            list.forEach(it => uniqueRuleIds.add(it.ruleId));
        });
    } else if (lastIssuesSnapshot) {
        lastIssuesSnapshot.forEach(it => uniqueRuleIds.add(it.ruleId));
    }

    const allRules = [...analysisRules.javascript, ...analysisRules.html, ...analysisRules.css];
    const selectedRules = allRules.filter(r => uniqueRuleIds.has(r.id));

    // If nothing found, just open Learn section without modal content
    if (selectedRules.length === 0) {
        navButtons.forEach(btn => { if (btn.dataset.section === 'learn') btn.click(); });
        console.log('No issues to learn from.');
        return;
    }

    // Build a consolidated learn modal content
    modalTitle.textContent = 'Learn: All Detected Issues';
    modalBody.innerHTML = selectedRules.map(rule => `
        <div class="learn-card" style="cursor:auto">
            <h3>${rule.title}</h3>
            <p>${rule.description}</p>
            <span class="badge ${rule.severity}">${rule.type}</span>
            ${rule.learn ? `<div class="coach-tip" style="margin-top:.5rem">${rule.learn.content}</div>` : ''}
        </div>
    `).join('');
    learnModal.classList.add('active');
});

// Add this test function at the end of the file, before populateLearnGrid()
function testAnalysis() {
    console.log('Testing analysis functionality...');
    
    // Test HTML with incomplete tags
    const testHTML = `<div class="test
<p>Some content</p>
</div`;
    
    console.log('Testing HTML analysis...');
    const htmlIssues = performAnalysis(testHTML, 'html');
    console.log('HTML issues found:', htmlIssues);
    
    // Test JavaScript with unused variable
    const testJS = `function test() {
    const unusedVar = "hello";
    console.log("test");
}`;
    
    console.log('Testing JavaScript analysis...');
    const jsIssues = performAnalysis(testJS, 'javascript');
    console.log('JavaScript issues found:', jsIssues);
    
    // Test CSS with important
    const testCSS = `.test {
    color: red !important;
}`;
    
    console.log('Testing CSS analysis...');
    const cssIssues = performAnalysis(testCSS, 'css');
    console.log('CSS issues found:', cssIssues);
}

// Run test when page loads
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(testAnalysis, 1000);
});

populateLearnGrid();