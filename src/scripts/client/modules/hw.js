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

  function updateUIOnAssignmentPage () {
    const idFromUrl = uri => Number( uri.substr( uri.lastIndexOf( '/' ) + 1 ) );
    const submission_links =
      $( "#submissions a[href^='/admin/assignment_submissions']" );

    const clone_link = submission_links.closest( "td" ).append(
      ` | <a href="#" class="clone_and_open_submission">
        <i class="fa fa-download" aria-hidden="true"></i>
        Clone Assignment Locally
      </a>`
    );

    clone_link
      .find( '.clone_and_open_submission' )
      .click( function getSubmissionIDandCall( e ) {
        e.preventDefault();
        const self = $( this );
        const submission_id = idFromUrl(
          self.closest( "td" ).find( "a[href^='/admin/assignment_submissions']" )[ 0 ].href
        );

        self.append( `
          <i class='newline_hw_working fa fa-spin fa-spinner'></i>
          ` );

        triggerCloneEventForSubmissionID( submission_id, function() {
          self.find( ".newline_hw_working" ).remove();
        } );
      } );
  }

  function updateUIOnSubmissionPage () {
    const clone_link = $( ".edit_assignment_submission" ).first().append(
      `
      <a class="clone_and_open_submission btn btn-primary btn-sm">
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
        triggerCloneEventForSubmissionID( pageData.assignment_submission.id, function() {
          self.find( ".newline_hw_working" ).remove();
        } );
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
