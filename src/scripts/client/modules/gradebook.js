(function gradebookModule(tiy, $, moment) {
  tiy.loadModule({
    name: 'gradebook',
    navIcon: 'fa-book',
    render: main
  });

  let uiBuilt = false;

  const TABLE_TEMPLATE = `
      <h6 id='path-title'></h6>

      <section class="grades">
        <table class="table table-condensed">
          <thead></thead>
          <tbody></tbody>
        </table>
      </section>

      <section class="actions">
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
    exceeds_expectations: 'E',
    complete_and_satisfactory: 'S',
    complete_and_unsatisfactory: 'U',
    incomplete: 'I',
    not_graded: 'G',
    retracted: 'R',
  };

  const OK_GRADES = [
    'complete_and_satisfactory',
    'exceeds_expectations',
    'not_graded',
  ];

  const IGNORED_GRADES = [
    'retracted'
  ];

  // Behavior ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

  function main(sessionData, $el) {
    $($el).on('showing', () => {
      show(sessionData, $el);
    });
  }

  function loadCachedGradebooks() {
    let gradebooks;
    try {
      gradebooks = JSON.parse(
        localStorage.getItem('cachedGradeBookData')
      );
    } catch (e) {
      console.warn('Failed to restore gradebook data from localStorage');
    }
    gradebooks = gradebooks || {};
    return gradebooks;
  }

  function loadCachedSession() {
    let session;
    try {
      session = JSON.parse(
        localStorage.getItem('cachedGradeBookDataSession')
      );
    } catch (e) {
      console.warn('Failed to restore gradebook session data from localStorage');
    }
    session = session || { path: null };
    return session;
  }

  /**
     Given any newline uri make an initial request, detect if there are more pages, if they are re curse and build a complete collection.
  **/
  function recurseOverCollection(uri, collection, page) {
    return new Promise((res) => {
      const settings = {
        async: true,
        crossDomain: true,
        url: `${uri}&page=${page}`,
        method: 'GET'
      };

      $.get(settings).done(function(response) {
        collection = [...collection, ...response.data];
        if (response.meta.total_pages <= page) {
          res(collection);
        } else {
          res(recurseOverCollection(uri, collection, page + 1));
        }
      });
    });
  }

  function show(sessionData, $el) {
    if (uiBuilt) {
      return;
    }

    const cachedSession = loadCachedSession();
    if (sessionData.path === null && cachedSession.path === null) {
      // Provide feedback to the user that we can't handle this.
      $el.text('Have you visited a path recently, we don\'t know what gradebook you want to see, go to a path you own and try again?!');
      return;
    } else if (sessionData.path === null && cachedSession.path !== null) {
      sessionData = cachedSession;
    } else {
      localStorage.setItem('cachedGradeBookDataSession', JSON.stringify(sessionData));
    }

    const gradebooks = loadCachedGradebooks();
    const gradebookData = gradebooks[sessionData.path.id];

    resetUI(sessionData, $el);

    if (gradebookData) {
      try {
        buildUI(
          sessionData,
          $el,
          gradebookData
        );
      } catch (e) {
        localStorage.removeItem('cachedGradeBookData');
      }
    } else {
      getGradebook(sessionData, $el);
    }

    uiBuilt = true;
  }


  function getGradebook(sessionData, $el) {
    console.info('DDOSsing Newline for path: ', sessionData.path.id);

    $('#generate-score-card').text('Processing').attr('disabled', true);

    try {
      scrape(sessionData, function(gradebook) {
        resetUI(sessionData, $el);
        buildUI(sessionData, $el, gradebook);
      });
    } catch (e) {
      console.warn(e);
      // Wrap in try catch to show UI to user that something went wrong ( user permissions? )
      $el.text('There was a problem getting all the data for this gradebooks, do you own this path?!');
    }
  }

  // UI ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

  function resetUI(sessionData, $el) {
    $el.html('');
    $el.append(TABLE_TEMPLATE);

    $('#generate-score-card').click(function(){
      getGradebook(sessionData, $el);
    });

    $el
      .find('tbody')
      .on('click', 'td.grade-percent', function() {
        $(this).parent().siblings('tr').toggle();
      });
  }

  function buildUI(sessionData, $el, gradebook) {
    const students = gradebook.students;
    const assignments = gradebook.assignments;
    const $table = $el.find('table');

    $table
      .find('thead')
      .append(buildAssignmentsHeader(assignments));

    // Never display the instructor in the gradebook
    const onlyStudents = students
      .filter(s => sessionData.user.user_id !== s.id)
      .sort((a, b) => parseInt(b.percentage, 10) - parseInt(a.percentage, 10));

    onlyStudents.forEach(function(student){
      $table.append(buildStudentRow(student, assignments));
    });

    $el.find('#path-title').html(
      `<a href='/admin/paths/${sessionData.path.id}'>
          ${gradebook.title}
       </a>
      `
    );
    $el.find('#last-scraped').text(moment(gradebook.scraped_at).fromNow());
  }

  function buildAssignmentsHeader(assignments) {
    const row = $('<tr>');
    row.append($('<th>').append('Student'));
    row.append($('<th>').append('Grade'));

    assignments.forEach(function(assignment) {
      row.append(`
        <th data-tooltip='${assignment.title}'>
          <a href='${assignment.href}' title='${assignment.title}' class="title">
            ${assignment.title.slice(0, 1)}
          </a>
        </th>
      `);
    });

    return row;
  }

  function buildStudentRow(student, assignments) {
    const studentRow = $('<tr>');

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
      `<td class='grade-percent' title='Click here to toggle other student grades visibility'>${student.percentage}%</td>`
    );

    assignments.forEach(function(assignment) {
      const submission = student.submissions[assignment.id];

      if (submission) {
        const gradeClass = SHORT_GRADE_NAMES[submission.status].toLowerCase();
        studentRow.append(
          `
          <td class='grade ${gradeClass}' date-tooltip='${assignment.title}' >
            <a href='${submission.href}' title='${assignment.title}' target='blank' >
              ${SHORT_GRADE_NAMES[submission.status]}
            </a>
          </td>
          `
        );
      } else {
        studentRow.append('<td></td>');
      }
    });

    return studentRow;
  }
  // Data Management +++++++++++++++++++++++++++++++++++++++++++++++++++++++++

  function calculateGrades(students, assignments) {
    if (!students) {
      return false;
    }

    // Question, What is the the best practice for building an uniq array
    // of objects in JS.
    return Object.keys(students).map(function(studentName) {
      const student = students[studentName];

      const submissions = Object.keys(student.submissions);
      const okCount = submissions.filter(id => OK_GRADES.includes(student.submissions[id].status));
      const grade = (okCount.length / assignments.length) * 100;
      student.percentage = grade.toFixed(0);
      return student;
    });
  }

  function getPathContent(path) {
    const pathURI = id => `https://newline.theironyard.com/api/paths/${id}/contents`;

    class Content {
      constructor(data) {
        // Build an object that has the exposed properties of the parent
        // content while adding functionality
        // TODO: This seems like something that is common, better way?
        Object.keys(data).forEach((k) => { this[k] = data[k]; });
        this.href = `/admin/${this.type.toLowerCase()}/${this.id}`;
        this.first_submission_at = null;
      }
    }

    return new Promise(function(res, rej) {
      $.get(pathURI(path.id)).then(function(data) {
        const units = data.data;
        const contents = [].concat(...units.map(el => el.contents));
        path.content = {
          units,
          assignments: contents.filter(el => el.type === 'Assignment').map(el => new Content(el)),
          lessons: contents.filter(el => el.type === 'Lesson').map(el => new Content(el)),
        };
        res(path);
      }).fail(err => rej(err));
    });
  }

  function scrape(sessionData, callback) {
    const userSubmissionURI = id => `https://newline.theironyard.com/api/assignment_submissions?student_id=${id}`;
    function extractStudentData(students, assignments, url, submissions) {
      const name = submissions[0].student.name;
      const studentId = submissions[0].student.id;

      students[studentId] = {
        id: studentId,
        name,
        percentage: null,
        submissions: {}
      };

      submissions.forEach(function(submission) {
        submission.href = `https://newline.theironyard.com/admin/assignment_submissions/${submission.id}`;
        const assignment = assignments.find(a => a.id === submission.assignment.id);

        if (assignment) {
          const noSubmission = assignment.first_submission_at === null;
          const newerSubmission = submission.created_at < assignment.first_submission_at;
          if (noSubmission || newerSubmission) {
            assignment.first_submission_at = submission.created_at;
          }

          if (!IGNORED_GRADES.includes(submission.status)) {
            submission.assignment = assignment;
            const existingSubmission = students[studentId].submissions[assignment.id];
            if (!(existingSubmission && existingSubmission.created_at > submission.created_at)) {
              students[studentId].submissions[assignment.id] = submission;
            }
          }
        } else {
          console.log('Submission from other path', submission, students[studentId]);
        }
      });
    }
    if (sessionData.students.length === 0) {
      throw new Error('no students');
    }
    Promise.all([getPathContent(sessionData.path)]).then(([pathWithContent]) => {
      sessionData.path = pathWithContent;

      let students = {};
      const assignments = sessionData.path.content.assignments;

      Promise.all(sessionData.students.map(s => new Promise((res) => {
        recurseOverCollection(userSubmissionURI(s.id), [], 1)
          .then((data) => {
            res(extractStudentData(students, assignments, userSubmissionURI(s.id), data));
          });
      }))).then(() => {
        // Reject any assingments that have nothing turned in?
        // Thoughts, this could use hidden state?
        const submittedAssingments = assignments
          .filter(el => el.first_submission_at !== null)
          // Newest submissions
          .sort((a, b) => new Date(b.first_submission_at) - new Date(a.first_submission_at));

        students = calculateGrades(students, submittedAssingments);
        const gradebook = {
          id: sessionData.path.id,
          title: sessionData.path.title,
          students,
          assignments: submittedAssingments,
          scraped_at: moment()
        };
        const gradebooks = loadCachedGradebooks();

        gradebooks[sessionData.path.id] = gradebook;

        localStorage.setItem('cachedGradeBookData', JSON.stringify(gradebooks));
        callback(gradebook);
      });
    });
  }
}(window.tiy || {}, window.jQuery, window.moment));
