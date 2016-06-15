# TIYO Assistant

This is a chrome extension to assist with The Iron Yard Online for instructors. Since this is not (yet?) a distributed extension, you will need to clone this repo (or download it) in order to use it.

* [Using this extension](#using-this-extension)
  * [Install It](#install-it)
  * [Gradebook](#gradebook)
  * [Search](#search)
  * [Instructor Notes](#instructor-notes)
* [To Hack On It](#to-hack-on-it)
* [Authors](#authors)

## Using this extension

### Install It

Clone this repo, then go to [chrome://extensions](chrome://extensions) in your browser. Drag the `tiyo-assistant-1.0.crx` file from this directory onto that page. That's it!

### Gradebook

1. Go to a Path of yours in TIYO
1. Some new icons will appear in the top right
1. Click on the one that looks like a book
1. (Possibly wait a while for the gradebook to scrape TIYO)
1. Enjoy!

The gradebook builds on the awesome work of @jwo and @matthiasak. Each student your path is assigned to will appear in the table along with their "grade" as determined by assignments submitted. Each assignment will be in the top header and each cell will indicate (with a color and letter) the latest status of that submission. You can click on a student's name to view their profile, an assignment header to view that assignment, or a submission cell to view that submission.

Data is cached in localStorage so as not to DDoS TIYO (too much). Clicking the "Refresh Grades" button will scrape the site once again and store the new data.

### Search

While on a Path you can search all text in any lesson or assignment. Click on the search icon in the top right (magnifying glass) to open the UI. If you have not yet built the search index for that path, you will want to do so (you can tell because the UI will read: `(Index created (never))`). Click on the "Refresh Index" button to start.

> _Note: TIYO likes to throw 500 errors sometimes. Even one of these during the re-indexing means a bad index, and no data will be stored. You may need to run the indexing script multiple times._

Once the index is built, simply type you search query and hit enter. The results will appear immediately below the search box and will link to the pieces of content that query appears in.

### Instructor Notes

The instructor notes allow just that: notes by instructors (for instructors only). While viewing a path an instructor will now have an additional icon next to the "current" and "hide/show" icons to the right of each content piece (lesson or assignment). Clicking on the notes icon there (it looks like a sticky note) will pop up a simple modal for entering notes. These notes are saved in `localStorage` only!

While viewing the content piece (lesson or assignment) as a student, the instructor will be able to view the notes at the top of the content, just above the description. Note that a student would never be able to see these since they would need the extension **and** the notes data from the instructor's `localStorage`.

The instructor may also edit these notes on the individual content edit page by clicking on the notes icon in the top right next to all the other module icons.

#### Sharing Notes

Since the data for instructor notes is only stored in `localStorage` (for now) if an instructor wants to share notes with others - or just among two machines - they would have to export, and then import, the data. To do so, open the instructor notes module UI using the icon in the top right of TIYO, then click on the "Export JSON" button. This will save a JSON file to your computer which you can then share with others.

To import instructor notes simply open the UI, select the JSON file on your machine (the one that was exported), and click on the "Import JSON" button. Note that the imported notes will be _merged_ with any you already have. That means that the extension will _never overwrite_ your existing notes. If you already have a note for a given content piece then the extension will add the imported notes under your own.

## To Hack On It

First install the Grunt CLI if you don't have it already, then clone the repo, install dependencies, and build the project!

```
$ npm install -g grunt-cli
$ git clone git@github.com:TIYDC/tiyo-assistant.git && cd tiyo-assistant && npm install && grunt
```

While you're developing you can run `grunt watch` in a terminal window (inside the project directory) to keep the `build/` directory up to date.

Now create your branch and hack away. When you're ready to test the extension, [enable developer extensions](https://developer.chrome.com/extensions/faq#faq-dev-01) in Chrome, then go to [your extensions](chrome://extensions/) and click the "Load unpacked extension..." button and navigate to the directory you cloned this repo into.

### Merging Back in and Releasing

We are happy to accept PRs and will cut releases as necessary. The "release" process is simply updating the manifest and regenerating the `crx` file in the root. This was included in the repo to make it easier for other instructors to use the tool without having to build it as described above. Note that to keep the `crx` file lean we can eliminate the `.git/`, `.sass-cache/`, and `src/` directories from the final product. The `crx` file itself is created by using the "Pack Extension" button within the chrome extensions settings page. And don't forget the `pem` file so that users can update their extension vs having to remove it first!

## Authors

Current maintainers are @jakerella and @rposborne, building off of the work that @jwo and @matthiasak have done.
