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

    if ( pageData.assignment || pageData.assignment_submission ) {
      addCloneLinksToUi();
    }

    $( $ui ).on( 'showing', function() {
      $ui.append( `<i class='newline_hw_working fa fa-spin fa-spinner'></i>` );

      detectNativeClient( function handleNativeClient( resp ) {
        addMainContent( $ui, resp );
      } );
    } );

  }

  function addMainContent( $ui, resp ) {
    $ui
      .html( "" )
      .append( `Newline HW ${resp.status === "ok" ? 'detected' : 'not found'} ` );

    if ( resp.status === "ok" ) {
      $ui.append( `Last Heartbeat at ${moment(resp.message_at).fromNow()}` );
      $ui.append( `<dl>` );

      for(let i in resp.data) {
        if (resp.data.hasOwnProperty(i)) {
            $ui.append( `<dt>${i}</dt><dd>${resp.data[i]}</dd>`);
        }
      }
      $ui.append( `</dl>` );
    } else {
      $ui
        .append(
          `<br />
          <a
            class="btn btn-primary btn-sm"
            target="_blank"
            href="https://github.com/TIYDC/newline-hw#installation">
            Download Newline HW to clone homework locally!
          </a>`
        );
    }

  }

  function addCloneLinksToUi() {
    detectNativeClient( function handleNativeClient( resp ) {
      if ( resp.status === "ok" ) {
        if ( pageData.assignment_submission ) {
          updateUIOnSubmissionPage();
        }
        if ( pageData.assignment ) {
          updateUIOnAssignmentPage();
        }
      }
    } );
  }


  function updateUIOnAssignmentPage() {
    const idFromUrl = uri => Number( uri.substr( uri.lastIndexOf( '/' ) + 1 ) );
    $( "#submissions a[href^='/admin/assignment_submissions']" ).closest( "td" ).each( function addLinks() {
      const $el = $( this );
      addCloneLinkForSubmissionTo(
        $el,
        idFromUrl( $el.find( "a[href^='/admin/assignment_submissions']" )[ 0 ].href ), {
          success_class: "btn label label-complete-and-satisfactory",
          fail_class: "btn label label-external-link"
        }
      );
    } );
  }


  function updateUIOnSubmissionPage() {
    addCloneLinkForSubmissionTo(
      $( ".edit_assignment_submission" ).first(),
      pageData.assignment_submission.id, {
        success_class: "btn btn-primary btn-sm",
        fail_class: "btn btn-info btn-sm"
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
  function addCloneLinkForSubmissionTo( $el, submission_id, options = {} ) {
    isSubmissionCloneable( submission_id, function handleIsSubmissionCloneable( resp ) {
      if (resp === "Timeout") {
        $el.append(
          `
          <a class="clone_and_open_submission ${options.fail_class}">
            <i class="fa fa-question" aria-hidden="true"></i>
          </a>
          `
        );
        return;
      }

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
            <i class="fa fa-external-link" aria-hidden="true"></i>
            Go To
          </a>
          `
        );
      }
    } );
  }

  function detectNativeClient( callback ) {
    chrome.runtime.sendMessage( {
      event: "heartbeat",
      data: {}
    }, function handleBackgroundPageResponse( res ) {
      callback( res );
    } );
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
