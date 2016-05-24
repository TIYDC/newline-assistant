(function($) {
    'use strict';

    function main() {
        console.info('Initializing TIYO assistant');
        $.get(chrome.extension.getURL('/template.html'))
            .then(function(data) {
                $(data).appendTo('body');
                getStudentData().then(buildStudentUI);
            });
    }

    function getStudentData() {
        var data = {
                group: null,
                students: []
            },
            group = $('.card-block dt:contains("Group")').next().find('a');

        if (!group.length) { return; }

        data.group = {
            title: group.text(),
            id: Number(group.attr('href').match(/\/([0-9]+)/)[1])
        };

        return $.get(group.attr('href'))
            .then(function(html) {
                var students = $(html).find('#students tr td:first-child a');
                students.each(function() {
                    var studentElem = $(this).find('.profile-placeholder-medium, img').remove().end();
                    data.students.push({
                        id: Number(studentElem.attr('href').match(/\/([0-9]+)/)[1]),
                        name: studentElem.text()
                    });
                });
                return data;
            });
    }

    function buildStudentUI(data) {
        var elem = $('.tiyo-assistant-student-list');

        console.log(data);

        elem.find('h2').html(data.group.elem);
        // elem.find('ul').append( $('<li>').append(studentElem) );

    }


    // Kick things off
    main();

})(window.jQuery);
