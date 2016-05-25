( function( tiy, $ ) {
    'use strict';

    tiy.loadModule( {
        name: 'gradebook',
        render: main
    } );

    // HACK so we can not show the logged in instructor if they belong to the
    // path
    let user = eval( $( "#IntercomSettingsScriptTag" ).text() );

    const shortGradeNames = {
        'Exceeds expectations': 'E',
        'Complete and satisfactory': 'S',
        'Complete and unsatisfactory': 'U',
        'Incomplete': 'I',
        'Not graded': ''
    }

    const okGrades = [
        'Complete and satisfactory',
        'Exceeds expectations',
        'Not graded'
    ];

    function main( data, el, c ) {
        $( '#generate-score-card' ).click( function() {
            console.info( "DDOSsing  TIYO" );
            $( '#generate-score-card' ).text( "Processing" ).prop( "disabled", true );
            generateGradebook( data.group.id, 118, function( students, assignments ) {
                buildGradebookUI( el, students, assignments );
            } );
        } );

        $( '#display-gradebook' ).click( function() {
            var students = JSON.parse( localStorage.getItem( 'cachedStudents' ) );
            var assignments = JSON.parse( localStorage.getItem( 'cachedAssignments' ) );
            students = calculateGrades( students );
            console.log(students);
            buildGradebookUI( el, students, assignments );
        } );
    }


    // TODO Adapt math to New Data Structure
    var calculateGrades = students => {
        var status = '';
        Object.keys( students ).map( ( name, i ) => {
            var student = students[ name ];
            var submissions = Object.keys( student );
            var okCount = submissions.filter( t => {
              console.log(student[ t ].submission.text,   okGrades.includes( student[ t ].submission.text ));

              return okGrades.includes( student[ t ].submission.text );
            })

            var percent = okCount.length / submissions.length * 100;
            console.log(percent);
            student.grade = percent.toFixed(0);
        } );


        return students;
    };

    function buildGradebookUI( $main, data, assignments ) {
        $main.html( '' );
        $main.append( '<table class=\"table table-condensed\"><tbody></tbody></table>' );
        var $table = $main.find( 'table' );
        var row = $( '<tr>' );
        $table.prepend( '<thead>' );
        row.append( $( '<th>' ).append( "Student" ) );
        for ( var assignment in assignments ) {
            row.append( $( '<th>' ).append( $( '<a>' )
                .text( assignment.slice( 0, 1 ) )
                .prop( 'href', assignments[ assignment ].href )
                .prop( 'title', assignment )
            ) );
        }
        $table.find( 'thead' ).append( row );

        for ( var student in data ) {
            // Never display the instructor in the gradebook
            if ( user.name === student ) {
                continue;
            }

            var studentRow = $( '<tr>' );

            studentRow.append(
              $( '<td>' ).append(
                $('<a>')
                  .text(student)
                  .prop("href", "#")
                  .prop('title', `Grade: ${data[student].grade}%`)
              )
            );

            for ( assignment in assignments ) {
                if ( data[ student ][ assignment ] ) {
                    var submission = data[ student ][ assignment ].submission;
                    studentRow.append( $( '<td>' ).append(
                        $( '<a>' ).text( shortGradeNames[ submission.text ] )
                        .prop( 'href', submission.href )
                        .prop( 'target', 'blank' )
                        .prop( 'title', assignment )

                    ).addClass( `grade ${shortGradeNames[submission.text].toLowerCase()}` ) );
                } else {
                    studentRow.append( $( '<td>' ) );
                }
            }
            $table.append( studentRow );
        }
    }

    function generateGradebook( groupId, pathId, callback ) {

        var group = id => `https://online.theironyard.com/admin/groups/${ id }`;
        var path = id => `https://online.theironyard.com/admin/paths/${ id }`;

        var slice = c => [].slice.call( c );
        var qs = ( el, s ) => el.querySelector( s );
        var qsa = ( el, s ) => slice( el.querySelectorAll( s ) );

        var getGroup = id => new Promise( ( res, rej ) => {
            $.get( group( id ) ).then( html => {
                var dom = document.createElement( 'html' );
                dom.innerHTML = html;

                var students = qsa( dom, '#students table tbody tr' ).map( x =>
                    qs( qs( x, 'td' ), 'a' ).href );

                res( students );
            } );
        } );

        var states = [ 'public', 'current' ];

        var getPath = id => new Promise( ( res, rej ) => {
            $.get( path( id ) ).then( html => {
                var dom = document.createElement( 'html' );
                dom.innerHTML = html;

                var titles = [];

                var promises = qsa( dom, '.assignment a.text-body' ).map( x => $
                    .get(
                        x.href ).then( html => {
                        var aPage = document.createElement( 'html' );
                        aPage.innerHTML = html;

                        var o = qs( aPage,
                            "#state option[selected='selected']" );
                        if ( o && states.indexOf( o.value ) !== -1 ) titles.push(
                            x.innerText );
                    } ) );

                $.when( ...promises ).then( () => res( titles ) );
            } );
        } );

        var studentUrls = getGroup( groupId );
        var assignmentTitles = getPath( pathId );

        var keys = a => Object.keys( a );


        Promise.all( [ studentUrls, assignmentTitles ] ).then( ( [ s, a ] ) => {
            var students = {};
            var assignments = {};

            Promise.all( s.map( url => new Promise( ( res, rej ) => {
                $.get( url ).then( html => {
                    var studentPage = document.createElement( 'html' );
                    studentPage.innerHTML = html;

                    var name = qs( studentPage, 'h1 strong' ).innerText;
                    students[ name ] = {};

                    qsa( studentPage, '#assignments table tbody tr' ).map(
                        row => {
                            var assignment = {
                                text: qs( row, 'td a' ).innerText,
                                href: qs( row, 'td a' ).getAttribute( 'href' )
                            };

                            assignments[ assignment.text ] = assignment;

                            var status = {
                                text: qs( qsa( row, 'td' )[ 2 ], 'label' ).innerText.trim(),
                                href: qs( qsa( row, 'td' )[ 1 ], 'a' ).getAttribute( 'href' )
                            };

                            if ( status.text !== 'Retracted' ) {
                                students[ name ][ assignment.text ] = {
                                    assignment: assignment,
                                    submission: status
                                };
                            }

                        } );

                    res();
                } );
            } ) ) ).then( () => {
                localStorage.setItem( 'cachedStudents', JSON.stringify( students ) );
                localStorage.setItem( 'cachedAssignments', JSON.stringify( assignments ) );
                callback( students, assignments );
            } );
        } );
    }


} )( window.tiy || {}, window.jQuery );
