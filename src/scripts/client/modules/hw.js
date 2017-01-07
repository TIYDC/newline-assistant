( function( tiy ) {
  'use strict';

  let $ui = null;
  let pageData = {};

  tiy.loadModule( {
    name: 'hw',
    navIcon: 'fa-pencil',
    render: main
  } );

  function main( data, elem ) {
    $ui = $( elem );
    pageData = data;
    console.log( pageData );
    detectNativeClient( function handleNativeClient( response ) {
      if ( response.status === "ok" ) {
        console.log( "Native Client detected", response );
        updateUIClientPresent( response );
      } else {
        noClientPresent( response );
      }
    } );
  }

  function updateUIClientPresent() {

    if (pageData.assignment_submission) {
      $( ".edit_assignment_submission" ).first().append(
        `<a class="btn btn-primary btn-sm">Clone Assignment Locally</a>`
      ).click( function getSubmissionIDandCall() {
        triggerCloneEventForSubmissionID( pageData.assignment_submission.id );
      } );
    }

    if (pageData.assignment){
      const idFromUrl = uri => Number( uri.substr( uri.lastIndexOf( '/' ) + 1 ) );
      const submission_link =
        $( "#submissions a[href^='/admin/assignment_submissions']" );
      const submission_id = idFromUrl(submission_link[0].href);

      const clone_link = submission_link.parents("td").append(
        ` | <a class="clone_and_open_submission">
          <i class="fa fa-fork" aria-hidden="true"></i>
          Clone Assignment Locally
        </a>`
      );

      clone_link
        .find('.clone_and_open_submission')
        .click( function getSubmissionIDandCall() {
          triggerCloneEventForSubmissionID( submission_id );
      } );
    }
  }

  function noClientPresent() {
    $ui
      .append(
        `<a
          class="btn btn-primary btn-sm"
          target="_blank"
          href="https://github.com/TIYDC/newline-hw">
          Download Newline HW
        </a>`
      );
  }

  function detectNativeClient( callback ) {
    let client = { present: false };
    try {
      client = JSON.parse(
        sessionStorage.getItem( 'newlineHwNativeClientPresent' )
      );
    } catch ( e ) {}

    if ( client && client.present ) {
      callback( client.data );
    } else {
      chrome.runtime.sendMessage( {
        event: "heartbeat",
        data: {}
      }, function handleBackgroundPageResponse( res ) {
        sessionStorage.setItem( 'newlineHwNativeClientPresent',JSON.stringify({
          present: true,
          data: res
        }));

        callback( res );
      } );
    }
  }

  function triggerCloneEventForSubmissionID( submission_id ) {
    chrome.runtime.sendMessage( {
      event: "clone_and_open_submission",
      data: {
        id: submission_id
      }
    }, function( response ) {
      console.log( "From Background page", response );
    } );
  }

} )( window.tiy || {} );
