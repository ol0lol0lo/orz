document.addEventListener('DOMContentLoaded', () => {
        // 检查必要的库是否加载
        const requiredLibs = {
            'marked.js': typeof marked !== 'undefined',
            'FileSaver.js': typeof saveAs !== 'undefined'
        };
        
        const optionalLibs = {
            'XLSX.js': typeof XLSX !== 'undefined',
            'DOMPurify': typeof DOMPurify !== 'undefined',
            'MathJax': typeof MathJax !== 'undefined'
        };
        
        // 检查必需库
        for (const [libName, isLoaded] of Object.entries(requiredLibs)) {
            if (!isLoaded) {
                console.error(`${libName}库未加载`);
                showNotification(`${libName}库加载失败，应用无法正常工作`, 'error');
                return;
            }
        }
        
        // 检查可选库
        for (const [libName, isLoaded] of Object.entries(optionalLibs)) {
            if (!isLoaded) {
                console.warn(`⚠️ ${libName}库未加载，相关功能将受限`);
            }
        }
        
        // 延迟检查XLSX库，因为可能需要更多时间加载
        setTimeout(() => {
            if (typeof XLSX === 'undefined') {
                console.warn('SheetJS库延迟检查失败，Excel导出功能将受限');
            }
        }, 200);
        

    const markdownEditor = document.getElementById('markdownEditor');
    const previewEditor = document.getElementById('previewEditor');
    const pasteBtn = document.getElementById('pasteBtn');
    const copyBtn = document.getElementById('copyBtn');
    const exportWordBtn = document.getElementById('exportWordBtn');
    const exportExcelBtn = document.getElementById('exportExcelBtn');
    const exportImageBtn = document.getElementById('exportImageBtn');

    // 确保按钮存在
    if (!exportWordBtn || !exportExcelBtn || !exportImageBtn) {
        console.error('导出按钮未找到');
    }

    // 初始化marked
    marked.setOptions({
        breaks: true,
        gfm: true
    });

    // 数学公式格式化功能
    function formatMathFormulas(text) {
        // 定义数学公式模板
        const mathTemplates = {
            // 集合论相关
            '有限集合子集个数': {
                description: '有限集合子集个数：子集个数：2^n 个，真子集个数：2^(n-1) 个；',
                formulas: ['$2^n$', '$2^{n-1}$']
            },
            '集合重要结论': {
                description: '集合里面重要结论：',
                formulas: [
                    '① $A \\cap B = A \\Leftrightarrow A \\subseteq B$',
                    '② $A \\cup B = A \\Leftrightarrow B \\subseteq A$', 
                    '③ $A \\Rightarrow B \\Leftrightarrow A \\subseteq B$',
                    '④ $A \\Leftrightarrow B \\Leftrightarrow A = B$'
                ]
            },
            '集合元素个数公式': {
                description: '集合元素个数公式：',
                formulas: ['$n(A \\cup B) = n(A) + n(B) - n(A \\cap B)$']
            },
            '常见数集': {
                description: '常见的数集：Z：整数集；R：实数集；Q：有理数集；N：自然数集；C：复数集；其中正整数集：Z⁺ = N⁺ = {1,2,3,......}',
                formulas: ['$\\mathbb{Z}$', '$\\mathbb{R}$', '$\\mathbb{Q}$', '$\\mathbb{N}$', '$\\mathbb{C}$', '$\\mathbb{Z}^+$', '$\\mathbb{N}^+$']
            },
            // 均值不等式相关
            '均值不等式': {
                description: '均值不等式：若a,b>0时，则a+b ≥ 2√ab；若a,b<0时，则a+b ≤ -2√ab；',
                formulas: ['$a+b \\geq 2\\sqrt{ab}$ (当a,b>0时)', '$a+b \\leq -2\\sqrt{ab}$ (当a,b<0时)']
            },
            '均值不等式变形': {
                description: '均值不等式变形形式：',
                formulas: [
                    '$a^2 + b^2 \\geq 2ab$ (当a,b∈R时)',
                    '$\\frac{b}{a} + \\frac{a}{b} \\geq 2$ (当ab>0时)',
                    '$\\frac{b}{a} + \\frac{a}{b} \\leq -2$ (当ab<0时)'
                ]
            },
            '积定和最小': {
                description: '积定和最小：若ab=p时，则a+b ≥ 2√ab = 2√p',
                formulas: ['$a+b \\geq 2\\sqrt{ab} = 2\\sqrt{p}$ (当ab=p时)']
            },
            '和定积最大': {
                description: '和定积最大：若a+b=k时，则ab ≤ (a+b)²/4 = k²/4',
                formulas: ['$ab \\leq \\frac{(a+b)²}{4} = \\frac{k²}{4}$ (当a+b=k时)']
            },
            '基本不等式': {
                description: '基本不等式：',
                formulas: ['$\\frac{2}{\\frac{1}{a} + \\frac{1}{b}} \\leq \\sqrt{ab} \\leq \\frac{a+b}{2} \\leq \\sqrt{\\frac{a²+b²}{2}}$']
            }
        };

        // 检查文本是否包含数学公式关键词
        for (const [key, template] of Object.entries(mathTemplates)) {
            if (text.includes(key) || text.includes(template.description.split('：')[0])) {
                return formatMathTemplate(template);
            }
        }

        return text;
    }

    // 格式化数学公式模板
    function formatMathTemplate(template) {
        let html = `<div class="math-formula-section">`;
        html += `<div class="math-description">${template.description}</div>`;
        
        if (template.formulas && template.formulas.length > 0) {
            html += `<div class="math-formulas">`;
            template.formulas.forEach(formula => {
                html += `<div class="math-formula">${formula}</div>`;
            });
            html += `</div>`;
        }
        
        html += `</div>`;
        return html;
    }

    // 增强的数学公式处理函数
    // 保护数学公式不被 marked 处理（保护 \(...\) 和 \[...\] 格式）
    function protectMathFormulas(content) {
        const mathPlaceholders = [];
        let placeholderIndex = 0;
        const uniqueId = Math.random().toString(36).substring(2, 15);
        
        // 使用特殊的唯一占位符，避免与用户内容冲突
        // 保护块级数学公式 \[...\]（必须先处理，因为可能包含行内公式）
        let protectedContent = content.replace(/\\\[([\s\S]*?)\\\]/g, (match, formula) => {
            const placeholder = `【MATH_DISPLAY_${uniqueId}_${placeholderIndex}】`;
            mathPlaceholders.push({ placeholder, formula: `\\[${formula}\\]` });
            placeholderIndex++;
            return placeholder;
        });
        
        // 保护行内数学公式 \(...\)
        protectedContent = protectedContent.replace(/\\\(([\s\S]*?)\\\)/g, (match, formula) => {
            const placeholder = `【MATH_INLINE_${uniqueId}_${placeholderIndex}】`;
            mathPlaceholders.push({ placeholder, formula: `\\(${formula}\\)` });
            placeholderIndex++;
            return placeholder;
        });
        
        return { protectedContent, mathPlaceholders };
    }
    
    // 恢复数学公式占位符
    function restoreMathFormulas(content, mathPlaceholders) {
        let restoredContent = content;
        // 按索引倒序恢复，避免占位符被替换
        for (let i = mathPlaceholders.length - 1; i >= 0; i--) {
            const { placeholder, formula } = mathPlaceholders[i];
            // 转义占位符中的特殊字符用于正则表达式
            const escapedPlaceholder = placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            restoredContent = restoredContent.replace(new RegExp(escapedPlaceholder, 'g'), formula);
        }
        return restoredContent;
    }
    
    function processMathFormulas(content) {
        // 首先处理平方符号的角标转换
        let processedContent = convertSuperscripts(content);
        
        // 处理常见的数学公式模式
        const mathPatterns = [
            // 集合论
            {
                pattern: /有限集合子集个数[：:]\s*子集个数[：:]\s*2\^?n\s*个[，,]\s*真子集个数[：:]\s*2\^?\(n-1\)\s*个/gi,
                replacement: '有限集合子集个数：子集个数：$2^n$ 个，真子集个数：$2^{n-1}$ 个'
            },
            {
                pattern: /A\s*∩\s*B\s*=\s*A\s*⇔\s*A\s*⊆\s*B/gi,
                replacement: '$A \\cap B = A \\Leftrightarrow A \\subseteq B$'
            },
            {
                pattern: /A\s*∪\s*B\s*=\s*A\s*⇔\s*B\s*⊆\s*A/gi,
                replacement: '$A \\cup B = A \\Leftrightarrow B \\subseteq A$'
            },
            {
                pattern: /n\(A\s*∪\s*B\)\s*=\s*n\(A\)\s*\+\s*n\(B\)\s*-\s*n\(A\s*∩\s*B\)/gi,
                replacement: '$n(A \\cup B) = n(A) + n(B) - n(A \\cap B)$'
            },
            // 均值不等式
            {
                pattern: /a\+b\s*≥\s*2√ab/gi,
                replacement: '$a+b \\geq 2\\sqrt{ab}$'
            },
            {
                pattern: /a\+b\s*≤\s*-2√ab/gi,
                replacement: '$a+b \\leq -2\\sqrt{ab}$'
            },
            {
                pattern: /a²\s*\+\s*b²\s*≥\s*2ab/gi,
                replacement: '$a² + b² \\geq 2ab$'
            },
            {
                pattern: /b\/a\s*\+\s*a\/b\s*≥\s*2/gi,
                replacement: '$\\frac{b}{a} + \\frac{a}{b} \\geq 2$'
            },
            {
                pattern: /ab\s*≤\s*\(a\+b\)²\/4/gi,
                replacement: '$ab \\leq \\frac{(a+b)²}{4}$'
            },
            // 基本不等式链
            {
                pattern: /2\s*\/\s*\(1\/a\s*\+\s*1\/b\)\s*≤\s*√ab\s*≤\s*\(a\+b\)\/2\s*≤\s*√\(a²\+b²\)\/2/gi,
                replacement: '$\\frac{2}{\\frac{1}{a} + \\frac{1}{b}} \\leq \\sqrt{ab} \\leq \\frac{a+b}{2} \\leq \\sqrt{\\frac{a²+b²}{2}}$'
            }
        ];
        
        // 应用数学公式模式
        mathPatterns.forEach(({ pattern, replacement }) => {
            processedContent = processedContent.replace(pattern, replacement);
        });

        return processedContent;
    }

    // 平方符号角标转换函数
    function convertSuperscripts(content) {
        // 定义上标字符映射
        const superscripts = {
            '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', 
            '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
            '+': '⁺', '-': '⁻', '=': '⁼', '(': '⁽', ')': '⁾',
            'n': 'ⁿ', 'i': 'ⁱ', 'x': 'ˣ', 'y': 'ʸ', 'z': 'ᶻ'
        };

        let processedContent = content;

        // 首先处理LaTeX格式的上标（^2, ^3等）
        const latexPatterns = [
            // 处理单个字符的上标：a^2, b^3, x^4等
            {
                pattern: /([a-zA-Z])\^(\d+)/g,
                replacement: (match, base, exp) => {
                    const superscriptExp = exp.split('').map(digit => superscripts[digit] || digit).join('');
                    return `${base}${superscriptExp}`;
                }
            },
            // 处理括号的上标：(a+b)^2, (x-y)^3等
            {
                pattern: /\(([^)]+)\)\^(\d+)/g,
                replacement: (match, content, exp) => {
                    const superscriptExp = exp.split('').map(digit => superscripts[digit] || digit).join('');
                    return `(${content})${superscriptExp}`;
                }
            },
            // 处理复杂表达式的上标：a+b^2, x*y^3等
            {
                pattern: /([a-zA-Z0-9+\-*/]+)\^(\d+)/g,
                replacement: (match, base, exp) => {
                    const superscriptExp = exp.split('').map(digit => superscripts[digit] || digit).join('');
                    return `${base}${superscriptExp}`;
                }
            }
        ];

        // 应用LaTeX格式转换
        latexPatterns.forEach(({ pattern, replacement }) => {
            processedContent = processedContent.replace(pattern, replacement);
        });

        // 处理常见的平方符号模式（已存在的Unicode上标字符）
        const squarePatterns = [
            // 处理 m², cm², km² 等单位
            {
                pattern: /(\w+)²/g,
                replacement: '$1²'
            },
            // 处理 a², b², x² 等变量平方
            {
                pattern: /([a-zA-Z])²/g,
                replacement: '$1²'
            },
            // 处理数字平方 2², 3² 等
            {
                pattern: /(\d+)²/g,
                replacement: '$1²'
            },
            // 处理括号平方 (a+b)²
            {
                pattern: /\(([^)]+)\)²/g,
                replacement: '($1)²'
            },
            // 处理分数平方 (a/b)²
            {
                pattern: /\(([^)]+\/[^)]+)\)²/g,
                replacement: '($1)²'
            },
            // 处理根号平方 √a²
            {
                pattern: /√([^√\s]+)²/g,
                replacement: '√$1²'
            }
        ];

        // 应用平方符号模式
        squarePatterns.forEach(({ pattern, replacement }) => {
            processedContent = processedContent.replace(pattern, replacement);
        });

        // 处理其他上标模式（如 x³, a⁴ 等）
        Object.entries(superscripts).forEach(([normal, sup]) => {
            if (sup !== '²') { // 避免重复处理平方符号
                const pattern = new RegExp(`([a-zA-Z0-9]+)${sup}`, 'g');
                processedContent = processedContent.replace(pattern, `$1${sup}`);
            }
        });

        return processedContent;
    }

    // 初始化MathJax配置
    if (typeof MathJax !== 'undefined') {
        MathJax.startup = {
            ready: () => {
                MathJax.startup.defaultReady();
            }
        };
        
        // 配置MathJax，修复字体加载问题
        MathJax.config = {
            tex: {
                inlineMath: [['$', '$'], ['\\(', '\\)']],
                displayMath: [['$$', '$$'], ['\\[', '\\]']],
                processEscapes: true,
                processEnvironments: true,
                processRefs: true,
                packages: {'[+]': ['base', 'ams', 'noerrors', 'noundefined', 'newcommand', 'configmacros']}
            },
            chtml: {
                scale: 1.1,
                minScale: 0.5,
                matchFontHeight: false,
                // 使用本地字体路径
                fontURL: '../fonts/mathjax/woff-v2',
                adaptiveCSS: true
            },
            svg: {
                scale: 1.1,
                minScale: 0.5,
                matchFontHeight: false,
                font: 'STIX-Web',
                // 使用CDN字体路径
                fontURL: 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/output/svg/fonts/woff-v2',
                // 禁用本地字体查找
                localID: null
            },
            options: {
                skipHtmlTags: ['script', 'noscript', 'style', 'textarea', 'pre'],
                ignoreHtmlClass: 'tex2jax_ignore',
                processHtmlClass: 'tex2jax_process'
            },
            startup: {
                ready: () => {
                    // 配置字体加载错误处理
                    if (MathJax.startup && MathJax.startup.defaultReady) {
                        MathJax.startup.defaultReady();
                    }
                }
            }
        };
        
        // 配置MathJax渲染选项
        MathJax.options = {
            renderActions: {
                addMenu: [0, '', '']
            },
            chtml: {
                scale: 1.1,
                minScale: 0.5,
                maxScale: 2.0
            }
        };
    }

    // 更新预览 - 显示渲染后的Markdown效果
    function updatePreview() {
        const markdown = markdownEditor.innerText;
        
        // 对用户输入进行安全过滤
        const sanitizedMarkdown = sanitizeUserInput(markdown);
        
        // 使用marked库将Markdown转换为HTML并显示
        try {
            // **关键修复：先保护 \(...\) 和 \[...\] 格式的数学公式**
            const { protectedContent, mathPlaceholders } = protectMathFormulas(sanitizedMarkdown);
            
            // 处理其他数学公式模式
            const processedMarkdown = processMathFormulas(protectedContent);
            
            // 使用marked库解析Markdown
            const html = marked.parse(processedMarkdown);
            
            // **恢复数学公式占位符**
            const restoredHtml = restoreMathFormulas(html, mathPlaceholders);
            
            // 使用DOMPurify过滤HTML内容，防止XSS攻击
            const sanitizedHtml = DOMPurify.sanitize(restoredHtml, {
                ALLOWED_TAGS: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'strong', 'em', 'b', 'i', 'u', 'a', 'img', 'ul', 'ol', 'li', 'blockquote', 'pre', 'code', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'hr', 'br', 'span', 'div', 'sup', 'sub'],
                ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'style', 'data-original-number'],
                ALLOW_DATA_ATTR: true
            });
            
            previewEditor.innerHTML = sanitizedHtml;
            
            // 如果MathJax可用，渲染数学公式
            if (typeof MathJax !== 'undefined' && MathJax.typesetPromise) {
                MathJax.typesetPromise([previewEditor]).catch((err) => {
                    console.error('MathJax渲染错误:', err);
                });
            }
        } catch (error) {
            console.error('Markdown解析错误:', error);
            // 如果解析失败，回退到显示原始文本
            previewEditor.innerText = markdown;
        }
    }
    
    // 转换Markdown为HTML, 更完整的处理Markdown语法
    function convertMarkdownToHtml(text) {
        // 分行处理
        const lines = text.split('\n');
        let html = '';
        let inListContext = false;
        let listType = '';
        let listItems = [];
        let emptyLineCount = 0; // 用于跟踪连续空行数量
        let inCodeBlock = false;
        let codeBlockContent = '';
        let codeBlockLanguage = '';
        let inTableContext = false;
        let tableRows = [];
        let inMathBlock = false;
        let mathBlockContent = '';
        
        for (let i = 0; i < lines.length; i++) {
            // 清理行内容
            let line = lines[i].trim();
            
            // 处理数学块 ($$...$$ 格式) - 保持原始格式供MathJax处理
            if (line.startsWith('$$')) {
                if (!inMathBlock) {
                    // 开始新的数学块
                    inMathBlock = true;
                    // 检查是否为单行数学公式
                    if (line.endsWith('$$') && line.length > 4) {
                        // 单行数学块，保持原始$$格式
                        html += `<div class="math-block">${line}</div>`;
                        inMathBlock = false;
                    } else {
                        // 多行数学块，初始化内容
                        mathBlockContent = line;
                    }
                    continue;
                } else if (line === '$$' || line.endsWith('$$')) {
                    // 结束数学块
                    if (line === '$$') {
                        // 单独一行的结束标记
                        html += `<div class="math-block">${mathBlockContent}</div>`;
                    } else {
                        // 行内结束的数学块
                        mathBlockContent += '\n' + line;
                        html += `<div class="math-block">${mathBlockContent}</div>`;
                    }
                    inMathBlock = false;
                    mathBlockContent = '';
                    continue;
                }
            }
            
            // 如果在数学块中, 累计内容并跳过处理
            if (inMathBlock) {
                mathBlockContent += (mathBlockContent ? '\n' : '') + line;
                continue;
            }
            
            // 处理代码块
            if (line.startsWith('```')) {
                if (!inCodeBlock) {
                    // 开始新的代码块
                    inCodeBlock = true;
                    // 检查是否指定了语言
                    const langMatch = line.match(/^```(\w*)/);
                    if (langMatch && langMatch[1]) {
                        codeBlockLanguage = langMatch[1];
                    } else {
                        codeBlockLanguage = '';
                    }
                    continue;
                } else {
                    // 结束代码块
                    if (codeBlockLanguage) {
                        html += `<pre><code class="language-${codeBlockLanguage}">${escapeHtml(codeBlockContent)}</code></pre>`;
                    } else {
                        html += `<pre><code>${escapeHtml(codeBlockContent)}</code></pre>`;
                    }
                    inCodeBlock = false;
                    codeBlockContent = '';
                    codeBlockLanguage = '';
                    continue;
                }
            }
            
            // 如果在代码块中, 累计内容并跳过处理
            if (inCodeBlock) {
                codeBlockContent += line + '\n';
                continue;
            }
            
            // 处理表格
            if (line.match(/^\|(.+)\|$/)) {
                if (!inTableContext) {
                    // 开始新表格
                    inTableContext = true;
                    tableRows = [];
                }
                
                // 收集表格行
                tableRows.push(line);
                
                // 如果这是最后一行或下一行不是表格行, 则处理并结束表格
                if (i === lines.length - 1 || !lines[i+1].trim().match(/^\|(.+)\|$/)) {
                    html += processTable(tableRows);
                    inTableContext = false;
                    tableRows = [];
                }
                
                // 跳过后续处理
                continue;
            }
            
            // 跳过水平分割线（三个或更多的连字符、星号或下划线）
            if (line.match(/^(\*{3,}|-{3,}|_{3,})$/)) {
                html += '<hr>';
                continue;
            }
            
            if (line === '') {
                // 处理空行 - 限制连续空行数量，最多一个空行
                emptyLineCount++;
                if (inListContext) {
                    // 结束当前列表
                    if (listType === 'ol') {
                        html += createOrderedList(listItems);
                    } else if (listType === 'ul') {
                        html += createUnorderedList(listItems);
                    }
                    inListContext = false;
                    listItems = [];
                }
                
                // 只添加第一个空行
                if (emptyLineCount <= 1) {
                    html += '<p>&nbsp;</p>';
                }
            } else {
                // 非空行，重置空行计数
                emptyLineCount = 0;
                
                if (line.match(/^#+\s+/)) {
                    // 处理标题，保留#号
                    const level = line.match(/^#+/)[0].length;
                    const titleText = line.replace(/^#+\s+/, '');
                    html += `<h${level}>${processInlineMarkdown(titleText)}</h${level}>`;
                } else if (line.match(/^\d+\.\s+/) || line.match(/^[一二三四五六七八九十]+[、\.]\s+/) || 
                           line.match(/^[a-zA-Z]\.\s+/) || line.match(/^[IVXivx]+\.\s+/) || 
                           line.match(/^[\(（]\d+[\)）]\s+/) || line.match(/^第[一二三四五六七八九十]+[条节章]\s+/)) {
                    // 处理有序列表项
                    if (!inListContext || listType !== 'ol') {
                        // 开始新的有序列表
                        if (inListContext) {
                            // 先结束之前的列表
                            if (listType === 'ul') {
                                html += createUnorderedList(listItems);
                            }
                        }
                        inListContext = true;
                        listType = 'ol';
                        listItems = [];
                    }
                    
                    // 提取序号部分
                    const numberMatch = line.match(/^(\d+\.|[一二三四五六七八九十]+[、\.]|[a-zA-Z]\.|[IVXivx]+\.|[\(（]\d+[\)）]|第[一二三四五六七八九十]+[条节章])\s+/);
                    if (numberMatch) {
                        const originalNumber = numberMatch[0];
                        const itemContent = line.substring(originalNumber.length);
                        listItems.push({number: originalNumber, content: processInlineMarkdown(itemContent)});
                    } else {
                        // 如果没匹配到序号，作为普通段落处理
                        listItems.push({content: processInlineMarkdown(line)});
                    }
                } else if (line.match(/^[-\*•]\s+/)) {
                    // 处理无序列表项，优化符号识别
                    if (!inListContext || listType !== 'ul') {
                        // 开始新的无序列表
                        if (inListContext) {
                            // 先结束之前的列表
                            if (listType === 'ol') {
                                html += createOrderedList(listItems);
                            }
                        }
                        inListContext = true;
                        listType = 'ul';
                        listItems = [];
                    }
                    
                    // 提取内容部分（不保留开头的符号）
                    const marker = line.match(/^([-\*•])\s+/);
                    const itemContent = line.replace(/^[-\*•]\s+/, '').trim();
                    
                    // 优化符号处理 - 统一使用·符号，但连字符-需要特殊处理
                    let markerSymbol = '•'; // 默认使用·符号
                    if (marker && marker[1] === '-') {
                        // 检查是否是真正的列表项（有内容且不是破折号）
                        if (itemContent && !itemContent.match(/^[-—–]\s*$/)) {
                            markerSymbol = '•'; // 真正的列表项使用·符号
                        } else {
                            markerSymbol = ''; // 破折号不显示符号
                        }
                    } else if (marker && (marker[1] === '*' || marker[1] === '•')) {
                        markerSymbol = '•'; // 星号和圆点统一使用·符号
                    }
                    
                    // 记录使用的符号类型和列表项标识
                    listItems.push({
                        content: processInlineMarkdown(itemContent),
                        marker: markerSymbol,
                        isListItem: true // 标记为真正的列表项
                    });
                } else if (line.match(/^>\s+/)) {
                    // 处理引用块
                    const quoteContent = line.replace(/^>\s+/, '');
                    html += `<blockquote>${processInlineMarkdown(quoteContent)}</blockquote>`;
                } else {
                    // 处理普通段落
                    if (inListContext) {
                        // 结束当前列表
                        if (listType === 'ol') {
                            html += createOrderedList(listItems);
                        } else if (listType === 'ul') {
                            html += createUnorderedList(listItems);
                        }
                        inListContext = false;
                        listItems = [];
                    }
                    
                    // 检查段落内是否包含序号格式文本
                    if (hasNumberingPattern(line)) {
                        html += `<p data-has-numbering="true">${processInlineMarkdown(line)}</p>`;
                    } else {
                        html += `<p>${processInlineMarkdown(line)}</p>`;
                    }
                }
            }
        }
        
        // 处理可能未结束的列表
        if (inListContext) {
            if (listType === 'ol') {
                html += createOrderedList(listItems);
            } else if (listType === 'ul') {
                html += createUnorderedList(listItems);
            }
        }
        
        // 处理未结束的代码块
        if (inCodeBlock && codeBlockContent) {
            html += `<pre><code>${escapeHtml(codeBlockContent)}</code></pre>`;
        }
        
        // 处理未结束的数学块
        if (inMathBlock && mathBlockContent) {
            html += `<div class="math-block">${mathBlockContent}</div>`;
        }
        
        return html;
    }
    
    // 处理表格数据
    function processTable(tableRows) {
        // 使用表格容器包裹表格，处理移动端滚动
        let html = '<div class="table-container">';
        html += '<table border="1" style="width:100%; border-collapse:collapse;">';
        
        let isHeader = true;
        let alignments = [];
        
        // 检查是否有对齐标记行
        if (tableRows.length > 1 && tableRows[1].match(/^\|\s*[-:]+\s*\|/)) {
            // 解析对齐方式
            const alignRow = tableRows[1];
            alignments = alignRow.split('|')
                .filter(cell => cell !== '')
                .map(cell => {
                    const trimmed = cell.trim();
                    if (trimmed.startsWith(':') && trimmed.endsWith(':')) {
                        return 'center';
                    } else if (trimmed.endsWith(':')) {
                        return 'right';
                    } else {
                        return 'left';
                    }
                });
        }
        
        for (let i = 0; i < tableRows.length; i++) {
            // 跳过分隔行
            if (tableRows[i].match(/^\|\s*[-:]+\s*\|/)) {
                continue;
            }
            
            const cells = tableRows[i].split('|').filter(cell => cell !== '');
            
            if (isHeader) {
                html += '<tr>';
                cells.forEach((cell, index) => {
                    const align = alignments[index] || 'left';
                    html += `<th style="border:1px solid #000; padding:5px; text-align:${align};">${processInlineMarkdown(cell.trim())}</th>`;
                });
                html += '</tr>';
                isHeader = false;
            } else {
                html += '<tr>';
                cells.forEach((cell, index) => {
                    const align = alignments[index] || 'left';
                    html += `<td style="border:1px solid #000; padding:5px; text-align:${align};">${processInlineMarkdown(cell.trim())}</td>`;
                });
                html += '</tr>';
            }
        }
        
        html += '</table>';
        html += '</div>'; // 关闭表格容器
        return html;
    }
    
    // HTML转义函数
    function escapeHtml(text) {
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
    
    // 处理行内Markdown语法
function processInlineMarkdown(text) {
    // 处理行内数学公式 $...$ - 保持原始格式供MathJax处理
    // 不进行转换，让MathJax直接处理 $...$ 格式
    
    // 准备一个标记，用于临时替换可能的HTML标签，防止它们干扰格式识别
    const placeholders = [];
    let codeBlocks = [];
    let mathInline = [];
    
    // 临时保存行内数学公式 $...$
    text = text.replace(/\$(.*?)\$/g, (match, formula) => {
        mathInline.push(formula);
        return `__MATH_INLINE_${mathInline.length - 1}__`;
    });
    
    // 临时保存HTML标签
    text = text.replace(/<([^>]+)>/g, (match) => {
        placeholders.push(match);
        return `__HTML_TAG_${placeholders.length - 1}__`;
    });
    
    // 临时保存行内代码块，避免其中的标记被处理
    text = text.replace(/`([^`\n]+?)`/g, (match, code) => {
        codeBlocks.push(code);
        return `__CODE_BLOCK_${codeBlocks.length - 1}__`;
    });
    
    // 处理组合格式：粗体+斜体 ***text*** 或 ___text___
    text = text.replace(/\*\*\*([^\*\n]+?)\*\*\*/g, '<strong><em>$1</em></strong>');  // 保留粗体+斜体格式
    text = text.replace(/___([^_\n]+?)___/g, '<strong><em>$1</em></strong>');         // 保留粗体+斜体格式
    
    // 处理粗体 **text** - 转换为HTML标签
    text = text.replace(/\*\*([^\*\n]+?)\*\*/g, '<strong>$1</strong>');
    
    // 处理粗体 __text__ - 转换为HTML标签
    text = text.replace(/__([^_\n]+?)__/g, '<strong>$1</strong>');
    
    // 处理斜体 *text* - 优化识别逻辑
    text = text.replace(/\*([^\*\n]+?)\*/g, function(match, content, offset, string) {
        // 检查前后字符，确保这是Markdown格式的斜体
        const prevChar = offset > 0 ? string[offset-1] : ' ';
        const nextChar = offset + match.length < string.length ? string[offset + match.length] : ' ';
        
        // 判断是不是Markdown格式（更严格的判断）
        if (/[\s\(\[\{\>\.\,\'\"\!\?\;\:\-]/.test(prevChar) && /[\s\)\]\}\.\,\'\"\!\?\;\:\-]/.test(nextChar)) {
            return '<em>' + content + '</em>';
        }
        
        // 否则保留原始的*符号
        return match;
    });
    
    // 处理斜体 _text_ - 优化识别逻辑
    text = text.replace(/_([^_\n]+?)_/g, function(match, content, offset, string) {
        // 检查前后字符，确保这是Markdown格式的斜体
        const prevChar = offset > 0 ? string[offset-1] : ' ';
        const nextChar = offset + match.length < string.length ? string[offset + match.length] : ' ';
        
        // 判断是不是Markdown格式（更严格的判断）
        if (/[\s\(\[\{\>\.\,\'\"\!\?\;\:\-]/.test(prevChar) && /[\s\)\]\}\.\,\'\"\!\?\;\:\-]/.test(nextChar)) {
            return '<em>' + content + '</em>';
        }
        
        // 否则保留原始的_符号
        return match;
    });
    
    // 还原行内代码块
    text = text.replace(/__CODE_BLOCK_(\d+)__/g, (match, index) => {
        return '<code>' + codeBlocks[parseInt(index)] + '</code>';
    });
    
    // 还原行内数学公式
    text = text.replace(/__MATH_INLINE_(\d+)__/g, (match, index) => {
        return '$' + mathInline[parseInt(index)] + '$';
    });
    
    // 处理链接 [text](url)
    text = text.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank">$1</a>');
    
    // 处理图片 ![alt](url)
    text = text.replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1" style="max-width:100%;">');
    
    // 处理删除线 ~~text~~，转换为HTML标签
    text = text.replace(/~~([^~\n]+?)~~/g, '<del>$1</del>');
    
    // 还原HTML标签
    text = text.replace(/__HTML_TAG_(\d+)__/g, (match, index) => {
        return placeholders[parseInt(index)];
    });
    
    return text;
}
    
    // 清理预览专用的内联Markdown语法
    function cleanInlineMarkdown(text) {
        // 保留行内数学公式 $...$
        let mathBlocks = [];
        let mathInline = [];
        
        // 临时保存数学块公式
        text = text.replace(/\$\$([\s\S]*?)\$\$/g, (match, formula) => {
            mathBlocks.push(formula);
            return `__MATH_BLOCK_${mathBlocks.length - 1}__`;
        });
        
        // 临时保存行内数学公式
        text = text.replace(/\$(.*?)\$/g, (match, formula) => {
            mathInline.push(formula);
            return `__MATH_INLINE_${mathInline.length - 1}__`;
        });
        
        // 保留Markdown格式标记，不删除**符号
        // 注释掉删除**符号的代码，让processInlineMarkdown函数处理格式
        // text = text.replace(/\*\*([^*]+?)\*\*/g, '$1'); // 禁用清除**符号
        
        // 去除所有斜体标记 *
        // text = text.replace(/\*/g, '');
        
        // 去除强调标记 __ __
        // text = text.replace(/__/g, '');
        
        // 去除行内代码标记 `
        // text = text.replace(/`/g, '');
        
        // 去除删除线标记 ~~
        // text = text.replace(/~~/g, '');
        
        // 提取链接文本 [text](url) -> text
        text = text.replace(/\[(.*?)\]\(.*?\)/g, '$1');
        
        // 清理图片标记 ![alt](url) -> alt
        text = text.replace(/!\[(.*?)\]\(.*?\)/g, '$1');
        
        // 还原数学块公式
        text = text.replace(/__MATH_BLOCK_(\d+)__/g, (match, index) => {
            return `$$${mathBlocks[parseInt(index)]}$$`;
        });
        
        // 还原行内数学公式
        text = text.replace(/__MATH_INLINE_(\d+)__/g, (match, index) => {
            return `$${mathInline[parseInt(index)]}$`;
        });
        
        return text;
    }
    
    // 预览专用的清理函数，优化Markdown符号处理
    function cleanLineForPreview(line) {
        // 使用增强的内联Markdown清理，保留格式标记
        line = cleanInlineMarkdown(line);
        
        // 优化行首符号处理 - 更智能的识别
        if (!line.match(/^\d+\.\s+/) && !line.match(/^[一二三四五六七八九十]+[、\.]\s+/) && 
            !line.match(/^[a-zA-Z]\.\s+/) && !line.match(/^[IVXivx]+\.\s+/) && 
            !line.match(/^[\(（]\d+[\)）]\s+/)) {
            // 移除行首的列表符号，但保留内容
            line = line.replace(/^[-\*•]\s+/, '').trim();
        }
        
        // 保留引用标记
        // line = line.replace(/^>\s*/, '');
        
        return line;
    }
    
    // 获取格式化文本内容的函数
    function removeLeadingBullets(text) {
        if (!text) return text;
        
        // 按行分割文本
        const lines = text.split('\n');
        const cleanedLines = lines.map(line => {
            // 删除行首的项目符号（包括各种格式）
            return line.replace(/^[\s]*[-\*•]\s+/, '').trim();
        });
        
        return cleanedLines.join('\n');
    }
    
    // 智能删除前置符号（保留有序列表）
    function smartRemoveLeadingSymbols(text) {
        if (!text) return text;
        
        const lines = text.split('\n');
        const cleanedLines = lines.map(line => {
            // 检查是否是有序列表（数字序号）
            if (line.match(/^\s*\d+\.\s+/) || 
                line.match(/^\s*[一二三四五六七八九十]+[、\.]\s+/) ||
                line.match(/^\s*[a-zA-Z]\.\s+/) ||
                line.match(/^\s*[IVXivx]+\.\s+/) ||
                line.match(/^\s*[\(（]\d+[\)）]\s+/)) {
                // 保留有序列表格式
                return line;
            } else {
                // 删除无序列表符号
                return line.replace(/^[\s]*[-\*•]\s+/, '').trim();
            }
        });
        
        return cleanedLines.join('\n');
    }
    
    // 检查文本是否包含序号模式
    function hasNumberingPattern(text) {
        // 匹配常见的序号模式如 "1. 2. 3." 或 "一、二、三、"
        return text.match(/\d+\./) || 
               text.match(/[一二三四五六七八九十]+[、\.]/) ||
               text.match(/[a-zA-Z]\./) ||
               text.match(/[IVXivx]+\./) ||
               text.match(/[\(（]\d+[\)）]/) ||
               text.match(/第[一二三四五六七八九十]+[条节章]/);
    }
    
    // 创建有序列表HTML，保留原始序号
    function createOrderedList(items) {
        let html = '<ol style="list-style-type:none; margin-left:0; padding-left:0;" data-list-type="ordered">';
        
        for (const item of items) {
            html += `<li style="position:relative; padding-left:30px; margin-bottom:5px;" data-list-type="ordered" data-original-number="${item.number || ''}">`; 
            
            if (item.number) {
                // 使用原始序号作为显示
                html += `<span style="position:absolute; left:0; top:0;" class="list-marker">${item.number}</span>`;
            }
            
            html += item.content;
            html += '</li>';
        }
        
        html += '</ol>';
        return html;
    }
    
    // 创建无序列表HTML - 隐藏段首符号显示
    function createUnorderedList(items) {
        let html = '<ul style="list-style-type:none; margin-left:0; padding-left:0;" data-list-type="unordered">';
        
        for (const item of items) {
            html += `<li style="position:relative; padding-left:0; margin-bottom:8px; line-height:1.6;" data-list-type="unordered">`;
            
            // 不显示任何段首符号，直接显示内容
            html += item.content;
            html += '</li>';
        }
        
        html += '</ul>';
        return html;
    }

    // qq将数字转换为罗马数字
    function toRoman(num) {
        const romanNumerals = [
            { value: 1, symbol: 'i' },
            { value: 4, symbol: 'iv' },
            { value: 5, symbol: 'v' },
            { value: 9, symbol: 'ix' },
            { value: 10, symbol: 'x' }
        ];
        
        let result = '';
        
        // 只处理1-10的数字，倾企企服更大的数字仍使用阿拉伯数字
        if (num > 10) {
            return num.toString();
        }
        
        for (let i = romanNumerals.length - 1; i >= 0; i--) {
            while (num >= romanNumerals[i].value) {
                result += romanNumerals[i].symbol;
                num -= romanNumerals[i].value;
            }
        }
        
        return result;
    }
    
    // 获取列表项倾企企业服务的嵌套级别
    function getListLevel(element) {
        let level = 0;
        let parent = element.parentElement;
        
        while (parent) {
            if (parent.tagName === 'UL' || parent.tagName === 'OL') {
                level++;
                parent = parent.parentElement;
            } else {
                break;
            }
        }
        
        return level - 1;
    }

    // 输入内容安全过滤函数
    function sanitizeUserInput(input) {
        if (typeof input !== 'string') return '';
        
        // 移除潜在的恶意脚本标签
        let sanitized = input
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
            .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
            .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
            .replace(/<link\b[^<]*>/gi, '')
            .replace(/<meta\b[^<]*>/gi, '')
            .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
            .replace(/javascript:/gi, '')
            .replace(/vbscript:/gi, '')
            .replace(/data:text\/html/gi, '');
        
        return sanitized;
    }

    // 清理Markdown语法
    function cleanMarkdown(text) {
        // 临时保存数学公式，避免被清理
        let mathBlocks = [];
        let mathInline = [];
        
        // 临时保存数学块公式
        text = text.replace(/\$\$([\s\S]*?)\$\$/g, (match, formula) => {
            mathBlocks.push(formula);
            return `__MATH_BLOCK_${mathBlocks.length - 1}__`;
        });
        
        // 临时保存行内数学公式
        text = text.replace(/\$(.*?)\$/g, (match, formula) => {
            mathInline.push(formula);
            return `__MATH_INLINE_${mathInline.length - 1}__`;
        });
        
        // 处理组合格式：粗体+斜体 ***text*** 或 ___text___
        text = text.replace(/\*\*\*([^\*\n]+?)\*\*\*/g, '$1');
        text = text.replace(/___([^_\n]+?)___/g, '$1');
        
        // 保留粗体格式，不删除**符号
        // text = text.replace(/\*\*(.*?)\*\*/g, '$1'); // 禁用清理**符号
        // text = text.replace(/__(.*?)__/g, '$1');
        
        // 替换斜体 - 已注释，不再清理*符号
        // text = text.replace(/\*(.*?)\*/g, '$1');
        text = text.replace(/_(.*?)_/g, '$1');
        
        // 替换列表项
        text = text.replace(/^\s*[-*+•]\s+/gm, '');
        text = text.replace(/^\s*\d+\.\s+/gm, '');
        
        // 替换代码块
        text = text.replace(/```([\s\S]*?)```/g, '$1');
        text = text.replace(/`(.*?)`/g, '$1');
        
        // 替换链接
        text = text.replace(/\[(.*?)\]\((.*?)\)/g, '$1');
        
        // 删除线
        text = text.replace(/~~(.*?)~~/g, '$1');
        
        // 还原数学块
        text = text.replace(/__MATH_BLOCK_(\d+)__/g, (match, index) => {
            return '$$' + mathBlocks[parseInt(index)] + '$$';
        });
        
        // 还原行内数学公式
        text = text.replace(/__MATH_INLINE_(\d+)__/g, (match, index) => {
            return '$' + mathInline[parseInt(index)] + '$';
        });
        
        return text;
    }

    // 判断内容是否包含表格
    function hasTable(html) {
        return html.includes('<table>');
    }

    // 处理HTML内容
    function processHtml(html) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        // 处理有序列表 - 完全陈保留原始锦序号
        const olElements = doc.querySelectorAll('ol');
        olElements.forEach(ol => {
            // 禁用默认序号
            ol.style.listStyleType = 'none';
            ol.dataset.listType = 'ordered'; // 标记为有序列表
            ol.classList.add('custom-list'); // 添加自定义类
            
            // 设置样式
            ol.style.paddingLeft = '0';
            ol.style.marginLeft = '0';
            
            // 获取原始文本中的序号格式
            const items = ol.querySelectorAll('li');
            items.forEach((item, index) => {
                item.style.position = 'relative';
                item.style.display = 'block';
                item.style.paddingLeft = '2em';
                item.dataset.listType = 'ordered';
                
                // 获取对应的原始文本行
                const originalLines = markdownEditor.innerText.split('\n');
                let originalNumber = '';
                let originalLine = '';
                
                // 尝试匹配当前列表项在原始文本中的序号
                for (const line of originalLines) {
                    const trimmedLine = line.trim();
                    if (trimmedLine.match(/^\d+\.\s/)) {
                        const itemContent = trimmedLine.replace(/^\d+\.\s/, '').trim();
                        // 如果列表项内容与原始行内容匹配，则找到了对应行
                        if (item.textContent.trim().includes(itemContent)) {
                            const match = trimmedLine.match(/^(\d+\.\s)/);
                            if (match) {
                                originalNumber = match[1];
                                originalLine = trimmedLine;
                                break;
                            }
                        }
                    }
                }
                
                // 如果未找到匹配，使用默认格式vx13635262735
                if (!originalNumber) {
                    originalNumber = (index + 1) + '. ';
                }
                
                // 保存原始序号
                item.dataset.originalNumber = originalNumber;
                
                // 添加显式的序号标记
                const span = document.createElement('span');
                span.textContent = originalNumber;
                span.style.position = 'absolute';
                span.style.left = '0';
                span.style.top = '0';
                span.classList.add('list-marker');
                
                // 清除可能存在的旧序号
                const oldMarkers = item.querySelectorAll('.list-marker');
                oldMarkers.forEach(oldMarker => oldMarker.remove());
                
                // 添加序号到bd3000 weixin列表项
                item.insertBefore(span, item.firstChild);
            });
        });
        
        // 返回处理后的HTML
        return doc.body.innerHTML;
    }

    // 获取格式化的文本内容用于复制
    function getFormattedTextContent() {
        // 从预览区域获取HTML内容
        const previewHTML = previewEditor.innerHTML;
        
        // 创建临时容器来解析HTML
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = previewHTML;
        
        // 处理列表项，删除项目符号
        const listItems = tempDiv.querySelectorAll('li');
        listItems.forEach(li => {
            const listMarkers = li.querySelectorAll('.list-marker');
            listMarkers.forEach(marker => {
                // 检查是否是有序列表
                const isOrdered = li.dataset.listType === 'ordered' || 
                                 li.closest('ol') !== null ||
                                 marker.textContent.match(/^\d+[\.\)、]/);
                
                if (!isOrdered) {
                    // 删除无序列表的项目符号
                    marker.remove();
                }
            });
        });
        
        // 获取处理后的文本内容
        let textContent = tempDiv.innerText || tempDiv.textContent || '';
        
        // 分行处理
        const lines = textContent.split('\n');
        const cleanedLines = lines.map(line => {
            // 处理行内容
            let cleanedLine = line.trim();
            
            // 跳过空行
            if (!cleanedLine) {
                return '';
            }
            
            // 跳过水平分割线
            if (cleanedLine.match(/^(\*{3,}|-{3,}|_{3,})$/)) {
                return '';
            }
            
            // 处理标题，去除 # 符号
            if (cleanedLine.match(/^#+\s+/)) {
                cleanedLine = cleanedLine.replace(/^#+\s+/, '');
            }
            
            // 处理无序列表项，删除项目符号
            if (cleanedLine.match(/^[-\*•]\s+/)) {
                cleanedLine = cleanedLine.replace(/^[-\*•]\s+/, '').trim();
            }
            
            // 额外处理：确保所有类型的项目符号都被删除
            // 删除各种项目符号（包括中文符号）
            cleanedLine = cleanedLine.replace(/^[-\*•·▪▫‣⁃]\s+/, '').trim();
            // 删除数字+点+空格的项目符号（如果不是有序列表）
            if (!cleanedLine.match(/^\d+\.\s+/)) {
                cleanedLine = cleanedLine.replace(/^\d+[\.\)、]\s+/, '').trim();
            }
            
            // 先处理组合格式：粗体+斜体 ***text*** 或 ___text___
            cleanedLine = cleanedLine.replace(/\*\*\*([^\*\n]+?)\*\*\*/g, '$1');
            cleanedLine = cleanedLine.replace(/___([^_\n]+?)___/g, '$1');
            
            // 保留粗体格式，不删除**符号
            // cleanedLine = cleanedLine.replace(/\*\*([^\*\n]+?)\*\*/g, '$1');
            // cleanedLine = cleanedLine.replace(/__([^_\n]+?)__/g, '$1');
            
            // 处理markdown格式的斜体 *text*
            cleanedLine = cleanedLine.replace(/\*([^\*\n]+?)\*/g, function(match, text, offset, string) {
                // 检查前后字符，确保这是Markdown格式的斜体
                const prevChar = offset > 0 ? string[offset-1] : ' ';
                const nextChar = offset + match.length < string.length ? string[offset + match.length] : ' ';
                
                // 判断是不是Markdown格式
                if (/[\s\(\[\{\>\.\,\'\"\!\?\;\:\-]/.test(prevChar) || offset === 0) {
                    return text; // 只保留内容，去掉*符号
                }
                
                // 否则保留原始的*符号
                return match;
            });
            
            // 处理markdown格式的斜体 _text_
            cleanedLine = cleanedLine.replace(/_([^_\n]+?)_/g, function(match, text, offset, string) {
                // 检查前后字符，确保这是Markdown格式的斜体
                const prevChar = offset > 0 ? string[offset-1] : ' ';
                const nextChar = offset + match.length < string.length ? string[offset + match.length] : ' ';
                
                // 判断是不是Markdown格式
                if (/[\s\(\[\{\>\.\,\'\"\!\?\;\:\-]/.test(prevChar) || offset === 0) {
                    return text; // 只保留内容，去掉_符号
                }
                
                // 否则保留原始的_符号
                return match;
            });
            
            // 处理链接和图片标记，只保留文本内容
            cleanedLine = cleanedLine.replace(/\[(.*?)\]\(.*?\)/g, '$1'); // 提取链接文本
            cleanedLine = cleanedLine.replace(/!\[(.*?)\]\(.*?\)/g, '$1'); // 清理图片标记
            
            return cleanedLine;
        });
        
        // 过滤空行并返回清理后的文本
        return cleanedLines.filter(line => line.trim()).join('\n');
    }

    // 将HTML导出为Word文档
    function exportToWord(html) {
        // 直接使用预览区域的HTML内容，确保格式完全一致
        const previewHtml = html;
        
        // 创建临时容器来解析HTML
        const tempDiv = document.createElement('div');
        
        // 使用DOMPurify过滤HTML内容，防止XSS攻击，但保留更多格式信息
        const sanitizedHtml = DOMPurify.sanitize(previewHtml, {
            ALLOWED_TAGS: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'strong', 'em', 'b', 'i', 'u', 'a', 'img', 'ul', 'ol', 'li', 'blockquote', 'pre', 'code', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'hr', 'br', 'span', 'div', 'sup', 'sub'],
            ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'style', 'data-original-number'],
            ALLOW_DATA_ATTR: true,
            KEEP_CONTENT: true
        });
        
        tempDiv.innerHTML = sanitizedHtml;
        
        // 清除可能导致问题的特性
        tempDiv.removeAttribute('contenteditable');
        tempDiv.removeAttribute('id');
        tempDiv.removeAttribute('class');
        tempDiv.style = '';
        
        // 删除所有list-marker元素
        const listMarkers = tempDiv.querySelectorAll('.list-marker');
        listMarkers.forEach(marker => {
            marker.parentNode.removeChild(marker);
        });
        
        // 将无序列表转换为普通段落，避免Word自动添加符号
        const unorderedLists = tempDiv.querySelectorAll('ul');
        unorderedLists.forEach(ul => {
            const listItems = ul.querySelectorAll('li');
            const paragraphs = [];
            
            listItems.forEach(li => {
                // 创建段落元素
                const p = document.createElement('p');
                p.style.margin = '0 0 5pt 0';
                p.style.padding = '0';
                p.innerHTML = li.innerHTML;
                paragraphs.push(p);
            });
            
            // 用段落替换ul元素
            const parent = ul.parentNode;
            paragraphs.forEach(p => {
                parent.insertBefore(p, ul);
            });
            parent.removeChild(ul);
        });
        
        // 直接使用预览区域的HTML内容，不进行复杂的格式转换
        const wordContent = tempDiv.innerHTML;
        
        // 创建Word文档头部
        const header = `
            <html xmlns:o="urn:schemas-microsoft-com:office:office" 
                  xmlns:w="urn:schemas-microsoft-com:office:word" 
                  xmlns:m="http://schemas.microsoft.com/office/2004/12/omml"
                  xmlns="http://www.w3.org/TR/REC-html40">
            <head>
                <meta charset="utf-8">
                <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
                <title>导出文档</title>
                <!--[if gte mso 9]>
                <xml>
                    <w:WordDocument>
                        <w:View>Print</w:View>
                        <w:Zoom>100</w:Zoom>
                        <w:DoNotOptimizeForBrowser/>
                        <w:ValidateAgainstSchema/>
                        <w:SaveIfXMLInvalid>false</w:SaveIfXMLInvalid>
                        <w:IgnoreMixedContent>false</w:IgnoreMixedContent>
                        <w:AlwaysShowPlaceholderText>false</w:AlwaysShowPlaceholderText>
                        <w:Compatibility>
                            <w:BreakWrappedTables/>
                            <w:SnapToGridInCell/>
                            <w:WrapTextWithPunct/>
                            <w:UseAsianBreakRules/>
                            <w:DontGrowAutofit/>
                        </w:Compatibility>
                    </w:WordDocument>
                </xml>
                <![endif]-->
                <style>
                    /* 页面设置 */
                    @page {
                        size: 21cm 29.7cm;
                        margin: 2cm;
                    }
                    
                    /* 基本文档样式 - 与预览区域保持一致 */
                    body {
                        font-family: "Microsoft YaHei", "SimSun", "宋体", serif;
                        font-size: 14px;
                        line-height: 1.6;
                        margin: 0;
                        padding: 0;
                        color: #333;
                        background-color: #fff;
                    }
                    
                    /* 标题样式 - 与预览区域保持一致 */
                    h1, h2, h3, h4, h5, h6 {
                        font-weight: bold;
                        margin-top: 16px;
                        margin-bottom: 8px;
                        color: #000;
                    }
                    h1 { font-size: 24px; }
                    h2 { font-size: 20px; }
                    h3 { font-size: 16px; }
                    h4 { font-size: 14px; }
                    h5, h6 { font-size: 12px; }
                    
                    /* 段落样式 - 与预览区域保持一致 */
                    p {
                        margin-bottom: 10px;
                        margin-top: 0;
                        line-height: 1.6;
                    }
                    
                    /* 表格样式 - 与预览区域保持一致 */
                    table {
                        border-collapse: collapse;
                        width: 100%;
                        margin: 12px 0;
                        font-size: 14px;
                    }
                    table, th, td {
                        border: 1px solid #ddd;
                    }
                    th, td {
                        padding: 8px;
                        vertical-align: top;
                        text-align: left;
                    }
                    th {
                        background-color: #f5f5f5;
                        font-weight: bold;
                    }
                    
                    /* 引用样式 - 与预览区域保持一致 */
                    blockquote {
                        margin-left: 20px;
                        padding-left: 10px;
                        border-left: 3px solid #ccc;
                        color: #555;
                        font-style: italic;
                    }
                    
                    /* 代码样式 - 与预览区域保持一致 */
                    code {
                        font-family: "Consolas", "Courier New", monospace;
                        background-color: #f8f8f8;
                        padding: 2px 4px;
                        border: 1px solid #ddd;
                        font-size: 12px;
                    }
                    pre {
                        font-family: "Consolas", "Courier New", monospace;
                        background-color: #f8f8f8;
                        padding: 8px;
                        margin: 10px 0;
                        white-space: pre-wrap;
                        border: 1px solid #ddd;
                        font-size: 12px;
                    }
                    
                    /* 列表样式 - 与预览区域保持一致 */
                    ol {
                        list-style-type: none;
                        margin-left: 0;
                        padding-left: 0;
                        margin-bottom: 10px;
                    }
                    ol li {
                        position: relative;
                        padding-left: 30px;
                        margin-bottom: 6px;
                        line-height: 1.5;
                    }
                    ol li span {
                        position: absolute;
                        left: 0;
                        top: 0;
                        font-weight: bold;
                    }
                    ul {
                        list-style-type: none;
                        margin-left: 0;
                        padding-left: 0;
                        margin-bottom: 10px;
                    }
                    ul li {
                        margin-bottom: 6px;
                        position: relative;
                        padding-left: 0;
                        line-height: 1.5;
                    }
                    
                    /* 数学公式样式 - 与预览区域保持一致 */
                    .math-inline {
                        font-family: "Cambria Math", "Times New Roman", serif;
                        font-style: italic;
                        font-size: 14px;
                        line-height: 1.2;
                        vertical-align: baseline;
                    }
                    .math-block {
                        font-family: "Cambria Math", "Times New Roman", serif;
                        text-align: center;
                        margin: 15px 0;
                        font-style: italic;
                        font-size: 16px;
                        line-height: 1.4;
                    }
                    
                    /* 数学公式内部元素样式 */
                    .math-inline sup, .math-block sup {
                        font-size: 0.8em;
                        vertical-align: super;
                        line-height: 0;
                    }
                    .math-inline sub, .math-block sub {
                        font-size: 0.8em;
                        vertical-align: sub;
                        line-height: 0;
                    }
                    
                    /* 分数样式 */
                    .math-inline span[style*="display:inline-block"], 
                    .math-block span[style*="display:inline-block"] {
                        display: inline-block;
                        vertical-align: middle;
                        text-align: center;
                        margin: 0 2px;
                    }
                    
                    /* 根号样式 */
                    .math-inline span[style*="position:relative"], 
                    .math-block span[style*="position:relative"] {
                        position: relative;
                    }
                    
                    /* 上标角标样式 */
                    sup {
                        font-size: 0.7em;
                        vertical-align: super;
                        line-height: 0;
                    }
                    
                    /* 强调样式 - 与预览区域保持一致 */
                    strong, b {
                        font-weight: bold;
                    }
                    em, i {
                        font-style: italic;
                    }
                    
                    /* 链接样式 - 与预览区域保持一致 */
                    a {
                        color: #0066cc;
                        text-decoration: none;
                    }
                    
                    /* 水平线样式 - 与预览区域保持一致 */
                    hr {
                        border: none;
                        border-top: 1px solid #ccc;
                        margin: 15px 0;
                    }
                    
                    /* 确保所有符号正确显示 */
                    * {
                        font-family: inherit;
                    }
                </style>
            </head>
            <body>
        `;
        
        const footer = `
            </body>
            </html>
        `;
        
        // 创建最终文档 - 直接使用预览区域的HTML内容
        const docContent = header + wordContent + footer;
        
        // 创建Blob并下载 - 使用正确的MIME类型和文件扩展名
        const blob = new Blob([docContent], { type: 'application/msword' });
        saveAs(blob, 'document.doc');
    }
    
    
    
    
    

    // 辅助函数：查找元素中的第一个文本节点
    function findFirstTextNode(element) {
        // 深度优先搜索查找第一个非空的文本节点
        if (element.nodeType === Node.TEXT_NODE) {
            if (element.textContent.trim() !== '') {
                return element;
            }
            return null;
        }
        
        // 处理元素节点
        if (element.nodeType === Node.ELEMENT_NODE) {
            // 跳过list-marker元素
            if (element.classList && element.classList.contains('list-marker')) {
                return null;
            }
            
            // 递归检查子节点
            for (let i = 0; i < element.childNodes.length; i++) {
                const textNode = findFirstTextNode(element.childNodes[i]);
                if (textNode) {
                    return textNode;
                }
            }
        }
        
        return null;
    }

    // 清理行文本的函数，去除所有特殊符号
    function cleanLine(line) {
        // 去除所有 ** 标记
        line = line.replace(/\*\*/g, '');
        
        // 去除单独的 * 标记，但要避免删除乘法符号 - 已注释，不再清除*符号
        // line = line.replace(/\s\*\s/g, ' × '); // 保留乘法符号
        // line = line.replace(/\*/g, '');
        
        // ccy去除行首的 - 或 • 标记
        line = line.replace(/^[-•]\s+/, '');
        
        // 去除引用标记
        line = line.replace(/^>\s*/, '');
        
        // 去除强调标记 __ __
        line = line.replace(/__/g, '');
        
        // 去除行内代码标记 `
        line = line.replace(/`/g, '');
        
        return line;
    }

    // 将表格导出为Excel
    function exportToExcel(html, format = 'xlsx') {
        // 使用传入的HTML内容，确保格式一致
        const previewHtml = html;
        
        // 从预览HTML中提取表格数据
        const tables = extractTablesFromPreviewHtml(previewHtml);
        
        if (tables.length === 0) {
            showNotification('倾企提示：没有找到表格内容', 'error');
            return;
        }
        
        // 直接使用XLSX格式导出
        try {
            // 检查SheetJS库是否可用
            if (typeof XLSX === 'undefined') {
                // 如果SheetJS不可用，显示错误信息而不是回退到HTML格式
                showNotification('SheetJS库未加载，无法导出XLSX格式。请刷新页面重试。', 'error');
                console.error('XLSX库未定义，无法导出Excel格式');
                return;
            }
            
            // 创建新的工作簿
            const workbook = XLSX.utils.book_new();
            
            // 合并所有表格到一个工作表
            let allTableData = [];
            let currentRowIndex = 0;
            
            tables.forEach((table, tableIndex) => {
                // 处理表格数据，保留格式信息
                const processedTable = table.map(row => 
                    row.map(cell => {
                        if (typeof cell === 'object' && cell.text !== undefined) {
                            // 新格式：包含格式信息的对象
                            // 提取纯文本内容用于Excel显示，但保留原始HTML用于格式检测
                            return {
                                text: extractPlainTextFromHtml(cell.text.trim()),
                                originalHtml: cell.text.trim(),
                                isBold: cell.isBold || hasBoldInHtml(cell.text),
                                isItalic: cell.isItalic || hasItalicInHtml(cell.text)
                            };
                        } else {
                            // 旧格式：纯文本
                            return {
                                text: cell.trim(),
                                originalHtml: cell.trim(),
                                isBold: false,
                                isItalic: false
                            };
                        }
                    })
                );
                
                // 如果不是第一个表格，添加空行分隔
                if (tableIndex > 0) {
                    const emptyRow = new Array(processedTable[0].length).fill('');
                    allTableData.push(emptyRow);
                    currentRowIndex++;
                }
                
                // 添加表格数据
                processedTable.forEach(row => {
                    // 提取纯文本用于Excel显示
                    const textRow = row.map(cell => {
                        if (typeof cell === 'object' && cell.text !== undefined) {
                            return cell.text;
                        } else {
                            return cell;
                        }
                    });
                    allTableData.push(textRow);
                    currentRowIndex++;
                });
            });
            
            // 将合并后的数据转换为工作表
            const worksheet = XLSX.utils.aoa_to_sheet(allTableData);
            
            // 计算最大列数
            const maxCols = Math.max(...allTableData.map(row => row.length));
            
            // 设置列宽 - 自适应内容宽度
            const colWidths = [];
            for (let colIndex = 0; colIndex < maxCols; colIndex++) {
                let maxWidth = 8; // 最小宽度
                allTableData.forEach(row => {
                    if (row[colIndex]) {
                        // 计算文本长度，考虑中文字符
                        const textLength = row[colIndex].length;
                        // 中文字符按2个字符宽度计算
                        const displayLength = textLength + (row[colIndex].match(/[\u4e00-\u9fa5]/g) || []).length;
                        maxWidth = Math.max(maxWidth, displayLength);
                    }
                });
                // 设置合理的列宽范围
                colWidths.push({ wch: Math.min(Math.max(maxWidth + 2, 10), 60) });
            }
            worksheet['!cols'] = colWidths;
            
            // 设置单元格样式（包括格式信息）
            if (allTableData.length > 0) {
                let currentRow = 0;
                
                tables.forEach((table, tableIndex) => {
                    // 处理表格数据，保留格式信息
                    const processedTable = table.map(row => 
                        row.map(cell => {
                            if (typeof cell === 'object' && cell.text !== undefined) {
                                // 新格式：包含格式信息的对象
                                return {
                                    text: extractPlainTextFromHtml(cell.text.trim()),
                                    originalHtml: cell.text.trim(),
                                    isBold: cell.isBold || hasBoldInHtml(cell.text),
                                    isItalic: cell.isItalic || hasItalicInHtml(cell.text)
                                };
                            } else {
                                // 旧格式：纯文本
                                return {
                                    text: cell.trim(),
                                    originalHtml: cell.trim(),
                                    isBold: false,
                                    isItalic: false
                                };
                            }
                        })
                    );
                    
                    // 如果不是第一个表格，跳过空行
                    if (tableIndex > 0) {
                        currentRow++;
                    }
                    
                    // 处理每一行
                    processedTable.forEach((row, rowIndex) => {
                        row.forEach((cell, colIndex) => {
                            const cellAddress = XLSX.utils.encode_cell({ r: currentRow, c: colIndex });
                            if (!worksheet[cellAddress]) return;
                            
                            // 基础样式设置
                            let cellStyle = {
                                font: { 
                                    name: "Microsoft YaHei", 
                                    size: 11,
                                    bold: false,
                                    italic: false
                                },
                                alignment: { 
                                    horizontal: "left", 
                                    vertical: "top",
                                    wrapText: true  // 自动换行
                                }
                            };
                            
                            // 表头样式 - 第一行加粗
                            if (rowIndex === 0) {
                                cellStyle.font.bold = true;
                                cellStyle.fill = { fgColor: { rgb: "F2F2F2" } };
                                cellStyle.alignment.horizontal = "center";
                                cellStyle.alignment.vertical = "center";
                            }
                            
                            // 应用格式信息
                            if (typeof cell === 'object' && cell.isBold !== undefined) {
                                if (cell.isBold) {
                                    cellStyle.font.bold = true;
                                }
                                if (cell.isItalic) {
                                    cellStyle.font.italic = true;
                                }
                            }
                            
                            // 应用样式到单元格
                            worksheet[cellAddress].s = cellStyle;
                        });
                        currentRow++;
                    });
                });
            }
            
            // 添加工作表到工作簿 - 只创建一个工作表
            XLSX.utils.book_append_sheet(workbook, worksheet, '表格数据');
            
            // 生成Excel文件
            const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        
        // 创建Blob并下载
            const blob = new Blob([excelBuffer], { 
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
            });
        saveAs(blob, 'spreadsheet.xlsx');
        
        // 导出成功提示
        showNotification('表格已成功导出为Excel文件', 'success');
            
        } catch (error) {
            console.error('Excel导出错误:', error);
            // 如果出现错误，显示错误信息而不是回退到HTML格式
            showNotification('Excel导出失败: ' + error.message, 'error');
        }
    }
    
    
    // 处理表格单元格内容
    function processCellContent(content) {
        // 处理数学公式 - 转换为可读文本
        content = content.replace(/\$(.*?)\$/g, '$1'); // 行内公式转为普通文本
        content = content.replace(/\$\$(.*?)\$\$/gs, '$1'); // 块级公式转为普通文本
        
        // 处理从预览HTML提取的Markdown格式
        // 处理粗体 **text** - 保留内容，移除**符号
        content = content.replace(/\*\*([^\*\n]+?)\*\*/g, '$1');
        
        // 处理粗体 __text__ - 保留内容，移除__符号
        content = content.replace(/__([^_\n]+?)__/g, '$1');
        
        // 处理斜体 *text* - 保留内容，移除*符号
        content = content.replace(/\*([^\*\n]+?)\*/g, '$1');
        
        // 处理斜体 _text_ - 保留内容，移除_符号
        content = content.replace(/_([^_\n]+?)_/g, '$1');
        
        // 处理行内代码 `code` - 移除反引号
        content = content.replace(/`([^`\n]+?)`/g, '$1');
        
        // 处理删除线 ~~text~~ - 移除删除线标记
        content = content.replace(/~~([^~\n]+?)~~/g, '$1');
        
        // 处理链接 [text](url) - 只保留文本
        content = content.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
        
        // 处理图片 ![alt](url) - 只保留alt文本
        content = content.replace(/!\[([^\]]+)\]\([^)]+\)/g, '$1');
        
        // 清理多余的空白字符
        content = content.replace(/\s+/g, ' ').trim();
        
        return content;
    }
    
    // 从预览HTML中提取表格数据和格式信息
    function extractTablesFromPreviewHtml(html) {
        const tables = [];
        
        // 创建临时DOM元素来解析HTML
        const tempDiv = document.createElement('div');
        
        // 使用DOMPurify过滤HTML内容，防止XSS攻击
        const sanitizedHtml = DOMPurify.sanitize(html, {
            ALLOWED_TAGS: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'strong', 'em', 'b', 'i', 'u', 'a', 'img', 'ul', 'ol', 'li', 'blockquote', 'pre', 'code', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'hr', 'br', 'span', 'div', 'sup', 'sub'],
            ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'style', 'data-original-number'],
            ALLOW_DATA_ATTR: true
        });
        
        tempDiv.innerHTML = sanitizedHtml;
        
        // 查找所有表格
        const tableElements = tempDiv.querySelectorAll('table');
        
        tableElements.forEach(table => {
            const tableData = [];
            
            // 获取所有行（包括表头和数据行）
            const allRows = table.querySelectorAll('tr');
            allRows.forEach(row => {
                const cells = row.querySelectorAll('td, th');
                const rowData = Array.from(cells).map(cell => {
                    return {
                        text: cell.innerHTML, // 保留原始HTML内容
                        isBold: hasBoldFormatting(cell),
                        isItalic: hasItalicFormatting(cell)
                    };
                });
                tableData.push(rowData);
            });
            
            if (tableData.length > 0) {
                tables.push(tableData);
            }
        });
        
        return tables;
    }
    
    // 检查单元格是否有粗体格式
    function hasBoldFormatting(cell) {
        // 检查HTML标签
        const hasHtmlBold = cell.querySelector('strong, b') !== null || 
                           cell.innerHTML.includes('<strong>') || 
                           cell.innerHTML.includes('<b>');
        
        // 检查CSS样式
        const computedStyle = window.getComputedStyle ? window.getComputedStyle(cell) : null;
        const hasCssBold = computedStyle && (
            computedStyle.fontWeight === 'bold' || 
            computedStyle.fontWeight === '700' || 
            computedStyle.fontWeight === '600' ||
            parseInt(computedStyle.fontWeight) >= 600
        );
        
        // 检查内联样式
        const hasInlineBold = cell.style.fontWeight === 'bold' || 
                             cell.style.fontWeight === '700' || 
                             cell.style.fontWeight === '600' ||
                             parseInt(cell.style.fontWeight) >= 600;
        
        return hasHtmlBold || hasCssBold || hasInlineBold;
    }
    
    // 检查HTML字符串中是否有粗体格式
    function hasBoldInHtml(htmlString) {
        if (!htmlString) return false;
        
        // 检查HTML标签
        return htmlString.includes('<strong>') || 
               htmlString.includes('<b>') ||
               htmlString.includes('</strong>') || 
               htmlString.includes('</b>');
    }
    
    // 检查HTML字符串中是否有斜体格式
    function hasItalicInHtml(htmlString) {
        if (!htmlString) return false;
        
        // 检查HTML标签
        return htmlString.includes('<em>') || 
               htmlString.includes('<i>') ||
               htmlString.includes('</em>') || 
               htmlString.includes('</i>');
    }
    
    // 检查单元格是否有斜体格式
    function hasItalicFormatting(cell) {
        // 检查HTML标签
        const hasHtmlItalic = cell.querySelector('em, i') !== null || 
                             cell.innerHTML.includes('<em>') || 
                             cell.innerHTML.includes('<i>');
        
        // 检查CSS样式
        const computedStyle = window.getComputedStyle ? window.getComputedStyle(cell) : null;
        const hasCssItalic = computedStyle && computedStyle.fontStyle === 'italic';
        
        // 检查内联样式
        const hasInlineItalic = cell.style.fontStyle === 'italic';
        
        return hasHtmlItalic || hasCssItalic || hasInlineItalic;
    }
    
    // 从表格单元格中提取文本内容和格式信息
    function extractTextFromCell(cell) {
        // 获取单元格的HTML内容
        let cellContent = cell.innerHTML;
        
        // 保留格式信息，不直接移除HTML标签
        // 只处理一些特殊标签，保留粗体、斜体等格式标记
        cellContent = cellContent
            .replace(/<br\s*\/?>/gi, '\n')  // 换行符
            .replace(/&nbsp;/g, ' ')        // 非断行空格
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'");
        
        return cellContent.trim();
    }
    
    // 从HTML内容中提取纯文本，用于Excel显示
    function extractPlainTextFromHtml(htmlContent) {
        if (!htmlContent) return '';
        
        let text = htmlContent;
        
        // 处理换行符
        text = text.replace(/<br\s*\/?>/gi, '\n');
        
        // 移除所有HTML标签，保留纯文本
        text = text.replace(/<[^>]*>/g, '');
        
        // 解码HTML实体
        text = text
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/&nbsp;/g, ' ');
        
        return text.trim();
    }
    
    // 从Markdown文本中提取表格
    function extractTablesFromMarkdown(markdownText) {
        const lines = markdownText.split('\n');
        const tables = [];
        let currentTable = null;
        let isProcessingTable = false;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            // 检测表格行
            if (line.match(/^\|(.+)\|$/)) {
                // 跳过表格分隔行
                if (line.match(/^\|\s*[-:]+\s*\|/)) {
                    continue;
                }
                
                // 开始新表格
                if (!isProcessingTable) {
                    isProcessingTable = true;
                    currentTable = [];
                }
                
                // 解析表格单元格
                const cells = line.split('|')
                    .filter(cell => cell !== '')  // 移除空单元格
                    .map(cell => cell.trim());   // 修剪空白
                
                currentTable.push(cells);
            } else if (isProcessingTable) {
                // 表格结束
                if (currentTable.length > 0) {
                    tables.push(currentTable);
                }
                isProcessingTable = false;
                currentTable = null;
            }
        }
        
        // 处理文档末尾的表格
        if (isProcessingTable && currentTable && currentTable.length > 0) {
            tables.push(currentTable);
        }
        
        return tables;
    }

    // 事件监听器
    markdownEditor.addEventListener('input', updatePreview);
    
    pasteBtn.addEventListener('click', async () => {
        try {
            const text = await navigator.clipboard.readText();
            markdownEditor.innerText = text;
            updatePreview();
            showNotification('内容已粘贴', 'success');
        } catch (err) {
            showNotification('无法访问剪贴板，请手动粘贴内容', 'error');
            markdownEditor.focus();
        }
    });
    
    copyBtn.addEventListener('click', async () => {
        try {
            // 添加额外检查，确保序号信息被正确保留在复制前
            const olItems = previewEditor.querySelectorAll('li[data-list-type="ordered"]');
            olItems.forEach(item => {
                const originalText = item.dataset.originalText || '';
                if (originalText && !item.querySelector('.list-marker:not([style*="visibility: hidden"])')) {
                    // 如果序号标记不存在或不可见，创建一个新的可见标记
                    const markers = item.querySelectorAll('.list-marker');
                    markers.forEach(marker => marker.remove());
                    
                    const span = document.createElement('span');
                    span.textContent = originalText;
                    span.classList.add('list-marker');
                    span.style.position = 'absolute';
                    span.style.left = '0';
                    span.style.top = '0';
                    span.style.visibility = 'visible';
                    span.style.display = 'inline-block';
                    
                    item.insertBefore(span, item.firstChild);
                }
            });
            
            // 获取预览区域的HTML内容，确保格式与预览区一致
            const previewContent = previewEditor.innerHTML;
            
            // 创建临时容器来清理和准备HTML内容
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = previewContent;
            
            // 删除所有隐藏的list-marker元素
            const listMarkers = tempDiv.querySelectorAll('.list-marker[style*="visibility: hidden"]');
            listMarkers.forEach(marker => marker.remove());
            
            // 清理后的HTML内容
            const cleanHtml = tempDiv.innerHTML;
            
            // 使用Clipboard API同时复制HTML和纯文本格式
            const clipboardItem = new ClipboardItem({
                'text/html': new Blob([cleanHtml], { type: 'text/html' }),
                'text/plain': new Blob([getFormattedTextContent()], { type: 'text/plain' })
            });
            
            await navigator.clipboard.write([clipboardItem]);
            
            const message = '内容已复制到剪贴板';
            showNotification(message, 'success');
        } catch (err) {
            // 如果ClipboardItem不支持，尝试使用传统的HTML复制方法
            try {
                // 创建临时元素用于复制
                const tempElement = document.createElement('div');
                tempElement.innerHTML = previewEditor.innerHTML;
                tempElement.style.position = 'fixed';
                tempElement.style.left = '-9999px';
                tempElement.style.top = '-9999px';
                document.body.appendChild(tempElement);
                
                // 选择内容
                const range = document.createRange();
                range.selectNodeContents(tempElement);
                const selection = window.getSelection();
                selection.removeAllRanges();
                selection.addRange(range);
                
                // 复制
                document.execCommand('copy');
                
                // 清理
                selection.removeAllRanges();
                document.body.removeChild(tempElement);
                
                const message = '内容已复制到剪贴板';
                showNotification(message, 'success');
            } catch (fallbackErr) {
                showNotification('无法复制到剪贴板', 'error');
                // 选择文本以便用户手动复制
                const range = document.createRange();
                range.selectNodeContents(previewEditor);
                const selection = window.getSelection();
                selection.removeAllRanges();
                selection.addRange(range);
            }
        }
    });
    
    exportWordBtn.addEventListener('click', () => {
        // 获取预览区域的HTML内容，确保格式一致
        const previewContent = previewEditor.innerHTML;
        
        // 使用DOMPurify过滤HTML内容，防止XSS攻击
        const cleanHtml = typeof DOMPurify !== 'undefined' ? DOMPurify.sanitize(previewContent, {
            ALLOWED_TAGS: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'strong', 'em', 'b', 'i', 'u', 'a', 'img', 'ul', 'ol', 'li', 'blockquote', 'pre', 'code', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'hr', 'br', 'span', 'div', 'sup', 'sub'],
            ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'style', 'data-original-number'],
            ALLOW_DATA_ATTR: true
        }) : previewContent;
        
        exportToWord(cleanHtml);
        showNotification('Word文档导出成功', 'success');
    });
    
    // Excel导出按钮事件 - 直接导出为xlsx格式
    exportExcelBtn.addEventListener('click', () => {
        
        // 获取预览区域的HTML内容，确保格式一致
        const previewContent = previewEditor.innerHTML;
        
        // 使用DOMPurify过滤HTML内容，防止XSS攻击
        const cleanHtml = typeof DOMPurify !== 'undefined' ? DOMPurify.sanitize(previewContent, {
            ALLOWED_TAGS: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'strong', 'em', 'b', 'i', 'u', 'a', 'img', 'ul', 'ol', 'li', 'blockquote', 'pre', 'code', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'hr', 'br', 'span', 'div', 'sup', 'sub'],
            ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'style', 'data-original-number'],
            ALLOW_DATA_ATTR: true
        }) : previewContent;
        
        exportToExcel(cleanHtml, 'xlsx');
    });
    
    // 图片导出按钮事件 - 由ct.js处理，避免冲突
    // 如果ct.js未加载，尝试延迟初始化
    if (exportImageBtn) {
        if (typeof window.initExportImageButton === 'function') {
            // ct.js已加载，调用初始化函数
            window.initExportImageButton();
        } else {
            // ct.js未加载，延迟检查
            setTimeout(() => {
                if (typeof window.initExportImageButton === 'function') {
                    window.initExportImageButton();
                } else {
                    console.warn('⚠️ ct.js未加载，图片导出功能将不可用');
                }
            }, 500);
        }
    }
    
    // PDF导出按钮事件 - 使用浏览器打印功能
    const exportPdfBtn = document.getElementById('exportPdfBtn');
    if (exportPdfBtn) {
        exportPdfBtn.addEventListener('click', () => {
            exportToPDF();
        });
    }
    
    // 获取格式化的导出内容 - 如果ct.js未加载则使用本地版本（用于PDF导出）
    function getFormattedExportContent() {
        // 如果ct.js已加载，使用ct.js中的函数
        if (typeof window.getFormattedExportContent === 'function') {
            return window.getFormattedExportContent();
        }
        
        // 否则使用本地版本（向后兼容）
        const tempDiv = document.createElement('div');
        tempDiv.style.cssText = 'position: absolute; top: -9999px; left: -9999px; visibility: hidden; width: 100%;';
        document.body.appendChild(tempDiv);
        
        const previewClone = previewEditor.cloneNode(true);
        tempDiv.appendChild(previewClone);
        
        let htmlContent = tempDiv.innerHTML;
        document.body.removeChild(tempDiv);
        
        return htmlContent;
    }
    
    // PDF导出函数 - 使用浏览器打印功能，确保数学公式正确显示
    function exportToPDF() {
        // 显示加载提示
        showNotification('正在准备PDF导出，请稍候...', 'info');
        
        // 等待MathJax完全渲染
        setTimeout(() => {
            // 创建打印窗口
            const printWindow = window.open('', '_blank');
            
            // 获取格式化的预览内容
            const previewContent = getFormattedExportContent();
            
            // 创建打印页面HTML - 使用与预览区完全一致的样式
            const printHtml = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI内容预览 - PDF导出</title>
    <style>
        @page {
            size: A4;
            margin: 2cm;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Helvetica Neue', Helvetica, Arial, sans-serif;
            font-size: 12pt;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 0;
            background: white;
        }
        
        /* 标题样式 - 与预览区一致 */
        h1 {
            font-size: 2em;
            font-weight: bold;
            margin: 0.67em 0;
            color: #2d4a2d;
            border-bottom: 2px solid #4a7c59;
            padding-bottom: 0.3em;
            page-break-after: avoid;
        }
        
        h2 {
            font-size: 1.5em;
            font-weight: bold;
            margin: 0.83em 0;
            color: #2d4a2d;
            border-bottom: 1px solid #4a7c59;
            padding-bottom: 0.2em;
            page-break-after: avoid;
        }
        
        h3 {
            font-size: 1.17em;
            font-weight: bold;
            margin: 1em 0;
            color: #2d4a2d;
            page-break-after: avoid;
        }
        
        h4 {
            font-size: 1em;
            font-weight: bold;
            margin: 1.33em 0;
            color: #2d4a2d;
            page-break-after: avoid;
        }
        
        h5 {
            font-size: 0.83em;
            font-weight: bold;
            margin: 1.67em 0;
            color: #2d4a2d;
            page-break-after: avoid;
        }
        
        h6 {
            font-size: 0.67em;
            font-weight: bold;
            margin: 2.33em 0;
            color: #2d4a2d;
            page-break-after: avoid;
        }
        
        /* 段落样式 */
        p {
            margin: 1em 0;
            line-height: 1.6;
        }
        
        /* 列表样式 - 与预览区一致 */
        ul {
            margin: 1em 0;
            padding-left: 0;
            list-style-type: none;
        }
        
        ol {
            margin: 1em 0;
            padding-left: 2em;
            list-style-type: decimal;
        }
        
        ul li {
            margin: 0.5em 0;
            line-height: 1.6;
            list-style-type: none;
        }
        
        ol li {
            margin: 0.5em 0;
            line-height: 1.6;
        }
        
        /* 表格样式 - 与预览区一致 */
        table {
            border-collapse: collapse;
            width: 100%;
            margin: 1em 0;
            background-color: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 8px rgba(45, 74, 45, 0.1);
            page-break-inside: avoid;
        }
        
        th, td {
            border: 1px solid #e0e0e0;
            padding: 12px 16px;
            text-align: left;
            vertical-align: top;
        }
        
        th {
            background-color: #f8fdf8;
            font-weight: bold;
            color: #2d4a2d;
            border-bottom: 2px solid #4a7c59;
        }
        
        tr:nth-child(even) {
            background-color: #f8fdf8;
        }
        
        /* 链接样式 */
        a {
            color: #4a7c59;
            text-decoration: none;
        }
        
        /* 强调样式 */
        strong, b {
            font-weight: bold;
            color: #2d4a2d;
        }
        
        em, i {
            font-style: italic;
            color: #4a6a4a;
        }
        
        /* 代码块样式 - 与预览区一致 */
        pre {
            background: linear-gradient(135deg, #f0f8f0 0%, #e8f5e8 100%);
            border-radius: 8px;
            padding: 18px;
            overflow: auto;
            margin: 18px 0;
            border: 1px solid rgba(74, 124, 89, 0.2);
            box-shadow: 0 2px 8px rgba(45, 74, 45, 0.05);
            font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', 'Consolas', monospace;
            font-size: 0.9em;
            white-space: pre;
            page-break-inside: avoid;
        }
        
        code {
            background-color: rgba(74, 124, 89, 0.1);
            border-radius: 4px;
            padding: 0.3em 0.5em;
            font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', 'Consolas', monospace;
            font-size: 0.9em;
            color: #2d4a2d;
        }
        
        pre code {
            background-color: transparent;
            padding: 0;
            font-size: 1em;
            white-space: pre;
            display: block;
            overflow-x: auto;
            color: #2d4a2d;
        }
        
        /* 引用块样式 - 与预览区一致 */
        blockquote {
            border-left: 4px solid #4a7c59;
            color: #4a6a4a;
            margin: 18px 0;
            padding: 0 18px;
            background: linear-gradient(135deg, #f8fdf8 0%, #f0f8f0 100%);
            border-radius: 0 8px 8px 0;
            font-style: italic;
        }
        
        /* 分割线样式 */
        hr {
            border: none;
            height: 2px;
            background: linear-gradient(90deg, transparent, #4a7c59, transparent);
            margin: 2em 0;
        }
        
        /* 上下标样式 */
        sup {
            vertical-align: super;
            font-size: 0.8em;
        }
        
        sub {
            vertical-align: sub;
            font-size: 0.8em;
        }
        
        /* 内容容器样式 */
        .content {
            max-width: 100%;
            word-wrap: normal;
            overflow-wrap: normal;
            word-break: normal;
        }
        
        /* 确保所有文本内容正确显示特殊符号 */
        .content * {
            font-family: inherit;
        }
        
        /* 数学公式样式 - 确保MathJax公式正确显示 */
        .MathJax, .mjx-chtml {
            display: inline !important;
            visibility: visible !important;
            opacity: 1 !important;
            position: static !important;
            float: none !important;
            clear: none !important;
            transform: none !important;
            filter: none !important;
            box-shadow: none !important;
            text-shadow: none !important;
            margin: 0 !important;
            padding: 0 !important;
        }
        
        /* 块级数学公式样式 */
        .mjx-chtml.MJXc-display {
            display: block !important;
            width: 100% !important;
            text-align: center !important;
            margin: 1em auto !important;
            padding: 0 !important;
            page-break-inside: avoid;
        }
        
        /* 数学符号样式 */
        .mjx-mi, .mjx-mo, .mjx-mn, .mjx-mtext, .mjx-mspace {
            display: inline !important;
            visibility: visible !important;
            opacity: 1 !important;
            position: static !important;
            transform: none !important;
            filter: none !important;
        }
        
        /* 分页控制 */
        .page-break {
            page-break-before: always;
        }
        
        .no-break {
            page-break-inside: avoid;
        }
        
        /* 打印时隐藏的元素 */
        @media print {
            .no-print {
                display: none !important;
            }
            
            body {
                -webkit-print-color-adjust: exact;
                color-adjust: exact;
            }
            
            /* 确保数学公式在打印时正确显示 */
            .MathJax, .mjx-chtml {
                -webkit-print-color-adjust: exact;
                color-adjust: exact;
            }
        }
    </style>
    
    <!-- MathJax配置 -->
    <script>
        window.MathJax = {
            tex: {
                inlineMath: [['$', '$'], ['\\(', '\\)']],
                displayMath: [['$$', '$$'], ['\\[', '\\]']],
                processEscapes: true,
                processEnvironments: true
            },
            options: {
                skipHtmlTags: ['script', 'noscript', 'style', 'textarea', 'pre']
            },
            startup: {
                ready: function () {
                    MathJax.startup.defaultReady();
                }
            }
        };
    </script>
    <script src="libs/tex-mml-chtml.js"></script>
</head>
<body>
    <div class="content">
        ${previewContent}
    </div>
    
    <script>
        // 等待MathJax渲染完成后再显示打印对话框
        window.addEventListener('load', function() {
            if (typeof MathJax !== 'undefined' && MathJax.typesetPromise) {
                MathJax.typesetPromise().then(function() {
                    // 延迟一点时间确保渲染完成
                    setTimeout(function() {
                        window.print();
                    }, 500);
                }).catch(function(err) {
                    // 即使MathJax渲染失败，也尝试打印
                    setTimeout(function() {
                        window.print();
                    }, 1000);
                });
            } else {
                // 如果没有MathJax，直接打印
                setTimeout(function() {
                    window.print();
                }, 1000);
            }
        });
        
        // 打印完成后关闭窗口
        window.addEventListener('afterprint', function() {
            window.close();
        });
    </script>
</body>
</html>`;
            
            // 写入内容到打印窗口
            printWindow.document.write(printHtml);
            printWindow.document.close();
            
            // 显示成功提示
            showNotification('✅ PDF导出窗口已打开，请在打印对话框中选择"另存为PDF"', 'success');
            
        }, 1000); // 等待MathJax渲染完成
    }
    // 支持拖放
    markdownEditor.addEventListener('dragover', (e) => {
        e.preventDefault();
        markdownEditor.classList.add('drag-over');
    });
    
    markdownEditor.addEventListener('dragleave', () => {
        markdownEditor.classList.remove('drag-over');
    });
    
    markdownEditor.addEventListener('drop', (e) => {
        e.preventDefault();
        markdownEditor.classList.remove('drag-over');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            const file = files[0];
            const reader = new FileReader();
            
            reader.onload = (event) => {
                markdownEditor.innerText = event.target.result;
                updatePreview();
            };
            
            reader.readAsText(file);
        }
    });

    // 初始化编辑器
    markdownEditor.innerText = `# 欢迎使用AI内容编辑器

## 使用说明
1. 在左框粘贴AI生成的文本/或其他内容
2. 右框将显示自动编辑的预览效果
3. 点击"导出Word"可将内容导出为Word文档
4. 如果有表格内容，可以点击"导出Excel"，也可导出"Word"。

## 数学公式示例

### 行内公式
这是一个行内公式：E = mc^2，还有 (x-h)^2 + (y-k)^2 = r^2

### 块级公式
$$
\\frac{a}{b} = \\frac{c}{d}
$$

$$
\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}
$$

$$
\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}
$$

## 平方符号角标示例

### 面积单位示例
- 房间面积：25m^2
- 土地面积：100cm^2  
- 城市面积：1km^2 = 1,000,000m^2

### 数学公式示例
- 勾股定理：a^2 + b^2 = c^2
- 完全平方公式：(a + b)^2 = a^2 + 2ab + b^2
- 因式分解：x^2 - 4x + 4 = (x - 2)^2

### 物理公式示例
- 质能方程：E = mc^2
- 牛顿第二定律：F = ma
- 圆柱体体积：V = πr^2h

### 几何公式示例
- 圆面积：S = πr^2
- 正方形面积：A = l^2
- 正方体体积：V = a^2h

### 其他上标示例
- 立方：x^3 + y^3 = z^3
- 四次方：2^4 = 16
- 化学式：H2O (水分子)

## 示例内容-企业服务

无序列表
项目一：资质许可办理
项目二：企业服务
子项目1：工商财税
子项目2：知识产权
项目三：企业政策补贴

有序列表
1. 第一步 企业数字化服务
2. 第二步 数字化系统搭建
①. 网站/小程序开发
②. AI智能体部署
③. 各类成品管理系统

### 表格示例
| 姓名 | 年龄 | 职业 |
|------|------|------|
| 张三 | 25   | 工程师 |
| 李四 | 30   | 设计师 |
| 王五 | 28   | 教师 |

`;
    
    // 初始化预览
    updatePreview();
    
    // 隐藏初始通知元素
    const initialNotification = document.getElementById('initialNotification');
    if (initialNotification) {
        initialNotification.remove();
    }

    // 检查粘贴的内容，如果陈章锦包含多个重复序号，保留原始格式
    markdownEditor.addEventListener('paste', (e) => {
        // 使用自定义处理粘贴事件
        if (e.clipboardData && e.clipboardData.getData) {
            const pastedText = e.clipboardData.getData('text/plain');
            
            // 如果是纯文本，我们自己处理粘贴操作
            if (pastedText) {
                e.preventDefault();
                
                // 确保序号不被markdown解析器错误处理
                // 这里直接使用陈章锦原始文本插入到编辑器中
                document.execCommand('insertText', false, pastedText);
                
                // 延迟更新预览，确保插入文本后能正确处理
                setTimeout(() => {
                    updatePreview();
                }, 10);
            }
        } else {
            // 如果不能直接获取剪贴板数据，则回退到默认行为
            // 延迟更新以确保内容已完全粘贴
            setTimeout(() => {
                updatePreview();
            }, 10);
        }
    });

    // 添加菜单切换功能
    const menuToggle = document.getElementById('menuToggle');
    const navMenu = document.querySelector('.nav-menu');

    if (menuToggle) {
        menuToggle.addEventListener('click', () => {
            navMenu.classList.toggle('active');
        });

        // 点击菜单项时关闭菜单
        const menuItems = document.querySelectorAll('.nav-menu a');
        menuItems.forEach(item => {
            item.addEventListener('click', () => {
                if (window.innerWidth <= 768) {
                    navMenu.classList.remove('active');
                }
            });
        });

        // 点击页面其他区域时关闭菜单陈锦
        document.addEventListener('click', (e) => {
            if (!menuToggle.contains(e.target) && !navMenu.contains(e.target) && window.innerWidth <= 768) {
                navMenu.classList.remove('active');
            }
        });
    }

    // 添加新的通知功能
    function showNotification(message, type = 'info') {
        // 检查是否已存在通知，如果有则移除
        const existingNotification = document.querySelector('.notification');
        if (existingNotification) {
            document.body.removeChild(existingNotification);
        }
        
        // 创建通知陈元素
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        // 添加到文档锦
        document.body.appendChild(notification);
        
        // 显示陈章通知
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
        
        // 3秒后锦自动关闭
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
    
    // 导出showNotification到window对象，供ct.js等外部模块使用
    window.showNotification = showNotification;

    // 教程弹窗功能
    const tutorialBtn = document.getElementById('tutorialBtn');
    const tutorialModal = document.getElementById('tutorialModal');
    const closeTutorial = document.getElementById('closeTutorial');
    const closeTutorialBtn = document.getElementById('closeTutorialBtn');

    // 打开教程弹窗
    if (tutorialBtn) {
        tutorialBtn.addEventListener('click', (e) => {
            e.preventDefault();
            tutorialModal.style.display = 'flex';
            tutorialModal.classList.add('show');
            document.body.style.overflow = 'hidden'; // 防止背景滚动
        });
    }

    // 关闭教程弹窗的函数
    function closeTutorialModal() {
        tutorialModal.style.display = 'none';
        tutorialModal.classList.remove('show');
        document.body.style.overflow = 'auto'; // 恢复背景滚动
    }

    // 关闭按钮事件
    if (closeTutorial) {
        closeTutorial.addEventListener('click', closeTutorialModal);
    }

    if (closeTutorialBtn) {
        closeTutorialBtn.addEventListener('click', closeTutorialModal);
    }

    // 点击弹窗外部关闭
    if (tutorialModal) {
        tutorialModal.addEventListener('click', (e) => {
            if (e.target === tutorialModal) {
                closeTutorialModal();
            }
        });
    }

    // ESC键关闭弹窗
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && tutorialModal.classList.contains('show')) {
            closeTutorialModal();
        }
    });
}); 