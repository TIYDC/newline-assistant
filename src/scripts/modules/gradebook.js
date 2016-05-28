( function( tiy, $ ) {
    'use strict';

    tiy.loadModule( {
        name: 'gradebook',
        navIcon: 'fa-book',
        render: main
    } );

    // HACK so we can not show the logged in instructor if they belong to the
    // path
    let user = eval( $( "#IntercomSettingsScriptTag" ).text() );
    let uiBuilt = false;

    let tableTemplate = `
      <table class=\"table table-condensed\">
        <thead></thead>
        <tbody></tbody>
      </table>
      <br>
      <section class="actions">
        <button type="button" class="btn btn-secondary btn-sm" id="generate-score-card">
          <i class="fa fa-refresh"></i> Refresh Grades
        </button>
      </section>
      `;

    const shortGradeNames = {
        'Exceeds expectations': 'E',
        'Complete and satisfactory': 'S',
        'Complete and unsatisfactory': 'U',
        'Incomplete': 'I',
        'Not graded': '?',
        'Retracted': 'R'
    };

    const okGrades = [
        'Complete and satisfactory',
        'Exceeds expectations',
        'Not graded'
    ];

    function main( sessionData, $el ) {
        $( $el ).on( 'showing', function() {
            if ( uiBuilt ) {
                return;
            }

            var students = JSON.parse( localStorage.getItem( 'cachedStudents' ) );
            var assignments = JSON.parse( localStorage.getItem( 'cachedAssignments' ) );

            resetUI( sessionData, $el );
            buildGradebookUI( $el, students, assignments );

            uiBuilt = true;
        } );
    }

    function resetUI ( sessionData, $el ) {
        $el.html( '' );
        $el.append( tableTemplate );

        $( '#generate-score-card' ).click( function() {
            console.info( "DDOSsing  TIYO" );
            $( '#generate-score-card' ).text( "Processing" ).prop( "disabled", true );
            generateGradebook( sessionData.group.id, sessionData.path.id, function( students, assignments ) {
                resetUI( sessionData, $el );
                buildGradebookUI( $el, students, assignments );
            } );
        } );
    }

    function calculateGrades ( students ) {
        if ( !students ) {
            return;
        }

        // Question, What is the the best practice for building an uniq array of objects in JS.
        Object.keys( students ).map( ( studentName ) => {
            var student = students[ studentName ];
            var submissions = Object.keys( student );

            var okCount = submissions.filter( assignmentName => {
                return okGrades.includes( student[ assignmentName ].submission.grade );
            } );

            var grade = okCount.length / submissions.length * 100;
            student.percentage = grade.toFixed( 0 );
        } );
        return students;
    }

    function buildGradebookAssignmentsHeader( assignments ) {
        var row = $( '<tr>' );
        row.append( $( '<th>' ).append( "Student" ) );

        for ( var assignment in assignments ) {
            if ( assignments.hasOwnProperty( assignment ) ) {
                row.append( $( '<th>' ).append( $( '<a>' )
                    .text( assignment.slice( 0, 1 ) )
                    .prop( 'href', assignments[ assignment ].href )
                    .prop( 'title', assignment )
                ) );
            }
        }

        return row;
    }

    function buildGradebookStudentRow( student, assignments ) {

        var studentRow = $( '<tr>' );

        studentRow.append(
            $( '<td>' ).append(
                $( '<a>' )
                .text( student.name )
                .prop( "href", "#" )
                .prop( 'title', `Grade: ${student.percentage}%` )
            )
        );

        for ( var assignment in assignments ) {
            if ( student[ assignment ] ) {
                var submission = student[ assignment ].submission;

                studentRow.append( $( '<td>' ).append(
                    $( '<a>' ).text( shortGradeNames[ submission.grade ] )
                    .prop( 'href', submission.href )
                    .prop( 'target', 'blank' )
                    .prop( 'title', assignment )

                ).addClass( `grade ${shortGradeNames[submission.grade].toLowerCase()}` ) );
            } else {
                studentRow.append( $( '<td>' ) );
            }
        }

        return studentRow;
    }

    function buildGradebookUI( $el, students, assignments ) {
        var $table = $el.find( 'table' );
        $table.find( 'thead' )
            .append( buildGradebookAssignmentsHeader( assignments ) );

        for ( var studentName in students ) {
            if ( students.hasOwnProperty( studentName ) ) {
                // Never display the instructor in the gradebook
                if ( user.name === studentName ) {
                    continue;
                }

                var student = students[ studentName ];
                $table.append( buildGradebookStudentRow( student, assignments ) );
            }
        }
    }

    function generateGradebook( groupId, pathId, callback ) {

        var group = id => `https://online.theironyard.com/admin/groups/${ id }`;
        var path = id => `https://online.theironyard.com/admin/paths/${ id }`;

        var slice = c => [].slice.call( c );
        var qs = ( el, s ) => el.querySelector( s );
        var qsa = ( el, s ) => slice( el.querySelectorAll( s ) );

        var getGroup = id => new Promise( ( res ) => {
            $.get( group( id ) ).then( html => {
                var dom = document.createElement( 'html' );
                dom.innerHTML = html;

                var students = qsa( dom, '#students table tbody tr' ).map( x =>
                    qs( qs( x, 'td' ), 'a' ).href );

                res( students );
            } );
        } );

        var states = [ 'public', 'current' ];

        var getPath = id => new Promise( ( res ) => {
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
                        if ( o && states.indexOf( o.value ) !== -1 ) {
                            titles.push( x.innerText );
                        }
                    } ) );

                $.when( ...promises ).then( () => res( titles ) );
            } );
        } );

        var studentUrls = getGroup( groupId );
        var assignmentTitles = getPath( pathId );

        Promise.all( [ studentUrls, assignmentTitles ] ).then( ( [ s ] ) => {
            var students = {};
            var assignments = {};

            Promise.all( s.map( url => new Promise( ( res ) => {
                $.get( url ).then( html => {
                    var studentPage = document.createElement( 'html' );
                    studentPage.innerHTML = html;

                    var name = qs( studentPage, 'h1 strong' ).innerText;
                    students[ name ] = {};

                    qsa( studentPage, '#assignments table tbody tr' ).map(
                        row => {
                            var assignment = {
                                name: qs( row, 'td a' ).innerText,
                                href: qs( row, 'td a' ).getAttribute( 'href' )
                            };

                            assignments[ assignment.name ] = assignment;

                            var submission = {
                                grade: qs( qsa( row, 'td' )[ 2 ], 'label' ).innerText.trim(),
                                href: qs( qsa( row, 'td' )[ 1 ], 'a' ).getAttribute( 'href' ),
                                submitted_at: qsa( row, 'td' )[ 3 ].innerText.trim()
                            };

                            if ( submission.grade !== 'Retracted' ) {
                                students[ name ][ assignment.name ] = {
                                    name: name,
                                    assignment: assignment,
                                    submission: submission
                                };
                            }

                        } );

                    res();
                } );
            } ) ) ).then( () => {
                students = calculateGrades( students );
                localStorage.setItem( 'cachedStudents', JSON.stringify( students ) );
                localStorage.setItem( 'cachedAssignments', JSON.stringify( assignments ) );
                callback( students, assignments );
            } );
        } );
    }


} )( window.tiy || {}, window.jQuery );
