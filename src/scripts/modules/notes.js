(function(tiy) {
    'use strict';

    const NOTES_KEY = 'tiyo-notes';
    const TEMPLATE = 'build/templates/notes.html';

    let $ui = null;
    let pageData = {};
    let pathData = {};

    tiy.loadModule({
        name: 'notes',
        navIcon: 'fa-sticky-note-o',
        render: main
    });

    function main(data, elem) {
        let notesData = {};

        $ui = $(elem);
        pageData = data;

        if (!pageData.path || !pageData.path.id) {
            return;
        }

        try { notesData = JSON.parse(localStorage.getItem(NOTES_KEY) || '{}'); } catch(e) { /* let this go */ }
        console.info('loading notes module with notesData:', notesData);

        if (notesData[pageData.path.id]) {
            pathData = notesData[pageData.path.id];
        }

        addNoteIcons();
    }

    function addNoteIcons() {
        $.get(chrome.extension.getURL(TEMPLATE)).then(function(html) {
            let notesModal = $(html);
            $ui.append(notesModal);
            $('.path-tree-states').after($(`<i class='fa fa-sticky-note-o tiyo-assistant-note'></i>`));
            $('.path-tree').on('click', '.tiyo-assistant-note', function() {
                showNoteModal($(this).parents('.lesson, .assignment'), notesModal);
            });
        });
    }

    function showNoteModal(content, modal) {
        console.log('showing modal for', content, modal);
    }


})(window.tiy || {});
