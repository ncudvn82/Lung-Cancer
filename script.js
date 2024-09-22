let articles = [];
let currentPage = 1;
const articlesPerPage = 25;
let currentFilter = null;
let currentFilterType = null;
let currentFilterValue = null;

document.addEventListener('DOMContentLoaded', function() {
    const urlParams = new URLSearchParams(window.location.search);
    const tag = urlParams.get('tag');

    if (tag) {
        currentFilterType = 'tag';
        currentFilterValue = tag;
    }

    // 從 JSON 文件加載文章元數據
    fetch('content.json')
        .then(response => response.json())
        .then(data => {
            articles = data.documents.items || [];
            document.getElementById('title').textContent = data.hero.title;
            document.getElementById('headtitle').textContent = data.siteTitle;
            //document.getElementById("adLink").href = data.ad1.link;
            //document.getElementById("adImg").src = data.ad1.image;
            //document.getElementById("adLink2").href = data.ad2.link;
            //document.getElementById("adImg2").src = data.ad2.image;

            createStickyImage(data.ad1, 'stickyImage');
            createStickyImage(data.ad2, 'stickyImage2');
            createAd3(data.ad3);
            createTagCloud();

            document.documentElement.style.setProperty('--primary-color', data.color1);
            document.documentElement.style.setProperty('--secondary-color', data.color2);
            document.documentElement.style.setProperty('--text-color', data.color3);
            document.documentElement.style.setProperty('--background-color', data.color4);
            document.documentElement.style.setProperty('--accent-color', data.color5);
            if (tag) {
                filterArticles('tag', tag);
            } else {
                displayArticles(currentPage);
            }
            updatePagination();
            populateSidebar();
            updateFilterStatus();
        })
        .catch(error => console.error('Error loading articles:', error));
});

function createTagCloud() {
    const tagCloudContainer = document.createElement('div');
    tagCloudContainer.id = 'tagCloud';
    tagCloudContainer.className = 'bg-orange-300 p-4 rounded-lg shadow-md';

    const tagCloudSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    tagCloudSvg.setAttribute("width", "400");
    tagCloudSvg.setAttribute("height", "300");
    tagCloudContainer.appendChild(tagCloudSvg);

    // 假設您想將標籤雲放在側邊欄中
    const sidebar = document.getElementById('stickyImageContainer');
    sidebar.insertBefore(tagCloudContainer, sidebar.firstChild);

    // 計算標籤頻率
    const tagCounts = {};
    articles.forEach(article => {
        article.tags.forEach(tag => {
            tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
    });

    // 準備數據給 d3-cloud
    const words = Object.keys(tagCounts).map(tag => ({
        text: tag,
        size: Math.max(12, Math.min(40, 12 + tagCounts[tag] * 3)) // 字體大小範圍：12px 到 40px
    }));

    // 使用 d3-cloud 生成文字雲
    d3.layout.cloud()
        .size([400, 300])
        .words(words)
        .padding(5)
        .rotate(() => 0)
        .font("Arial")
        .fontSize(d => d.size)
        .on("end", draw)
        .start();

    function draw(words) {
        const color = d3.scaleOrdinal(d3.schemeCategory10);

        d3.select(tagCloudSvg)
            .append("g")
            .attr("transform", "translate(200,150)")
            .selectAll("text")
            .data(words)
            .enter().append("text")
            .style("font-size", d => `${d.size}px`)
            .style("font-family", "Arial, sans-serif")
            .style("font-weight", "bold")
            .style("cursor", "pointer")
            .style("fill", (d, i) => color(i))
            .attr("text-anchor", "middle")
            .attr("transform", d => `translate(${d.x},${d.y})`)
            .text(d => d.text)
            .on("click", (event, d) => filterArticles('tag', d.text));
    }
}


function createStickyImage(adData, id) {
    if (adData.image && adData.image !== "") {
        const stickyImageContainer = document.getElementById('stickyImageContainer');
        const stickyImageDiv = document.createElement('div');
        stickyImageDiv.id = id;
        stickyImageDiv.innerHTML = `
            <a href="${adData.link}" id="${id}Link" target="_blank">
                <img src="${adData.image}" id="${id}Img" alt="Sticky Image">
            </a>
        `;
        stickyImageContainer.appendChild(stickyImageDiv);
    }
}

function createAd3(adData) {
    if (adData.image && adData.image !== "") {
        const ad3Container = document.getElementById('ad3Container');
        ad3Container.innerHTML = `
            <div id="ad3">
                <a href="${adData.link}" id="adLink3" target="_blank">
                    <img src="${adData.image}" id="adImg3" alt="Sticky Image">
                </a>
            </div>
        `;
    }
}

document.getElementById('homePage').addEventListener('click', function(e) {
    e.preventDefault();
    resetToHomePage();
});

function resetToHomePage() {
    currentPage = 1;
    currentFilter = null;
    currentFilterType = null;
    currentFilterValue = null;
    displayArticles(currentPage);
    updatePagination();
    updateFilterStatus();
    scrollToTop();
}

function displayArticles(page) {
    const articleContainer = document.getElementById('articles');
    articleContainer.innerHTML = '';

    const displayedArticles = currentFilter ? currentFilter : articles;

    if (displayedArticles.length === 0) {
        const noArticlesElement = document.createElement('div');
        noArticlesElement.textContent = "目前沒有文章";
        noArticlesElement.className = "no-articles"
        articleContainer.appendChild(noArticlesElement);
    } else {
        const start = (page - 1) * articlesPerPage;
        const end = start + articlesPerPage;

        for (let i = start; i < end && i < displayedArticles.length; i++) {
            const article = displayedArticles[i];
            const articleElement = document.createElement('a');
            articleElement.className = 'article';
            articleElement.href = `./documents/${article.no}.html`;
            articleElement.innerHTML = `
                <h2>${article.titles}</h2>
                <div class="article-meta">
                    作者: ${article.author} | 日期: ${article.date} | 標籤: ${article.tags.join(', ')}
                </div>
            `;
            articleContainer.appendChild(articleElement);
        }
    }
    window.scrollTo(0, 0);
}

function updatePagination() {
    const totalArticles = currentFilter ? currentFilter.length : articles.length;
    const totalPages = Math.max(1, Math.ceil(totalArticles / articlesPerPage)); // 確保至少有1頁
    document.getElementById('prevPage').disabled = currentPage === 1;
    document.getElementById('nextPage').disabled = currentPage >= totalPages;

    // 更新當前頁碼顯示
    document.getElementById('currentPage').textContent = `第 ${currentPage} 頁,共 ${totalPages} 頁`;
}

document.getElementById('prevPage').addEventListener('click', () => {
    if (currentPage > 1) {
        currentPage--;
        displayArticles(currentPage);
        updatePagination();
    }
});

document.getElementById('nextPage').addEventListener('click', () => {
    const totalArticles = currentFilter ? currentFilter.length : articles.length;
    const totalPages = Math.ceil(totalArticles / articlesPerPage);
    if (currentPage < totalPages) {
        currentPage++;
        displayArticles(currentPage);
        updatePagination();
    }
});

function populateSidebar() {
    const dateArchive = document.getElementById('dateArchive');
    const tagList = document.getElementById('tagList');
    const dates = new Set();
    const tags = new Set();

    articles.forEach(article => {
        const date = article.date.substring(0, 7); // 取得年/月
        dates.add(date);
        article.tags.forEach(tag => tags.add(tag));
    });

    dates.forEach(date => {
        const li = document.createElement('li');
        li.textContent = date;
        li.addEventListener('click', () => filterArticles('date', date));
        dateArchive.appendChild(li);
    });

    tags.forEach(tag => {
        const li = document.createElement('li');
        li.textContent = tag;
        li.addEventListener('click', () => filterArticles('tag', tag));
        tagList.appendChild(li);
    });
}

function filterArticles(type, value) {
    currentFilter = articles.filter(article => {
        if (type === 'date') {
            return article.date.startsWith(value);
        } else if (type === 'tag') {
            return article.tags.includes(value);
        }
    });

    currentFilterType = type;
    currentFilterValue = value;
    currentPage = 1;
    displayArticles(currentPage);
    updatePagination();
    updateFilterStatus();
}

function clearFilter() {
    currentFilter = null;
    currentFilterType = null;
    currentFilterValue = null;
    currentPage = 1;
    displayArticles(currentPage);
    updatePagination();
    updateFilterStatus();
    resetToHomePage();
}

function updateFilterStatus() {
    const filterStatus = document.getElementById('filterStatus');
    if (currentFilter) {
        let statusText = currentFilterType === 'date' ? '日期篩選: ' : '標籤篩選: ';
        statusText += currentFilterValue;
        filterStatus.innerHTML = `
            ${statusText} 
            <button onclick="clearFilter()">清除篩選</button>
        `;
    } else {
        filterStatus.innerHTML = '顯示所有文章';
    }
}

function scrollToTop() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

document.getElementById('backToTop').addEventListener('click', function(e) {
    e.preventDefault();
    scrollToTop();
});

function adjustSidebarHeight() {
    const sidebar = document.getElementById('sidebar');
    const sidebarContent = document.getElementById('sidebarContent');
    const stickyImageContainer = document.getElementById('stickyImageContainer');

    const availableHeight = sidebar.offsetHeight;
    const imageHeight = stickyImageContainer.offsetHeight;

    //sidebarContent.style.maxHeight = `${availableHeight - imageHeight}px`;
}

window.addEventListener('load', adjustSidebarHeight);
window.addEventListener('resize', adjustSidebarHeight);