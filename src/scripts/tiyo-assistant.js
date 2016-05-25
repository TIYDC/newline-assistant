(function(tiy, $) {
    'use strict';

    // Public API methods
    tiy.loadModule = loadModule;

    // locals & constants
    let tiyoData = null;
    let mainUI = null;
    let modulesLoaded = [];
    let dataLoaded = false;
    let uiLoaded = false;

    const MAIN_TEMPLATE = 'src/templates/main.html';


    function main() {
        console.info('Initializing TIYO assistant');

        collectData()
            .then(function callModuleInits(data) {
                tiyoData = data;
                dataLoaded = true;
                console.log('Data gathered, calling init methods', data);
                modulesLoaded.forEach(function(mod) {
                    doInit(mod);
                });

                return $.get(chrome.extension.getURL(MAIN_TEMPLATE));
            })
            .then(function callModuleRenders(html) {
                mainUI = $(html).appendTo('body');
                uiLoaded = true;
                console.log('UI base loaded, calling render methods', mainUI);
                modulesLoaded.forEach(function(mod) {
                    doRender(mod);
                });
            });
    }

    function collectData() {
        let data = {
                group: null,
                students: []
            },
            group = $('.card-block dt:contains("Group")').next().find('a');

        if (!group.length) { return; }

        data.group = {
            title: group.text(),
            id: Number(group.attr('href').match(/\/([0-9]+)/)[1])
        };

        return $.get(group.attr('href')).then(function(html) {
            let students = $(html).find('#students tr td:first-child a');
            students.each(function() {
                let studentElem = $(this).find('.profile-placeholder-medium, img').remove().end();
                data.students.push({
                    id: Number(studentElem.attr('href').match(/\/([0-9]+)/)[1]),
                    name: studentElem.text()
                });
            });
            return data;
        });
    }

    function loadModule(api) {
        if (!api) { return; }
        if (!api.name) { api.name = Date.getTime(); }

        console.info('loading module', api);

        modulesLoaded.push(api);
        doInit(api);
        doRender(api);
    }

    function doInit(mod) {
        if (dataLoaded && typeof(mod.init) === 'function') {
            mod.init(tiyoData);
        }
    }

    function doRender(mod) {
        if (uiLoaded && typeof(mod.render) === 'function') {
            var elem = createModuleWrapper(mod);
            mod.render(tiyoData, elem);
        }
    }

    function createModuleWrapper(mod) {
        var elem = $(`<article id='tiyo-assistant-${mod.name}'>`).addClass('tiyo-assistant-module');
        $(mainUI).find('.tiyo-assistant-content').append(elem);
        return elem;
    }

    // Kick things off...
    main();
    // Then export our module API
    window.tiy = tiy;
    console.log(window.tiy);

})(window.tiy || {}, window.jQuery);
