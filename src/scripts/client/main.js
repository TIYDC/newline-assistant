(function(tiy, $) {
    'use strict';

    // Public API methods
    tiy.loadModule = loadModule;
    tiy.showMessage = showMessage;

    // locals & constants
    let tiyoData = null;
    let navUI = null;
    let mainUI = null;
    let notifyUI = null;
    let modulesLoaded = [];
    let moduleDisplayed = null;
    let dataLoaded = false;
    let uiLoaded = false;

    const MAIN_TEMPLATE = 'templates/main.html';
    const NAV_TEMPLATE = 'templates/nav.html';
    const NOTIFICATIONS_TEMPLATE = 'templates/notifications.html';
    const PANEL_ANIMATION_TIME = 200;

    function main() {
        let spaceUsed = Object.keys(localStorage).reduce(function(total, k) {
            return ((typeof(total) === 'number' && total) || 0) + ((localStorage[k].length * 2)/1024/1024);
        }, 0);
        console.info('Initializing TIYO assistant... total localStorage used: ~%sMB', spaceUsed.toFixed(2));

        addFontAwesomeStyleSheet();
        setupNotificationsUI();

        collectData()
        .then(function getNavUI(data) {
            tiyoData = data;
            dataLoaded = true;
            console.log('Data gathered', data);
            return $.get(chrome.extension.getURL(NAV_TEMPLATE));
        })
        .then(function getMainUI(html) {
            navUI = $(html);
            $('.main .header:first').append(navUI);

            modulesLoaded.forEach(addNavIcon);
            navUI.on('click', 'li', toggleModuleUI);

            return $.get(chrome.extension.getURL(MAIN_TEMPLATE));
        })
        .then(function callModuleRenders(html) {
            mainUI = $(html);
            $('.main .content').prepend(mainUI);
            uiLoaded = true;

            setupContentClose();

            console.log('UI base loaded, calling render methods', mainUI);
            modulesLoaded.forEach(function(mod) {
                doRender(mod);
            });
        });
    }

    /**
    * Chrome extensions have issues with access files from css like fonts, so
    * we need to embed the styelsheet using the chromse extension URL, which
    * is dynamically generated. The remainder of the FA styles are in a static
    * stylesheet in /vendor
    */
    function addFontAwesomeStyleSheet() {
        $('head').append(
            $('<style>')
            .attr('type', 'text/css')
            .text(
                `@font-face {
                    font-family: FontAwesome;
                    src: url('${chrome.extension.getURL('vendor/fontawesome-webfont.woff')}');
                }`
            )
        );
    }

    function getUser() {
        try {
            return  JSON.parse(
                $( "#IntercomSettingsScriptTag" )
                .text()
                .split(";")[0]
                .replace("window.intercomSettings =", "")
                .replace(";", "")
                .trim()
            );
        } catch (e) {
            return;
        }
    }

    function collectData() {
        let pathname = window.location.pathname.split(/\//),
            data = {
                user: null,
                path: null,
                assignment_submission: null,
                assignment: null,
                content: null,
                group: null,
                students: []
            },
            group = $('.card-block dt:contains("Group")').next().find('a');

        data.user = getUser();

        // Admin view of path
        if (/\/admin\/paths\/[0-9]+/.test(window.location.pathname)) {
            data.path = {
                id: Number(pathname[3]),
                title: $('.content .breadcrumb li:eq(1)').text(),
                onPage: true
            };
        }

        if (/\/admin\/assignment_submissions\/[0-9]+/.test(window.location.pathname)) {
            data.assignment_submission = {
                id: Number(pathname[3]),
                onPage: true
            };
        }

        if (/\/admin\/assignments\/[0-9]+/.test(window.location.pathname)) {
            data.assignment = {
                id: Number(pathname[3]),
                onPage: true
            };
        }

        // Admin view of content piece
        if (/\/admin\/(lessons|assignmnents)\/[0-9]+/.test(window.location.pathname)) {
            data.content = {
                id: Number(pathname[3]),
                title: $('.content .breadcrumb li:eq(3)').text(),
                type: pathname[2],
                isAdmin: true
            };
        }

        // Student view of content piece
        if (/\/paths\/[0-9]+\/units\/[0-9]+\/[^\/]+\/[0-9]+/.test(window.location.pathname)) {
            data.path = {
                id: Number(pathname[2]),
                title: $('.m-pathheader-info-title').text(),
                onPage: false
            };
            data.content = {
                id: Number(pathname[6]),
                title: $('.m-lessonheader-title').text(),
                type: pathname[5],
                isAdmin: false
            };
        }

        let p;
        if (group.length) {
            data.group = {
                title: group.text(),
                id: Number(group.attr('href').match(/\/([0-9]+)/)[1])
            };

            p = new Promise(
              function(res) {
                $.get(group.attr('href')).then(function(html) {
                let students = $(html).find('#students tr td:first-child a');
                students.each(function() {
                    let studentElem = $(this).find('.profile-placeholder-medium, img').remove().end();
                    data.students.push({
                        id: Number(studentElem.attr('href').match(/\/([0-9]+)/)[1]),
                        name: studentElem.text()
                    });
                });
                res(data);
              }, function() {
                console.log( "Group Missing or you do not have access." );
                res(data);
              });
            });
        } else {
            p = Promise.resolve(data);
        }

        return p;
    }

    function addNavIcon(mod) {
        if (!navUI) { return; }

        navUI.find('ul').append(
            `<li data-module='${mod.name}' title='${mod.name}' aria-title='${mod.name}'><i class='fa ${mod.navIcon} fa-lg' aria-hidden='true'></i></li>`
        );
    }

    function toggleModuleUI(e) {
        e.preventDefault();
        var name = $(this).data('module');
        var mod = modulesLoaded.filter(function(m) { return m.name === name;});
        if (!mod.length) { return; }

        if (moduleDisplayed === mod[0].name) {
            console.log('hiding ', mod[0]);
            closeContent(e);
        } else {
            console.log('showing ', mod[0]);
            moduleDisplayed = mod[0].name;
            $('.tiyo-assistant-module').hide();
            $(`[data-module="${mod[0].name}"]`).show().trigger('showing');
            mainUI.slideDown(PANEL_ANIMATION_TIME);
        }
    }

    function closeContent(e) {
        e.preventDefault();
        $(`[data-module="${moduleDisplayed}"]`).show().trigger('hiding');
        moduleDisplayed = null;
        mainUI.slideUp(PANEL_ANIMATION_TIME);
    }

    function setupContentClose() {
        $('.tiyo-assistant-close').click(closeContent);
    }

    function loadModule(api) {
        if (!api) { return; }
        if (!api.name) { api.name = Date.getTime(); }

        console.info('loading module', api);

        modulesLoaded.push(api);

        addNavIcon(api);
        doRender(api);
    }

    function doRender(mod) {
        if (uiLoaded && typeof(mod.render) === 'function') {
            var elem = createModuleWrapper(mod);
            mod.render(tiyoData, elem);
        }
    }

    function createModuleWrapper(mod) {
        var elem = $(`<article data-module='${mod.name}'>`).addClass('tiyo-assistant-module');
        $(mainUI).find('.tiyo-assistant-content').append(elem);
        return elem;
    }

    function setupNotificationsUI() {
        $.get(chrome.extension.getURL(NOTIFICATIONS_TEMPLATE)).then(function(html) {
            notifyUI = $(html).appendTo('body');
            notifyUI.on('click', '.close', function() {
                $(this).parent().fadeOut(function() { $(this).remove(); });
            });
        });
    }

    function showMessage(msg, options = {}) {
        options.type = options.type || 'danger';
        options.duration = (Number(options.duration) || options.duration === 0) ? options.duration : 4;

        let dismissable = (options.canDismiss === false) ? '' : 'alert-dismissible';

        let msgNode = $(`<p class='alert alert-${options.type} ${dismissable}'>`).text(msg);

        if (dismissable.length) {
            msgNode.append(`<button class='close'>&times;</button>`);
        }

        notifyUI.append(msgNode);

        if (options.duration && options.duration > 0) {
            setTimeout(function() {
                msgNode.fadeOut(function() { $(this).remove(); });
            }, (options.duration * 1000));
        }
    }

    // Kick things off...
    main();
    // Then export our module API
    window.tiy = tiy;

})(window.tiy || {}, window.jQuery);
