(function(tiy) {
    'use strict';

    const NOTES_KEY = 'tiyo-notes';
    const NOTES_TEMPLATE = 'build/templates/notes.html';

    let $ui = null;
    let pageData = {};
    let notesData = {};

    tiy.loadModule({
        name: 'notes',
        navIcon: 'fa-sticky-note-o',
        render: main
    });

    function main(data, elem) {
        $ui = $(elem);
        pageData = data;

        try { notesData = JSON.parse(localStorage.getItem(NOTES_KEY) || '{}'); } catch(e) { /* let this go */ }
        console.info('loading notes module with notesData:', notesData);

        if (!notesData) {
            notesData = {};
            localStorage.setItem(NOTES_KEY, JSON.stringify(notesData));
        }

        if (pageData.path && pageData.path.id) {
            addNotesIcons();
        } else if (pageData.content && pageData.content.id) {
            addContentNotesUI();
        }
    }

    function addNotesIcons() {
        $ui.append(`<p>Please use the note icons next to each content line in your units!</p>`);

        $.get(chrome.extension.getURL(NOTES_TEMPLATE)).then(function(html) {
            let notesModal = $(html);
            notesModal.addClass('tiyo-assistant-modal');
            $('body').append(notesModal);
            $('.path-tree-states').after($(`<i class='fa fa-sticky-note-o tiyo-assistant-note'></i>`));

            $('.path-tree').on('click', '.tiyo-assistant-note', function() {
                showNotesModal($(this).parents('.lesson, .assignment'), notesModal);
            });

            notesModal.submit(function(e) {
                saveNotes.call(this, e);
                $(this).hide();
            });
            notesModal.find('.tiyo-assistant-note-cancel').click(function() {
                notesModal.hide();
            });
        });
    }

    function showNotesModal(contentNode, modalNode) {
        let id = contentNode.data('id').match(/^gid:\/\/online\/[^\/]+\/([0-9]+)$/);
        if (!id) {
            console.warn('content node is not a lesson or assignment.', contentNode);
            return;
        }
        id = id[1];

        console.log('showing modal for', id, modalNode);

        let notes = notesData[id] || '';

        modalNode
            .attr('data-id', id)
            .find('.tiyo-assistant-note-title')
                .text(contentNode.find('.text-body').text())
                .end()
            .find('textarea')
                .val(notes)
                .end()
            .css({
                top: (contentNode.height() * 2) + contentNode.offset().top,
                left: contentNode.offset().left
            })
            .show();
    }

    function addContentNotesUI() {
        let notes = notesData[pageData.content.id] || '';
        $.get(chrome.extension.getURL(NOTES_TEMPLATE)).then(function(html) {
            $ui.append(html)
                .find('form')
                    .attr('data-id', pageData.content.id)
                    .find('.tiyo-assistant-note-title')
                        .text(pageData.content.title)
                        .end()
                    .find('textarea')
                        .val(notes)
                        .end()
                    .find('.tiyo-assistant-note-cancel')
                        .remove()
                        .end()
                    .show()
                    .submit(saveNotes);
        });
    }

    function saveNotes(e) {
        e.preventDefault();

        let $form = $(this);
        let id = Number($form.data('id'));

        if (!id) {
            console.warn('Unable to save notes, not id!', this);
            return $form.hide();
        }

        let notes = $form.find('textarea').val();

        console.info('Saving notes for %d: %s', id, notes);

        notesData[''+id] = notes;
        localStorage.setItem(NOTES_KEY, JSON.stringify(notesData));
    }


})(window.tiy || {});
