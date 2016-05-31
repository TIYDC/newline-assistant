(function(tiy) {
    'use strict';

    const INDEX_ITEM = 'tiyo-search-index';
    const TEMPLATE = 'build/templates/search.html';
    const SCRAPE_BASE = 'https://online.theironyard.com';
    const FILLERS = /\b(an|and|are(n\'t)?|as|at|be|but|by|do(es)?(n\'t)?|for|from|if|in|into|is(n\'t)?|it\'?s?|no|none|not|of|on|or|such|that|the|theirs?|then|there(\'s)?|these|they|this|to|us|was|we|will|with|won\'t|you\'?r?e?)\b/g;

    let $ui = null;
    let indexData = null;
    let pageData = {};

    tiy.loadModule({
        name: 'search',
        navIcon: 'fa-search',
        render: main
    });

    function main(data, elem) {
        try { indexData = JSON.parse(localStorage.getItem(INDEX_ITEM) || null); } catch(e) { /* let this go */ }
        console.info('loading search module with indexData', indexData);

        $ui = $(elem);
        pageData = data;

        if (pageData.path) {
            $.get(chrome.extension.getURL(TEMPLATE))
                .then(function(html) {
                    $ui.append(html);
                    addIndexAge(indexData);
                    $ui.find('.tiyo-assistant-search-refresh').click(buildIndex);
                    $ui.find('form').submit(doSearch);
                });
        } else {
            $ui.append(
                $('<p>').text('Currently search is only supported from a Path page.')
            );
        }
    }

    function addIndexAge(indexData) {
        let now = Date.now();
        let ageDays = -1;

        if (indexData && indexData[pageData.path.id] && indexData[pageData.path.id].createTime) {
            ageDays = (now - indexData[pageData.path.id].createTime) / (1000 * 60 * 60 * 24);
        }

        $ui.find('.tiyo-assistant-search-age time')
            .text( (ageDays > -1) ? (ageDays.toFixed(1) + ' days ago') : '(never)' );
    }

    function doSearch(e) {
        e.preventDefault();
        if (!indexData) {
            return $ui.find('.tiyo-assistant-notice').text('There is no index, please build it!');
        }


    }

    function buildIndex() {
        $ui.find('.tiyo-assistant-search-refresh').attr('disabled', 'disabled');
        $ui.find('.tiyo-assistant-notice').text('Recreating... this could take a while.');

        let indexData = {
            createTime: Date.now(),
            index: {}
        };

        let units = findContentIDs();

        console.log('gathered all unit & content IDs', units);

        indexContent(pageData.path.id, units[0].id, units[0].lessons[0], 'lessons')
            .then(function(index) {
                Object.keys(index.hist).forEach(function(word) {
                    indexData[word] = indexData[word] || { lessons: [], assignments: [] };
                    indexData[word][index.type].push({
                        u: index.unit,
                        id: index.contentId,
                        w: index.hist[word]
                    });
                });

                console.log('index data', indexData);
            });
    }

    function findContentIDs() {
        let units = [];

        $('.unit').each(function() {
            let unit = {
                id: Number($(this).data('id').match(/\/([0-9]+)$/)[1]),
                lessons: [],
                assignments: []
            };
            $(this).find('.lesson').each(function() {
                unit.lessons.push(Number($(this).data('id').match(/\/([0-9]+)$/)[1]));
            });
            $(this).find('.assignment').each(function() {
                unit.assignments.push(Number($(this).data('id').match(/\/([0-9]+)$/)[1]));
            });

            units.push(unit);
        });

        return units;
    }

    function indexContent(path, unit, contentId, type) {
        return $.get(`${SCRAPE_BASE}/paths/${path}/units/${unit}/${type}/${contentId}`)
            .then(function scrapeAndIndex(html) {
                let $html = $(html);
                let content = [];

                content.push($html.find('h1').text());
                content.push($html.find('article').prev('p').prev('p').text());
                content.push($html.find('article').text());

                content = content.join(' ')
                    .toLowerCase()
                    .replace(/[^a-z0-9\'\-\s]/g, '')   // kill any non-word character (except ' and -)
                    .replace(/\W?\-\W|\W\-\W?/g, ' ')  // kill any non-word hyphen
                    .replace(/(\s|^)\w(\s|$)/g, ' ')   // kill any single characters
                    .replace(FILLERS, ' ')
                    .replace(/(\n\s*|\s{2,})/g, ' ');  // collapse all whitespace to a single character

                let hist = countWord(content, {});
                return { path, unit, contentId, type, hist };
            });
    }

    function countWord(content, hist) {
        let next = content.match(/^\s*([\w\-\']+)\s+/);
        if (next) {
            hist[next[1]] = (hist[next[1]] && ++hist[next[1]]) || 1;
            return countWord(content.replace(/^\s*([\w\-\']+)\s+/, ''), hist);
        }
        return hist;
    }


})(window.tiy || {});
