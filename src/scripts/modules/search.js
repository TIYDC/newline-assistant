(function(tiy) {
    'use strict';

    const INDEX_ITEM = 'tiyo-search-index';
    const TEMPLATE = 'build/templates/search.html';

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

        console.log('gathered all unit & content id\'s', units);

        //     {
        //         "157": {
        //             "createTime": 1234567890,
        //             "index": {
        //                 "indexed-word": {
        //                     "lessons": [ "615-1804" ],
        //                     "assignments": [ "615-1025" ]
        //                 ]
        //             }
        //         }
        //     }


        // paths/157/units/965/lessons/2893
    }


})(window.tiy || {});
