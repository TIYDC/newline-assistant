(function(tiy) {
    'use strict';

    const INDEX_ITEM = 'tiyo-search-index';
    const TAG_KEY = 'tiyo-search-tags';
    const TEMPLATE = 'templates/search.html';
    const TAG_TEMPLATE = 'templates/tags.html';
    const SCRAPE_BASE = 'https://online.theironyard.com';
    const FILLERS = /\b(an|and|are(n\'t)?|as|at|be|but|by|do(es)?(n\'t)?|for|from|if|in|into|is(n\'t)?|it\'?s?|no|none|not|of|on|or|such|that|the|theirs?|then|there(\'s)?|these|they|this|to|us|was|we|will|with|won\'t|you\'?r?e?)\b/g;

    let $ui = null;
    let tagData = {};
    let pageData = {};

    tiy.loadModule({
        name: 'search',
        navIcon: 'fa-search',
        render: main
    });

    function main(data, elem) {
        let indexData = {};
        try { indexData = JSON.parse(localStorage.getItem(INDEX_ITEM) || '{}'); } catch(e) { /* let this go */ }
        try { tagData = JSON.parse(localStorage.getItem(TAG_KEY) || '{}'); } catch(e) { /* let this go */ }

        $ui = $(elem);
        pageData = data;

        if (pageData.path) {
            addTagIcons();

            $.get(chrome.extension.getURL(TEMPLATE))
                .then(function(html) {
                    $ui.append(html);
                    addIndexAge(indexData);
                    $ui.find('.tiyo-assistant-search-refresh').click(function() {
                        buildIndex(indexData);
                    });
                    $ui.find('form').submit(function(e) {
                        e.preventDefault();
                        doSearch($(this).find('[type=text]').val(), indexData);
                    });
                });
        } else {
            $ui.append(
                $('<p>').text('Currently search is only supported from a Path page.')
            );
        }
    }

    function getTagLabel(tag) {
        return `<span class='tiyo-assistant-tag label label-info'>${tag}</span>`;
    }

    function addTagIcons() {
        $('.path-tree-lessons .text-body').each(function() {
            let id = $(this).attr('href').match(/\/(\d+)$/);
            id = id && id[1];
            if (!id) { return; }

            let tags = tagData[id] || [];
            let tagItems = tags.map(getTagLabel);
            // Add new tag input
            $(this).after($(`<input type='text' class='tiyo-assistant-new-tag' data-id='${id}'>`));
            // Add existing tags...
            $(this).after(tagItems);
        });

        $('.path-tree-states').after($(`<i class='fa fa-tag tiyo-assistant-add-tag'></i>`));

        $('.path-tree')
            .on('click', '.tiyo-assistant-tag', function() {
                removeTag($(this).parents('.lesson, .assignment'), $(this).text());
            })
            .on('click', '.tiyo-assistant-add-tag', function() {
                $(this).parent().find('input').show()[0].focus();
            })
            .on('blur', '.tiyo-assistant-new-tag', function() {
                $(this).hide();
            })
            .on('keypress', '.tiyo-assistant-new-tag', function(e) {
                if (e.keyCode === 13) {
                    addTag($(this).parents('.lesson, .assignment'), $(this).val());
                    $(this).val('').hide();
                }
            })
            .on('keyup', '.tiyo-assistant-new-tag', function(e) {
                if (e.keyCode === 27) {
                    $(this).val('').hide();
                }
            });
    }

    function getIDFromNode(contentNode) {
        let id = contentNode.data('id').match(/^gid:\/\/online\/[^\/]+\/([0-9]+)$/);
        return id && id[1];
    }

    function removeTag(contentNode, tag) {
        let id = getIDFromNode(contentNode);
        if (!id) {
            return console.warn('Content node is not a lesson or assignment.', contentNode);
        }

        let tags = tagData[id] || [];
        let index = tags.indexOf(tag);
        if (index > -1) {
            tags.splice(index, 1);
            localStorage.setItem(TAG_KEY, JSON.stringify(tagData));
            // This could match multiple tags (like "select" within "selectors")
            // so we need to find the exact tag match...
            contentNode.find(`.tiyo-assistant-tag:contains("${tag}")`).each(function() {
                if ($(this).text() === tag) {
                    $(this).remove();
                }
            });
        }
    }

    function addTag(contentNode, tag) {
        tag = tag.trim();

        if (tag.indexOf(',') > -1) {
            return tag.split(/\,/).forEach(function(splitTag) {
                addTag(contentNode, splitTag);
            });
        }

        let id = getIDFromNode(contentNode);
        if (!id) {
            return console.warn('Content node is not a lesson or assignment.', contentNode);
        }

        let tags = tagData[id] || [];
        if (!tags.includes(tag)) {
            tags.push(tag);
            tagData[id] = tags;
            localStorage.setItem(TAG_KEY, JSON.stringify(tagData));
            contentNode.find('.text-body').after(getTagLabel(tag));
        }
    }

    function addIndexAge(indexData) {
        let now = Date.now();
        let ageDays = -1;

        if (indexData && indexData[pageData.path.id] && indexData[pageData.path.id].__createTime) {
            ageDays = (now - indexData[pageData.path.id].__createTime) / (1000 * 60 * 60 * 24);
        }

        $ui.find('.tiyo-assistant-search-age time')
            .text( (ageDays > -1) ? (ageDays.toFixed(1) + ' days ago') : '(never)' );
    }

    function doSearch(query, indexData) {
        $('.tiyo-assistant-search-results li').remove();

        if (!query) { return; }

        if (!indexData || !indexData[pageData.path.id]) {
            tiy.showMessage('There is no index for this path, please build it!', { type: 'info' });
            return;
        }

        console.info('searching path %d for %s', pageData.path.id, query);

        let index = indexData[pageData.path.id];
        let tokens = query.replace(FILLERS, ' ').split(/\s+/);
        let results = Object.create(null);

        tokens
            .filter(function(token) {
                // remove any empties
                return token.trim().length;
            })
            .map(function(token) {
                // map to the matched content
                return index[token] || [];
            })
            .forEach(function(matches) {
                // build total weight for single content piece
                matches.forEach(function(match) {
                    if (!results[match.id]) {
                        results[match.id] = {
                            id: match.id,
                            type: (match.t === 'l') ? 'Lesson' : 'Assignment',
                            unit: match.u,
                            weight: 0
                        };
                        results[match.id].title = $(`[data-id="gid://online/${results[match.id].type}/${results[match.id].id}"] a:first-child`).text();
                    }
                    results[match.id].weight += match.w;
                });
            });

        let sortedResults = [];
        let resultIDs = Object.keys(results);

        if (!resultIDs.length) {
            tiy.showMessage('Looks like there were no results!', { type: 'info' });
            return;
        }

        resultIDs.forEach(function(id) {
            sortedResults.push(results[id]);
        });
        sortedResults.sort(function(a, b) {
            return b.weight - a.weight;
        });

        console.log('search results built', sortedResults);

        let resultItems = [];
        resultItems = sortedResults.map(function(result) {
            return `<li class='path-tree-level ${result.type.toLowerCase()}'>
                <a href='/admin/${result.type.toLowerCase()}s/${result.id}' class='text-body'>${result.title}</a>
            </li>`;
        });
        $('.tiyo-assistant-search-results ul').append(resultItems.join(''));
    }

    function buildIndex(indexData) {
        $ui.find('.tiyo-assistant-search-refresh').attr('disabled', 'disabled');
        tiy.showMessage('Creating new index... this could take a while.', { type: 'info' });

        let pathIndex = Object.create(null);
        pathIndex.__createTime = Date.now();

        let units = findContentIDs();
        console.info('gathered unit data', units);

        let promises = [];

        units.forEach(function(unit) {
            unit.lessons.forEach(function(lesson) {
                promises.push(indexContent(pageData.path.id, unit.id, lesson, 'lessons'));
            });
            unit.assignments.forEach(function(assignment) {
                promises.push(indexContent(pageData.path.id, unit.id, assignment, 'assignments'));
            });
        });

        Promise.all(promises)
            .then(function(results) {
                results.forEach(function(index) {
                    Object.keys(index.hist).forEach(function(word) {
                        pathIndex[word] = pathIndex[word] || [];
                        pathIndex[word].push({
                            u: index.unit,
                            id: index.contentId,
                            w: index.hist[word],
                            t: (index.type === 'lessons') ? 'l' : 'a'
                        });
                    });
                });

                console.info('final index for path', pageData.path.id, pathIndex);

                indexData[pageData.path.id] = pathIndex;
                localStorage.setItem(INDEX_ITEM, JSON.stringify(indexData));
                addIndexAge(indexData);

                $ui.find('.tiyo-assistant-search-refresh').attr('disabled', '');
                tiy.showMessage('New index built!', { type: 'success' });
            })
            .catch(function(err) {
                console.warn('Problem getting content index', err);
                $ui.find('.tiyo-assistant-search-refresh').attr('disabled', false);
                tiy.showMessage('There was a problem building the index, please try again (TIYO throws 500 errors sometimes)!');
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
                    .replace(/[^a-z0-9\'\-\s]/g, ' ')      // kill any non-word character (except ' and -)
                    .replace(/\W?\-\W|\W\-\W?/g, ' ')      // kill any non-word hyphen
                    .replace(/\b\'|\'\b/g, ' ')            // remove single quotes not as apostrophes
                    .replace(/\b(\w|\'\-)\b/g, ' ')        // kill any single characters
                    .replace(/\b[0-9]+\b/g, ' ')           // remove pure numbers
                    .replace(FILLERS, ' ')                 // remove filler words
                    .replace(/(\n\s*|\s{2,})/g, ' ');      // collapse all whitespace to a single character

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
