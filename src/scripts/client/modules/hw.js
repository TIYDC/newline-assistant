( function( tiy, moment ) {
  'use strict';

  const HW_NO_CLIENT_TEMPLATE = 'templates/hw_no_client.html';
  const HW_CLIENT_TEMPLATE = 'templates/hw_client.html';

  let $ui = null;
  let pageData = {};

  tiy.loadModule( {
    name: 'hw',
    navIcon: 'fa-download',
    render: main
  } );


  /**
   * Entrypoint from tiyo-assistant
   * @param  {Object} data page related data
   * @param  {Element} elem jQuery Element
   * @return {void}
   */
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
        addDiagnosticUi( $ui, resp );
      } );
    } );
  }

  /**
   * Build the UI for diagonsitc and install help
   */
  function addDiagnosticUi( $ui, resp ) {
    $ui
      .html( "" )
      .append( `<h5>Newline HW ${resp.status === "ok" ? 'detected' : 'not found'}</h5>` );

    if ( resp.status === "ok" ) {
      $.get( chrome.extension.getURL( HW_CLIENT_TEMPLATE ) ).then( function( html ) {
        $ui.append( html );
        const $diag = $ui.find("#diagnostic");
        $diag.append( `Last Heartbeat at ${moment(resp.message_at).fromNow()}` );

        function printDiag(data) {
          let html = "";
            html += `<dl>`;
            Object.keys( data ).forEach( function showData( key ) {
              if (typeof( data[key] ) === "object" ) {
                html += printDiag(data[key]);
              } else {
                html += `<dt>${key}</dt><dd>${data[key]}</dd>`;
              }
            });
            html += `</dl>`;
            return html;
        }

        $diag.append(printDiag(resp.data));
      } );

    } else {
      $.get( chrome.extension.getURL( HW_NO_CLIENT_TEMPLATE ) ).then( function( html ) {
        $ui.append( html );
      } );
    }
  }


  /**
   * Primary entry point for working UI
   *
   * While on relvent pages will detect if a native client is present and call
   * the respective setup functions if it is.
   */
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

  /**
   * Add ui to a assignment page
   *
   * i.e., /admin/assignments/123
   */
  function updateUIOnAssignmentPage() {
    function idFromUrl(uri) {
      return Number(uri.substr(uri.lastIndexOf('/') + 1));
    }

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

  /**
   * Add ui to a submission page
   *
   * i.e., /admin/assignment_submissions/123
   */
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


  /**
   * send event a heartbeat to background worker to determine if it is installed
   * callback is passed various diagnostic attributes determine by newline_hw
   *
   * @param  {Number}   submission_id the newline assignment_submission id
   * @param  {Function} callback      function to be called when message has been recieved
   */
  function detectNativeClient( callback ) {
    sendMessageToBackgroundWorker( {
      event: "heartbeat",
      data: {}
    }, callback );
  }


  /**
   * send event to background worker to run aganist the Setup class, to determine if
   * the submitted URL is "cloneable" aka a PR, or a git link.
   *
   * @param  {Number}   submission_id the newline assignment_submission id
   * @param  {Function} callback      function to be called when message has been recieved
   */
  function isSubmissionCloneable( submission_id, callback ) {
    sendMessageToBackgroundWorker( {
      event: "check_if_cloneable",
      data: {
        id: submission_id
      }
    }, callback );
  }


  /**
   * send event to background worker to trigger applescript to open and run
   * hw command for the submission_id
   *
   * @param  {Number}   submission_id the newline assignment_submission id
   * @param  {Function} callback      function to be called when message has been recieved
   */
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
        console.error( 'Newline Assistant -> newline_hw', chrome.runtime.lastError );
        // Catch errors if newline_hw is just not there otherwise show.
        if (chrome.runtime.lastError !== 'Specified native messaging host not found.') {
          tiy.showMessage( chrome.runtime.lastError );
        }
      }

      callback( resp );
    } );
  }

} )( window.tiy || {}, window.moment );
