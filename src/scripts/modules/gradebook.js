( function( tiy, $, moment ) {
    'use strict';

    tiy.loadModule( {
        name: 'gradebook',
        navIcon: 'fa-book',
        render: main
    } );

    let uiBuilt = false;

    const TABLE_TEMPLATE = `
      <table class="table table-condensed">
        <thead></thead>
        <tbody></tbody>
      </table>
    `;

    const GRADEBOOK_TEMPLATE = `
      <h6 id='path-title'></h6>

      <div class="grades">
        ${TABLE_TEMPLATE}
      </div>
      
      <br>
      <section class="actions">
        <div id="display-options">
            Show assignments:
            <label>
                <input type="checkbox" id="show_without_due_date" /> without due dates
            </label>
            <label>
                <input type="checkbox" id="show_with_future_due_date" /> with future due dates
            </label>
            <label>
                <input type="checkbox" id="show_with_no_submissions" /> with no submissions
            </label>
            <label>
                <input type="checkbox" id="show_hidden" /> hidden assignments
            </label>
        </div>
        
        <button type="button" class="btn btn-secondary btn-sm" id="generate-score-card">
          <i class="fa fa-refresh"></i> Refresh Grades
        </button>
        <small class='text-muted'>
          as of
          <span id='last-scraped'>Never</span>
        </small>
        
        
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
    const slice = c => [].slice.call( c );
    const qs = ( el, s ) => el.querySelector( s );
    const qsa = ( el, s ) => slice( el.querySelectorAll( s ) );

    // Behavior ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++



    function main( sessionData, $el ) {
        $( $el ).on( 'showing', function() {
            show( sessionData, $el );
        } );
    }

    function loadCachedGradebooks() {
      let gradebooks;
      try {
          gradebooks = JSON.parse(
              localStorage.getItem( 'cachedGradeBookData' )
          );

      } catch ( e ) {}
      gradebooks = gradebooks || {};
      return gradebooks;
    }

    function loadCachedSession() {
      let session;
      try {
          session = JSON.parse(
              localStorage.getItem( 'cachedGradeBookDataSession' )
          );
      } catch ( e ) {}
      session = session || { path: null };
      return session;
    }

    function show( sessionData, $el ) {

        if ( uiBuilt ) {
            return;
        }

        let cachedSession = loadCachedSession();
        console.log(sessionData, cachedSession);
        if ( sessionData.path === null && cachedSession.path === null ) {
            // Provide feedback to the user that we can't handle this.
            $el.text( 'Have you visited a path recently, we don\'t know what gradebook you want to see, go to a path you own and try again?!' );
            return;
        } else if ( sessionData.path === null && cachedSession.path !== null  ) {
          sessionData = cachedSession;
        } else {
          localStorage.setItem( 'cachedGradeBookDataSession', JSON.stringify(sessionData) );
        }

        let gradebooks = loadCachedGradebooks();
        let gradebook_data = gradebooks[ sessionData.path.id ];

        resetUI( sessionData, $el );

        sessionData.settings = JSON.parse(localStorage.getItem( 'display_settings' )) || {};

        if ( gradebook_data ) {
            try {
                buildUI(
                    sessionData,
                    $el,
                    gradebook_data
                );
            } catch ( e ) {
                localStorage.removeItem( 'cachedGradeBookData' );
            }
        } else {
            getGradebook( sessionData, $el );
        }

        uiBuilt = true;

        $("#display-options input[type='checkbox']").click(function(){
            let display_settings = {};

            $("#display-options input[type='checkbox']").each(function(item){
                let setting = $(this).attr("id");
                let enabled = $(this).is(':checked');
                display_settings[setting] = enabled;    
            });

            localStorage.setItem( 'display_settings', JSON.stringify( display_settings ) );
            
            sessionData.settings = display_settings;
            
            $el.find("table").replaceWith(TABLE_TEMPLATE);
            buildUI( sessionData, $el, gradebook_data );
        });
    }


    function getGradebook( sessionData, $el ) {
        console.info( "DDOSsing  TIYO for path: ", sessionData.path.id );

        $( '#generate-score-card' ).text( "Processing" ).attr( "disabled", true );

        try {
            scrape( sessionData, function( gradebook ) {
                $el.find("table").replaceWith(TABLE_TEMPLATE);
                $( '#generate-score-card' ).text( "Refresh Grades" ).attr( "disabled", false );

                buildUI( sessionData, $el, gradebook );
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
        $el.append( GRADEBOOK_TEMPLATE );

        $( '#generate-score-card' ).click( function() {
            getGradebook( sessionData, $el );
        } );
    }

    function buildUI( sessionData, $el, gradebook ) {

        $("#show_without_due_date").prop("checked", sessionData.settings.show_without_due_date);
        $("#show_with_future_due_date").prop("checked", sessionData.settings.show_with_future_due_date);
        $("#show_with_no_submissions").prop("checked", sessionData.settings.show_with_no_submissions);
        $("#show_hidden").prop("checked", sessionData.settings.show_hidden);

        let students = gradebook.students;
        let assignments = gradebook.assignments;
        const $table = $el.find( 'table' );
        $table.find( 'thead' )
            .append( buildAssignmentsHeader( assignments, sessionData.settings ) );

        const orderedStudents = Object.keys( students ).sort();
        for ( let studentId of orderedStudents ) {
            // Never display the instructor in the gradebook
            if ( sessionData.user.user_id.toString() === studentId ) {
                continue;
            }

            let student = students[ studentId ];
            $table.append( buildStudentRow( student, assignments, sessionData.settings ) );
        }

        $el.find('#path-title').html(
          `<a href='/admin/paths/${sessionData.path.id}'>
          ${gradebook.title}
          </a>`);
        $el.find('#last-scraped').text(moment(gradebook.scraped_at).fromNow());

    }

    function buildAssignmentsHeader( assignments, settings ) {
        const row = $( '<tr>' );
        row.append( $( '<th>' ).append( "Student" ) );
        row.append( $( '<th>' ).append( "Grade" ) );

        for ( let assignment of assignments ) {
            if(displayAssignment(assignment, settings)){
                row.append( `
                  <th data-tooltip='${assignment.title}'>
                    <a href='${assignment.href}' title='${assignment.title}' class="title">
                      ${assignment.title}
                    </a>
                  </th>
                ` ); // .slice( 0, 1 )
            }
        }

        return row;
    }

    function displayAssignment(assignment, settings){
        let display = true;

        // display assignments without a due date?
        if(!settings.show_without_due_date && assignment.due_date === null){
            display = false;
        }
        // display assignments with a future due date?
        if(!settings.show_with_future_due_date && new Date(assignment.due_date) > new Date()){
            display = false;
        }
        // display assignments with no submissions?
        if(!settings.show_with_no_submissions && assignment.first_submission_at === null){
            display = false;
        }
        // display hidden assignments?
        if(!settings.show_hidden && assignment.hidden_state === true){
            display = false;
        }

        return display;
    }

    function buildStudentRow( student, assignments, settings ) {
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
            `<td>${calculateStudentPercentage(student, assignments, settings)}%</td>`
        );

        for ( let assignment of assignments ) {
            if(displayAssignment(assignment, settings)){
                let submission = student.submissions[ assignment.id ];

                let gradeClass = submission && submission.grade ? SHORT_GRADE_NAMES[ submission.grade ].toLowerCase() : "none";

                if ( submission ) {
                    studentRow.append(
                        `
                      <td class='grade ${gradeClass}' date-tooltip='${assignment.title}' >
                        <a href='${submission.href}' title='${assignment.title}' target='blank' >
                          ${SHORT_GRADE_NAMES[ submission.grade ]}
                        </a>
                      </td>
                      `
                    );
                } else {
                    studentRow.append( `
                      <td class='grade ${gradeClass}' date-tooltip='${assignment.title}' >
                        <span>&nbsp;</span>
                      </td>
                    ` );
                }
            }
        }

        return studentRow;
    }

    function calculateStudentPercentage(student, assignments, settings){
        // filter to only the assignments we want to display
        let filtered_assignments = assignments.filter( assignment => displayAssignment(assignment, settings));
        let filtered_assignment_ids = filtered_assignments.map( assignment => assignment.id );

        var submissions = Object.keys( student.submissions );

        var okCount = submissions.filter( assignmentId => {
            return OK_GRADES.includes( student.submissions[ assignmentId ].grade ) && filtered_assignment_ids.includes(parseInt(assignmentId));
        } );

        let percent = (okCount.length / filtered_assignments.length) * 100;
        return percent.toFixed(0);
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

    function getPathContent(path) {
      const pathURI = id => `https://online.theironyard.com/admin/paths/${ id }`;

      return new Promise( ( res, rej ) => {
        if (/\/admin\/paths\/[0-9]+/.test(window.location.pathname)) {
          path.content = scrapePathContent(document)
          res(path);
        } else {
          $.get( pathURI( path.id ) ).then( html => {
            var dom = document.createElement( 'html' );
            dom.innerHTML = html;
            path.content = scrapePathContent(dom)
            res( path );
          } ).fail( err => rej(err));
        }
      } );
    }

    function scrapePathContent(dom) {
      let allContent = {
        assignments: [],
        lessons: [],
        units: []
      };

      qsa( dom, '.path-tree-level' ).forEach( x => {
        // Anything that has a GID has been persisted by Rails.
        let gid = x.getAttribute('data-id');

        if (gid) {
          let title = qs( x, "a.text-body" ).innerText;
          let href = qs( x, "a.text-body" ).getAttribute('href');
          let hidden = qs( x, "#hidden-state, #unit-hidden-state" ).getAttribute("checked");
          let type = gid.split("/")[3]
          let id = gid.split("/")[4]

          /*
            todo: add fields on assignments for:
                -- assignment required (or due date)
                -- number of submissions total
           */
          let content = {
            id: Number(id),
            type: type,
            title: title,
            href: href,
            hidden_state: !!hidden,
            gid: gid,
            first_submission_at: null
          };

          if (type === 'Assignment') {
            scrapeAssignmentDueDate(content, (content) => {
                allContent.assignments.push(content);
            });
          } else if (type === 'Lesson') {
            allContent.lessons.push(content);
          } else if (type === 'Unit') {
            allContent.units.push(content);
          }
        }
      } );
      console.log("Path Content:", allContent);
      return allContent;
    }

    function scrapeAssignmentDueDate(content, callback){
        const assignmentURI = href => `https://online.theironyard.com${href}`;

          $.get( assignmentURI(content.href) ).then( html => {
            var dom = document.createElement( 'html' );
            dom.innerHTML = html;
            content.due_date = new Date( qsa( dom, '.card-block div:last-child > p:last-child' )[0].innerText );
            if(content.due_date == "Invalid Date") content.due_date = null;
            callback( content );
          } ).fail( err => {
              console.info("doh!");
              callback( content );
          });
    }

    function getAssignmentContent(path) {
      const pathURI = id => `https://online.theironyard.com/admin/paths/${ id }`;

      return new Promise( ( res, rej ) => {
        if (/\/admin\/paths\/[0-9]+/.test(window.location.pathname)) {
          path.content = scrapePathContent(document)
          res(path);
        } else {
          $.get( pathURI( path.id ) ).then( html => {
            var dom = document.createElement( 'html' );
            dom.innerHTML = html;
            path.content = scrapePathContent(dom)
            res( path );
          } ).fail( err => rej(err));
        }
      } );
    }

    function scrape( sessionData, callback ) {
        const userURI = id => `https://online.theironyard.com/admin/users/${id}`;

        function scrapeStudentPage( students, assignments, url, html ) {
            let studentPage = document.createElement( 'html' );
            studentPage.innerHTML = html;

            let name = qs( studentPage, 'h1 strong' ).innerText;
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
                    if (assignment.first_submission_at === null || submission.submitted_at < assignment.first_submission_at ) {
                        assignment.first_submission_at = submission.submitted_at;
                    }

                  if ( !IGNORED_GRADES.includes( submission.grade ) ) {
                      submission.assignment = assignment;
                      let existingSubmission = students[ studentId ].submissions[ assignment.id ];
                      if ( !( existingSubmission && existingSubmission.submitted_at > submission.submitted_at ) ) {
                        students[ studentId ].submissions[ assignment.id ] = submission;
                      }
                  }
                } else {
                  console.log("Submission from other path", submission, students[ studentId ])
                }
            } );

        }
        Promise.all( [getPathContent(sessionData.path)] ).then( ([pathWithContent]) => {
          sessionData.path = pathWithContent;

          Promise.all( [sessionData.students] ).then( ( [ s ] ) => {
              let students = {};
              let assignments = sessionData.path.content.assignments;

              Promise.all( s.map( s => new Promise( ( res ) => {
                  $.get( userURI(s.id) ).then( html => res( scrapeStudentPage( students, assignments, userURI(s.id), html ) ) );
              } ) ) ).then( () => {

                  // use the path's sorting as the correct sort order
                  /*assignments.sort( function( a, b ) {
                      return new Date( b.first_submission_at ) - new Date( a.first_submission_at );
                  } ); */

                  // don't calculate grade ahead of time
                  //students = calculateGrades( students, assignments );

                  const gradebook = {
                      id: sessionData.path.id,
                      title: sessionData.path.title,
                      students: students,
                      assignments: assignments,
                      scraped_at:  moment()
                  };
                  let gradebooks = loadCachedGradebooks();

                  gradebooks[sessionData.path.id] = gradebook;

                  localStorage.setItem( 'cachedGradeBookData', JSON.stringify( gradebooks ) );
                  callback( gradebook );
              } );
          } );
        });
    }

} )( window.tiy || {}, window.jQuery, window.moment );
