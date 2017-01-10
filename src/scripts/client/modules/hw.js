( function( tiy, moment ) {
  'use strict';

  const HW_NO_CLIENT_TEMPLATE = 'templates/hw.html';

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

    // On relevant pages add links
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
      .append( `<h5>Newline HW ${resp.status === "ok" ? 'detected' : 'not found'}</h5>` );

    if ( resp.status === "ok" ) {
      $ui.append( `Last Heartbeat at ${moment(resp.message_at).fromNow()}` );
      $ui.append( `<dl>` );

      Object.keys(resp.data).forEach(function showData(key) {
        $ui.append( `<dt>${key}</dt><dd>${resp.data[key]}</dd>` );
      });

      $ui.append( `</dl>` );
    } else {
      $.get( chrome.extension.getURL( HW_NO_CLIENT_TEMPLATE ) ).then( function( html ) {
        $ui.append( html );
      } );
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
          success_class: "label label-complete-and-satisfactory",
          fail_class: "label label-external-link"
        }
      );
    } );
  }


  function updateUIOnSubmissionPage() {
    addCloneLinkForSubmissionTo(
      $( '.edit_assignment_submission:eq(0)' ),
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
      if ( resp.data.cloneable ) {
        $el.append(
          `
          <a class="clone_and_open_submission ${options.success_class}">
            <i class="fa fa-download" aria-hidden="true"></i>
            Clone Assignment Locally
          </a>
          `
        );

        $el.on( "click", ".clone_and_open_submission", function getSubmissionIDandCall( e ) {
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
    sendMessageToBackgroundWorker( {
      event: "heartbeat",
      data: {}
    }, callback );
  }

  function isSubmissionCloneable( submission_id, callback ) {
    sendMessageToBackgroundWorker( {
      event: "check_if_cloneable",
      data: {
        id: submission_id
      }
    }, callback );
  }

  function triggerCloneEventForSubmissionID( submission_id, callback ) {
    sendMessageToBackgroundWorker( {
      event: "clone_and_open_submission",
      data: {
        id: submission_id
      }
    }, callback );
  }

  /**
   * send json objects to the backgroup process for privledge esclation.
   *
   * @param  {object}   msg      event data to be sent to native client
   * @param  {Function} callback optional callback with response for native client
   */
  function sendMessageToBackgroundWorker( msg, callback ) {
    callback = ( typeof( callback ) === "function" && callback ) || function() {};
    chrome.runtime.sendMessage( msg, function( resp ) {
      console.log( "From Background page", resp );

      // Handle native client error message / timeout
      if ( resp && resp.status === "fail" ) {
        console.error( resp.message );
        tiy.showMessage( resp.message );
      }

      // Handle failure to commuicate with background page
      if ( typeof resp === "undefined" ) {
        console.error( chrome.runtime.lastError );
        tiy.showMessage( chrome.runtime.lastError );
      }

      callback( resp );
    } );
  }

} )( window.tiy || {}, window.moment );
