# The Newline Assistant (TA)

This is a chrome extension to assist with The Iron Yard's Newline for instructors. Think of it as your digital TA.

* [Using this extension](#using-this-extension)
  * [Install It](#install-it)
  * [Gradebook](#gradebook)
  * [Search](#search)
  * [Instructor Notes](#instructor-notes)
* [To Hack On It](#to-hack-on-it)
* [Authors](#authors)

## Using this extension

### Install It

Head to the (unlisted) entry in the [Chrome Web Store](https://chrome.google.com/webstore/detail/tiyo-assistant/fnhanbdccpjnnoohoppkeejljjljihcc?authuser=0) add click the "Add to Chrome" button!

Once installed, just head to [Newline](https://newline.theironyard.com), you'll have some new icons in the top-right corner that will let you access the features below...

### Gradebook

1. Go to a Path of yours in Newline
1. Some new icons will appear in the top right
1. Click on the one that looks like a book
1. (Possibly wait a while for the gradebook to scrape Newline)
1. Enjoy!

The gradebook builds on the awesome work of @jwo and @matthiasak. Each student your path is assigned to will appear in the table along with their "grade" as determined by assignments submitted. Each assignment will be in the top header and each cell will indicate (with a color and letter) the latest status of that submission. You can click on a student's name to view their profile, an assignment header to view that assignment, or a submission cell to view that submission.

Data is cached in localStorage so as not to DDoS Newline (too much). Clicking the "Refresh Grades" button will scrape the site once again and store the new data.

### Homework

The Homework module builds upon the inspiration from @jah2488.  It allows communication to an authorized ruby process running on your computer to rapidly clone and setup git based projects on your computer.  This allows for easy cloning of PR's, Git Repos, Gists, and various other git related links.  For full documentation please read more about the underlying tool newline_hw [here](https://github.com/TIYDC/newline_hw#newlinehw).

It depends on

1. ruby 2.3.0
2. [newline_cli](https://github.com/theironyard/newline_cli)
3. [newline_hw](https://github.com/tiydc/newline_hw)

#### Troubleshooting
Tailing the message's passed to `newline_hw`
`tail -f ~/Library/Logs/newline_hw/newlinehw.log`

Get a copy of the logs in your clipboard
`cat ~/Library/Logs/newline_hw/newlinehw.log | pbcopy`

### Search

While on a Path you can search all text in any lesson or assignment. Click on the search icon in the top right (magnifying glass) to open the UI. If you have not yet built the search index for that path, you will want to do so (you can tell because the UI will read: `(Index created (never))`). Click on the "Refresh Index" button to start.

> _Note: Newline likes to throw 500 errors sometimes. Even one of these during the re-indexing means a bad index, and no data will be stored. You may need to run the indexing script multiple times._

Once the index is built, simply type you search query and hit enter. The results will appear immediately below the search box and will link to the pieces of content that query appears in.

#### Content Tagging

You can add tags to any piece of content (lesson or assignment) by clicking on the tag icon next to the content and then typing in the input next to the content name (see screenshot below). The tags should be **comma separated**, but there is no limit to how many you can add. Clicking on a tag next to the content will **remove that tag**.

![tagging screenshot](http://i.imgur.com/RvW3yIw.png)

When you search for content, the results will also show the tags, and tags will be weighted heavily in the results. Thus, content pieces with a tag will show up higher in search results. Clicking on a tag in searching results **will not remove the tag**, but instead it will change you search query to match that tag.

![searching for tags](http://i.imgur.com/PAxlPe6.png)

#### Copying Tags to Another Path

All tags are restricted to the path they were created on. That means when you clone a path all tags will be "left behind". Because of this, you can copy all tags from the current path to any other path. This process uses the content name (lesson or assignment title) to match tags on the new (hopefully cloned) path.

To do this, open up the "Search" module while on a path (that's the magnifying glass icon in the top right). Click on the "Copy Tags to Path" button and enter the new path's ID. Click on "Copy Tags" and way a moment while the TA does its thing. You'll get a message indicating success or failure.

### Instructor Notes

The instructor notes allow just that: notes by instructors (for instructors only). While viewing a path an instructor will now have an additional icon next to the "current" and "hide/show" icons to the right of each content piece (lesson or assignment). Clicking on the notes icon there (it looks like a sticky note) will pop up a simple modal for entering notes. These notes are saved in `localStorage` only!

While viewing the content piece (lesson or assignment) as a student, the instructor will be able to view the notes at the top of the content, just above the description. Note that a student would never be able to see these since they would need the extension **and** the notes data from the instructor's `localStorage`.

The instructor may also edit these notes on the individual content edit page by clicking on the notes icon in the top right next to all the other module icons.

#### Sharing Notes

Since the data for instructor notes is only stored in `localStorage` (for now) if an instructor wants to share notes with others - or just among two machines - they would have to export, and then import, the data. To do so, open the instructor notes module UI using the icon in the top right of Newline, then click on the "Export JSON" button. This will save a JSON file to your computer which you can then share with others.

To import instructor notes simply open the UI, select the JSON file on your machine (the one that was exported), and click on the "Import JSON" button. Note that the imported notes will be _merged_ with any you already have. That means that the extension will _never overwrite_ your existing notes. If you already have a note for a given content piece then the extension will add the imported notes under your own.

## To Hack On It

First install the Grunt CLI if you don't have it already, then clone the repo, install dependencies, and build the project!

```
$ npm install -g grunt-cli
$ git clone git@github.com:TIYDC/tiyo-assistant.git && cd tiyo-assistant && npm install && grunt
```

While you're developing you can run `grunt watch` in a terminal window (inside the project directory) to keep the `build/` directory up to date.

Now create your branch and hack away. When you're ready to test the extension, [enable developer extensions](https://developer.chrome.com/extensions/faq#faq-dev-01) in Chrome, then go to [your extensions](chrome://extensions/) and click the "Load unpacked extension..." button and navigate to the `build/` directory inside your project.

### Merging Back in and Releasing

We are happy to accept PRs and will cut releases as necessary. The "release" process is simply creating a zip file from the `/build` directory and updating the published chrome extension (which only @jakerella can do currently). We also will add a "release" in GitHub each time.

## Authors

Current maintainers are @jakerella and @rposborne, building off of the work that @jwo and @matthiasak have done.
