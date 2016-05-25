(function(tiy, $) {
    'use strict';

    tiy.loadModule({
        name: 'student-list',
        render: buildStudentUI
    });

    function buildStudentUI(data, ui) {
        console.log('Rendering student list', ui);

        var elem = $(
            `<aside class='tiyo-assistant-student-list'>
                <h2>${data.group.title || 'Unknown'}</h2>
                <ul></ul>
            </aside>`
        );
        $(ui).append(elem);
    }

})(window.tiy || {}, window.jQuery);
