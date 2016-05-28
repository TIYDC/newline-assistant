(function(tiy) {
    'use strict';

    const INDEX_ITEM = 'tiyo-search-index';
    const TEMPLATE = 'build/templates/search.html';

    tiy.loadModule({
        name: 'search',
        navIcon: 'fa-search',
        render: main
    });

    function main(data, elem) {
        let indexData = null;
        try { indexData = JSON.parse(localStorage.getItem(INDEX_ITEM) || null); } catch(e) { /* let this go */ }

        $.get(chrome.extension.getURL(TEMPLATE))
            .then(function(html) {
                elem.append(html);
                addIndexAge(indexData, elem);
            });
    }

    function addIndexAge(indexData, elem) {
        let now = Date.now();
        let ageDays = -1;

        if (indexData && indexData.createTime) {
            ageDays = (now - indexData.createTime) / (1000 * 60 * 60 * 24);
        }

        elem.find('.tiyo-assistant-search-age time')
            .text( (ageDays > -1) ? (ageDays.toFixed(1) + ' days ago') : '(never)' );
    }


})(window.tiy || {});
