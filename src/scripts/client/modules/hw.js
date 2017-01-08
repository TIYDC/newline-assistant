( function( tiy, moment ) {
  'use strict';

  let $ui = null;
  let pageData = {};

  tiy.loadModule( {
    name: 'hw',
    navIcon: 'fa-download',
    render: main
  } );

  function main( data, elem ) {
    $ui = $( elem );
    pageData = data;

    detectNativeClient( function handleNativeClient( response ) {
      addMainContent( $ui, response );
      if ( response.status === "ok" ) {
        console.log( "Native Client detected", response );
        updateUIClientPresent( response );
      } else {
        noClientPresent( response );
      }
    } );
  }

  function addMainContent( $ui, response ) {
    $ui
      .append( `Newline HW ${response.status === "ok" ? 'detected' : 'not found'} ` );

    if ( response.status === "ok" ) {
      $ui.append( `
          <small>
          Last Heartbeat at ${moment(response.data.message_at).fromNow()}
          using ruby ${response.data.ruby_version}
          using newline_hw ${response.data.version},
          and
          using newline_cli ${response.data.newline_cli_version}
          </small>
        ` );
    } else {
      $ui.append( `Last Error: ${response.message}` );
    }

  }

  function updateUIClientPresent() {
    if ( pageData.assignment_submission ) {
      updateUIOnSubmissionPage();
    }

    if ( pageData.assignment ) {
      updateUIOnAssignmentPage();
    }
  }

  function noClientPresent() {
    $ui
      .append(
        `<a
          class="btn btn-primary btn-sm"
          target="_blank"
          href="https://github.com/TIYDC/newline-hw#installation">
          Download Newline HW to clone homework locally!
        </a>`
      );
  }

  function updateUIOnAssignmentPage() {
    const idFromUrl = uri => Number( uri.substr( uri.lastIndexOf( '/' ) + 1 ) );
    $( "#submissions a[href^='/admin/assignment_submissions']" ).closest( "td" ).each( function addLinks() {
      const $el = $( this );
      addCloneLinkForSubmissionTo(
        $el,
        idFromUrl( $el.find( "a[href^='/admin/assignment_submissions']" )[ 0 ].href ), {
          success_class: "btn label label-complete-and-satisfactory",
          fail_class: "btn label label-incomplete"
        }
      );
    } );
  }


  function updateUIOnSubmissionPage() {
    addCloneLinkForSubmissionTo(
      $( ".edit_assignment_submission" ).first(),
      pageData.assignment_submission.id, {
        success_class: "btn btn-primary btn-sm",
        fail_class: "btn btn-danger btn-sm"
      }
    );
  }

/**
 * Adds a link to an $el that will trigger a triggerCloneEventForSubmissionID
 * event for a submission_id when clicked.  If a submission_id cannot be cloned
 * display a revelant message to the user.
 *
 * @param {jQuery Element} $el the element to append the relevant link
 * to
 * @param {integer} submission_id the submission_id that is to be passed to
 * NewlineHW
 * @param {object} options configuration options for the link (currently
 * on success class and fail class)
 */
  function addCloneLinkForSubmissionTo( $el, submission_id, options ) {
    options = ( typeof( options ) === "object" && options ) || {};

    isSubmissionCloneable( submission_id, function handleIsSubmissionCloneable( resp ) {
      if ( resp.data.cloneable ) {
        const clone_link = $el.append(
          `
          <a class="clone_and_open_submission ${options.success_class}">
            <i class="fa fa-download" aria-hidden="true"></i>
            Clone Assignment Locally
          </a>
          `
        );

        clone_link
          .find( '.clone_and_open_submission' )
          .click( function getSubmissionIDandCall( e ) {
            e.preventDefault();
            const self = $( this );

            self.append( `
              <i class='newline_hw_working fa fa-spin fa-spinner'></i>
            ` );

            triggerCloneEventForSubmissionID( submission_id, function() {
              self.find( ".newline_hw_working" ).remove();
            } );
          } );
      } else {
        $el.append(
          `
          <a target="_blank" href="${resp.data.submission_info.url}" class="${options.fail_class}">
            Submitted link can't be cloned
          </a>
          `
        );
      }
    } );


  }

  function detectNativeClient( callback ) {
    let client = {
      present: false
    };
    try {
      client = JSON.parse(
        sessionStorage.getItem( 'newlineHwNativeClientPresent' )
      );
    } catch ( e ) {}

    if ( client && client.present && client.data.status === "ok" ) {
      callback( client.data );
    } else {
      chrome.runtime.sendMessage( {
        event: "heartbeat",
        data: {}
      }, function handleBackgroundPageResponse( res ) {
        sessionStorage.setItem( 'newlineHwNativeClientPresent', JSON.stringify( {
          present: true,
          data: res
        } ) );

        callback( res );
      } );
    }
  }

  function isSubmissionCloneable( submission_id, callback ) {
    callback = ( typeof( callback ) === "function" && callback ) || function() {};
    console.log( "Checking if submission ID is cloneable", submission_id );
    chrome.runtime.sendMessage( {
      event: "check_if_cloneable",
      data: {
        id: submission_id
      }
    }, function( response ) {
      console.log( "From Background page", response );

      callback( response );
    } );
  }

  function triggerCloneEventForSubmissionID( submission_id, callback ) {
    callback = ( typeof( callback ) === "function" && callback ) || function() {};
    console.log( "Cloning submission ID", submission_id );
    chrome.runtime.sendMessage( {
      event: "clone_and_open_submission",
      data: {
        id: submission_id
      }
    }, function( response ) {
      console.log( "From Background page", response );

      callback( response );
    } );
  }

} )( window.tiy || {}, window.moment );
