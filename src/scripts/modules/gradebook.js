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
    // $( "#IntercomSettingsScriptTag" ).text().replace("window.intercomSettings =", "").replace(";", "")
    let user = eval( $( "#IntercomSettingsScriptTag" ).text() );
    let uiBuilt = false;

    const TABLE_TEMPLATE = `
      <table class="table table-condensed">
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

    const PARSING_TIME_FORMAT = "MMM DD, YYYY hh:mm A";

    // Behavior ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

    function main( sessionData, $el ) {
        $( $el ).on( 'showing', function() {
            show( sessionData, $el );
        } );
    }

    function show( sessionData, $el ) {
        let gradebook_data;

        if ( uiBuilt ) {
            return;
        }

        try {
            gradebook_data = JSON.parse(
                localStorage.getItem( 'cachedGradeBookData' )
            );

        } catch ( e ) {}

        resetUI( sessionData, $el );

        if ( gradebook_data ) {
            try {
                buildUI(
                    $el,
                    gradebook_data.students,
                    gradebook_data.assignments
                );
            } catch ( e ) {
                localStorage.removeItem( 'cachedGradeBookData' );
            }
        } else {
            getGradebook( sessionData, $el );
        }

        uiBuilt = true;
    }


    function getGradebook( sessionData, $el ) {
        console.info( "DDOSsing  TIYO" );

        if ( sessionData.group === null && sessionData.path === null ) {
            // Provide feedback to the user that we can't handle this.
            return;
        }

        $( '#generate-score-card' ).text( "Processing" ).attr( "disabled", true );

        try {
            scrape( sessionData.group.id, sessionData.path.id, function( students, assignments ) {
                resetUI( sessionData, $el );
                buildUI( $el, students, assignments );
            } );
        } catch ( e ) {
            console.warn( "it blewup", e );
            // Wrap in try catch to show UI to user that something went wrong ( user permissions? )
            $el.find( '.tiyo-assistant-notice' ).text( 'There was a problem getting all the data for this gradebooks, do you own this path?!' );
        }
    }

    // UI ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

    function resetUI( sessionData, $el ) {
        $el.html( '' );
        $el.append( TABLE_TEMPLATE );

        $( '#generate-score-card' ).click( function() {
            getGradebook( sessionData, $el );
        } );
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

            let student = students[ studentId ];
            $table.append( buildStudentRow( student, assignments ) );
        }
    }

    function buildAssignmentsHeader( assignments ) {
        const row = $( '<tr>' );
        row.append( $( '<th>' ).append( "Student" ) );
        row.append( $( '<th>' ).append( "Grade" ) );

        for ( let assignment of assignments ) {
            row.append( `
              <th data-tooltip='${assignment.name}'>
                <a href='${assignment.href}' title='${assignment.name}'>
                  ${assignment.name.slice( 0, 1 )}
                </a>
              </th>
            ` );
        }

        return row;
    }

    function buildStudentRow( student, assignments ) {
        const studentRow = $( '<tr>' );

        studentRow.append(
            `
            <td>
                <a href='/admin/users/${student.id}' title='Grade: ${student.percentage}%'>
                ${student.name}
                </a>
            </td>
            `
        );

        studentRow.append(
            `<td>${student.percentage}%</td>`
        );

        for ( let assignment of assignments ) {
            let submission = student.submissions[ assignment.id ];

            if ( submission ) {
                let gradeClass = SHORT_GRADE_NAMES[ submission.grade ].toLowerCase();
                studentRow.append(
                    `
                  <td class='grade ${gradeClass}' date-tooltip='${assignment.name}' >
                    <a href='${submission.href}' title='${assignment.name}%' target='blank' >
                      ${SHORT_GRADE_NAMES[ submission.grade ]}
                    </a>
                  </td>
                  `
                );
            } else {
                studentRow.append( '<td></td>' );
            }
        }

        return studentRow;
    }

    // Data Management +++++++++++++++++++++++++++++++++++++++++++++++++++++++++

    let idFromUrl = uri => Number( uri.substr( uri.lastIndexOf( '/' ) + 1 ) );

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
        var states = [ 'public', 'current' ];
        var group = id => `https://online.theironyard.com/admin/groups/${ id }`;
        var path = id => `https://online.theironyard.com/admin/paths/${ id }`;
        var slice = c => [].slice.call( c );
        var qs = ( el, s ) => el.querySelector( s );
        var qsa = ( el, s ) => slice( el.querySelectorAll( s ) );

        function scrapeStudentsFromGroup( html ) {
            let dom = document.createElement( 'html' );
            dom.innerHTML = html;

            let students = qsa( dom, '#students table tbody tr' ).map( x =>
                qs( qs( x, 'td' ), 'a' ).href );

            return students;
        }

        var getGroup = id => new Promise( ( res ) => {
            $.get( group( id ) ).then( html => {
                res( scrapeStudentsFromGroup( html ) );
            } );
        } );

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

        function scrapeStudentPage( students, assignments, url, html ) {
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

            qsa( studentPage, '#assignments table tbody tr' ).map( row => {

                let studentSubmissionPath = qs( qsa( row, 'td' )[ 1 ], 'a' ).getAttribute( 'href' );
                let assignmentPath = qs( row, 'td a' ).getAttribute( 'href' );

                let submission = {
                    id: idFromUrl( studentSubmissionPath ),
                    grade: qs( qsa( row, 'td' )[ 2 ], 'label' ).innerText.trim(),
                    href: studentSubmissionPath,
                    submitted_at: moment( qsa( row, 'td' )[ 3 ].innerText.trim(), PARSING_TIME_FORMAT ),
                    assignment: null
                };

                let assignmentId = idFromUrl( assignmentPath );
                let assignment = assignments.find( function( a ) {
                    return a.id === assignmentId;
                } );

                if ( assignment ) {
                    if ( submission.submitted_at < assignment.first_submission_at ) {
                        assignment.first_submission_at = submission.submitted_at;
                    }
                } else {
                    assignment = {
                        id: assignmentId,
                        name: qs( row, 'td a' ).innerText,
                        href: assignmentPath,
                        first_submission_at: submission.submitted_at
                    };
                    assignments.push( assignment );
                }

                if ( !IGNORED_GRADES.includes( submission.grade ) ) {
                    submission.assignment = assignment;
                    students[ studentId ].submissions[ assignment.id ] = submission;
                }

            } );

        }

        Promise.all( [ studentUrls, assignmentTitles ] ).then( ( [ s ] ) => {
            let students = {};
            let assignments = [];

            Promise.all( s.map( url => new Promise( ( res ) => {
                $.get( url ).then( html => res( scrapeStudentPage( students, assignments, url, html ) ) );
            } ) ) ).then( () => {

                assignments.sort( function( a, b ) {
                    return new Date( b.first_submission_at ) - new Date( a.first_submission_at );
                } );

                students = calculateGrades( students, assignments );

                const gradebook_data = {
                    students: students,
                    assignments: assignments
                };

                localStorage.setItem( 'cachedGradeBookData', JSON.stringify( gradebook_data ) );
                callback( gradebook_data.students, gradebook_data.assignments );
            } );
        } );
    }

} )( window.tiy || {}, window.jQuery, window.moment );
