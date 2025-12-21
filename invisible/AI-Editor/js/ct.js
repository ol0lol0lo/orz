/**
 * 图片导出处理模块 - ct.js
 * 提供长图导出功能
 */

// 获取预览编辑器元素
function getPreviewEditor() {
    const previewEditor = document.getElementById('previewEditor');
    if (!previewEditor) {
        console.error('预览编辑器元素未找到');
        return null;
    }
    return previewEditor;
}

// 获取格式化的导出内容 - 确保与预览区格式完全一致，包括所有滚动区域的内容
function getFormattedExportContent() {
    const previewEditor = getPreviewEditor();
    if (!previewEditor) {
        return '';
    }
    
    // 保存原始滚动位置
    const originalScrollTop = previewEditor.scrollTop;
    
    // 先滚动到顶部，确保所有内容都已加载到DOM
    previewEditor.scrollTop = 0;
    
    // 再滚动到底部，确保所有内容都被浏览器渲染
    previewEditor.scrollTop = previewEditor.scrollHeight;
    
    // 最后滚动回顶部，准备克隆
    previewEditor.scrollTop = 0;
    
    // 创建一个临时容器来克隆预览区内容
    const tempDiv = document.createElement('div');
    tempDiv.style.cssText = 'position: absolute; top: -9999px; left: -9999px; visibility: hidden; width: 100%; height: auto; min-height: auto; max-height: none; overflow: visible;';
    document.body.appendChild(tempDiv);
    
    // 深度克隆预览区内容（包括所有子元素、属性和文本节点）
    const previewClone = previewEditor.cloneNode(true);
    
    // 移除克隆元素的高度限制和滚动限制，确保所有内容可见
    previewClone.style.cssText = `
        position: static !important;
        height: auto !important;
        min-height: auto !important;
        max-height: none !important;
        overflow: visible !important;
        overflow-y: visible !important;
        overflow-x: visible !important;
    `;
    
    // 确保克隆的元素继承正确的样式上下文
    tempDiv.appendChild(previewClone);
    
    // 强制浏览器重新计算布局
    void tempDiv.offsetHeight;
    
    // 获取HTML内容
    let htmlContent = tempDiv.innerHTML;
    
    // 恢复原始滚动位置
    previewEditor.scrollTop = originalScrollTop;
    
    // 清理临时容器
    document.body.removeChild(tempDiv);
    
    return htmlContent;
}

// MutationObserver：实时监控math-block，立即删除重复的mjx容器
let mathBlockObserver = null;

function startMathBlockMonitoring(container) {
    if (!container) return;
    
    // 如果已有观察者，先断开
    if (mathBlockObserver) {
        mathBlockObserver.disconnect();
    }
    
    
    // 创建观察者，监控DOM变化
    mathBlockObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                mutation.addedNodes.forEach((addedNode) => {
                    if (addedNode.nodeType === Node.ELEMENT_NODE) {
                        // 检查是否是mjx容器被添加
                        if (addedNode.classList && 
                            (addedNode.classList.contains('mjx-container') || 
                             addedNode.classList.contains('mjx-chtml') || 
                             addedNode.classList.contains('mjx-math'))) {
                            
                            // 找到其父math-block
                            const mathBlock = addedNode.closest('.math-block, .math-display, .math-inline');
                            if (mathBlock) {
                                // 立即清理这个math-block
                                cleanupSingleMathBlock(mathBlock);
                            }
                        }
                        
                        // 检查是否是math-block，如果是则立即清理
                        if (addedNode.classList && 
                            (addedNode.classList.contains('math-block') || 
                             addedNode.classList.contains('math-display') || 
                             addedNode.classList.contains('math-inline'))) {
                            cleanupSingleMathBlock(addedNode);
                        }
                    }
                });
            }
        });
    });
    
    // 开始观察
    mathBlockObserver.observe(container, {
        childList: true,
        subtree: true
    });
    
    // 立即执行一次清理
    cleanupMathJaxDuplicates(container);
}

function stopMathBlockMonitoring() {
    if (mathBlockObserver) {
        mathBlockObserver.disconnect();
        mathBlockObserver = null;
    }
}

// 清理单个math-block的函数
function cleanupSingleMathBlock(mathBlock) {
    if (!mathBlock) return;
    
    const directChildren = Array.from(mathBlock.childNodes).filter(
        node => node.nodeType === Node.ELEMENT_NODE
    );
    
    const topLevelMjxContainers = directChildren.filter(child => {
        if (child.classList && child.classList.contains('mjx-container')) {
            return true;
        }
        if (child.classList && 
            (child.classList.contains('mjx-chtml') || child.classList.contains('mjx-math'))) {
            if (!child.closest('.mjx-container')) {
                return true;
            }
        }
        return false;
    });
    
    if (topLevelMjxContainers.length > 1) {
        console.warn(`⚠⚠⚠ [实时监控] 发现${topLevelMjxContainers.length}个顶级mjx容器！立即删除多余的...`);
        
        // 选择最佳容器
        let bestContainer = topLevelMjxContainers[0];
        let bestScore = -1;
        
        topLevelMjxContainers.forEach(container => {
            let score = 0;
            if (container.classList.contains('mjx-container')) score += 10;
            if (container.querySelector('svg')) score += 5;
            if (container.querySelector('.mjx-chtml, .mjx-math')) score += 3;
            if (container.innerHTML && container.innerHTML.trim().length > 50) score += 2;
            
            if (score > bestScore) {
                bestScore = score;
                bestContainer = container;
            }
        });
        
        // 立即删除其他所有容器
        topLevelMjxContainers.forEach(container => {
            if (container !== bestContainer) {
                container.remove();
            }
        });
        
        // 完全重构：清空并只保留最佳容器
        const mjxClone = bestContainer.cloneNode(true);
        mathBlock.innerHTML = '';
        mathBlock.appendChild(mjxClone);
    }
    
    // 删除所有script标签
    const scripts = mathBlock.querySelectorAll('script[type*="math/tex"], script[type*="math/asciimath"]');
    scripts.forEach(script => script.remove());
}

// 专业的MathJax重影清理函数
// 移除所有MathJax原始输入元素，只保留渲染后的结果
function cleanupMathJaxDuplicates(container) {
    if (!container) return;
    
    // MathJax 3.x 会将原始LaTeX文本保留在DOM中，与渲染结果同时存在
    // 我们需要彻底清除所有原始输入，只保留渲染结果
    
    // 增强策略：先处理所有math-block容器，然后处理其他情况
    
    // 步骤0：直接处理所有math-block容器 - 最彻底的清理策略
    // 使用专用的清理函数
    const mathBlocks = container.querySelectorAll('.math-block, .math-display, .math-inline');
    
    mathBlocks.forEach((mathBlock, index) => {
        cleanupSingleMathBlock(mathBlock);
    });
    
    // 步骤1：收集其他需要清理的文本节点（不在math-block内的）
    const textNodesToClean = [];
    const textWalker = document.createTreeWalker(
        container,
        NodeFilter.SHOW_TEXT,
        null,
        false
    );
    
    let textNode;
    while (textNode = textWalker.nextNode()) {
        const text = textNode.textContent || '';
        
        // 匹配LaTeX公式模式：$...$, $$...$$, \(...\), \[...\]
        const latexPatterns = [
            /\$\$?[^$]+\$\$?/g,           // $...$ 或 $$...$$
            /\\(\(|\[)[\s\S]*?\\(\)|\])/g, // \(...\) 或 \[...\]
            /\$\$[\s\S]*?\$\$/g            // $$...$$
        ];
        
        let hasLatexPattern = false;
        for (const pattern of latexPatterns) {
            if (pattern.test(text)) {
                hasLatexPattern = true;
                break;
            }
        }
        
        if (hasLatexPattern) {
            // 检查父元素或兄弟节点是否有MathJax渲染结果
            const parent = textNode.parentElement;
            if (parent) {
                // **关键修复：先检查文本节点是否在math-block容器内**
                const inMathBlock = parent.closest('.math-block, .math-display, .math-inline');
                
                if (inMathBlock) {
                    // 如果在math-block容器内，必须非常小心
                    // **关键修复：只有当容器内确实有渲染结果，且文本节点不在mjx元素内部时才清理**
                    const hasRenderedInMathBlock = inMathBlock.querySelector('.mjx-chtml, .mjx-math, .mjx-container') !== null;
                    
                    if (hasRenderedInMathBlock) {
                        // 确认这是LaTeX公式文本（只处理$$...$$格式的块状公式）
                        const trimmed = text.trim();
                        const isBlockLaTeXFormula = 
                            /^\$\$[\s\S]*\$\$$/.test(trimmed) ||
                            /^\\\[[\s\S]*\\\]$/.test(trimmed);
                        
                        // **关键：确保文本节点不在mjx元素内部（防止误删渲染结果）**
                        // 检查文本节点是否在任何mjx元素内部（包含关系检查）
                        let isInMjx = false;
                        let isInMjxContainer = false;
                        
                        // 检查文本节点是否在mjx元素内部
                        const mjxElements = inMathBlock.querySelectorAll('.mjx-chtml, .mjx-math, .mjx-container');
                        for (const mjxEl of mjxElements) {
                            if (mjxEl.contains(textNode)) {
                                isInMjx = true;
                                break;
                            }
                            // 检查文本节点的父元素是否在mjx容器内
                            let parent = textNode.parentElement;
                            while (parent && parent !== inMathBlock) {
                                if (mjxEl.contains(parent)) {
                                    isInMjxContainer = true;
                                    break;
                                }
                                parent = parent.parentElement;
                            }
                            if (isInMjxContainer) break;
                        }
                        
                        // 检查文本节点的父元素是否本身就是mjx元素
                        const parentIsMjx = textNode.parentElement && 
                            (textNode.parentElement.classList?.contains('mjx-chtml') || 
                             textNode.parentElement.classList?.contains('mjx-math') ||
                             textNode.parentElement.classList?.contains('mjx-container'));
                        
                        // 检查文本节点是否通过closest找到mjx元素
                        const closestMjx = textNode.parentElement?.closest('.mjx-chtml, .mjx-math, .mjx-container');
                        
                        // 只清理符合以下条件的文本节点：
                        // 1. 是块状LaTeX公式文本
                        // 2. 绝对不在mjx元素内部（多层检查确保安全）
                        // 3. math-block内有渲染结果
                        if (isBlockLaTeXFormula && 
                            !isInMjx && 
                            !isInMjxContainer && 
                            !parentIsMjx && 
                            !closestMjx &&
                            mjxElements.length > 0) {
                            // 最后的安全检查：确保这个文本节点确实是原始LaTeX文本，不是渲染结果的一部分
                            // 如果文本节点是math-block的直接子节点或通过非mjx元素间接子节点
                            let currentParent = textNode.parentElement;
                            let pathToMathBlock = [];
                            while (currentParent && currentParent !== inMathBlock && currentParent !== document.body) {
                                pathToMathBlock.push(currentParent);
                                // 如果路径中遇到mjx元素，说明文本节点在mjx内部，不清理
                                if (currentParent.classList?.contains('mjx-chtml') || 
                                    currentParent.classList?.contains('mjx-math') ||
                                    currentParent.classList?.contains('mjx-container')) {
                                    isInMjx = true;
                                    break;
                                }
                                currentParent = currentParent.parentElement;
                            }
                            
                            if (!isInMjx) {
                                textNodesToClean.push(textNode);
                            }
                        }
                    }
                    // 如果没有渲染结果，不清理，保留原始文本供MathJax使用
                } else {
                    // 不在math-block容器内，使用原有逻辑
                    // 检查父元素内是否有渲染结果
                    const hasRendered = parent.querySelector('.mjx-chtml, .mjx-math') !== null;
                    
                    // 检查前后兄弟节点是否有渲染结果
                    let prevSibling = textNode.previousSibling;
                    let nextSibling = textNode.nextSibling;
                    while (prevSibling && prevSibling.nodeType !== Node.ELEMENT_NODE) {
                        prevSibling = prevSibling.previousSibling;
                    }
                    while (nextSibling && nextSibling.nodeType !== Node.ELEMENT_NODE) {
                        nextSibling = nextSibling.nextSibling;
                    }
                    
                    const hasAdjacentRendered = 
                        (prevSibling && (prevSibling.classList?.contains('mjx-chtml') || prevSibling.classList?.contains('mjx-math'))) ||
                        (nextSibling && (nextSibling.classList?.contains('mjx-chtml') || nextSibling.classList?.contains('mjx-math')));
                    
                    if (hasRendered || hasAdjacentRendered) {
                        // 确认这是LaTeX公式文本而不是普通文本
                        const trimmed = text.trim();
                        const isLaTeXFormula = 
                            (trimmed.match(/^\$\$?[^$]+\$\$?$/) !== null) ||
                            (trimmed.match(/^\\\([\s\S]*\\\)$/) !== null) ||
                            (trimmed.match(/^\\\[[\s\S]*\\\]$/) !== null) ||
                            (trimmed.match(/^\$\$[\s\S]*\$\$$/) !== null) ||
                            (trimmed.includes('$') && trimmed.includes('\\'));
                        
                        // 确保文本节点不在mjx元素内部（防止误删）
                        const insideMjx = textNode.parentElement && 
                            (textNode.parentElement.closest('.mjx-chtml, .mjx-math, .mjx-container') !== null);
                        
                        if (isLaTeXFormula && !insideMjx) {
                            textNodesToClean.push(textNode);
                        }
                    }
                }
            }
        }
    }
    
    // 步骤2：清理文本节点（移除内容或整个节点）
    textNodesToClean.forEach(textNode => {
        try {
            // 完全移除文本内容
            textNode.textContent = '';
        } catch (e) {
            console.warn('清理文本节点失败:', e);
        }
    });
    
    // 步骤3：移除所有MathJax script标签（如果有）
    const mathJaxScripts = container.querySelectorAll('script[type*="math/tex"]');
    mathJaxScripts.forEach(script => {
        const parent = script.parentElement;
        if (parent && parent.querySelector('.mjx-chtml, .mjx-math')) {
            script.remove();
        }
    });
    
    // 步骤4：移除隐藏的MathJax预览元素
    const previewElements = container.querySelectorAll('.MathJax_Preview');
    previewElements.forEach(el => {
        const parent = el.parentElement;
        if (parent && parent.querySelector('.mjx-chtml, .mjx-math')) {
            el.remove();
        }
    });
    
    // 步骤4b：移除隐藏的MathJax相关元素（但更精确地定位）
    const allMathRelated = container.querySelectorAll('[class*="MathJax"], [class*="mjx-"]');
    allMathRelated.forEach(el => {
        // 跳过渲染元素
        if (el.classList?.contains('mjx-chtml') || el.classList?.contains('mjx-math')) {
            return;
        }
        
        const style = window.getComputedStyle(el);
        if ((style.display === 'none' || style.visibility === 'hidden') || 
            el.classList?.contains('MathJax_Preview')) {
            const parent = el.parentElement;
            if (parent && parent.querySelector('.mjx-chtml, .mjx-math')) {
                el.remove();
            }
        }
    });
    
    // 步骤5：清理mjx-container中的非渲染元素
    const mjxContainers = container.querySelectorAll('.mjx-container');
    mjxContainers.forEach(mjxContainer => {
        const children = Array.from(mjxContainer.children);
        const hasRendered = children.some(el => 
            el.classList?.contains('mjx-chtml') || 
            el.classList?.contains('mjx-math')
        );
        
        if (hasRendered) {
            children.forEach(child => {
                if (!child.classList?.contains('mjx-chtml') && 
                    !child.classList?.contains('mjx-math')) {
                    const style = window.getComputedStyle(child);
                    if (style.display === 'none' || 
                        style.visibility === 'hidden' || 
                        style.opacity === '0') {
                        child.remove();
                    }
                }
            });
        }
    });
    
    // 步骤6：清理包含LaTeX模式的元素（但保护容器和渲染结果）
    // 注意：不能清空容器元素（如.math-block），只能清理其中的原始文本
    const allElements = container.querySelectorAll('*');
    allElements.forEach(el => {
        // 跳过所有mjx渲染元素及其父容器
        if (el.classList?.contains('mjx-chtml') || 
            el.classList?.contains('mjx-math') ||
            el.classList?.contains('mjx-container') ||
            el.closest('.mjx-container')) {
            return;
        }
        
        // 跳过数学公式容器（如.math-block），它们需要保留结构
        if (el.classList?.contains('math-block') || 
            el.classList?.contains('math-display') ||
            el.classList?.contains('math-inline')) {
            // 只清理容器内的原始文本节点，不清理容器本身
            // 已经在步骤1-2中处理了文本节点，这里跳过
            return;
        }
        
        // 检查元素是否只包含原始LaTeX文本（没有子元素或只有隐藏元素）
        const text = el.textContent || '';
        const hasLatexPattern = /\$\$?[^$]+\$\$?/.test(text) || /\\(\(|\[)/.test(text);
        
        if (hasLatexPattern) {
            // 检查元素内部是否有渲染结果
            const hasRenderedInside = el.querySelector('.mjx-chtml, .mjx-math') !== null;
            
            // **关键修复：如果容器内有渲染结果，绝对不清空！**
            if (hasRenderedInside) {
                // 有渲染结果，只清理原始文本节点，不清空容器
                return;
            }
            
            // 检查父元素中是否有渲染结果（但不在当前元素内）
            const parent = el.parentElement;
            const hasRenderedInParent = parent && 
                parent.querySelectorAll('.mjx-chtml, .mjx-math').length > 0 &&
                !hasRenderedInside;
            
            // 只有当元素内部没有渲染结果，且父元素有渲染结果时，才清理
            // 但要确保不是公式容器本身
            if (!hasRenderedInside && hasRenderedInParent) {
                // 再次检查：确保不是公式容器
                const isMathContainer = el.classList?.contains('math-block') || 
                                      el.classList?.contains('math-display') ||
                                      el.classList?.contains('math-inline');
                
                if (isMathContainer) {
                    // 是公式容器，跳过，不清空
                    return;
                }
                
                const style = window.getComputedStyle(el);
                // 如果是隐藏元素，移除它
                if (style.display === 'none' || style.visibility === 'hidden') {
                    el.remove();
                } else {
                    // 检查元素是否只包含LaTeX文本（没有可见的子元素）
                    const visibleChildren = Array.from(el.children).filter(child => {
                        const childStyle = window.getComputedStyle(child);
                        return childStyle.display !== 'none' && 
                               childStyle.visibility !== 'hidden' && 
                               !child.classList?.contains('mjx-chtml') &&
                               !child.classList?.contains('mjx-math');
                    });
                    
                    // 如果没有可见的子元素，且文本只包含LaTeX模式，才清空
                    if (visibleChildren.length === 0) {
                        const trimmed = text.trim();
                        if ((trimmed.match(/^\$\$?[^$]+\$\$?$/) !== null) ||
                            trimmed.match(/^\\\([\s\S]*\\\)$/) !== null ||
                            trimmed.match(/^\\\[[\s\S]*\\\]$/) !== null) {
                            el.textContent = '';
                        }
                    }
                }
            }
        }
    });
    
    // 步骤7：最后的保险策略 - 使用CSS隐藏所有可能包含原始LaTeX文本的元素
    // 这个方法作为最后的手段，确保任何遗漏的原始文本都被隐藏
    const styleElement = document.createElement('style');
    styleElement.id = 'mathjax-cleanup-hide';
    styleElement.textContent = `
        .long-image-container script[type*="math/tex"] {
            display: none !important;
            visibility: hidden !important;
            opacity: 0 !important;
            position: absolute !important;
            left: -9999px !important;
        }
        .long-image-container .MathJax_Preview {
            display: none !important;
        }
        .long-image-container [class*="MathJax"]:not(.mjx-chtml):not(.mjx-math):not(.mjx-container) {
            display: none !important;
        }
        /* 确保数学公式容器和渲染结果可见 */
        .long-image-container .math-block,
        .long-image-container .math-display,
        .long-image-container .math-inline {
            display: block !important;
            visibility: visible !important;
        }
        .long-image-container .mjx-container,
        .long-image-container .mjx-chtml,
        .long-image-container .mjx-math {
            display: inline-block !important;
            visibility: visible !important;
            opacity: 1 !important;
        }
        .long-image-container .mjx-chtml.MJXc-display {
            display: block !important;
            width: 100% !important;
            text-align: center !important;
            margin: 15px 0 !important;
            padding: 0 !important;
            position: static !important;
            float: none !important;
            clear: none !important;
            line-height: normal !important;
            vertical-align: baseline !important;
        }
        
        /* 确保块级公式的容器也有正确间距 - 与预览样式一致 */
        .long-image-container .mjx-container.MJXc-display {
            display: block !important;
            width: 100% !important;
            text-align: center !important;
            margin: 15px 0 !important;
            padding: 0 !important;
            position: static !important;
            float: none !important;
            clear: none !important;
            line-height: normal !important;
            vertical-align: baseline !important;
        }
    `;
    
    // 只在容器还没有这个样式时添加
    if (!container.querySelector('#mathjax-cleanup-hide') && 
        !container.ownerDocument.querySelector('#mathjax-cleanup-hide')) {
        const doc = container.ownerDocument || document;
        const head = doc.head || doc.querySelector('head');
        if (head) {
            head.appendChild(styleElement);
        } else {
            // 如果没有head，就添加到容器中
            container.appendChild(styleElement);
        }
    }
}

// 显示通知（如果存在showNotification函数则使用，否则使用console）
function showNotification(message, type = 'info') {
    if (typeof window.showNotification === 'function') {
        window.showNotification(message, type);
    } else if (typeof showNotification === 'function') {
        showNotification(message, type);
    } else {
        // 静默处理，不输出到控制台
    }
}

// 下载图片
function downloadImage(canvas, fileName) {
    canvas.toBlob(blob => {
        if (typeof saveAs !== 'undefined') {
            saveAs(blob, fileName);
        } else {
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = fileName;
            link.click();
            URL.revokeObjectURL(url);
        }
    }, 'image/png', 0.95);
}

// 长图导出函数 - 极简版本：直接按预览结果导出，不处理任何特殊逻辑
async function exportLongImage() {
    // 检查html2canvas库是否加载
    if (typeof html2canvas === 'undefined') {
        showNotification('html2canvas库未加载，无法导出图片。请刷新页面重试。', 'error');
        return;
    }
    
    const previewEditor = getPreviewEditor();
    if (!previewEditor) {
        showNotification('预览编辑器未找到', 'error');
        return;
    }
    
    // 检查内容是否为空
    if (!previewEditor.innerHTML.trim()) {
        showNotification('预览内容为空，请先编辑内容', 'error');
        return;
    }
    
    // 显示加载提示
    showNotification('正在生成长图，请稍候...', 'info');
    
    try {
        // 等待一小段时间，确保预览内容完全渲染
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // 创建一个隐藏的导出容器，固定宽度1080px
        const exportContainer = document.createElement('div');
        exportContainer.id = 'exportContainer';
        exportContainer.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 1080px;
            background: #ffffff;
            padding: 40px;
            box-sizing: border-box;
            visibility: hidden;
            overflow: visible;
            z-index: -9999;
        `;
        
        // 深度克隆预览区域的所有内容（包括样式和已渲染的元素）
        const previewClone = previewEditor.cloneNode(true);
        
        // **关键：移除ID避免冲突，使用类名确保CSS样式能正确应用**
        previewClone.removeAttribute('id');
        previewClone.className = previewEditor.className || 'editor';
        previewClone.classList.add('export-preview-clone');
        
        // 获取原始元素的计算样式，确保克隆元素继承所有样式
        const computedStyle = window.getComputedStyle(previewEditor);
        
        // 移除克隆元素的所有高度和滚动限制，让它完全展开
        // 同时确保背景色和文字颜色正确，直接复制计算好的样式
        previewClone.style.cssText = `
            width: 1000px !important;
            max-width: 1000px !important;
            height: auto !important;
            min-height: auto !important;
            max-height: none !important;
            overflow: visible !important;
            overflow-y: visible !important;
            overflow-x: visible !important;
            margin: 0 !important;
            padding: 20px !important;
            background: ${computedStyle.backgroundColor || '#ffffff'} !important;
            color: ${computedStyle.color || '#2d4a2d'} !important;
            font-family: ${computedStyle.fontFamily || '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Helvetica, Arial, sans-serif'} !important;
            font-size: ${computedStyle.fontSize || '14px'} !important;
            line-height: ${computedStyle.lineHeight || '1.6'} !important;
            position: static !important;
            visibility: visible !important;
            opacity: 1 !important;
            display: block !important;
        `;
        
        // 创建一个style标签，为导出容器添加#previewEditor的所有样式规则
        const exportStyles = document.createElement('style');
        exportStyles.id = 'export-dynamic-styles';
        exportStyles.textContent = `
            .export-preview-clone {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Helvetica Neue', Helvetica, Arial, sans-serif;
                font-size: 14px;
                line-height: 1.6;
                color: #2d4a2d;
            }
            .export-preview-clone h1, .export-preview-clone h2, .export-preview-clone h3,
            .export-preview-clone h4, .export-preview-clone h5, .export-preview-clone h6 {
                color: #2d4a2d;
            }
            .export-preview-clone p, .export-preview-clone li {
                color: #2d4a2d;
            }
            /* 列表样式 - 与预览区域保持一致，不显示项目符号 */
            .export-preview-clone ul {
                margin: 1em 0 !important;
                padding-left: 0 !important;
                list-style-type: none !important;
            }
            .export-preview-clone ul li {
                margin: 0.5em 0 !important;
                line-height: 1.6 !important;
                list-style-type: none !important;
            }
            .export-preview-clone ol {
                margin: 1em 0 !important;
                padding-left: 2em !important;
                list-style-type: decimal !important;
            }
            .export-preview-clone ol li {
                margin: 0.5em 0 !important;
                line-height: 1.6 !important;
            }
            .export-preview-clone table {
                border-collapse: collapse;
                width: 100%;
                margin: 1em 0;
                background-color: #ffffff;
            }
            .export-preview-clone th, .export-preview-clone td {
                border: 1px solid #e0e0e0;
                padding: 12px 16px;
            }
            .export-preview-clone th {
                background-color: #f8fdf8;
                color: #2d4a2d;
            }
            .export-preview-clone code {
                background-color: rgba(74, 124, 89, 0.1);
                color: #2d4a2d;
            }
            .export-preview-clone pre {
                background: linear-gradient(135deg, #f0f8f0 0%, #e8f5e8 100%);
                color: #2d4a2d;
            }
        `;
        exportContainer.appendChild(exportStyles);
        
        // 将克隆的内容添加到导出容器
        exportContainer.appendChild(previewClone);
        
        // 添加到DOM（必须在DOM中才能正确计算尺寸和渲染）
        document.body.appendChild(exportContainer);
        
        // **关键：直接对克隆元素中的所有列表应用样式，确保与预览区域完全一致**
        const clonedUlElements = previewClone.querySelectorAll('ul');
        clonedUlElements.forEach(ul => {
            ul.style.margin = '1em 0';
            ul.style.paddingLeft = '0';
            ul.style.listStyleType = 'none';
            
            // 同时处理所有列表项
            const clonedLiElements = ul.querySelectorAll('li');
            clonedLiElements.forEach(li => {
                li.style.margin = '0.5em 0';
                li.style.lineHeight = '1.6';
                li.style.listStyleType = 'none';
            });
        });
        
        // 处理有序列表
        const clonedOlElements = previewClone.querySelectorAll('ol');
        clonedOlElements.forEach(ol => {
            ol.style.margin = '1em 0';
            ol.style.paddingLeft = '2em';
            ol.style.listStyleType = 'decimal';
            
            const clonedOlLiElements = ol.querySelectorAll('li');
            clonedOlLiElements.forEach(li => {
                li.style.margin = '0.5em 0';
                li.style.lineHeight = '1.6';
            });
        });
        
        // 等待浏览器完成布局计算
        await new Promise(resolve => {
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    // 强制重新计算布局
                    void exportContainer.offsetHeight;
                    void previewClone.offsetHeight;
                    setTimeout(resolve, 200);
                });
            });
        });
        
        // 获取实际内容高度
        const contentHeight = Math.max(
            exportContainer.scrollHeight,
            exportContainer.offsetHeight,
            previewClone.scrollHeight,
            previewClone.offsetHeight,
            500 // 最小高度
        );
        
        // 如果内容高度异常小，可能是渲染问题，使用预览区域的实际高度
        if (contentHeight < 100 && previewEditor.scrollHeight > 100) {
            const estimatedHeight = Math.ceil(previewEditor.scrollHeight * (1080 / previewEditor.offsetWidth));
            const finalHeight = Math.max(estimatedHeight, 1000);
            
            // 使用html2canvas直接截图
            const canvas = await html2canvas(exportContainer, {
                scale: 2,
                backgroundColor: '#ffffff',
                useCORS: true,
                logging: false,
                width: 1080,
                height: finalHeight,
                windowWidth: 1080,
                windowHeight: finalHeight,
                scrollX: 0,
                scrollY: 0,
                allowTaint: false,
                foreignObjectRendering: true
            });
            
            return processCanvas(canvas, exportContainer);
        }
        
        // 使用html2canvas直接截图，不做任何特殊处理
        const canvas = await html2canvas(exportContainer, {
            scale: 2, // 提高清晰度
            backgroundColor: '#ffffff',
            useCORS: true,
            logging: false,
            width: 1080,
            height: contentHeight,
            windowWidth: 1080,
            windowHeight: contentHeight,
            scrollX: 0,
            scrollY: 0,
            allowTaint: false,
            foreignObjectRendering: true, // 对SVG和MathJax更好
            onclone: (clonedDoc, element) => {
                // 确保克隆的元素可见
                const clonedPreview = clonedDoc.querySelector('.export-preview-clone');
                if (clonedPreview) {
                    clonedPreview.style.visibility = 'visible';
                    clonedPreview.style.opacity = '1';
                    clonedPreview.style.color = '#2d4a2d';
                    clonedPreview.style.background = '#ffffff';
                    clonedPreview.style.display = 'block';
                }
            }
        });
        
        // 处理canvas并下载
        await processCanvas(canvas, exportContainer);
        
    } catch (error) {
        console.error('❌ 导出失败:', error);
        console.error('❌ 错误堆栈:', error.stack);
        showNotification('导出失败：' + (error.message || '未知错误'), 'error');
        
        // 清理可能的临时容器
        const tempContainer = document.getElementById('exportContainer');
        if (tempContainer && tempContainer.parentNode) {
            tempContainer.parentNode.removeChild(tempContainer);
        }
    }
}

// 处理canvas并下载的辅助函数
async function processCanvas(canvas, exportContainer) {
    // 确保canvas宽度为1080px（按比例调整高度）
    const targetWidth = 1080;
    let finalCanvas = canvas;
    
    if (Math.abs(canvas.width - targetWidth) > 1) {
        const newCanvas = document.createElement('canvas');
        const ratio = targetWidth / canvas.width;
        newCanvas.width = targetWidth;
        newCanvas.height = Math.round(canvas.height * ratio);
        
        const ctx = newCanvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, newCanvas.width, newCanvas.height);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(canvas, 0, 0, newCanvas.width, newCanvas.height);
        finalCanvas = newCanvas;
    }
    
    // 生成PNG并下载
    finalCanvas.toBlob((blob) => {
        if (!blob) {
            console.error('❌ Blob创建失败');
            showNotification('导出失败：无法生成图片', 'error');
            return;
        }
        
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = '导出内容.png';
        link.href = url;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        // 清理临时容器
        if (exportContainer && exportContainer.parentNode) {
            exportContainer.parentNode.removeChild(exportContainer);
        }
        
        showNotification('✅ 图片导出成功！', 'success');
    }, 'image/png', 0.95);
}

// 将mjx元素转换为图片的函数（支持SVG和CHTML两种渲染方式）
function convertMjxToImage(mjxElement) {
    return new Promise((resolve) => {
        try {
            // 确保元素在DOM中且可见
            if (!mjxElement || !mjxElement.parentNode || !document.body.contains(mjxElement)) {
                console.warn('mjx元素不在DOM中，无法转换');
                resolve(null);
                return;
            }
            
            // 确保元素可见（临时显示）
            const originalDisplay = mjxElement.style.display;
            const originalVisibility = mjxElement.style.visibility;
            const originalOpacity = mjxElement.style.opacity;
            mjxElement.style.display = '';
            mjxElement.style.visibility = 'visible';
            mjxElement.style.opacity = '1';
            
            // 强制重新布局
            void mjxElement.offsetHeight;
            
            // 等待一小段时间确保渲染完成
            setTimeout(() => {
                try {
                    // 获取mjx元素的边界框（确保是可见状态下的）
                    const rect = mjxElement.getBoundingClientRect();
                    const width = Math.max(1, Math.ceil(rect.width));
                    const height = Math.max(1, Math.ceil(rect.height));
                    
                    if (width === 0 || height === 0) {
                        console.warn('mjx元素尺寸为0，跳过转换', {
                            element: mjxElement,
                            rect: rect,
                            display: window.getComputedStyle(mjxElement).display,
                            visibility: window.getComputedStyle(mjxElement).visibility
                        });
                        // 恢复原始样式
                        mjxElement.style.display = originalDisplay;
                        mjxElement.style.visibility = originalVisibility;
                        mjxElement.style.opacity = originalOpacity;
                        resolve(null);
                        return;
                    }
                    
                    // 查找SVG元素（MathJax可能使用SVG渲染）
                    const svgElement = mjxElement.querySelector('svg');
                    if (svgElement) {
                        // SVG渲染方式
                        const svgClone = svgElement.cloneNode(true);
                        const svgRect = svgElement.getBoundingClientRect();
                        const svgWidth = Math.max(1, Math.ceil(svgRect.width || width));
                        const svgHeight = Math.max(1, Math.ceil(svgRect.height || height));
                        
                        svgClone.setAttribute('width', svgWidth);
                        svgClone.setAttribute('height', svgHeight);
                        svgClone.setAttribute('viewBox', `0 0 ${svgWidth} ${svgHeight}`);
                        svgClone.style.width = svgWidth + 'px';
                        svgClone.style.height = svgHeight + 'px';
                        
                        // 将SVG转换为data URI
                        const svgString = new XMLSerializer().serializeToString(svgClone);
                        const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
                        const url = URL.createObjectURL(svgBlob);
                        
                        const img = new Image();
                        img.onload = function() {
                            URL.revokeObjectURL(url);
                            try {
                                // 创建canvas来渲染SVG为PNG（更兼容）
                                const canvas = document.createElement('canvas');
                                const scale = 2; // 提高分辨率
                                canvas.width = svgWidth * scale;
                                canvas.height = svgHeight * scale;
                                const ctx = canvas.getContext('2d');
                                ctx.scale(scale, scale);
                                ctx.drawImage(img, 0, 0);
                                const dataUrl = canvas.toDataURL('image/png');
                                
                                const resultImg = document.createElement('img');
                                resultImg.src = dataUrl;
                                resultImg.style.width = width + 'px';
                                resultImg.style.height = height + 'px';
                                resultImg.style.display = 'block';
                                resultImg.style.margin = '0 auto';
                                resultImg.style.verticalAlign = 'middle';
                                resultImg.className = 'math-rendered-image';
                                
                                // 恢复原始样式
                                mjxElement.style.display = originalDisplay;
                                mjxElement.style.visibility = originalVisibility;
                                mjxElement.style.opacity = originalOpacity;
                                
                                resolve(resultImg);
                            } catch (err) {
                                console.error('SVG转PNG失败:', err);
                                URL.revokeObjectURL(url);
                                // 恢复原始样式
                                mjxElement.style.display = originalDisplay;
                                mjxElement.style.visibility = originalVisibility;
                                mjxElement.style.opacity = originalOpacity;
                                // 回退到html2canvas
                                convertMjxWithHtml2Canvas(mjxElement, width, height, originalDisplay, originalVisibility, originalOpacity).then(resolve);
                            }
                        };
                        img.onerror = function() {
                            console.warn('SVG图片加载失败，回退到html2canvas');
                            URL.revokeObjectURL(url);
                            // 回退到html2canvas
                            convertMjxWithHtml2Canvas(mjxElement, width, height, originalDisplay, originalVisibility, originalOpacity).then(resolve);
                        };
                        img.src = url;
                    } else {
                        // CHTML渲染方式，使用html2canvas
                        convertMjxWithHtml2Canvas(mjxElement, width, height, originalDisplay, originalVisibility, originalOpacity).then(resolve);
                    }
                } catch (error) {
                    console.error('转换mjx元素时出错:', error);
                    // 恢复原始样式
                    mjxElement.style.display = originalDisplay;
                    mjxElement.style.visibility = originalVisibility;
                    mjxElement.style.opacity = originalOpacity;
                    resolve(null);
                }
            }, 100); // 等待100ms确保渲染完成
        } catch (error) {
            console.error('convertMjxToImage外层错误:', error);
            resolve(null);
        }
    });
}

// 使用html2canvas转换mjx元素（用于CHTML渲染）
function convertMjxWithHtml2Canvas(mjxElement, width, height, originalDisplay, originalVisibility, originalOpacity) {
    return html2canvas(mjxElement, {
        scale: 3, // 高分辨率
        backgroundColor: 'transparent',
        logging: false,
        width: width,
        height: height,
        useCORS: true,
        allowTaint: false,
        windowWidth: width,
        windowHeight: height,
        x: 0,
        y: 0
    }).then(canvas => {
        const dataUrl = canvas.toDataURL('image/png');
        const img = document.createElement('img');
        img.src = dataUrl;
        img.style.width = width + 'px';
        img.style.height = height + 'px';
        img.style.display = 'block';
        img.style.margin = '0 auto';
        img.style.verticalAlign = 'middle';
        img.className = 'math-rendered-image';
        
        // 恢复原始样式
        mjxElement.style.display = originalDisplay;
        mjxElement.style.visibility = originalVisibility;
        mjxElement.style.opacity = originalOpacity;
        
        return img;
    }).catch(err => {
        console.warn('html2canvas转换mjx失败:', err);
        // 恢复原始样式
        mjxElement.style.display = originalDisplay;
        mjxElement.style.visibility = originalVisibility;
        mjxElement.style.opacity = originalOpacity;
        return null;
    });
}

// 导出Canvas - 全新简化版本，直接使用html2canvas捕获MathJax内容
function exportCanvas(tempContainer, finalHeight) {
    // 计算最终高度，确保所有内容都被包含
    const actualFinalHeight = Math.max(
        finalHeight || 0,
        tempContainer.scrollHeight || 0,
        tempContainer.offsetHeight || 0,
        tempContainer.clientHeight || 0
    );
    
    const targetWidth = 1080;
    
    // 设置容器尺寸
    tempContainer.style.height = actualFinalHeight + 'px';
    tempContainer.style.minHeight = actualFinalHeight + 'px';
    tempContainer.style.maxHeight = 'none';
    tempContainer.style.overflow = 'visible';
    
    // 强制重新布局
    void tempContainer.offsetHeight;
    
    // 验证MathJax元素是否已渲染
    const mathBlocks = tempContainer.querySelectorAll('.math-block');
    const mjxElements = tempContainer.querySelectorAll('.mjx-container, .mjx-chtml, .mjx-math');
    
    // **最终验证：检查每个math-block是否只有一个顶级mjx容器，删除多余的**
    mathBlocks.forEach((block, index) => {
        const directChildren = Array.from(block.childNodes).filter(
            node => node.nodeType === Node.ELEMENT_NODE
        );
        const topLevelMjx = directChildren.filter(child => {
            if (child.classList && child.classList.contains('mjx-container')) {
                return true;
            }
            if (child.classList && 
                (child.classList.contains('mjx-chtml') || child.classList.contains('mjx-math'))) {
                if (!child.closest('.mjx-container')) {
                    return true;
                }
            }
            return false;
        });
        
        if (topLevelMjx.length > 1) {
            // 只保留第一个，删除其他所有
            for (let i = 1; i < topLevelMjx.length; i++) {
                topLevelMjx[i].remove();
            }
        }
    });
    
    // 再次统计验证（统计顶级容器数量）
    let totalTopLevelMjx = 0;
    mathBlocks.forEach(block => {
        const directChildren = Array.from(block.childNodes).filter(
            node => node.nodeType === Node.ELEMENT_NODE
        );
        const topLevel = directChildren.filter(child => {
            if (child.classList && child.classList.contains('mjx-container')) return true;
            if (child.classList && 
                (child.classList.contains('mjx-chtml') || child.classList.contains('mjx-math')) &&
                !child.closest('.mjx-container')) return true;
            return false;
        });
        totalTopLevelMjx += topLevel.length;
    });
    
    // 直接使用html2canvas导出，不转换mjx元素
    performExport(tempContainer, actualFinalHeight, targetWidth);
}

// 执行实际的导出操作
function performExport(tempContainer, height, targetWidth) {
        // 如果容器高度为0或内容为空，报错
        if ((height || tempContainer.scrollHeight || tempContainer.offsetHeight) < 100) {
            console.error('容器高度异常或内容为空:', {
                height,
                scrollHeight: tempContainer.scrollHeight,
                offsetHeight: tempContainer.offsetHeight,
                childrenCount: tempContainer.children.length
            });
            showNotification('导出失败：内容为空或容器高度异常', 'error');
            if (document.body.contains(tempContainer)) {
                document.body.removeChild(tempContainer);
            }
            return;
        }
        
        // **简化方案：不再启动监控，直接使用预览中已渲染的内容**
        // 等待清理完成，确保DOM稳定
        void tempContainer.offsetHeight; // 强制重新布局
        
        // **⭐⭐⭐ 最后一次验证：在html2canvas之前，确保每个math-block只有一个顶级mjx容器 ⭐⭐⭐**
        const finalCheckBlocks = tempContainer.querySelectorAll('.math-block');
        let preCleanupRemoved = 0;
        finalCheckBlocks.forEach((block, index) => {
            const directChildren = Array.from(block.childNodes).filter(
                node => node.nodeType === Node.ELEMENT_NODE
            );
            const topLevelMjx = directChildren.filter(child => {
                if (child.classList && child.classList.contains('mjx-container')) {
                    return true;
                }
                if (child.classList && 
                    (child.classList.contains('mjx-chtml') || child.classList.contains('mjx-math'))) {
                    if (!child.closest('.mjx-container')) {
                        return true;
                    }
                }
                return false;
            });
            
            if (topLevelMjx.length > 1) {
                // 选择最佳的容器（优先mjx-container，且内容完整）
                let bestContainer = topLevelMjx[0];
                let bestScore = -1;
                
                topLevelMjx.forEach(container => {
                    let score = 0;
                    if (container.classList.contains('mjx-container')) score += 10;
                    if (container.querySelector('svg')) score += 5;
                    if (container.querySelector('.mjx-chtml, .mjx-math')) score += 3;
                    if (container.innerHTML && container.innerHTML.trim().length > 50) score += 2;
                    
                    if (score > bestScore) {
                        bestScore = score;
                        bestContainer = container;
                    }
                });
                
                // 同步删除除最佳容器外的所有容器
                topLevelMjx.forEach(container => {
                    if (container !== bestContainer) {
                        container.remove();
                        preCleanupRemoved++;
                    }
                });
            }
        });
        
        // 使用html2canvas导出，直接捕获MathJax渲染的内容
    html2canvas(tempContainer, {
        scale: 2, // 提高清晰度
        useCORS: true,
        allowTaint: false, // 改为false，提高SVG捕获成功率
        backgroundColor: '#ffffff',
        logging: false,
        removeContainer: false,
        windowWidth: tempContainer.scrollWidth || targetWidth,
        windowHeight: height || tempContainer.scrollHeight,
        height: height || tempContainer.scrollHeight,
        width: targetWidth,
        foreignObjectRendering: true, // 启用foreignObject渲染，对SVG和MathJax更好
        onclone: function(clonedDoc, clonedElement) {
            // **简化方案：只删除script标签，防止MathJax重新渲染**
            const allMathJaxScripts = clonedDoc.querySelectorAll('script[src*="mathjax"], script[src*="MathJax"], script[type*="math/tex"], script[type*="math/asciimath"]');
            allMathJaxScripts.forEach(script => script.remove());
            
            // 禁用克隆文档中的MathJax对象（如果存在）
            try {
                if (clonedDoc.defaultView && clonedDoc.defaultView.MathJax) {
                    clonedDoc.defaultView.MathJax = null;
                }
                if (clonedDoc.window && clonedDoc.window.MathJax) {
                    clonedDoc.window.MathJax = null;
                }
            } catch (e) {
                // 忽略错误
            }
            
            // 在克隆文档中确保容器样式正确
            const clonedContainer = clonedDoc.querySelector('.long-image-container') || clonedElement;
            if (clonedContainer) {
                // **简化方案：只清理math-block中的重复容器，确保只有一个mjx容器**
                const allMathBlocksForCleanup = clonedContainer.querySelectorAll('.math-block');
                let totalRemoved = 0;
                
                allMathBlocksForCleanup.forEach((block, index) => {
                    const directChildren = Array.from(block.childNodes).filter(
                        node => node.nodeType === Node.ELEMENT_NODE
                    );
                    const topLevelMjx = directChildren.filter(child => {
                        if (child.classList && child.classList.contains('mjx-container')) {
                            return true;
                        }
                        if (child.classList && 
                            (child.classList.contains('mjx-chtml') || child.classList.contains('mjx-math'))) {
                            if (!child.closest('.mjx-container')) {
                                return true;
                            }
                        }
                        return false;
                    });
                    
                    if (topLevelMjx.length > 1) {
                        // 选择最佳容器
                        let bestContainer = topLevelMjx[0];
                        let bestScore = -1;
                        topLevelMjx.forEach(container => {
                            let score = 0;
                            if (container.classList.contains('mjx-container')) score += 10;
                            if (container.querySelector('svg')) score += 5;
                            if (container.classList.contains('MJXc-display')) score += 15;
                            if (container.innerHTML && container.innerHTML.trim().length > 50) score += 2;
                            if (score > bestScore) {
                                bestScore = score;
                                bestContainer = container;
                            }
                        });
                        // 只保留最佳容器
                        const tempBest = bestContainer.cloneNode(true);
                        block.innerHTML = '';
                        block.appendChild(tempBest);
                        totalRemoved += (topLevelMjx.length - 1);
                    }
                });
                
                // **清理所有script标签**
                const allScripts = clonedContainer.querySelectorAll('script[type*="math/tex"], script[type*="math/asciimath"]');
                allScripts.forEach(script => script.remove());
                
                // **关键修复：使用static定位，确保html2canvas能正确捕获**
                // 移除所有定位相关属性，让容器自然流式布局
                clonedContainer.style.position = 'static';
                clonedContainer.style.left = 'auto';
                clonedContainer.style.top = 'auto';
                clonedContainer.style.right = 'auto';
                clonedContainer.style.bottom = 'auto';
                clonedContainer.style.width = targetWidth + 'px';
                clonedContainer.style.minWidth = targetWidth + 'px';
                clonedContainer.style.maxWidth = targetWidth + 'px';
                clonedContainer.style.height = (height || tempContainer.scrollHeight) + 'px';
                clonedContainer.style.minHeight = (height || tempContainer.scrollHeight) + 'px';
                clonedContainer.style.maxHeight = 'none';
                clonedContainer.style.overflow = 'visible';
                clonedContainer.style.visibility = 'visible';
                clonedContainer.style.opacity = '1';
                clonedContainer.style.display = 'block';
                clonedContainer.style.margin = '0';
                clonedContainer.style.padding = '40px';
                clonedContainer.style.boxSizing = 'border-box';
                
                // **关键：确保export-preview-content元素正确显示**
                const exportContent = clonedContainer.querySelector('.export-preview-content');
                if (exportContent) {
                    exportContent.style.position = 'relative';
                    exportContent.style.width = '100%';
                    exportContent.style.height = 'auto';
                    exportContent.style.minHeight = 'auto';
                    exportContent.style.maxHeight = 'none';
                    exportContent.style.overflow = 'visible';
                    exportContent.style.display = 'block';
                    exportContent.style.visibility = 'visible';
                    exportContent.style.opacity = '1';
                }
                
                // **确保math-block容器可见**
                const mathBlocks = clonedContainer.querySelectorAll('.math-block');
                mathBlocks.forEach((block, index) => {
                    block.style.display = 'block';
                    block.style.visibility = 'visible';
                    block.style.opacity = '1';
                });
                
                // **关键：确保所有MathJax元素可见，块级公式使用block，行内公式使用inline-block**
                const mjxElements = clonedContainer.querySelectorAll('.mjx-container, .mjx-chtml, .mjx-math, .mjx-display');
                mjxElements.forEach((mjx, idx) => {
                    // 检查是否是块级公式（有MJXc-display类）
                    const isDisplay = mjx.classList.contains('MJXc-display') || 
                                     mjx.classList.contains('mjx-display') ||
                                     (mjx.classList.contains('mjx-container') && mjx.classList.contains('MJXc-display')) ||
                                     (mjx.classList.contains('mjx-chtml') && mjx.classList.contains('MJXc-display'));
                    
                    // 块级公式使用block，行内公式使用inline-block
                    mjx.style.display = isDisplay ? 'block' : 'inline-block';
                    mjx.style.visibility = 'visible';
                    mjx.style.opacity = '1';
                    
                    // 如果是块级公式，设置正确的margin和间距
                    if (isDisplay) {
                        mjx.style.margin = '15px 0';
                        mjx.style.width = '100%';
                        mjx.style.textAlign = 'center';
                        mjx.style.lineHeight = 'normal';
                        mjx.style.verticalAlign = 'baseline';
                    }
                    
                    // 确保SVG元素也可见
                    const svgs = mjx.querySelectorAll('svg');
                    svgs.forEach(svg => {
                        svg.style.display = isDisplay ? 'block' : 'inline-block';
                        svg.style.visibility = 'visible';
                        svg.style.opacity = '1';
                    });
                });
                
                // 确保所有图片可见
                const allImages = clonedContainer.querySelectorAll('img');
                allImages.forEach((img, idx) => {
                    img.style.display = 'block';
                    img.style.visibility = 'visible';
                    img.style.opacity = '1';
                });
                
                // **修复块级公式重合问题：在onclone中确保块级公式有正确的间距 - 与预览样式一致（15px 0）**
                const allDisplayMath = clonedContainer.querySelectorAll('.mjx-chtml.MJXc-display, .mjx-container.MJXc-display');
                allDisplayMath.forEach((mathEl, idx) => {
                    // 与预览样式一致：使用15px 0（style.css中的样式）
                    mathEl.style.display = 'block';
                    mathEl.style.width = '100%';
                    mathEl.style.textAlign = 'center';
                    mathEl.style.margin = '15px 0';
                    mathEl.style.padding = '0';
                    mathEl.style.position = 'static';
                    mathEl.style.float = 'none';
                    mathEl.style.clear = 'none';
                    mathEl.style.lineHeight = 'normal';
                    mathEl.style.verticalAlign = 'baseline';
                });
                
                // 确保包含块级公式的父元素也有正确的间距 - 避免重叠
                allDisplayMath.forEach(mathEl => {
                    let parent = mathEl.parentElement;
                    // 如果父元素是p或div，确保它们有margin但不重叠
                    if (parent && (parent.tagName === 'P' || parent.tagName === 'DIV')) {
                        if (!parent.classList.contains('math-block')) {
                            parent.style.margin = '15px 0';
                            parent.style.padding = '0';
                            parent.style.position = 'static';
                            parent.style.float = 'none';
                            parent.style.clear = 'none';
                            parent.style.lineHeight = 'normal';
                        }
                    }
                });
            }
            
            // 确保所有元素可见
            const allElements = clonedDoc.querySelectorAll('*');
            allElements.forEach(el => {
                if (el.tagName === 'SCRIPT' && el.type && el.type.includes('math')) {
                    // 隐藏MathJax脚本标签
                    el.style.display = 'none';
                    el.style.visibility = 'hidden';
                    return;
                }
                if (!el.style || el.style.visibility !== 'hidden') {
                    el.style.visibility = 'visible';
                    el.style.opacity = '1';
                }
            });
        }
    }).then(canvas => {
        // **关键修复：验证canvas是否有内容（不是空白）**
        if (!canvas || canvas.width === 0 || canvas.height === 0) {
            console.error('Canvas为空或尺寸为0:', {
                canvas: canvas,
                width: canvas?.width,
                height: canvas?.height
            });
            showNotification('导出失败：生成的图片为空', 'error');
            if (document.body.contains(tempContainer)) {
                document.body.removeChild(tempContainer);
            }
            return;
        }
        
        // 检查canvas是否有实际内容（不是全白）
        const ctx = canvas.getContext('2d');
        const imageData = ctx.getImageData(0, 0, Math.min(100, canvas.width), Math.min(100, canvas.height));
        const pixels = imageData.data;
        let hasNonWhitePixels = false;
        for (let i = 0; i < pixels.length; i += 4) {
            // 检查RGB值（不是255,255,255）
            if (pixels[i] < 255 || pixels[i + 1] < 255 || pixels[i + 2] < 255) {
                hasNonWhitePixels = true;
                break;
            }
        }
        
        if (!hasNonWhitePixels && canvas.width > 100 && canvas.height > 100) {
            console.warn('警告：Canvas可能是空白的（全白），但继续导出');
        }
        
        // 确保canvas宽度为1080px
        let finalCanvas = canvas;
        
        if (Math.abs(canvas.width - targetWidth) > 1) {
            // 创建新的canvas，固定宽度为1080px
            const newCanvas = document.createElement('canvas');
            newCanvas.width = targetWidth;
            // 按比例计算高度
            newCanvas.height = Math.round(canvas.height * (targetWidth / canvas.width));
            
            const ctx = newCanvas.getContext('2d');
            // 使用高质量缩放
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(canvas, 0, 0, newCanvas.width, newCanvas.height);
            
            finalCanvas = newCanvas;
        }
        
        downloadImage(finalCanvas, 'AI内容预览_长图.png');
        
        // 停止监控
        stopMathBlockMonitoring();
        
        // 清理临时容器
        if (document.body.contains(tempContainer)) {
            document.body.removeChild(tempContainer);
        }
        
        showNotification('✅ 长图导出成功！', 'success');
    }).catch(error => {
        console.error('长图导出失败:', error);
        showNotification('图片导出失败：' + error.message, 'error');
        
        // 停止监控
        stopMathBlockMonitoring();
        
        if (document.body.contains(tempContainer)) {
            document.body.removeChild(tempContainer);
        }
    });
}

// 初始化图片导出按钮事件监听器
function initExportImageButton() {
    const exportImageBtn = document.getElementById('exportImageBtn');
    
    if (!exportImageBtn) {
        console.warn('exportImageBtn按钮未找到，图片导出功能将不可用');
        return;
    }
    
    // 如果已经绑定过事件，先移除（避免重复绑定）
    const newExportImageBtn = exportImageBtn.cloneNode(true);
    exportImageBtn.parentNode.replaceChild(newExportImageBtn, exportImageBtn);
    
    // 绑定图片导出按钮事件
    newExportImageBtn.addEventListener('click', () => {
        // **关键修复：防止重复点击和导出过程中的干扰**
        if (newExportImageBtn.disabled) {
            return;
        }
        
        // 临时禁用按钮，防止重复点击
        newExportImageBtn.disabled = true;
        const originalText = newExportImageBtn.textContent || newExportImageBtn.innerText;
        if (newExportImageBtn.textContent !== undefined) {
            newExportImageBtn.textContent = '导出中...';
        } else if (newExportImageBtn.innerText !== undefined) {
            newExportImageBtn.innerText = '导出中...';
        }
        
        // 检查html2canvas库是否加载（延迟检查）
        if (typeof html2canvas === 'undefined') {
            console.warn('html2canvas库未加载，尝试延迟加载...');
            // 恢复按钮状态
            newExportImageBtn.disabled = false;
            if (newExportImageBtn.textContent !== undefined) {
                newExportImageBtn.textContent = originalText;
            } else if (newExportImageBtn.innerText !== undefined) {
                newExportImageBtn.innerText = originalText;
            }
            // 尝试延迟检查
            setTimeout(() => {
                if (typeof html2canvas !== 'undefined') {
                    // 递归调用自己
                    newExportImageBtn.click();
                } else {
                    showNotification('html2canvas库未加载，无法导出图片。请刷新页面重试。', 'error');
                }
            }, 1000);
            return;
        }
        
        // 调用导出函数
        if (typeof exportLongImage === 'function') {
            // **关键修复：在导出完成后恢复按钮状态**
            const restoreButton = () => {
                newExportImageBtn.disabled = false;
                if (newExportImageBtn.textContent !== undefined) {
                    newExportImageBtn.textContent = originalText;
                } else if (newExportImageBtn.innerText !== undefined) {
                    newExportImageBtn.innerText = originalText;
                }
            };
            
            // 尝试调用导出函数，并监听完成/失败
            try {
                const exportPromise = exportLongImage();
                if (exportPromise && typeof exportPromise.then === 'function') {
                    exportPromise
                        .then(() => {
                            // 导出成功，延迟恢复按钮（让通知显示）
                            setTimeout(restoreButton, 2000);
                        })
                        .catch((err) => {
                            console.error('导出失败:', err);
                            // 导出失败，立即恢复按钮
                            restoreButton();
                        });
                } else {
                    // 如果导出函数不是Promise，延迟恢复按钮
                    setTimeout(restoreButton, 3000);
                }
            } catch (err) {
                console.error('调用导出函数时出错:', err);
                restoreButton();
                showNotification('导出失败：' + (err.message || '未知错误'), 'error');
            }
        } else {
            // 恢复按钮状态
            newExportImageBtn.disabled = false;
            if (newExportImageBtn.textContent !== undefined) {
                newExportImageBtn.textContent = originalText;
            } else if (newExportImageBtn.innerText !== undefined) {
                newExportImageBtn.innerText = originalText;
            }
            console.error('exportLongImage函数未找到:', {
                exportLongImage: typeof exportLongImage,
                windowExportLongImage: typeof window.exportLongImage
            });
            showNotification('图片导出功能未加载，请刷新页面重试', 'error');
        }
    });
}

// 导出函数供外部调用 - 确保在任何情况下都能正确导出
if (typeof window !== 'undefined') {
    window.exportLongImage = exportLongImage;
    window.getFormattedExportContent = getFormattedExportContent;
    window.initExportImageButton = initExportImageButton;
    
    // 如果DOM已经加载完成，立即初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initExportImageButton);
    } else {
        // DOM已经加载完成，直接初始化
        initExportImageButton();
    }
} else if (typeof global !== 'undefined') {
    global.exportLongImage = exportLongImage;
    global.getFormattedExportContent = getFormattedExportContent;
    global.initExportImageButton = initExportImageButton;
}

