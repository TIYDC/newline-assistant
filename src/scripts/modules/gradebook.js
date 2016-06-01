( function( tiy, $, moment ) {
    'use strict';

    tiy.loadModule( {
        name: 'gradebook',
        navIcon: 'fa-book',
        render: main
    } );

    // HACK so we can not show the logged in instructor if they belong to the
    // path
    // Possible solution, tap into primary window
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

    const SHORT_GRADE_NAMES = {
        'Exceeds expectations': 'E',
        'Complete and satisfactory': 'S',
        'Complete and unsatisfactory': 'U',
        'Incomplete': 'I',
        'Not graded': 'G',
        'Retracted': 'R'
    };

    const OK_GRADES = [
        'Complete and satisfactory',
        'Exceeds expectations',
        'Not graded'
    ];

    const IGNORED_GRADES = [
        'Retracted'
    ];

    const TIME_FORMAT = "MMM DD, YYYY hh:mm A";

    // Behavior ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

    function main( sessionData, $el ) {
        $( $el ).on( 'showing', function() {
            if ( uiBuilt ) {
                return;
            }

            const GRADEBOOKDATA = JSON.parse( localStorage.getItem( 'cachedGradeBookData' ) );

            function getGradebook() {
                console.info( "DDOSsing  TIYO" );
                $( '#generate-score-card' ).text( "Processing" ).attr( "disabled", true );
                scrape( sessionData.group.id, sessionData.path.id, function( students, assignments ) {
                    resetUI( sessionData, $el );
                    buildUI( $el, students, assignments );
                } );
            }

            function resetUI() {
                $el.html( '' );
                $el.append( tableTemplate );

                $( '#generate-score-card' ).click( getGradebook );
            }

            resetUI();

            if ( GRADEBOOKDATA ) {
                try {
                    buildUI(
                        $el,
                        GRADEBOOKDATA.students,
                        GRADEBOOKDATA.assignments
                    );
                } catch ( e ) {
                    localStorage.removeItem( 'cachedGradeBookData' );
                }
            } else {
                getGradebook();
            }

            uiBuilt = true;
        } );
    }

    // UI ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

    function buildAssignmentsHeader( assignments ) {
        var row = $( '<tr>' );
        row.append( $( '<th>' ).append( "Student" ) );
        row.append( $( '<th>' ).append( "Grade" ) );

        for ( let assignment of assignments ) {
            row.append( $( '<th>' ).append( $( '<a>' )
                .text( assignment.name.slice( 0, 1 ) )
                .attr( 'href', assignment.href )
                .attr( 'title', assignment.name )


            ).attr( 'data-tooltip', assignment.name )
           );
        }

        return row;
    }

    function buildStudentRow( student, assignments ) {
        const studentRow = $( '<tr>' );

        studentRow.append(
            $( '<td>' ).append(
                $( '<a>' )
                .text( student.name )
                .attr( "href", `/admin/users/${student.id}` )
                .attr( 'title', `Grade: ${student.percentage}%` )
            )
        );

        studentRow.append(
            $( '<td>' ).text( `${student.percentage}%` )
        );

        for ( let assignment of assignments ) {
            let submission = student.submissions[ assignment.id ];

            if ( submission ) {
                studentRow.append(
                    $( '<td>' ).append(
                        $( '<a>' ).text( SHORT_GRADE_NAMES[ submission.grade ] )
                        .attr( 'href', submission.href )
                        .attr( 'target', 'blank' )
                        .attr( 'title', assignment.name )
                    )
                    .attr( 'data-tooltip', assignment.name )
                    .addClass(
                        `grade ${SHORT_GRADE_NAMES[submission.grade].toLowerCase()}`
                    )
                );
            } else {
                studentRow.append( $( '<td>' ) );
            }
        }

        return studentRow;
    }

    function buildUI( $el, students, assignments ) {
        const $table = $el.find( 'table' );
        $table.find( 'thead' )
            .append( buildAssignmentsHeader( assignments ) );

        const orderedStudents = Object.keys( students ).sort();
        for ( let studentId of orderedStudents ) {
            // Never display the instructor in the gradebook
            if ( user.user_id.toString() === studentId ) {
                continue;
            }

            var student = students[ studentId ];
            $table.append( buildStudentRow( student, assignments ) );
        }
    }

    // Data Management +++++++++++++++++++++++++++++++++++++++++++++++++++++++++

    function calculateGrades( students, assignments ) {
        if ( !students ) {
            return;
        }

        // Question, What is the the best practice for building an uniq array
        // of objects in JS.
        Object.keys( students ).map( ( studentName ) => {
            var student = students[ studentName ];

            var submissions = Object.keys( student.submissions );

            var okCount = submissions.filter( assignmentId => {
                return OK_GRADES.includes( student.submissions[ assignmentId ].grade );
            } );

            var grade = okCount.length / assignments.length * 100;
            student.percentage = grade.toFixed( 0 );
        } );
        return students;
    }


    function scrape( groupId, pathId, callback ) {

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
            var assignments = [];

            let idFromUrl = ( href ) => {
                return Number( href.substr( href.lastIndexOf( '/' ) + 1 ) )
            }

            Promise.all( s.map( url => new Promise( ( res ) => {
                $.get( url ).then( html => {

                    var studentPage = document.createElement( 'html' );
                    studentPage.innerHTML = html;

                    var name = qs( studentPage, 'h1 strong' ).innerText;
                    let studentId = idFromUrl( url );

                    students[ studentId ] = {
                        id: studentId,
                        name: name,
                        percentage: null,
                        submissions: {}
                    };


                    qsa( studentPage, '#assignments table tbody tr' ).map(
                        row => {

                            let studentSubmissionPath = qs( qsa( row, 'td' )[ 1 ], 'a' ).getAttribute( 'href' );
                            let assignmentPath = qs( row, 'td a' ).getAttribute( 'href' );

                            var submission = {
                                id: idFromUrl( studentSubmissionPath ),
                                grade: qs( qsa( row, 'td' )[ 2 ], 'label' ).innerText.trim(),
                                href: studentSubmissionPath,
                                submitted_at: moment( qsa( row, 'td' )[ 3 ].innerText.trim(), TIME_FORMAT ),
                                assignment: null
                            };

                            var assignment = {
                                id: idFromUrl( assignmentPath ),
                                name: qs( row, 'td a' ).innerText,
                                href: assignmentPath,
                                first_submission_at: submission.submitted_at
                            };

                            var exsiting_assignment = assignments.find( function( a ) {
                                return a.id === assignment.id;
                            } );

                            if ( typeof( exsiting_assignment ) === 'undefined' ) {
                                assignments.push( assignment );
                            } else {
                                assignment = exsiting_assignment;
                            }

                            if ( submission.submitted_at < assignment.first_submission_at ) {
                                assignment.first_submission_at = submission.submitted_at;
                            }

                            if ( !IGNORED_GRADES.includes( submission.grade ) ) {
                                submission.assignment = assignment;
                                students[ studentId ].submissions[ assignment.id ] = submission;
                            }

                        } );

                    res();
                } );
            } ) ) ).then( () => {

                assignments.sort( function( a, b ) {
                    return new Date( b.first_submission_at ) - new Date( a.first_submission_at );
                } );

                students = calculateGrades( students, assignments );

                const GRADEBOOKDATA = {
                    students: students,
                    assignments: assignments
                };

                localStorage.setItem( 'cachedGradeBookData', JSON.stringify( GRADEBOOKDATA ) );
                callback( GRADEBOOKDATA.students, GRADEBOOKDATA.assignments );
            } );
        } );
    }

} )( window.tiy || {}, window.jQuery, window.moment );
